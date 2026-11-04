/* =========================================================
   supabase-config.js
   Configuración de conexión a Supabase.

   ⚠️ IMPORTANTE: reemplazá los dos valores de abajo con los
   tuyos, que sacaste de Project Settings → API en Supabase.
   ========================================================= */

const SUPABASE_URL = 'https://torghplvnekxnhqjcqmo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcmdocGx2bmVreG5ocWpjcW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NzQyMjgsImV4cCI6MjEwOTE1MDIyOH0.4WiOodAmOr5oDTgMqn2jKzXGvQGARBVnLdPf7yYZB50';

// Cliente de Supabase disponible para todo el sitio
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
