/* =========================================================
   supabase-config.js
   Configuración de conexión a Supabase.

   ⚠️ IMPORTANTE: reemplazá los dos valores de abajo con los
   tuyos, que sacaste de Project Settings → API en Supabase.
   ========================================================= */

const SUPABASE_URL = 'https://suscpuzsazidlltvkxcv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1c2NwdXpzYXppZGxsdHZreGN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0MDUxNDYsImV4cCI6MjEwMTk4MTE0Nn0.dHyG4AWjXkC95KkJyqIm_MnycuU9fp3m6cPBlRQh_10';

// Cliente de Supabase disponible para todo el sitio
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
