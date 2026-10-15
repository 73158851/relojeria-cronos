// js/productos.js

window.obtenerProductos = async function() {
  let client = null;
  if (typeof supabaseClient !== "undefined") client = supabaseClient;
  else if (window._supabase) client = window._supabase;
  else if (typeof supabase !== "undefined" && typeof supabase.from === "function") client = supabase;

  if (!client) return [];

  try {
    const { data, error } = await client.from("productos").select("*");
    if (error) throw error;
    // Filtramos para que en la tienda pública solo se vean los productos Activos
    return (data || []).filter(p => (p.estado || "Activo") !== "Inactivo");
  } catch (err) {
    console.error("Error al obtener productos:", err);
    return [];
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("product-grid");
  if (!grid) return;

  const esInicio = grid.getAttribute("data-destacados") === "true";
  const todosLosProductos = await window.obtenerProductos();

  // 1. Renderizado Hero Banners para index.html
  function renderDestacadosHero(lista) {
    // Prioriza los marcados con el check "Destacar producto", o toma los 3 primeros
    let destacados = lista.filter(p => p.destacado === true);
    if (destacados.length === 0) destacados = lista.slice(0, 3);
    else destacados = destacados.slice(0, 4);

    if (destacados.length === 0) {
      grid.innerHTML = `<p style="text-align: center; color: #888; padding: 40px 0;">No hay piezas destacadas disponibles.</p>`;
      return;
    }

    grid.innerHTML = destacados.map(item => {
      const nombre = item.nombre || "Reloj Cronos";
      const marca = item.marca || item.categoria || "Edición Exclusiva";
      const precio = Number(item.precio || 0).toFixed(2);
      const descripcion = item.descripcion || "Diseño clásico y elegante con acabados de alta precisión.";
      const imagen = item.imagen_url || "img/logo-cronos.png";

      return `
        <article class="product-hero-banner" style="background-image: url('${imagen}');">
          <div class="product-hero-overlay"></div>
          <div class="product-hero-inner">
            <span class="product-hero-category">${marca.toUpperCase()}</span>
            <h3 class="product-hero-title">${nombre}</h3>
            <p class="product-hero-desc">${descripcion}</p>
            
            <div class="product-hero-cta">
              <div class="product-hero-price">
                <span class="price-currency">Bs</span>
                <span class="price-val">${precio}</span>
              </div>
              <a href="producto.html?id=${item.id}" class="btn-hero-order">
                <span>Ver Galería y Detalles</span>
              </a>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  // 2. Renderizado en cuadrícula para catalogo.html
  function renderCatalogoGrid(lista) {
    if (!lista || lista.length === 0) {
      grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #888; padding: 40px 0;">No se encontraron relojes en esta categoría.</p>`;
      return;
    }

    grid.innerHTML = lista.map(item => {
      const nombre = item.nombre || "Reloj Cronos";
      const marca = item.marca || item.categoria || "CRONOS";
      const precio = Number(item.precio || 0).toFixed(2);
      const imagen = item.imagen_url || "img/logo-cronos.png";
      const cantFotos = 1 + (Array.isArray(item.imagenes_adicionales) ? item.imagenes_adicionales.filter(Boolean).length : 0);

      return `
        <article class="product-card">
          <div class="card-badge">📷 ${cantFotos} vistas</div>
          <a href="producto.html?id=${item.id}" class="product-card-media">
            <img src="${imagen}" alt="${nombre}" loading="lazy" class="product-thumb-img" onerror="this.src='img/logo-cronos.png'" />
          </a>
          <div class="product-card-body">
            <span class="product-category">${marca.toUpperCase()}</span>
            <h3 class="product-card-title"><a href="producto.html?id=${item.id}">${nombre}</a></h3>
            <div class="product-card-footer">
              <span class="product-price">Bs ${precio}</span>
              <a href="producto.html?id=${item.id}" class="btn-ver-detalle">Ver Galería</a>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  if (esInicio) {
    renderDestacadosHero(todosLosProductos);
  } else {
    renderCatalogoGrid(todosLosProductos);
  }

  // Filtros en catalogo.html
  const filterTabs = document.querySelectorAll(".filter-tab");
  if (filterTabs.length > 0) {
    filterTabs.forEach(tab => {
      tab.addEventListener("click", () => {
        filterTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        const cat = (tab.getAttribute("data-categoria") || "").toLowerCase().trim();
        if (cat === "todos" || !cat) {
          renderCatalogoGrid(todosLosProductos);
        } else {
          renderCatalogoGrid(todosLosProductos.filter(p => (p.categoria || "").toLowerCase().includes(cat)));
        }
      });
    });
  }
});