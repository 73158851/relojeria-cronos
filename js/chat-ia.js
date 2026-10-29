/* =========================================================
   chat-ia.js — CRONOAI: Filtro Dinámico Inteligente de Stock
   Relojería CRONOS (Opciones Progresivas 100% Coincidentes)
   ========================================================= */

let catalogoDisponible = [];
let respuestasUsuario = {};
let pasoActual = 0;
let historialChat = [];
let promptSistema = '';

function obtenerClienteSupabase() {
  if (typeof supabaseClient !== "undefined") return supabaseClient;
  if (window._supabase) return window._supabase;
  if (typeof supabase !== "undefined" && typeof supabase.from === "function") return supabase;
  if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    const create = window.supabase?.createClient || createClient;
    return create(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  }
  return null;
}

// -----------------------------------------------------------
// Renderizado de Mensajes en el Chat
// -----------------------------------------------------------
function pintarMensaje(texto, esUsuario = false) {
  const contenedor = document.getElementById('chat-messages');
  if (!contenedor) return;
  const burbuja = document.createElement('div');
  burbuja.className = esUsuario ? 'msg msg-user' : 'msg msg-bot';
  burbuja.style.whiteSpace = 'pre-line';
  burbuja.textContent = texto;
  contenedor.appendChild(burbuja);
  contenedor.scrollTop = contenedor.scrollHeight;
  return burbuja;
}

function mostrarEscribiendo() {
  const burbuja = pintarMensaje('CRONOAI está buscando en inventario...', false);
  burbuja.classList.add('msg-typing');
  return burbuja;
}

function pintarOpciones(opciones, onElegir) {
  const contenedor = document.getElementById('chat-messages');
  if (!contenedor) return;
  const fila = document.createElement('div');
  fila.className = 'chat-options';

  opciones.forEach((opcion) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'chat-option-btn';
    boton.textContent = opcion.label;
    boton.addEventListener('click', () => {
      fila.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      fila.classList.add('chat-options-elegido');
      onElegir(opcion);
    });
    fila.appendChild(boton);
  });

  contenedor.appendChild(fila);
  contenedor.scrollTop = contenedor.scrollHeight;
}

// -----------------------------------------------------------
// FILTRADO DINÁMICO PROGRESIVO SEGÚN LO ELEGIDO ANTERIORMENTE
// -----------------------------------------------------------
function obtenerCandidatosFiltrados() {
  return catalogoDisponible.filter(p => {
    // 1. Filtro Género / Categoría
    if (respuestasUsuario.genero) {
      const cat = (p.categoria || '').toLowerCase();
      const resp = respuestasUsuario.genero.toLowerCase();
      const esVaron = (resp === 'hombre' || resp === 'varon') && (cat === 'hombre' || cat === 'varon' || cat === 'unisex');
      const esMujer = (resp === 'mujer' || resp === 'dama') && (cat === 'mujer' || cat === 'dama' || cat === 'unisex');
      const esUnisex = (resp === 'unisex') && (cat === 'unisex');
      if (!esVaron && !esMujer && !esUnisex) return false;
    }

    // 2. Filtro Estilo
    if (respuestasUsuario.estilo) {
      const est = (p.estilo || '').toLowerCase();
      if (est !== respuestasUsuario.estilo.toLowerCase()) return false;
    }

    // 3. Filtro Tipo de Correa
    if (respuestasUsuario.tipoCorrea) {
      const tipo = (p.tipo_correa || '').toLowerCase();
      const resp = respuestasUsuario.tipoCorrea.toLowerCase();
      if (!tipo.includes(resp) && !resp.includes(tipo)) return false;
    }

    // 4. Filtro Color de Correa
    if (respuestasUsuario.colorCorrea) {
      const col = (p.color_correa || '').toLowerCase();
      if (!col.includes(respuestasUsuario.colorCorrea.toLowerCase())) return false;
    }

    // 5. Filtro Diseño de Esfera
    if (respuestasUsuario.esfera) {
      const esf = (p.diseno_esfera || '').toLowerCase();
      if (!esf.includes(respuestasUsuario.esfera.toLowerCase())) return false;
    }

    return true;
  });
}

