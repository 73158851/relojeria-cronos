/* =========================================================
   chat-ia.js - CRONOAI con Cuestionario Dinámico y Gemini
   ========================================================= */

window.CUSTOM_GEMINI_API_KEY = ""; 

// -----------------------------------------------------------
// Configuración dinámica del cuestionario (6 preguntas)
// -----------------------------------------------------------
const PREGUNTAS_BASE = [
  {
    id: 'genero',
    texto: '¡Hola! 👋 Soy CRONOAI. Respondé estas 6 preguntas y te recomiendo el reloj ideal.\n\n1/6 ¿Para quién buscás el reloj?',
    obtenerOpciones: () => [
      { label: 'Varón', valor: 'hombre' },
      { label: 'Mujer', valor: 'mujer' },
      { label: 'Unisex', valor: 'unisex' },
    ],
  },
  {
    id: 'estilo',
    texto: '2/6 ¿Qué estilo de reloj buscás?',
    obtenerOpciones: () => [
      { label: 'Deportivo', valor: 'Deportivo' },
      { label: 'Elegante', valor: 'Elegante' },
      { label: 'Clásico', valor: 'Clásico' },
      { label: 'De vestir', valor: 'De vestir' },
    ],
  },
  {
    id: 'tipoCorrea',
    texto: '3/6 ¿Qué tipo de correa preferís?',
    obtenerOpciones: (respuestas) => {
      // Si eligió estilo deportivo, la opción lógica principal es Goma
      if (respuestas.estilo === 'Deportivo') {
        return [
          { label: 'Goma / Silicona', valor: 'Goma' },
          { label: 'Metal', valor: 'Metal' },
          { label: 'Cuero', valor: 'Cuero' },
        ];
      }
      return [
        { label: 'Metal', valor: 'Metal' },
        { label: 'Cuero', valor: 'Cuero' },
        { label: 'Goma', valor: 'Goma' },
      ];
    },
  },
  {
    id: 'colorCorrea',
    texto: '4/6 ¿Qué color de correa preferís?',
    obtenerOpciones: (respuestas) => {
      const tipo = respuestas.tipoCorrea || 'Metal';
      if (tipo === 'Goma') {
        return [
          { label: 'Negro', valor: 'Negro' },
          { label: 'Verde', valor: 'Verde' },
          { label: 'Naranja', valor: 'Naranja' },
          { label: 'Azul', valor: 'Azul' },
          { label: 'Rojo', valor: 'Rojo' },
          { label: 'Rosado', valor: 'Rosado' },
        ];
      }
      if (tipo === 'Cuero') {
        return [
          { label: 'Marrón', valor: 'Marrón' },
          { label: 'Negro', valor: 'Negro' },
          { label: 'Azul', valor: 'Azul' },
          { label: 'Verde', valor: 'Verde' },
        ];
      }
      // Metal
      return [
        { label: 'Plateado', valor: 'Plateado' },
        { label: 'Dorado', valor: 'Dorado' },
        { label: 'Negro', valor: 'Negro' },
      ];
    },
  },
  {
    id: 'esfera',
    texto: '5/6 ¿Qué diseño de esfera preferís?',
    obtenerOpciones: () => [
      { label: 'Cronógrafo', valor: 'Cronógrafo' },
      { label: 'Con números', valor: 'Con números' },
      { label: 'Con detalles decorativos', valor: 'Con detalles' },
    ],
  },
  {
    id: 'presupuesto',
    texto: '6/6 ¿Cuál es tu presupuesto aproximado?',
    obtenerOpciones: () => [
      { label: 'Bs. 100 - 300', valor: [100, 300] },
      { label: 'Bs. 301 - 600', valor: [301, 600] },
      { label: 'Bs. 601 - 900', valor: [601, 900] },
      { label: 'Más de Bs. 900', valor: [901, Infinity] },
      { label: 'Me es indiferente', valor: null },
    ],
  },
];

let indicePregunta = 0;
let respuestasUsuario = {};
let historialChat = [];
let promptSistema = '';

function obtenerClienteSupabase() {
  if (typeof supabaseClient !== "undefined") return supabaseClient;
  if (window._supabase) return window._supabase;
  if (typeof supabase !== "undefined" && typeof supabase.functions !== "undefined") return supabase;
  if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    const create = window.supabase?.createClient || createClient;
    return create(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  }
  return null;
}

// -----------------------------------------------------------
// Renderizado de mensajes y botones
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
  const burbuja = pintarMensaje('Escribiendo...', false);
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
// Flujo del cuestionario interactivo
// -----------------------------------------------------------
function hacerPregunta(indice) {
  if (indice >= PREGUNTAS_BASE.length) {
    mostrarResultados();
    return;
  }

  const pregunta = PREGUNTAS_BASE[indice];
  pintarMensaje(pregunta.texto, false);

  const opciones = pregunta.obtenerOpciones(respuestasUsuario);

  pintarOpciones(opciones, (opcionElegida) => {
    pintarMensaje(opcionElegida.label, true);
    respuestasUsuario[pregunta.id] = opcionElegida.valor;
    indicePregunta = indice + 1;
    setTimeout(() => hacerPregunta(indicePregunta), 300);
  });
}

