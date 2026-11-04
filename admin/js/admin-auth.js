/* =========================================================
   admin-auth.js — Guardia de seguridad y autenticación admin
   Relojería CRONOS
   ========================================================= */

function mostrarErrorAdminAuth(mensaje) {
  const box = document.getElementById('auth-error');
  if (!box) return;
  box.textContent = mensaje;
  box.style.display = 'block';
}

function obtenerClienteSupabaseAdmin() {
  if (typeof supabaseClient !== "undefined") return supabaseClient;
  if (window.supabaseClient) return window.supabaseClient;
  if (window._supabase) return window._supabase;
  if (typeof supabase !== "undefined" && typeof supabase.auth !== "undefined") return supabase;
  if (typeof supabase !== "undefined" && typeof supabase.from === "function") return supabase;
  return null;
}

/**
 * Comprueba si el usuario logueado existe y tiene registro en 'administradores'
 */
async function obtenerSesionAdmin() {
  const client = obtenerClienteSupabaseAdmin();
  if (!client) return null;

  try {
    const { data: { session } } = await client.auth.getSession();
    if (!session || !session.user) return null;

    const { data, error } = await client
      .from('administradores')
      .select('user_id, nombre')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error || !data) return null;

    return { ...session, adminNombre: data.nombre };
  } catch (err) {
    console.warn("Aviso al verificar credenciales de administrador:", err);
    return null;
  }
}

/**
 * Guardia de seguridad estricto para admin/dashboard.html
 * Si no es administrador, lo redirige de inmediato al login
 */
async function protegerPaginaAdmin() {
  if (window.location.pathname.endsWith('login.html')) return;

  const sesion = await obtenerSesionAdmin();
  if (!sesion) {
    window.location.replace('login.html');
    return null;
  }

  const labelEmail = document.getElementById('admin-email-label');
  if (labelEmail) {
    labelEmail.textContent = sesion.adminNombre || sesion.user.email.split('@')[0];
  }

  return sesion;
}

/**
 * Cierre de sesión garantizado (ejecuta redirección siempre)
 */
window.cerrarSesionAdmin = async function(e) {
  if (e && typeof e.preventDefault === 'function') {
    e.preventDefault();
  }

  try {
    const client = obtenerClienteSupabaseAdmin();
    if (client && client.auth) {
      await client.auth.signOut();
    }
  } catch (err) {
    console.warn("Aviso al cerrar sesión en Supabase:", err);
  } finally {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = 'login.html';
  }
};

// Ejecutar protección automática en cada página del panel
document.addEventListener('DOMContentLoaded', () => {
  protegerPaginaAdmin();

  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', window.cerrarSesionAdmin);
  }

  const formLogin = document.getElementById('admin-login-form');
  if (!formLogin) return;

  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const box = document.getElementById('auth-error');
    if (box) box.style.display = 'none';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btn-submit-login');

    btn.disabled = true;
    btn.textContent = 'Verificando credenciales...';

    const client = obtenerClienteSupabaseAdmin();
    if (!client) {
      mostrarErrorAdminAuth('No se pudo conectar con el servidor.');
      btn.disabled = false;
      btn.textContent = 'Ingresar al panel';
      return;
    }

    const { error: errorLogin } = await client.auth.signInWithPassword({ email, password });

    if (errorLogin) {
      mostrarErrorAdminAuth('Correo o contraseña incorrectos.');
      btn.disabled = false;
      btn.textContent = 'Ingresar al panel';
      return;
    }

    const sesionAdmin = await obtenerSesionAdmin();

    if (!sesionAdmin) {
      mostrarErrorAdminAuth('Acceso denegado: Esta cuenta no tiene permisos de administrador.');
      await client.auth.signOut();
      btn.disabled = false;
      btn.textContent = 'Ingresar al panel';
      return;
    }

    window.location.replace('dashboard.html');
  });
});