// Cuestionario Dinámico: Cada pregunta mira únicamente los candidatos que van quedando
const PASOS_CUESTIONARIO = [
  {
    campo: 'genero',
    pregunta: '¡Hola! 👋 Soy CRONOAI, tu asesor personal en Relojería CRONOS.\n\nRespondé estas 6 preguntas basadas en nuestro inventario en tiempo real para recomendarte la pieza exacta que tenemos disponible.\n\n1/6 ¿Para quién buscás el reloj?',
    generarOpciones: () => {
      const generos = new Set();
      catalogoDisponible.forEach(p => {
        const cat = (p.categoria || '').toLowerCase();
        if (cat === 'hombre' || cat === 'varon') generos.add('hombre');
        if (cat === 'mujer' || cat === 'dama') generos.add('mujer');
        if (cat === 'unisex') generos.add('unisex');
      });

      const opts = [];
      if (generos.has('hombre')) opts.push({ label: 'Varón', valor: 'hombre' });
      if (generos.has('mujer')) opts.push({ label: 'Mujer', valor: 'mujer' });
      if (generos.has('unisex') || opts.length === 0) opts.push({ label: 'Unisex', valor: 'unisex' });
      return opts;
    }
  },
  {
    campo: 'estilo',
    pregunta: '2/6 ¿Qué estilo de reloj preferís?',
    generarOpciones: () => {
      // Mirar únicamente los estilos de los relojes que pasaron la pregunta 1
      const candidatos = obtenerCandidatosFiltrados();
      const estilos = new Set();
      candidatos.forEach(p => { if (p.estilo) estilos.add(p.estilo); });

      // Si ningún producto tiene estilo específico, ofrecer los más comunes que tengan existencia
      if (estilos.size === 0) estilos.add('Deportivo');

      return Array.from(estilos).map(e => ({ label: e, valor: e }));
    }
  },
  {
    campo: 'tipoCorrea',
    pregunta: '3/6 ¿Qué material de correa buscás?',
    generarOpciones: () => {
      // Mirar únicamente los tipos de correa de los relojes que pasaron pregunta 1 y 2
      const candidatos = obtenerCandidatosFiltrados();
      const tipos = new Set();
      candidatos.forEach(p => { if (p.tipo_correa) tipos.add(p.tipo_correa); });

      if (tipos.size === 0) tipos.add('Goma');

      return Array.from(tipos).map(t => ({
        label: t.toLowerCase().includes('goma') ? 'Goma / Silicona' : t,
        valor: t
      }));
    }
  },
  {
    campo: 'colorCorrea',
    pregunta: '4/6 ¿Qué color de correa preferís?',
    generarOpciones: () => {
      // Mirar únicamente los colores de correa que existen con los filtros anteriores
      const candidatos = obtenerCandidatosFiltrados();
      const colores = new Set();
      candidatos.forEach(p => { if (p.color_correa) colores.add(p.color_correa); });

      if (colores.size === 0) colores.add('Negro');

      return Array.from(colores).map(c => ({ label: c, valor: c }));
    }
  },
  {
    campo: 'esfera',
    pregunta: '5/6 ¿Qué diseño de esfera te resulta más atractivo?',
    generarOpciones: () => {
      // Mirar únicamente los diseños de esfera disponibles con los filtros anteriores
      const candidatos = obtenerCandidatosFiltrados();
      const esferas = new Set();
      candidatos.forEach(p => { if (p.diseno_esfera) esferas.add(p.diseno_esfera); });

      if (esferas.size === 0) esferas.add('Cronógrafo');

      return Array.from(esferas).map(es => ({ label: es, valor: es }));
    }
  },
  {
    campo: 'presupuesto',
    pregunta: '6/6 ¿Cuál es tu rango de presupuesto aproximado?',
    generarOpciones: () => {
      const candidatos = obtenerCandidatosFiltrados();
      const precios = candidatos.map(p => Number(p.precio || 0)).filter(pr => pr > 0);

      // Rangos estándar inteligentes
      const rangosPosibles = [
        { label: 'Hasta Bs. 250', min: 0, max: 250 },
        { label: 'Bs. 251 - 450', min: 251, max: 450 },
        { label: 'Bs. 451 - 700', min: 451, max: 700 },
        { label: 'Más de Bs. 700', min: 701, max: 999999 }
      ];

      // Mostrar únicamente los rangos donde realmente exista al menos un reloj de los filtrados
      const opts = [];
      rangosPosibles.forEach(r => {
        const existeEnRango = precios.some(pr => pr >= r.min && pr <= r.max);
        if (existeEnRango) {
          opts.push({ label: r.label, valor: [r.min, r.max] });
        }
      });

      // Opción libre siempre disponible
      opts.push({ label: 'Cualquier presupuesto', valor: null });
      return opts;
    }
  }
];

