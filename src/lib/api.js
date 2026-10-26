// Cliente HTTP da API do EstudAI (backend em ASP.NET Core).
// Todas as chamadas ao backend passam por aqui, para centralizar
// a URL base, os cabeçalhos e o tratamento de erros.

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5018';

async function requisicao(caminho, { metodo = 'GET', corpo, userId } = {}) {
  const headers = { 'X-User-Id': userId };
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

  if (!resposta.ok) {
    throw new Error(`Erro na API: ${resposta.status}`);
  }

  // 204 No Content (ex.: DELETE) não tem corpo
  return resposta.status === 204 ? null : resposta.json();
}

export const notasApi = {
  listar: (userId, materia) =>
    requisicao(`/api/notes?materia=${encodeURIComponent(materia)}`, { userId }),

  criar: (userId, materia, texto) =>
    requisicao('/api/notes', { metodo: 'POST', corpo: { materia, texto }, userId }),

  excluir: (userId, id) =>
    requisicao(`/api/notes/${id}`, { metodo: 'DELETE', userId }),
};
