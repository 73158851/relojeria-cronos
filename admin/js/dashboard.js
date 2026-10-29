// admin/js/dashboard.js

document.addEventListener("DOMContentLoaded", async () => {
  function obtenerSupabase() {
    if (typeof supabaseClient !== "undefined") return supabaseClient;
    if (window._supabase) return window._supabase;
    if (typeof supabase !== "undefined" && typeof supabase.from === "function") return supabase;
    return null;
  }

  const client = obtenerSupabase();

  // Vistas
  const viewCatalogo = document.getElementById("view-catalogo");
  const viewFormulario = document.getElementById("view-formulario");
  const viewVentas = document.getElementById("view-ventas");
  const viewProveedores = document.getElementById("view-proveedores");
  const viewClientes = document.getElementById("view-clientes");
  const todasLasVistas = [viewCatalogo, viewFormulario, viewVentas, viewProveedores, viewClientes];

  // Botones de navegación lateral
  const navProductos = document.getElementById("nav-productos");
  const navVentas = document.getElementById("nav-ventas");
  const navProveedores = document.getElementById("nav-proveedores");
  const navClientes = document.getElementById("nav-clientes");
  const todosLosNavs = [navProductos, navVentas, navProveedores, navClientes];

  // Elementos de productos
  const grid = document.getElementById("admin-products-grid");
  const formProd = document.getElementById("form-producto");
  const btnNuevo = document.getElementById("btn-nuevo-producto");
  const btnVolver = document.getElementById("btn-volver-catalogo");
  const btnBorrador = document.getElementById("btn-guardar-borrador");
  const btnPublicar = document.getElementById("btn-publicar");

  // Filtros
  const inputSearch = document.getElementById("filter-search");
  const globalSearch = document.getElementById("global-search");
  const selectMarca = document.getElementById("filter-marca");
  const selectEstado = document.getElementById("filter-estado");
  const selectOrden = document.getElementById("filter-orden");

  // Control responsivo de la barra lateral y cierre exterior
  const btnToggleSidebar = document.getElementById("btn-toggle-sidebar");
  const sidebar = document.getElementById("admin-sidebar");
  const overlay = document.getElementById("sidebar-overlay");

  function cerrarSidebarMovil() {
    if (sidebar) sidebar.classList.remove("open-mobile");
    if (overlay) overlay.classList.remove("active");
  }

  function toggleSidebarMovil(e) {
    e.stopPropagation();
    if (!sidebar) return;
    const abrir = !sidebar.classList.contains("open-mobile");
    sidebar.classList.toggle("open-mobile", abrir);
    if (overlay) overlay.classList.toggle("active", abrir);
  }

  if (btnToggleSidebar) {
    btnToggleSidebar.addEventListener("click", toggleSidebarMovil);
  }

  // Tocar en el fondo oscuro cierra la barra
  if (overlay) {
    overlay.addEventListener("click", cerrarSidebarMovil);
  }

  // Tocar fuera del sidebar en cualquier parte de la pantalla cierra la barra
  document.addEventListener("click", (e) => {
    if (sidebar && sidebar.classList.contains("open-mobile")) {
      if (!sidebar.contains(e.target) && e.target !== btnToggleSidebar) {
        cerrarSidebarMovil();
      }
    }
  });

  let inventario = [];
  let listaVentas = [];
  let listaProveedores = [];
  let paginaActual = 1;
  const itemsPorPagina = 10;
  let columnasRealesVentas = null;

  function activarVista(vistaActiva, navActivo) {
    todasLasVistas.forEach(v => { if (v) v.classList.remove("active"); });
    todosLosNavs.forEach(n => { if (n) n.classList.remove("active"); });

    if (vistaActiva) vistaActiva.classList.add("active");
    if (navActivo) navActivo.classList.add("active");

    cerrarSidebarMovil();
  }

  // Eventos de barra lateral
  if (navProductos) navProductos.addEventListener("click", (e) => { e.preventDefault(); activarVista(viewCatalogo, navProductos); cargarInventario(); });
  if (navVentas) navVentas.addEventListener("click", (e) => { e.preventDefault(); activarVista(viewVentas, navVentas); cargarVentas(); });
  if (navProveedores) navProveedores.addEventListener("click", (e) => { e.preventDefault(); activarVista(viewProveedores, navProveedores); cargarProveedores(); });
  if (navClientes) navClientes.addEventListener("click", (e) => { e.preventDefault(); activarVista(viewClientes, navClientes); cargarClientes(); });

  // ---------------------------------------------------------
  // MÓDULO 1: PRODUCTOS
  // ---------------------------------------------------------
  async function cargarInventario() {
    if (!client) return;
    grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:40px; color:#64748b;">Cargando inventario...</p>`;

    const { data, error } = await client.from("productos").select("*");
    if (error) {
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
            <button type="button" class="btn-card-edit" onclick="editarProducto('${item.id}')">✏️ Editar</button>
            <button type="button" class="btn-card-icon delete" onclick="eliminarProducto('${item.id}')" title="Eliminar">🗑️</button>
            <button type="button" class="btn-card-icon clone" onclick="duplicarProducto('${item.id}')" title="Duplicar">❐</button>
          </div>
        </article>
      `;
    }).join("");

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

  function limpiarFormulario() {
    formProd.reset();
    document.getElementById("prod-id").value = "";
    document.getElementById("form-main-title").textContent = "Agregar producto";
    document.getElementById("preview-main-img").src = "../img/logo-cronos.png";
    document.getElementById("desc-count").textContent = "0";

    window.estadoImagenes = {
      principalUrl: "",
      principalFile: null,
      adicionales: [null, null, null, null, null]
    };
    if (typeof window.renderizarSlotsAdicionales === "function") {
      window.renderizarSlotsAdicionales();
    }
  }

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
    document.getElementById("prod-estilo").value = prod.estilo || "Deportivo";
    document.getElementById("prod-tipo-correa").value = prod.tipo_correa || "Goma";
    document.getElementById("prod-color-correa").value = prod.color_correa || "Negro";
    document.getElementById("prod-esfera").value = prod.diseno_esfera || "Cronógrafo";
    document.getElementById("prod-descripcion").value = prod.descripcion || "";
    document.getElementById("desc-count").textContent = (prod.descripcion || "").length;
    document.getElementById("prod-destacado").checked = Boolean(prod.destacado);

    window.estadoImagenes.principalUrl = prod.imagen_url || "";
    document.getElementById("preview-main-img").src = prod.imagen_url || "../img/logo-cronos.png";

    const extras = Array.isArray(prod.imagenes_adicionales) ? prod.imagenes_adicionales : [];
    window.estadoImagenes.adicionales = [0, 1, 2, 3, 4].map(idx => {
      return extras[idx] ? { url: extras[idx], file: null } : null;
    });

    if (typeof window.renderizarSlotsAdicionales === "function") {
      window.renderizarSlotsAdicionales();
    }
    activarVista(viewFormulario, navProductos);
  };

  window.eliminarProducto = async function(id) {
    if (!confirm("¿Deseas eliminar este reloj del inventario?")) return;
    const { error } = await client.from("productos").delete().eq("id", id);
    if (error) {
      mostrarToast("Error: " + error.message);
      return;
    }
    mostrarToast("Producto eliminado correctamente");
    cargarInventario();
  };

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

  async function guardarProducto(forzarEstado = null) {
    if (!client) return;
    btnPublicar.disabled = true;
    btnPublicar.textContent = "Guardando...";

    try {
      const id = document.getElementById("prod-id").value;

      let urlPrincipal = window.estadoImagenes.principalUrl;
      if (window.estadoImagenes.principalFile) {
        urlPrincipal = await window.subirArchivoStorage(window.estadoImagenes.principalFile, client);
      }

      const urlsAdicionales = [];
      for (let i = 0; i < window.estadoImagenes.adicionales.length; i++) {
        const slot = window.estadoImagenes.adicionales[i];
        if (!slot) continue;
        if (slot.file) {
          const sub = await window.subirArchivoStorage(slot.file, client);
          urlsAdicionales.push(sub);
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

      let errorResult = null;
      if (id) {
        const { error } = await client.from("productos").update(payload).eq("id", id);
        errorResult = error;
      } else {
        const { error } = await client.from("productos").insert([payload]);
        errorResult = error;
      }

      if (errorResult) throw errorResult;

      mostrarToast(id ? "¡Reloj actualizado con éxito!" : "¡Reloj publicado con éxito!");
      activarVista(viewCatalogo, navProductos);
      cargarInventario();

    } catch (err) {
      console.error(err);
      mostrarToast("Error: " + err.message);
    } finally {
      btnPublicar.disabled = false;
      btnPublicar.textContent = "Publicar producto";
    }
  }

  if (btnNuevo) btnNuevo.addEventListener("click", () => { limpiarFormulario(); activarVista(viewFormulario, navProductos); });
  if (btnVolver) btnVolver.addEventListener("click", () => { activarVista(viewCatalogo, navProductos); });
  if (formProd) formProd.addEventListener("submit", (e) => { e.preventDefault(); guardarProducto(); });
  if (btnBorrador) btnBorrador.addEventListener("click", () => guardarProducto("Inactivo"));

  [inputSearch, globalSearch, selectMarca, selectEstado, selectOrden].forEach(el => {
    if (el) el.addEventListener("input", () => {
      paginaActual = 1;
      aplicarFiltrosYRenderizar();
    });
  });

  // ---------------------------------------------------------
  // MÓDULO 2: VENTAS
  // ---------------------------------------------------------
  async function cargarVentas() {
    const tbody = document.getElementById("tbody-ventas");
    if (!tbody || !client) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px;">Cargando ventas...</td></tr>`;

    const { data, error } = await client.from("ventas").select("*");

    if (error) {
      console.error("Error ventas:", error);
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#ef4444;">Error al cargar ventas (${error.message}).</td></tr>`;
      return;
    }

    listaVentas = data || [];

    if (listaVentas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#64748b;">No hay ventas registradas todavía.</td></tr>`;
      return;
    }

    columnasRealesVentas = Object.keys(listaVentas[0]);

    listaVentas.sort((a, b) => new Date(b.fecha_venta || b.fecha || b.created_at || 0) - new Date(a.fecha_venta || a.fecha || a.created_at || 0));

    tbody.innerHTML = listaVentas.map(v => {
      const fechaVal = v.fecha_venta || v.fecha || v.created_at;
      const fecha = fechaVal ? new Date(fechaVal).toLocaleDateString("es-BO") : new Date().toLocaleDateString("es-BO");

      let relojNombre = v.reloj || v.nombre_reloj;
      if (!relojNombre && v.producto_id) {
        const prod = inventario.find(p => String(p.id) === String(v.producto_id));
        relojNombre = prod ? prod.nombre : `ID: ${v.producto_id}`;
      }
      relojNombre = relojNombre || "Reloj";

      const cant = v.cantidad || v.cant || 1;
      const precioUnit = Number(v.precio_unitario || v.precio || 0);
      const total = Number(v.total || (cant * precioUnit) || 0).toFixed(2);
      const clienteNombre = v.nombre_cliente || v.cliente || "Cliente mostrador";
      const metodoPago = v.metodo_pago || v.pago || "Efectivo";

      return `
        <tr>
          <td>${fecha}</td>
          <td><strong>${relojNombre}</strong></td>
          <td>${cant}</td>
          <td>Bs ${precioUnit.toFixed(2)}</td>
          <td><strong>Bs ${total}</strong></td>
          <td>${clienteNombre}</td>
          <td><span class="badge-pay">${metodoPago}</span></td>
          <td style="text-align:center; white-space:nowrap;">
            <button type="button" class="btn-card-icon" onclick="editarVenta('${v.id}')" title="Editar venta" style="padding:4px 8px; font-size:13px; margin-right:4px;">✏️</button>
            <button type="button" class="btn-table-del" onclick="eliminarVenta('${v.id}')" title="Eliminar venta">🗑️</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  window.editarVenta = function(id) {
    const venta = listaVentas.find(v => String(v.id) === String(id));
    if (!venta) return;

    poblarSelectRelojesVenta();
    document.getElementById("modal-venta-title").textContent = "Editar Venta";
    document.getElementById("venta-id").value = venta.id;
    if (venta.producto_id) {
      selectVentaReloj.value = venta.producto_id;
    }
    document.getElementById("venta-cantidad").value = venta.cantidad || venta.cant || 1;
    document.getElementById("venta-precio").value = venta.precio_unitario || venta.precio || 0;
    document.getElementById("venta-cliente").value = venta.nombre_cliente || venta.cliente || "";
    document.getElementById("venta-telefono").value = venta.telefono_cliente || venta.telefono || "";
    document.getElementById("venta-pago").value = venta.metodo_pago || venta.pago || "Efectivo";

    modalVenta.classList.add("active");
  };

  window.eliminarVenta = async function(id) {
    if (!confirm("¿Deseas eliminar esta venta?")) return;
    const { error } = await client.from("ventas").delete().eq("id", id);
    if (error) {
      mostrarToast("Error: " + error.message);
      return;
    }
    mostrarToast("Venta eliminada");
    cargarVentas();
  };

  const btnNuevaVenta = document.getElementById("btn-nueva-venta");
  const modalVenta = document.getElementById("modal-venta");
  const formVenta = document.getElementById("form-venta");
  const selectVentaReloj = document.getElementById("venta-reloj");

  function poblarSelectRelojesVenta() {
    selectVentaReloj.innerHTML = inventario.map(p => `<option value="${p.id}" data-precio="${p.precio}">${p.nombre} (Bs ${p.precio})</option>`).join("");
  }

  if (btnNuevaVenta) {
    btnNuevaVenta.addEventListener("click", () => {
      document.getElementById("modal-venta-title").textContent = "Registrar Venta";
      document.getElementById("venta-id").value = "";
      formVenta.reset();
      poblarSelectRelojesVenta();
      const primerPrecio = inventario[0]?.precio || 0;
      document.getElementById("venta-precio").value = primerPrecio;
      modalVenta.classList.add("active");
    });
  }

  if (selectVentaReloj) {
    selectVentaReloj.addEventListener("change", (e) => {
      const opt = e.target.selectedOptions[0];
      if (opt) document.getElementById("venta-precio").value = opt.getAttribute("data-precio") || 0;
    });
  }

  window.cerrarModalVenta = function() {
    if (modalVenta) modalVenta.classList.remove("active");
  };

  if (formVenta) {
    formVenta.addEventListener("submit", async (e) => {
      e.preventDefault();
      const idVenta = document.getElementById("venta-id").value;
      const relojSelect = selectVentaReloj;
      const relojId = relojSelect.value;
      const relojTexto = relojSelect.options[relojSelect.selectedIndex]?.text.split(" (Bs")[0] || "Reloj";
      const cant = parseInt(document.getElementById("venta-cantidad").value, 10) || 1;
      const precio = parseFloat(document.getElementById("venta-precio").value) || 0;
      const nombreCliente = document.getElementById("venta-cliente").value.trim() || "Cliente directo";
      const tel = document.getElementById("venta-telefono").value.trim();
      const pago = document.getElementById("venta-pago").value;

      const mapaValores = {
        producto_id: relojId,
        reloj: relojTexto,
        nombre_reloj: relojTexto,
        cantidad: cant,
        cant: cant,
        precio_unitario: precio,
        precio: precio,
        total: cant * precio,
        nombre_cliente: nombreCliente,
        cliente: nombreCliente,
        telefono_cliente: tel,
        telefono: tel,
        metodo_pago: pago,
        pago: pago
      };

      let payload = {};
      if (columnasRealesVentas && columnasRealesVentas.length > 0) {
        columnasRealesVentas.forEach(col => {
          if (col === "id" || col === "created_at") return;
          if (col in mapaValores) payload[col] = mapaValores[col];
        });
      } else {
        payload = {
          producto_id: relojId,
          cantidad: cant,
          precio_unitario: precio,
          total: cant * precio,
          nombre_cliente: nombreCliente,
          metodo_pago: pago
        };
      }

      let errorVenta = null;
      if (idVenta) {
        const { error } = await client.from("ventas").update(payload).eq("id", idVenta);
        errorVenta = error;
      } else {
        const { error } = await client.from("ventas").insert([payload]);
        errorVenta = error;
      }

      if (errorVenta) {
        mostrarToast("Error al guardar venta: " + errorVenta.message);
        return;
      }

      mostrarToast(idVenta ? "¡Venta actualizada con éxito!" : "¡Venta registrada con éxito!");
      cerrarModalVenta();
      formVenta.reset();
      cargarVentas();
    });
  }

  // ---------------------------------------------------------
  // MÓDULO 3: PROVEEDORES
  // ---------------------------------------------------------
  async function cargarProveedores() {
    const tbody = document.getElementById("tbody-proveedores");
    if (!tbody || !client) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">Cargando proveedores...</td></tr>`;

    const { data, error } = await client.from("proveedores").select("*");
    if (error) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#ef4444;">Error al cargar proveedores.</td></tr>`;
      return;
    }

    listaProveedores = data || [];

    if (listaProveedores.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#64748b;">No hay proveedores registrados.</td></tr>`;
      return;
    }

    tbody.innerHTML = listaProveedores.map(p => `
      <tr>
        <td><strong>${p.nombre}</strong></td>
        <td>${p.contacto || "-"}</td>
        <td>${p.telefono || "-"}</td>
        <td>${p.correo || "-"}</td>
        <td><span class="status-pill activo">${p.estado || "Activo"}</span></td>
        <td style="text-align:center; white-space:nowrap;">
          <button type="button" class="btn-card-icon" onclick="editarProveedor('${p.id}')" title="Editar proveedor" style="padding:4px 8px; font-size:13px; margin-right:4px;">✏️</button>
          <button type="button" class="btn-table-del" onclick="eliminarProveedor('${p.id}')" title="Eliminar proveedor">🗑️</button>
        </td>
      </tr>
    `).join("");
  }

  window.editarProveedor = function(id) {
    const prov = listaProveedores.find(p => String(p.id) === String(id));
    if (!prov) return;

    document.getElementById("modal-prov-title").textContent = "Editar Proveedor";
    document.getElementById("prov-id").value = prov.id;
    document.getElementById("prov-nombre").value = prov.nombre || "";
    document.getElementById("prov-contacto").value = prov.contacto || "";
    document.getElementById("prov-telefono").value = prov.telefono || "";
    document.getElementById("prov-correo").value = prov.correo || "";
    document.getElementById("prov-direccion").value = prov.direccion || "";

    modalProv.classList.add("active");
  };

  window.eliminarProveedor = async function(id) {
    if (!confirm("¿Deseas eliminar este proveedor?")) return;
    const { error } = await client.from("proveedores").delete().eq("id", id);
    if (error) {
      mostrarToast("Error: " + error.message);
      return;
    }
    mostrarToast("Proveedor eliminado");
    cargarProveedores();
  };

  const btnNuevoProv = document.getElementById("btn-nuevo-proveedor");
  const modalProv = document.getElementById("modal-proveedor");
  const formProv = document.getElementById("form-proveedor");

  if (btnNuevoProv) {
    btnNuevoProv.addEventListener("click", () => {
      document.getElementById("modal-prov-title").textContent = "Nuevo Proveedor";
      document.getElementById("prov-id").value = "";
      formProv.reset();
      modalProv.classList.add("active");
    });
  }

  window.cerrarModalProveedor = function() {
    if (modalProv) modalProv.classList.remove("active");
  };

  if (formProv) {
    formProv.addEventListener("submit", async (e) => {
      e.preventDefault();
      const idProv = document.getElementById("prov-id").value;
      const payload = {
        nombre: document.getElementById("prov-nombre").value.trim(),
        contacto: document.getElementById("prov-contacto").value.trim(),
        telefono: document.getElementById("prov-telefono").value.trim(),
        correo: document.getElementById("prov-correo").value.trim(),
        direccion: document.getElementById("prov-direccion").value.trim(),
        estado: "Activo"
      };

      let errorProv = null;
      if (idProv) {
        const { error } = await client.from("proveedores").update(payload).eq("id", idProv);
        errorProv = error;
      } else {
        const { error } = await client.from("proveedores").insert([payload]);
        errorProv = error;
      }

      if (errorProv) {
        mostrarToast("Error: " + errorProv.message);
        return;
      }

      mostrarToast(idProv ? "Proveedor actualizado correctamente" : "Proveedor guardado correctamente");
      cerrarModalProveedor();
      formProv.reset();
      cargarProveedores();
    });
  }

  // ---------------------------------------------------------
  // MÓDULO 4: CLIENTES
  // ---------------------------------------------------------
  async function cargarClientes() {
    const tbody = document.getElementById("tbody-clientes");
    if (!tbody || !client) return;
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">Cargando clientes...</td></tr>`;

    let { data, error } = await client.from("clientes").select("*");

    if (error || !data) {
      const res = await client.from("usuarios").select("*");
      data = res.data || [];
    }

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:#64748b;">No hay clientes registrados en este momento.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(c => {
      const fechaVal = c.created_at || c.registrado || c.fecha_registro;
      const fecha = fechaVal ? new Date(fechaVal).toLocaleDateString("es-BO") : "-";
      const nombre = c.nombre_completo || c.nombre || "Usuario";
      const correo = c.email || c.correo || "-";
      const telefono = c.telefono_whatsapp || c.telefono || c.celular || "-";

      return `
        <tr>
          <td><strong>${nombre}</strong></td>
          <td>${correo}</td>
          <td>${telefono}</td>
          <td>${fecha}</td>
        </tr>
      `;
    }).join("");
  }

  // Cargar inventario inicial
  cargarInventario();
});