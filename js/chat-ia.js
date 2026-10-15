/* =========================================================
   chat-ia.js - CRONOAI con Cuestionario de 6 preguntas y Gemini
   ========================================================= */

// =========================================================
// ESPACIO PARA CONFIGURACIÓN DE LA API KEY O LLAMADA
// =========================================================
// La conexión con la IA se realiza a través de la Edge Function de Supabase ('chat-ia').
// Asegúrate de tener configurada tu GEMINI_API_KEY en los Secrets de tu proyecto en Supabase.
// Si necesitas pasar una clave de forma directa por código, puedes definirla aquí:
window.CUSTOM_GEMINI_API_KEY = ""; 

// -----------------------------------------------------------
// Banco de preguntas de la pasarela (6 preguntas)
// -----------------------------------------------------------
const PREGUNTAS_CRONOAI = [
  {
    id: 'genero',
    texto: '¡Hola! 👋 Soy CRONOAI. Respondé estas 6 preguntas y te recomiendo el reloj ideal.\n\n1/6 ¿Para quién buscás el reloj?',
    opciones: [
      { label: 'Varón', valor: 'hombre' },
      { label: 'Mujer', valor: 'mujer' },
      { label: 'Unisex', valor: 'unisex' },
    ],
  },
  {
    id: 'estilo',
    texto: '2/6 ¿Qué estilo de reloj buscás?',
    opciones: [
      { label: 'De vestir', valor: 'De vestir' },
      { label: 'Deportivo', valor: 'Deportivo' },
      { label: 'Clásico', valor: 'Clásico' },
      { label: 'Elegante', valor: 'Elegante' },
    ],
  },
  {
    id: 'tipoCorrea',
    texto: '3/6 ¿Qué tipo de correa preferís?',
    opciones: [
      { label: 'Metal', valor: 'Metal' },
      { label: 'Cuero', valor: 'Cuero' },
    ],
  },
  {
    id: 'colorCorrea',
    texto: '4/6 ¿Qué color de correa preferís?',
    opcionesPorCorrea: {
      Metal: [
        { label: 'Dorado', valor: 'Dorado' },
        { label: 'Plateado', valor: 'Plateado' },
        { label: 'Negro', valor: 'Negro' },
      ],
      Cuero: [
        { label: 'Marrón', valor: 'Marrón' },
        { label: 'Negro', valor: 'Negro' },
        { label: 'Azul', valor: 'Azul' },
      ],
    },
  },
  {
    id: 'esfera',
    texto: '5/6 ¿Qué diseño de esfera preferís?',
    opciones: [
      { label: 'Cronógrafo', valor: 'Cronógrafo' },
      { label: 'Con números', valor: 'Con números' },
      { label: 'Con detalles decorativos', valor: 'Con detalles' },
    ],
  },
  {
    id: 'presupuesto',
    texto: '6/6 ¿Cuál es tu presupuesto aproximado?',
    opciones: [
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
// UI: pintar mensajes y opciones
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
// Flujo del cuestionario guiado
// -----------------------------------------------------------
function hacerPregunta(indice) {
  if (indice >= PREGUNTAS_CRONOAI.length) {
    mostrarResultados();
    return;
  }

  const pregunta = PREGUNTAS_CRONOAI[indice];
  pintarMensaje(pregunta.texto, false);

  const opciones = pregunta.opcionesPorCorrea
    ? pregunta.opcionesPorCorrea[respuestasUsuario.tipoCorrea]
    : pregunta.opciones;

  pintarOpciones(opciones, (opcionElegida) => {
    pintarMensaje(opcionElegida.label, true);
    respuestasUsuario[pregunta.id] = opcionElegida.valor;
    indicePregunta = indice + 1;
    setTimeout(() => hacerPregunta(indicePregunta), 350);
  });
}

// -----------------------------------------------------------
// Sistema de puntaje y recomendación de relojes
// -----------------------------------------------------------
function calcularCoincidencia(producto, respuestas) {
  let puntos = 0;

  if (producto.categoria === 'unisex' || producto.categoria === respuestas.genero) puntos += 20;
  if (producto.estilo === respuestas.estilo) puntos += 20;
  if (producto.tipo_correa === respuestas.tipoCorrea) puntos += 20;
  if (producto.color_correa === respuestas.colorCorrea) puntos += 15;
  if (producto.diseno_esfera === respuestas.esfera) puntos += 15;

  const rango = respuestas.presupuesto;
  const dentroDeRango = !rango || (producto.precio >= rango[0] && producto.precio <= rango[1]);
  if (dentroDeRango) puntos += 10;

  return puntos;
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
  let candidatos = productos;
  let dentroDePresupuesto = true;

  if (rango) {
    const filtrados = productos.filter((p) => p.precio >= rango[0] && p.precio <= rango[1]);
    if (filtrados.length > 0) {
      candidatos = filtrados;
    } else {
      dentroDePresupuesto = false;
    }
  }

  const puntuados = candidatos
    .map((producto) => ({ producto, score: calcularCoincidencia(producto, respuestasUsuario) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (!dentroDePresupuesto) {
    pintarMensaje('No tenemos relojes disponibles en ese rango exacto, pero estas piezas se acercan bastante a tus gustos:', false);
  } else {
    pintarMensaje('¡Listo! Estos son los relojes que mejor coinciden con tus preferencias:', false);
  }

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
            <a href="producto.html?id=${producto.id}" class="btn-detalle" style="padding: 7px 12px; font-size: 12px; text-decoration: none; background: #111; color: #fff; border-radius: 4px; text-align: center; font-weight: 600;">Ver Galería</a>
            <a href="${linkWhatsApp}" target="_blank" class="btn-whatsapp" style="padding: 7px 12px; font-size: 12px; text-decoration: none; background: #25D366; color: #fff; border-radius: 4px; text-align: center; font-weight: 600;">WhatsApp</a>
          </div>
        </div>
      </div>
    `;
  }).join('');

  contenedor.appendChild(bloque);
  contenedor.scrollTop = contenedor.scrollHeight;
}

// -----------------------------------------------------------
// Conexión con el Agente de IA (Gemini vía Supabase Edge Function)
// -----------------------------------------------------------
async function construirPromptSistema(puntuados) {
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

  const listaProductos = productos
    .map((p) => `- ${p.nombre} | ${p.categoria} | Bs ${p.precio} | ${p.estilo || ''} | correa ${p.tipo_correa || ''} ${p.color_correa || ''} | esfera ${p.diseno_esfera || ''}`)
    .join('\n');

  const resumenRecomendados = puntuados
    .map(({ producto, score }) => `- ${producto.nombre} (Bs ${producto.precio}, ${score}% de coincidencia)`)
    .join('\n');

  return `Sos el asesor virtual CRONOAI de Cronos, una relojería exclusiva en Bolivia que vende relojes y atiende por WhatsApp.

El cliente ya respondió un cuestionario de preferencias:
${JSON.stringify(respuestasUsuario)}

Y ya le mostraste estas recomendaciones:
${resumenRecomendados}

Este es el catálogo completo disponible:
${listaProductos}

Reglas importantes:
- Respondé en español con tono amable, elegante y profesional.
- Moneda: siempre en bolivianos (Bs).
- Respuestas cortas: máximo 3 o 4 oraciones.
- Solo recomendá productos existentes en el catálogo; nunca inventes modelos ni precios.
- Si piden algo distinto a lo recomendado, busca en la lista de arriba y sugiere piezas por su nombre exacto.
- Si consultan sobre compras o envíos, recuérdales que pueden coordinar directamente por WhatsApp.`;
}

async function preguntarAGemini(mensajeUsuario) {
  historialChat.push({ role: 'user', parts: [{ text: mensajeUsuario }] });

  const client = obtenerClienteSupabase();
  if (!client) {
    throw new Error('No se pudo establecer conexión con el servidor.');
  }

  // Preparamos el cuerpo de la petición incluyendo la API Key personalizada si se rellenó arriba
  const bodyPayload = { 
    promptSistema, 
    historial: historialChat,
    apiKey: window.CUSTOM_GEMINI_API_KEY || undefined
  };

  const { data, error } = await client.functions.invoke('chat-ia', {
    body: bodyPayload,
  });

  if (error) {
    console.error('Error llamando a la función:', error);
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

// -----------------------------------------------------------
// Inicialización del Chat IA
// -----------------------------------------------------------
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