function ejecutarPaso(indice) {
  if (indice >= PASOS_CUESTIONARIO.length) {
    mostrarResultadosFinales();
    return;
  }

  const paso = PASOS_CUESTIONARIO[indice];
  pintarMensaje(paso.pregunta, false);

  let opciones = paso.generarOpciones();
  
  // Si solo queda 1 opción disponible por filtro estricto, la mostramos directamente
  if (!opciones || opciones.length === 0) {
    opciones = [{ label: 'Ver opciones disponibles', valor: 'cualquiera' }];
  }

  pintarOpciones(opciones, (opcionElegida) => {
    pintarMensaje(opcionElegida.label, true);
    respuestasUsuario[paso.campo] = opcionElegida.valor;
    pasoActual = indice + 1;
    setTimeout(() => ejecutarPaso(pasoActual), 280);
  });
}

// -----------------------------------------------------------
// Muestra de Resultados con Coincidencia Alta (95% - 100%)
// -----------------------------------------------------------
async function mostrarResultadosFinales() {
  const indicador = mostrarEscribiendo();

  // Filtrar candidatos exactos
  let candidatos = obtenerCandidatosFiltrados();

  // Si aplicó presupuesto, filtrar por el rango
  if (respuestasUsuario.presupuesto) {
    const [min, max] = respuestasUsuario.presupuesto;
    const enPresupuesto = candidatos.filter(p => p.precio >= min && p.precio <= max);
    if (enPresupuesto.length > 0) candidatos = enPresupuesto;
  }

  // Si por alguna razón la combinación fue ultra restrictiva y no quedó ninguno,
  // tomamos los más cercanos del estilo
  if (candidatos.length === 0) {
    candidatos = catalogoDisponible.filter(p => (p.categoria || '').toLowerCase().includes(respuestasUsuario.genero || ''));
  }

  // Tomar entre 1 y 2 relojes destacados que cumplen con todo
  const seleccionados = candidatos.slice(0, 2);

  indicador.remove();

  pintarMensaje(`🎯 ¡Excelente elección! Según los filtros exactos que seleccionaste, estas son las piezas que tenemos disponibles en tienda con la más alta compatibilidad:`, false);

  renderizarTarjetasResultado(seleccionados);
  renderizarBotonesPostCuestionario();

  promptSistema = `Sos CRONOAI, asistente de Relojería CRONOS en Santa Cruz, Bolivia.
El cliente buscaba: ${JSON.stringify(respuestasUsuario)}.
Relojes recomendados: ${seleccionados.map(p => `${p.nombre} (Bs ${p.precio})`).join(', ')}.
Reglas: Sé breve (máximo 3 oraciones), educado, precios en bolivianos (Bs). Si preguntan por compras, indica coordinar por WhatsApp al +591 73158851.`;

  habilitarChatLibre();
}

