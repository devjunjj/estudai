import { createClient } from '@supabase/supabase-js';

// Usa só o primeiro "pedaço" de cada valor: se um espaço ou uma linha a mais
// entrar por engano no .env ou na Vercel, o valor continua válido
// (uma quebra de linha dentro da chave faz o navegador recusar a requisição).
function limpar(valor) {
  return (valor ?? '').trim().split(/\s+/)[0].replace(/\/+$/, '');
}

const SUPABASE_URL = limpar(import.meta.env.VITE_SUPABASE_URL);
const SUPABASE_ANON_KEY = limpar(import.meta.env.VITE_SUPABASE_ANON_KEY);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase não configurado. Veja o .env.example (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
