// admin/js/dashboard.js

document.addEventListener("DOMContentLoaded", async () => {
  const viewCatalogo = document.getElementById("view-catalogo");
  const viewFormulario = document.getElementById("view-formulario");
  const grid = document.getElementById("admin-products-grid");
  const form = document.getElementById("form-producto");

  const btnNuevo = document.getElementById("btn-nuevo-producto");
  const btnVolver = document.getElementById("btn-volver-catalogo");
  const btnBorrador = document.getElementById("btn-guardar-borrador");
  const btnPublicar = document.getElementById("btn-publicar");

  const inputSearch = document.getElementById("filter-search");
  const globalSearch = document.getElementById("global-search");
  const selectMarca = document.getElementById("filter-marca");
  const selectEstado = document.getElementById("filter-estado");
  const selectOrden = document.getElementById("filter-orden");

  function obtenerSupabase() {
    if (typeof supabaseClient !== "undefined") return supabaseClient;
    if (window._supabase) return window._supabase;
    if (typeof supabase !== "undefined" && typeof supabase.from === "function") return supabase;
    return null;
  }

  const client = obtenerSupabase();
  let inventario = [];
  let paginaActual = 1;
  const itemsPorPagina = 10;

  // Alternar entre vista de cuadrícula y vista de formulario
  function cambiarVista(mostrarFormulario) {
    if (mostrarFormulario) {
      viewCatalogo.classList.remove("active");
      viewFormulario.classList.add("active");
    } else {
      viewFormulario.classList.remove("active");
      viewCatalogo.classList.add("active");
      cargarInventario();
    }
  }

  // Cargar todos los relojes desde Supabase
  async function cargarInventario() {
    if (!client) return;
    grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:40px; color:#64748b;">Cargando inventario...</p>`;

    const { data, error } = await client.from("productos").select("*");
    if (error) {
      console.error("Error al cargar inventario:", error);
      grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:#ef4444;">Error al cargar productos.</p>`;
      return;
    }

    inventario = data || [];
    aplicarFiltrosYRenderizar();
  }

  function aplicarFiltrosYRenderizar() {
    const texto = ((inputSearch?.value || "") + " " + (globalSearch?.value || "")).trim().toLowerCase();
    const marca = selectMarca?.value || "todas";
    const estado = selectEstado?.value || "todos";
    const orden = selectOrden?.value || "recientes";

    let filtrados = inventario.filter(p => {
      const coincideTexto = !texto || 
        (p.nombre || "").toLowerCase().includes(texto) ||
        (p.modelo || "").toLowerCase().includes(texto) ||
        (p.marca || "").toLowerCase().includes(texto);

      const marcaProd = (p.marca || "CRONOS").toUpperCase();
      const coincideMarca = marca === "todas" || marcaProd === marca.toUpperCase();

      const estadoProd = p.estado || "Activo";
      const coincideEstado = estado === "todos" || estadoProd === estado;

      return coincideTexto && coincideMarca && coincideEstado;
    });

    if (orden === "precio-asc") filtrados.sort((a, b) => (a.precio || 0) - (b.precio || 0));
    else if (orden === "precio-desc") filtrados.sort((a, b) => (b.precio || 0) - (a.precio || 0));
    else if (orden === "nombre") filtrados.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    else filtrados.reverse();

    renderizarCuadricula(filtrados);
  }

  function renderizarCuadricula(lista) {
    const infoPag = document.getElementById("pagination-info");
    const controlesPag = document.getElementById("pagination-controls");

    if (lista.length === 0) {
      grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:40px; color:#64748b;">No se encontraron relojes con esos filtros.</p>`;
      if (infoPag) infoPag.textContent = "Mostrando 0 productos";
      if (controlesPag) controlesPag.innerHTML = "";
      return;
    }

    const totalPaginas = Math.ceil(lista.length / itemsPorPagina);
    if (paginaActual > totalPaginas) paginaActual = 1;

    const inicio = (paginaActual - 1) * itemsPorPagina;
    const paginados = lista.slice(inicio, inicio + itemsPorPagina);

    if (infoPag) {
      infoPag.textContent = `Mostrando ${inicio + 1} - ${Math.min(inicio + itemsPorPagina, lista.length)} de ${lista.length} productos`;
    }

    grid.innerHTML = paginados.map(item => {
      const estado = item.estado || "Activo";
      const claseEstado = estado.toLowerCase() === "inactivo" ? "inactivo" : "activo";
      const marca = item.marca || "CRONOS";
      const modelo = item.modelo || item.nombre || "Sin modelo";
      const precio = Number(item.precio || 0).toLocaleString("es-BO", { minimumFractionDigits: 2 });
      const stock = item.stock ?? 10;
      const img = item.imagen_url || "../img/logo-cronos.png";
      const extras = Array.isArray(item.imagenes_adicionales) ? item.imagenes_adicionales.filter(Boolean).length : 0;

      return `
        <article class="admin-prod-card">
          <div class="card-top-Thumb">
            <span class="status-pill ${claseEstado}">${estado}</span>
            <img src="${img}" alt="${item.nombre}" onerror="this.src='../img/logo-cronos.png'">
            <span class="angles-count-badge">📷 ${1 + extras} fotos</span>
          </div>
          <span class="card-brand">${marca}</span>
          <h4 class="card-model-name" title="${item.nombre}">${modelo}</h4>
          <div class="card-price-val">Bs ${precio}</div>
          <div class="card-stock-val">Stock: ${stock}</div>
          <div class="card-actions-row">
            <button type="button" class="btn-card-edit" onclick="editarProducto('${item.id}')">
              ✏️ Editar
            </button>
            <button type="button" class="btn-card-icon delete" onclick="eliminarProducto('${item.id}')" title="Eliminar">
              🗑️
            </button>
            <button type="button" class="btn-card-icon clone" onclick="duplicarProducto('${item.id}')" title="Duplicar">
              ❐
            </button>
          </div>
        </article>
      `;
    }).join("");

    // Botones de paginación
    if (controlesPag) {
      let htmlPag = "";
      for (let i = 1; i <= totalPaginas; i++) {
        htmlPag += `<button type="button" class="page-btn ${i === paginaActual ? 'active' : ''}" onclick="irAPagina(${i})">${i}</button>`;
      }
      controlesPag.innerHTML = htmlPag;
    }
  }

  window.irAPagina = function(num) {
    paginaActual = num;
    aplicarFiltrosYRenderizar();
  };

  // Preparar formulario vacío para nuevo reloj
  function limpiarFormulario() {
    form.reset();
    document.getElementById("prod-id").value = "";
    document.getElementById("form-main-title").textContent = "Agregar producto";
    document.getElementById("preview-main-img").src = "../img/logo-cronos.png";
    document.getElementById("desc-count").textContent = "0";

    window.estadoImagenes = {
      principalUrl: "",
      principalFile: null,
      adicionales: [null, null, null, null, null]
    };
    window.renderizarSlotsAdicionales();
  }

  // Editar producto existente
  window.editarProducto = function(id) {
    const prod = inventario.find(p => String(p.id) === String(id));
    if (!prod) return;

    limpiarFormulario();
    document.getElementById("form-main-title").textContent = "Editar producto";
    document.getElementById("prod-id").value = prod.id;
    document.getElementById("prod-nombre").value = prod.nombre || "";
    document.getElementById("prod-precio").value = prod.precio || 0;
    document.getElementById("prod-estado").value = prod.estado || "Activo";
    document.getElementById("prod-modelo").value = prod.modelo || "";
    document.getElementById("prod-stock").value = prod.stock ?? 10;
    document.getElementById("prod-categoria").value = prod.categoria || "hombre";
    document.getElementById("prod-marca").value = prod.marca || "CRONOS";
    document.getElementById("prod-estilo").value = prod.estilo || "Clásico";
    document.getElementById("prod-tipo-correa").value = prod.tipo_correa || "Metal";
    document.getElementById("prod-color-correa").value = prod.color_correa || "Dorado";
    document.getElementById("prod-esfera").value = prod.diseno_esfera || "Con números";
    document.getElementById("prod-descripcion").value = prod.descripcion || "";
    document.getElementById("desc-count").textContent = (prod.descripcion || "").length;
    document.getElementById("prod-destacado").checked = Boolean(prod.destacado);

    // Cargar imagen principal y ángulos adicionales
    window.estadoImagenes.principalUrl = prod.imagen_url || "";
    document.getElementById("preview-main-img").src = prod.imagen_url || "../img/logo-cronos.png";

    const extrasGuardadas = Array.isArray(prod.imagenes_adicionales) ? prod.imagenes_adicionales : [];
    window.estadoImagenes.adicionales = [0, 1, 2, 3, 4].map(idx => {
      return extrasGuardadas[idx] ? { url: extrasGuardadas[idx], file: null } : null;
    });

    window.renderizarSlotsAdicionales();
    cambiarVista(true);
  };

  // Eliminar reloj
  window.eliminarProducto = async function(id) {
    if (!confirm("¿Estás seguro de que deseas eliminar este reloj del catálogo?")) return;
    const { error } = await client.from("productos").delete().eq("id", id);
    if (error) {
      mostrarToast("Error al eliminar: " + error.message);
      return;
    }
    mostrarToast("Producto eliminado correctamente");
    cargarInventario();
  };

  // Duplicar reloj rápido
  window.duplicarProducto = async function(id) {
    const orig = inventario.find(p => String(p.id) === String(id));
    if (!orig) return;

    const copia = { ...orig };
    delete copia.id;
    copia.nombre = `${orig.nombre} (Copia)`;

    const { error } = await client.from("productos").insert([copia]);
    if (error) {
      mostrarToast("Error al duplicar: " + error.message);
      return;
    }
    mostrarToast("Producto duplicado");
    cargarInventario();
  };

  // Guardar o actualizar producto
  async function guardarProducto(forzarEstado = null) {
    if (!client) return;

    btnPublicar.disabled = true;
    btnPublicar.textContent = "Subiendo imágenes y guardando...";

    try {
      const id = document.getElementById("prod-id").value;

      // 1. Subir imagen principal si se seleccionó un archivo nuevo
      let urlPrincipal = window.estadoImagenes.principalUrl;
      if (window.estadoImagenes.principalFile) {
        urlPrincipal = await window.subirArchivoStorage(window.estadoImagenes.principalFile, client);
      }

      // 2. Subir imágenes adicionales de los slots 1 al 5
      const urlsAdicionales = [];
      for (let i = 0; i < window.estadoImagenes.adicionales.length; i++) {
        const slot = window.estadoImagenes.adicionales[i];
        if (!slot) continue;
        if (slot.file) {
          const subida = await window.subirArchivoStorage(slot.file, client);
          urlsAdicionales.push(subida);
        } else if (slot.url) {
          urlsAdicionales.push(slot.url);
        }
      }

      const payload = {
        nombre: document.getElementById("prod-nombre").value.trim(),
        precio: parseFloat(document.getElementById("prod-precio").value) || 0,
        estado: forzarEstado || document.getElementById("prod-estado").value,
        modelo: document.getElementById("prod-modelo").value.trim(),
        stock: parseInt(document.getElementById("prod-stock").value, 10) || 0,
        categoria: document.getElementById("prod-categoria").value,
        marca: document.getElementById("prod-marca").value.trim().toUpperCase(),
        estilo: document.getElementById("prod-estilo").value,
        tipo_correa: document.getElementById("prod-tipo-correa").value,
        color_correa: document.getElementById("prod-color-correa").value,
        diseno_esfera: document.getElementById("prod-esfera").value,
        descripcion: document.getElementById("prod-descripcion").value.trim(),
        destacado: document.getElementById("prod-destacado").checked,
        imagen_url: urlPrincipal,
        imagenes_adicionales: urlsAdicionales
      };

      let resultadoError = null;
      if (id) {
        const { error } = await client.from("productos").update(payload).eq("id", id);
        resultadoError = error;
      } else {
        const { error } = await client.from("productos").insert([payload]);
        resultadoError = error;
      }

      if (resultadoError) throw resultadoError;

      mostrarToast(id ? "¡Reloj actualizado con éxito!" : "¡Reloj publicado con éxito!");
      cambiarVista(false);

    } catch (err) {
      console.error("Error guardando producto:", err);
      mostrarToast("Error: " + err.message);
    } finally {
      btnPublicar.disabled = false;
      btnPublicar.textContent = "Publicar producto";
    }
  }

  // Eventos de botones
  if (btnNuevo) {
    btnNuevo.addEventListener("click", () => {
      limpiarFormulario();
      cambiarVista(true);
    });
  }

  if (btnVolver) {
    btnVolver.addEventListener("click", () => cambiarVista(false));
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      guardarProducto();
    });
  }

  if (btnBorrador) {
    btnBorrador.addEventListener("click", () => guardarProducto("Inactivo"));
  }

  [inputSearch, globalSearch, selectMarca, selectEstado, selectOrden].forEach(el => {
    if (el) el.addEventListener("input", () => {
      paginaActual = 1;
      aplicarFiltrosYRenderizar();
    });
  });

  // Inicializar carga
  cargarInventario();
});