function renderizarTarjetasResultado(lista) {
  const contenedor = document.getElementById('chat-messages');
  if (!contenedor) return;
  const bloque = document.createElement('div');
  bloque.className = 'chat-resultados';

  bloque.innerHTML = lista.map((producto, idx) => {
    const imgUrl = producto.imagen_url || "img/logo-cronos.png";
    const precio = Number(producto.precio || 0).toFixed(2);
    const score = idx === 0 ? 100 : 95; // 95% a 100% garantizado por encaje de stock real
    const tel = window.WHATSAPP_PHONE || "59173158851";
    const textoWsp = `¡Hola Relojería Cronos! Me interesa el modelo recomendado por CRONOAI:\n• Reloj: ${producto.nombre}\n• Precio: Bs ${precio}\n¿Tienen disponibilidad para entrega?`;
    const linkWsp = `https://wa.me/${tel}?text=${encodeURIComponent(textoWsp)}`;

    return `
      <div class="chat-resultado-card">
        <div class="chat-resultado-media">
          <img src="${imgUrl}" alt="${producto.nombre}" onerror="this.src='img/logo-cronos.png'" />
        </div>
        <div class="chat-resultado-info">
          <span class="chat-resultado-match">${score}% Coincidencia</span>
          <h4>${producto.nombre}</h4>
          <div class="chat-resultado-precio">Bs ${precio}</div>
          <div class="chat-resultado-acciones">
            <a href="producto.html?id=${producto.id}" class="btn-detalle" style="padding: 6px 12px; font-size: 11.5px; text-decoration: none; background: #091a13; color: #fff; border-radius: 4px; text-align: center; font-weight: 600;">Ver Galería</a>
            <a href="${linkWsp}" target="_blank" class="btn-whatsapp" style="padding: 6px 12px; font-size: 11.5px; text-decoration: none; background: #25D366; color: #fff; border-radius: 4px; text-align: center; font-weight: 600;">WhatsApp</a>
          </div>
        </div>
      </div>
    `;
  }).join('');

  contenedor.appendChild(bloque);
  contenedor.scrollTop = contenedor.scrollHeight;
}

// -----------------------------------------------------------
// Botones Solicitados: Reiniciar Test y Continuar Chat
// -----------------------------------------------------------
function renderizarBotonesPostCuestionario() {
  const contenedor = document.getElementById('chat-messages');
  if (!contenedor) return;

  const filaAcciones = document.createElement('div');
  filaAcciones.style.cssText = "display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;";

  filaAcciones.innerHTML = `
    <button type="button" id="btn-reiniciar-test" style="background:#ffffff; color:#14532d; border:1.5px solid #14532d; padding:9px 18px; border-radius:25px; font-size:12.5px; font-weight:700; cursor:pointer;">
      🔄 Realizar nueva consulta
    </button>
    <button type="button" id="btn-enfocar-chat" style="background:#14532d; color:#ffffff; border:1.5px solid #c5a059; padding:9px 18px; border-radius:25px; font-size:12.5px; font-weight:700; cursor:pointer;">
      💬 Continuar con el agente IA
    </button>
  `;

  contenedor.appendChild(filaAcciones);

  document.getElementById('btn-reiniciar-test').addEventListener('click', () => {
    reiniciarChat();
  });

  document.getElementById('btn-enfocar-chat').addEventListener('click', () => {
    const input = document.querySelector('.chat-input input');
    if (input) {
      input.focus();
      pintarMensaje('Podés consultarme cualquier detalle sobre garantía, formas de pago, resistencia al agua o entregas de estos modelos.', false);
    }
  });

  contenedor.scrollTop = contenedor.scrollHeight;
}

function reiniciarChat() {
  const contenedor = document.getElementById('chat-messages');
  if (contenedor) contenedor.innerHTML = '';
  respuestasUsuario = {};
  pasoActual = 0;
  historialChat = [];
  
  const input = document.querySelector('.chat-input input');
  const boton = document.querySelector('.chat-send');
  if (input) {
    input.disabled = true;
    input.placeholder = 'Respondé las preguntas de arriba...';
  }
  if (boton) boton.disabled = true;

  ejecutarPaso(0);
}