// -----------------------------------------------------------
// Cálculo de afinidad lógica de los relojes
// -----------------------------------------------------------
function normalizar(texto) {
  return (texto || '').toString().toLowerCase().trim();
}

function calcularCoincidencia(producto, respuestas) {
  let puntos = 0;

  // 1. Género (20 pts)
  const catProd = normalizar(producto.categoria);
  const genResp = normalizar(respuestas.genero);
  if (catProd === 'unisex' || catProd === genResp) puntos += 20;

  // 2. Estilo (25 pts)
  const estiloProd = normalizar(producto.estilo);
  const estiloResp = normalizar(respuestas.estilo);
  if (estiloProd === estiloResp) {
    puntos += 25;
  } else if (estiloResp === 'deportivo' && (normalizar(producto.nombre).includes('deportivo') || normalizar(producto.tipo_correa).includes('goma') || normalizar(producto.tipo_correa).includes('silicona'))) {
    puntos += 20;
  }

  // 3. Tipo de correa (20 pts)
  const correaProd = normalizar(producto.tipo_correa);
  const correaResp = normalizar(respuestas.tipoCorrea);
  if (correaResp === 'goma' && (correaProd.includes('goma') || correaProd.includes('silicona'))) {
    puntos += 20;
  } else if (correaProd.includes(correaResp)) {
    puntos += 20;
  }

  // 4. Color de correa (15 pts)
  const colorProd = normalizar(producto.color_correa);
  const colorResp = normalizar(respuestas.colorCorrea);
  if (colorProd.includes(colorResp) || colorResp.includes(colorProd)) {
    puntos += 15;
  }

  // 5. Diseño de esfera (10 pts)
  const esferaProd = normalizar(producto.diseno_esfera);
  const esferaResp = normalizar(respuestas.esfera);
  if (esferaProd.includes(esferaResp) || esferaResp.includes(esferaProd)) {
    puntos += 10;
  }

  // 6. Presupuesto (10 pts)
  const rango = respuestas.presupuesto;
  const precio = Number(producto.precio || 0);
  if (!rango || (precio >= rango[0] && precio <= rango[1])) {
    puntos += 10;
  }

  return Math.min(puntos, 100);
}

