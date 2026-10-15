// js/detalle-producto.js

document.addEventListener("DOMContentLoaded", async () => {
  const mainImg = document.getElementById("main-gallery-img");
  const thumbsTrack = document.getElementById("thumbnails-track");
  const btnPrev = document.getElementById("btn-prev-img");
  const btnNext = document.getElementById("btn-next-img");
  const btnZoom = document.getElementById("btn-open-zoom");

  const lightboxModal = document.getElementById("lightbox-modal");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxClose = document.getElementById("lightbox-close");

  const breadMarca = document.getElementById("bread-marca");
  const breadModelo = document.getElementById("bread-modelo");
  const elMarca = document.getElementById("producto-marca");
  const elNombre = document.getElementById("producto-nombre");
  const elDescripcion = document.getElementById("producto-descripcion");
  const elPrecio = document.getElementById("producto-precio");
  const elPrecioAnt = document.getElementById("producto-precio-anterior");
  const badgeStock = document.getElementById("badge-stock");

  const specMarca = document.getElementById("spec-marca");
  const specModelo = document.getElementById("spec-modelo");
  const specStock = document.getElementById("spec-stock");
  const specEstado = document.getElementById("spec-estado");

  const btnWhatsapp = document.getElementById("btn-whatsapp-comprar");
  const btnFav = document.getElementById("btn-fav-toggle");

  const urlParams = new URLSearchParams(window.location.search);
  const productoId = urlParams.get("id");

  if (!productoId) {
    if (elNombre) elNombre.textContent = "Producto no seleccionado";
    return;
  }

  let client = null;
  if (typeof supabaseClient !== "undefined") client = supabaseClient;
  else if (window._supabase) client = window._supabase;
  else if (typeof supabase !== "undefined" && typeof supabase.from === "function") client = supabase;

  if (!client) {
    console.error("Cliente Supabase no disponible.");
    return;
  }

  let galeriaFotos = [];
  let indiceFotoActual = 0;

  function actualizarImagenActiva(index) {
    if (galeriaFotos.length === 0) return;
    if (index < 0) index = galeriaFotos.length - 1;
    if (index >= galeriaFotos.length) index = 0;

    indiceFotoActual = index;
    mainImg.src = galeriaFotos[indiceFotoActual];

    const todosThumbs = thumbsTrack.querySelectorAll(".thumb-item");
    todosThumbs.forEach((t, idx) => {
      t.classList.toggle("active", idx === indiceFotoActual);
    });
  }

  function renderizarMiniaturas() {
    if (!thumbsTrack) return;
    thumbsTrack.innerHTML = galeriaFotos.map((url, idx) => `
      <div class="thumb-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}">
        <img src="${url}" alt="Ángulo ${idx + 1}" onerror="this.src='img/logo-cronos.png'">
      </div>
    `).join("");

    thumbsTrack.querySelectorAll(".thumb-item").forEach(item => {
      item.addEventListener("click", () => {
        const idx = parseInt(item.getAttribute("data-idx"), 10);
        actualizarImagenActiva(idx);
      });
    });
  }

  try {
    const { data: producto, error } = await client
      .from("productos")
      .select("*")
      .eq("id", productoId)
      .single();

    if (error || !producto) {
      if (elNombre) elNombre.textContent = "Reloj no encontrado";
      return;
    }

    const nombre = producto.nombre || "Reloj Cronos";
    const marca = (producto.marca || "CRONOS").toUpperCase();
    const modelo = producto.modelo || nombre;
    const precio = Number(producto.precio || 0);
    const precioFormateado = precio.toFixed(2);
    const precioAnterior = (precio * 1.25).toFixed(2);
    const stock = producto.stock ?? 10;
    const estado = producto.estado || "Activo";
    const descripcion = producto.descripcion || "Reloj analógico de diseño clásico y elegante, fabricado con materiales de alta resistencia y precisión garantizada.";

    // Rellenar textos y especificaciones
    if (breadMarca) breadMarca.textContent = marca;
    if (breadModelo) breadModelo.textContent = modelo;
    if (elMarca) elMarca.textContent = marca;
    if (elNombre) elNombre.textContent = modelo !== nombre ? `${nombre}` : nombre;
    if (elDescripcion) elDescripcion.textContent = descripcion;
    if (elPrecio) elPrecio.textContent = precioFormateado;
    if (elPrecioAnt) elPrecioAnt.textContent = "Bs " + precioAnterior;

    if (specMarca) specMarca.textContent = marca;
    if (specModelo) specModelo.textContent = modelo;
    if (specStock) specStock.textContent = `${stock} unidades`;
    if (specEstado) specEstado.textContent = estado === "Activo" ? "🟢 Activo" : "⚪ Inactivo";

    if (badgeStock) {
      if (stock > 0) {
        badgeStock.textContent = "● En stock";
        badgeStock.classList.remove("agotado");
      } else {
        badgeStock.textContent = "● Agotado";
        badgeStock.classList.add("agotado");
      }
    }

    // Construir arreglo de fotos (Principal + Adicionales)
    const principal = producto.imagen_url || "img/logo-cronos.png";
    const adicionales = Array.isArray(producto.imagenes_adicionales) 
      ? producto.imagenes_adicionales.filter(Boolean) 
      : [];

    galeriaFotos = [principal, ...adicionales];
    renderizarMiniaturas();
    actualizarImagenActiva(0);

    // Enlace limpio a WhatsApp
    if (btnWhatsapp) {
      const tel = window.WHATSAPP_PHONE || "59173158851";
      const textoFinal = "¡Hola Relojería Cronos! Estoy interesado en adquirir el siguiente reloj:\n\n" +
                         "• Marca: " + marca + "\n" +
                         "• Pieza: " + nombre + " (" + modelo + ")\n" +
                         "• Precio: Bs " + precioFormateado + "\n\n" +
                         "¿Tienen disponibilidad para coordinar la entrega?";
      btnWhatsapp.href = "https://wa.me/" + tel + "?text=" + encodeURIComponent(textoFinal);
    }

  } catch (err) {
    console.error("Error al cargar detalle del reloj:", err);
  }

  // Eventos de navegación de la galería
  if (btnPrev) btnPrev.addEventListener("click", () => actualizarImagenActiva(indiceFotoActual - 1));
  if (btnNext) btnNext.addEventListener("click", () => actualizarImagenActiva(indiceFotoActual + 1));

  // Eventos de Zoom / Lightbox
  function abrirZoom() {
    if (!lightboxModal || !lightboxImg) return;
    lightboxImg.src = galeriaFotos[indiceFotoActual] || mainImg.src;
    lightboxModal.classList.add("open");
  }

  if (btnZoom) btnZoom.addEventListener("click", abrirZoom);
  if (mainImg) mainImg.addEventListener("click", abrirZoom);
  if (lightboxClose) lightboxClose.addEventListener("click", () => lightboxModal.classList.remove("open"));
  if (lightboxModal) {
    lightboxModal.addEventListener("click", (e) => {
      if (e.target === lightboxModal) lightboxModal.classList.remove("open");
    });
  }

  if (btnFav) {
    btnFav.addEventListener("click", () => {
      btnFav.classList.toggle("active");
      btnFav.textContent = btnFav.classList.contains("active") ? "♥" : "♡";
    });
  }
});