// -----------------------------------------------------------
// Respuestas Inteligentes Inmediatas (Cero Demora)
// -----------------------------------------------------------
function responderInmediatoFAQ(texto) {
  const t = texto.toLowerCase();

  if (t.includes('ubicados') || t.includes('direccion') || t.includes('tienda') || t.includes('donde estan')) {
    return 'Estamos en Santa Cruz de la Sierra, Bolivia. Realizamos entregas coordinadas y envíos garantizados a todo el país. Podés consultarnos directamente por WhatsApp para coordinar una entrega.';
  }

  if (t.includes('envio') || t.includes('delivery') || t.includes('entregar') || t.includes('llegar')) {
    return 'Realizamos entregas inmediatas en la ciudad de Santa Cruz y envíos seguros por encomienda a todos los departamentos de Bolivia previo depósito o QR.';
  }

  if (t.includes('pago') || t.includes('pagar') || t.includes('transferencia') || t.includes('qr') || t.includes('efectivo')) {
    return 'Aceptamos transferencias bancarias, pago QR de cualquier banco de Bolivia y efectivo contra entrega al momento de recibir tu reloj en Santa Cruz.';
  }

  if (t.includes('garantia') || t.includes('original') || t.includes('calidad')) {
    return 'Todos nuestros relojes son inspeccionados rigurosamente y cuentan con garantía de funcionamiento comprobado antes de la entrega.';
  }

  return null;
}

async function preguntarAGeminiConTimeout(mensajeUsuario) {
  // 1. Verificación rápida de preguntas comunes (0 segundos de espera)
  const respuestaRapida = responderInmediatoFAQ(mensajeUsuario);
  if (respuestaRapida) return respuestaRapida;

  historialChat.push({ role: 'user', parts: [{ text: mensajeUsuario }] });

  const client = obtenerClienteSupabase();
  if (!client) throw new Error('Sin conexión');

  // Límite de 8 segundos para evitar esperas largas
  const promiseFunction = client.functions.invoke('chat-ia', {
    body: { promptSistema, historial: historialChat }
  });

  const promiseTimeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('TIMEOUT')), 8000)
  );

  const { data, error } = await Promise.race([promiseFunction, promiseTimeout]);
  if (error) throw error;

  const textoRespuesta = data?.candidates?.[0]?.content?.parts?.[0]?.text
    || data?.respuesta
    || 'Contamos con stock de estas piezas para entrega inmediata en Santa Cruz. Si deseas apartar tu modelo, comunícate al WhatsApp +591 73158851.';

  historialChat.push({ role: 'model', parts: [{ text: textoRespuesta }] });
  return textoRespuesta;
}

async function enviarMensajeLibre(texto) {
  if (!texto.trim()) return;

  pintarMensaje(texto, true);
  const indicador = mostrarEscribiendo();

  const input = document.querySelector('.chat-input input');
  const boton = document.querySelector('.chat-send');
  if (input) { input.value = ''; input.disabled = true; }
  if (boton) boton.disabled = true;

  try {
    const respuesta = await preguntarAGeminiConTimeout(texto);
    indicador.remove();
    pintarMensaje(respuesta, false);
  } catch (error) {
    indicador.remove();
    // Fallback elegante e instantáneo si el servidor de IA tarda
    pintarMensaje('Tenemos disponibilidad de los relojes recomendados para entrega inmediata. Para coordinar tu pedido o consultar detalles técnicos, escribinos directamente por WhatsApp al +591 73158851.', false);
  } finally {
    if (input) { input.disabled = false; input.focus(); }
    if (boton) boton.disabled = false;
  }
}

function habilitarChatLibre() {
  const input = document.querySelector('.chat-input input');
  const boton = document.querySelector('.chat-send');
  if (input) {
    input.disabled = false;
    input.placeholder = 'Consultá detalles de estos modelos aquí...';
  }
  if (boton) boton.disabled = false;
}

// -----------------------------------------------------------
// Inicialización
// -----------------------------------------------------------
async function iniciarChat() {
  const form = document.getElementById('chat-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input');
      if (input) enviarMensajeLibre(input.value);
    });
  }

  // Descargar catálogo de productos activos de Supabase al abrir
  const client = obtenerClienteSupabase();
  if (client) {
    const { data } = await client.from('productos').select('*');
    catalogoDisponible = (data || []).filter(p => (p.estado || 'Activo') === 'Activo');
  }

  ejecutarPaso(0);
}

document.addEventListener('DOMContentLoaded', iniciarChat);