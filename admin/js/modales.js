// admin/js/modales.js

// Estado global de las imágenes en el formulario
window.estadoImagenes = {
  principalUrl: "",
  principalFile: null,
  adicionales: [null, null, null, null, null] // Cada posición guarda { url: string, file: File|null }
};

function mostrarToast(mensaje) {
  const toast = document.getElementById("admin-toast");
  if (!toast) return;
  toast.textContent = mensaje;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3200);
}

window.insertarTexto = function(simbolo) {
  const area = document.getElementById("prod-descripcion");
  if (!area) return;
  const start = area.selectionStart;
  const end = area.selectionEnd;
  const texto = area.value;
  area.value = texto.substring(0, start) + simbolo + texto.substring(end);
  area.focus();
};

// Renderiza las 5 casillas numeradas para las fotos de ángulos
window.renderizarSlotsAdicionales = function() {
  const contenedor = document.getElementById("extra-images-grid");
  if (!contenedor) return;

  contenedor.innerHTML = window.estadoImagenes.adicionales.map((slot, idx) => {
    const tieneImg = slot && slot.url;
    return `
      <div class="extra-slot" data-index="${idx}">
        <div class="slot-top-bar">
          <span>⠿</span>
          ${tieneImg ? `<button type="button" class="btn-remove-slot" onclick="eliminarSlotAdicional(${idx})" title="Quitar imagen">🗑️</button>` : ""}
        </div>
        <div class="slot-img-box" onclick="seleccionarImagenParaSlot(${idx})">
          ${tieneImg 
            ? `<img src="${slot.url}" alt="Ángulo ${idx + 1}">`
            : `<span class="slot-empty-placeholder">+ Subir<br>ángulo ${idx + 1}</span>`
          }
        </div>
        <span class="slot-number">${idx + 1}</span>
      </div>
    `;
  }).join("");
};

window.eliminarSlotAdicional = function(index) {
  window.estadoImagenes.adicionales[index] = null;
  window.renderizarSlotsAdicionales();
};

let slotActivoIndex = null;

window.seleccionarImagenParaSlot = function(index) {
  slotActivoIndex = index;
  const inputExtra = document.getElementById("input-extra-imgs");
  if (inputExtra) inputExtra.click();
};

// Sube un archivo individual al bucket 'relojes' de Supabase Storage
window.subirArchivoStorage = async function(file, client) {
  const ext = (file.name.split(".").pop() || "webp").toLowerCase();
  const nombreArchivo = `reloj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

  const { error: uploadError } = await client.storage
    .from("relojes")
    .upload(nombreArchivo, file, { upsert: true });

  if (uploadError) {
    console.warn("Aviso Storage:", uploadError.message);
    // Fallback a DataURL si hubiera restricción de políticas
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

  const { data } = client.storage.from("relojes").getPublicUrl(nombreArchivo);
  return data.publicUrl;
};

document.addEventListener("DOMContentLoaded", () => {
  const btnMainImg = document.getElementById("btn-trigger-main-img");
  const inputMainImg = document.getElementById("input-main-img");
  const previewMainImg = document.getElementById("preview-main-img");

  const btnExtraImgs = document.getElementById("btn-trigger-extra-imgs");
  const inputExtraImgs = document.getElementById("input-extra-imgs");
  const descInput = document.getElementById("prod-descripcion");
  const descCount = document.getElementById("desc-count");

  if (btnMainImg && inputMainImg) {
    btnMainImg.addEventListener("click", () => inputMainImg.click());
    inputMainImg.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      window.estadoImagenes.principalFile = file;
      window.estadoImagenes.principalUrl = URL.createObjectURL(file);
      previewMainImg.src = window.estadoImagenes.principalUrl;
    });
  }

  if (btnExtraImgs && inputExtraImgs) {
    btnExtraImgs.addEventListener("click", () => {
      slotActivoIndex = null;
      inputExtraImgs.click();
    });

    inputExtraImgs.addEventListener("change", (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      if (slotActivoIndex !== null && files[0]) {
        // Si hizo clic en una casilla específica (1 al 5)
        window.estadoImagenes.adicionales[slotActivoIndex] = {
          file: files[0],
          url: URL.createObjectURL(files[0])
        };
        slotActivoIndex = null;
      } else {
        // Si seleccionó varias imágenes de golpe con el botón "+ Seleccionar imágenes"
        files.forEach((file) => {
          const hueco = window.estadoImagenes.adicionales.findIndex(item => item === null);
          if (hueco !== -1) {
            window.estadoImagenes.adicionales[hueco] = {
              file: file,
              url: URL.createObjectURL(file)
            };
          }
        });
      }

      inputExtraImgs.value = "";
      window.renderizarSlotsAdicionales();
    });
  }

  if (descInput && descCount) {
    descInput.addEventListener("input", () => {
      descCount.textContent = descInput.value.length;
    });
  }

  window.renderizarSlotsAdicionales();
});