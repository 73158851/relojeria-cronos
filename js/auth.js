/* =========================================================
   js/auth.js
   Login, registro y logout de CLIENTES del sitio público.
   Manejo de sesión visual en navbar con icono compacto de salida.
   ========================================================= */

function obtenerClienteSupabase() {
  if (typeof supabaseClient !== "undefined") return supabaseClient;
  if (window.supabaseClient) return window.supabaseClient;
  if (window._supabase) return window._supabase;
  if (typeof supabase !== "undefined" && typeof supabase.auth !== "undefined") return supabase;
  return null;
}

// -----------------------------------------------------------
// Traducción de errores comunes de Supabase al español
// -----------------------------------------------------------
function traducirErrorAuth(mensaje) {
  const mapa = {
    'Invalid login credentials': 'Correo o contraseña incorrectos.',
    'User already registered': 'Ya existe una cuenta con ese correo.',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
    'Email not confirmed': 'Todavía no confirmaste tu correo. Revisá tu bandeja de entrada.',
  };
  return mapa[mensaje] || mensaje;
}

function mostrarErrorAuth(mensaje) {
  const box = document.getElementById('auth-error');
  if (!box) return;
  box.textContent = traducirErrorAuth(mensaje);
  box.style.display = 'block';
}

function ocultarErrorAuth() {
  const box = document.getElementById('auth-error');
  if (!box) return;
  box.style.display = 'none';
}

// -----------------------------------------------------------
// VERIFICAR ROL DE ADMINISTRADOR
// -----------------------------------------------------------
async function esUsuarioAdmin(userId, client) {
  if (!userId || !client) return false;
  try {
    const { data, error } = await client
      .from('administradores')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return false;
    return true;
  } catch (err) {
    return false;
  }
}

// -----------------------------------------------------------
// LOGIN
// -----------------------------------------------------------
async function manejarLogin(evento) {
  evento.preventDefault();
  ocultarErrorAuth();

  const client = obtenerClienteSupabase();
  if (!client) return;

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn = evento.target.querySelector('button[type="submit"]');

  btn.disabled = true;
  btn.textContent = 'Ingresando...';

  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    mostrarErrorAuth(error.message);
    btn.disabled = false;
    btn.textContent = 'Ingresar';
    return;
  }

  window.location.href = 'index.html';
}

// -----------------------------------------------------------
// REGISTRO
// -----------------------------------------------------------
async function manejarRegistro(evento) {
  evento.preventDefault();
  ocultarErrorAuth();

  const client = obtenerClienteSupabase();
  if (!client) return;

  const nombre = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const telefono = document.getElementById('phone').value.trim();
  const password = document.getElementById('password').value;
  const btn = evento.target.querySelector('button[type="submit"]');

  btn.disabled = true;
  btn.textContent = 'Creando cuenta...';

  const { error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { nombre, telefono },
    },
  });

  if (error) {
    mostrarErrorAuth(error.message);
    btn.disabled = false;
    btn.textContent = 'Crear cuenta';
    return;
  }

  window.location.href = 'index.html';
}

// -----------------------------------------------------------
// LOGOUT
// -----------------------------------------------------------
async function cerrarSesion() {
  const client = obtenerClienteSupabase();
  if (client) {
    await client.auth.signOut();
  }
  window.location.href = 'index.html';
}

// -----------------------------------------------------------
// ESTADO DEL NAVBAR (visitante / cliente / administrador)
// -----------------------------------------------------------
async function renderizarAuthSlot() {
  const slot = document.getElementById('auth-slot');
  if (!slot) return;

  const client = obtenerClienteSupabase();
  if (!client) return;

  try {
    const { data: { session } } = await client.auth.getSession();

    if (session && session.user) {
      const user = session.user;
      const nombre = user.user_metadata?.nombre || user.email.split('@')[0];
      const esAdmin = await esUsuarioAdmin(user.id, client);

      let html = `
        <div class="user-menu">
          <span class="user-name">
            Hola, ${nombre}
          </span>
      `;

      // Si es admin se muestra el acceso al panel
      if (esAdmin) {
        html += `
          <a href="admin/dashboard.html" class="btn-panel-admin" style="background:#14532d; color:#ffffff; padding:5px 12px; border-radius:20px; font-size:11px; font-weight:700; text-decoration:none; border:1px solid #c5a059; display:inline-flex; align-items:center; gap:4px;">
            👑 Admin
          </a>
        `;
      }

      // Botón con ícono de puerta/salida
      html += `
          <button id="logout-btn" class="btn-logout-icon" title="Cerrar sesión" aria-label="Cerrar sesión">
            🚪
          </button>
        </div>
      `;

      slot.innerHTML = html;
      document.getElementById('logout-btn').addEventListener('click', cerrarSesion);
    } else {
      slot.innerHTML = `<a href="login.html" class="btn-auth-link">Ingresar</a>`;
    }
  } catch (error) {
    console.warn("Aviso comprobando sesión:", error);
    slot.innerHTML = `<a href="login.html" class="btn-auth-link">Ingresar</a>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderizarAuthSlot();

  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', manejarLogin);

  const registerForm = document.getElementById('register-form');
  if (registerForm) registerForm.addEventListener('submit', manejarRegistro);
});