async function mostrarResultados() {
  const indicador = mostrarEscribiendo();
  
  let productos = [];
  if (typeof window.obtenerProductos === 'function') {
    productos = await window.obtenerProductos();
  } else {
    const client = obtenerClienteSupabase();
    if (client) {
      const { data } = await client.from('productos').select('*');
      productos = data || [];
    }
  }

  indicador.remove();

  const rango = respuestasUsuario.presupuesto;
  let candidatos = productos.filter(p => (p.estado || 'Activo') === 'Activo');

  let filtradosPresupuesto = candidatos;
  if (rango) {
    const enRango = candidatos.filter((p) => p.precio >= rango[0] && p.precio <= rango[1]);
    if (enRango.length > 0) {
      filtradosPresupuesto = enRango;
    }
  }

  const puntuados = filtradosPresupuesto
    .map((producto) => ({ producto, score: calcularCoincidencia(producto, respuestasUsuario) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  pintarMensaje('¡Listo! Estos son los relojes que mejor coinciden con tus preferencias:', false);
  pintarResultados(puntuados);
  pintarMensaje('¿Tenés alguna otra duda o consulta sobre estas piezas? Podés seguir escribiéndome aquí abajo.', false);

  promptSistema = await construirPromptSistema(puntuados);
  habilitarChatLibre();
}

function pintarResultados(puntuados) {
  const contenedor = document.getElementById('chat-messages');
  if (!contenedor) return;
  const bloque = document.createElement('div');
  bloque.className = 'chat-resultados';

  bloque.innerHTML = puntuados.map(({ producto, score }) => {
    const imgUrl = producto.imagen_url || "img/logo-cronos.png";
    const precioFormateado = Number(producto.precio || 0).toFixed(2);
    const tel = window.WHATSAPP_PHONE || "59173158851";
    const texto = "¡Hola Relojería Cronos! Me interesa el modelo recomendado por CRONOAI:\n\n" +
                  "• Pieza: " + producto.nombre + "\n" +
                  "• Precio: Bs " + precioFormateado + "\n\n" +
                  "¿Tienen disponibilidad?";
    const linkWhatsApp = "https://wa.me/" + tel + "?text=" + encodeURIComponent(texto);

    return `
      <div class="chat-resultado-card">
        <div class="chat-resultado-media">
          <img src="${imgUrl}" alt="${producto.nombre}" onerror="this.src='img/logo-cronos.png'" />
        </div>
        <div class="chat-resultado-info">
          <span class="chat-resultado-match">${score > 0 ? score + '% Coincidencia' : 'Recomendado'}</span>
          <h4>${producto.nombre}</h4>
          <div class="chat-resultado-precio">Bs ${precioFormateado}</div>
          <div class="chat-resultado-acciones">
            <a href="producto.html?id=${producto.id}" class="btn-detalle" style="padding: 8px 12px; font-size: 12px; text-decoration: none; background: #111; color: #fff; border-radius: 4px; text-align: center; font-weight: 600;">Ver Galería</a>
            <a href="${linkWhatsApp}" target="_blank" class="btn-whatsapp" style="padding: 8px 12px; font-size: 12px; text-decoration: none; background: #25D366; color: #fff; border-radius: 4px; text-align: center; font-weight: 600;">WhatsApp</a>
          </div>
        </div>
      </div>
    `;
  }).join('');

  contenedor.appendChild(bloque);
  contenedor.scrollTop = contenedor.scrollHeight;
}

// -----------------------------------------------------------
// Conexión libre con Gemini vía Edge Function
// -----------------------------------------------------------
async function construirPromptSistema(puntuados) {
  let productos = [];
  const client = obtenerClienteSupabase();
  if (client) {
    const { data } = await client.from('productos').select('*');
    productos = data || [];
  }

  const listaProductos = productos
    .map((p) => `- ${p.nombre} | ${p.categoria} | Bs ${p.precio} | Estilo: ${p.estilo || ''} | Correa: ${p.tipo_correa || ''} ${p.color_correa || ''} | Esfera: ${p.diseno_esfera || ''}`)
    .join('\n');

  const resumenRecomendados = puntuados
    .map(({ producto, score }) => `- ${producto.nombre} (Bs ${producto.precio}, ${score}% de coincidencia)`)
    .join('\n');

  return `Sos el asesor virtual CRONOAI de Relojería Cronos en Bolivia.
El cliente respondió el cuestionario de preferencias:
${JSON.stringify(respuestasUsuario)}

Recomendaciones mostradas:
${resumenRecomendados}

Catálogo disponible:
${listaProductos}

Instrucciones:
- Tono amable, cortés, elegante y conciso (máximo 3 o 4 oraciones).
- Precios siempre en bolivianos (Bs).
- Solo responde sobre relojes reales de este catálogo.
- Si preguntan por compras o envíos, recuérdales que coordinan de inmediato por WhatsApp.`;
}

async function preguntarAGemini(mensajeUsuario) {
  historialChat.push({ role: 'user', parts: [{ text: mensajeUsuario }] });

  const client = obtenerClienteSupabase();
  if (!client) throw new Error('No se pudo establecer conexión.');

  const bodyPayload = { 
    promptSistema, 
    historial: historialChat,
    apiKey: window.CUSTOM_GEMINI_API_KEY || undefined
  };

  const { data, error } = await client.functions.invoke('chat-ia', {
    body: bodyPayload,
  });

  if (error) {
    console.error('Error Edge Function:', error);
    throw new Error('No se pudo contactar al asesor. Intenta de nuevo en un momento.');
  }

  const textoRespuesta = data?.candidates?.[0]?.content?.parts?.[0]?.text
    || data?.respuesta
    || 'Disculpa, no pude procesar esa consulta. ¿Podrías reformularla?';

  historialChat.push({ role: 'model', parts: [{ text: textoRespuesta }] });
  return textoRespuesta;
}

async function enviarMensajeLibre(texto) {
  if (!texto.trim()) return;

  pintarMensaje(texto, true);
  const indicador = mostrarEscribiendo();

  const input = document.querySelector('.chat-input input');
  const boton = document.querySelector('.chat-send');
  if (input) input.value = '';
  if (input) input.disabled = true;
  if (boton) boton.disabled = true;

  try {
    const respuesta = await preguntarAGemini(texto);
    indicador.remove();
    pintarMensaje(respuesta, false);
  } catch (error) {
    indicador.remove();
    pintarMensaje(error.message, false);
  } finally {
    if (input) input.disabled = false;
    if (boton) boton.disabled = false;
    if (input) input.focus();
  }
}

function habilitarChatLibre() {
  const input = document.querySelector('.chat-input input');
  const boton = document.querySelector('.chat-send');
  if (input) input.disabled = false;
  if (boton) boton.disabled = false;
  if (input) input.placeholder = 'Escribe tu consulta aquí...';
  if (input) input.focus();
}

function iniciarChat() {
  const form = document.getElementById('chat-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input');
    if (input) enviarMensajeLibre(input.value);
  });

  hacerPregunta(0);
}

document.addEventListener('DOMContentLoaded', iniciarChat);