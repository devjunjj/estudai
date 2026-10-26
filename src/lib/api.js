// Cliente HTTP da API do EstudAI (backend em ASP.NET Core).
// Todas as chamadas ao backend passam por aqui, para centralizar
// a URL base, a autenticação e o tratamento de erros.

import { supabase } from './supabaseClient';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5018';

// Token JWT da sessão atual do Supabase. A API valida esse token
// e descobre sozinha quem é o usuário — o frontend não informa o id.
async function obterToken() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sessão expirada. Faça login novamente.');
  return token;
}

async function requisicao(caminho, { metodo = 'GET', corpo } = {}) {
  const headers = { Authorization: `Bearer ${await obterToken()}` };
  if (corpo !== undefined) headers['Content-Type'] = 'application/json';

  let resposta;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      method: metodo,
      headers,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    // fetch só lança erro quando nem chega no servidor (API desligada, sem rede, CORS)
    throw new Error('Não foi possível conectar à API. Ela está rodando?');
  }

  if (resposta.status === 401) {
    throw new Error('Sessão inválida ou expirada. Faça login novamente.');
  }
  if (resposta.status === 429) {
    throw new Error('Muitos pedidos em pouco tempo. Espere um minuto e tente de novo.');
  }
  if (!resposta.ok) {
    // a API manda { mensagem } nos erros que ela mesma trata (ex.: IA fora do ar)
    const corpo = await resposta.json().catch(() => null);
    throw new Error(corpo?.mensagem ?? `Erro na API: ${resposta.status}`);
  }

  // 204 No Content (ex.: DELETE) não tem corpo
  return resposta.status === 204 ? null : resposta.json();
}

export const notasApi = {
  listar: (materia) => requisicao(`/api/notes?materia=${encodeURIComponent(materia)}`),

  criar: (materia, texto) =>
    requisicao('/api/notes', { metodo: 'POST', corpo: { materia, texto } }),

  excluir: (id) => requisicao(`/api/notes/${id}`, { metodo: 'DELETE' }),
};

// A IA é chamada pela API (que guarda a chave e exige login), nunca direto pelo navegador
export const iaApi = {
  gerar: (prompt, arquivo = null) =>
    requisicao('/api/ia/gerar', { metodo: 'POST', corpo: { prompt, arquivo } }),
};
