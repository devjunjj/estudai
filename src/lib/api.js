// Cliente HTTP da API do EstudAI (backend em ASP.NET Core).
// Todas as chamadas ao backend passam por aqui, para centralizar
// a URL base, a autenticação e o tratamento de erros.

import { supabase } from './supabaseClient';

// Primeiro "pedaço" do valor, sem barra no final (protege contra espaço ou linha a mais na variável)
const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:5018').trim().split(/\s+/)[0].replace(/\/+$/, '');

// Token JWT da sessão atual do Supabase. A API valida esse token
// e descobre sozinha quem é o usuário — o frontend não informa o id.
async function obterToken() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sessão expirada. Faça login novamente.');
  return token;
}

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

// No plano grátis do Render a API "dorme" depois de 15 min sem uso e leva
// cerca de 1 minuto para acordar. Esta chamada leve já começa a acordá-la
// assim que o app abre, antes de o aluno precisar dela.
let jaAcordou = false;
export function acordarApi() {
  if (jaAcordou) return;
  jaAcordou = true;
  fetch(`${API_URL}/saude`, { cache: 'no-store' }).catch(() => {});
}

// Espera a API responder no /saude (até ~75 s). true = está no ar.
async function esperarApiAcordar(limiteMs = 75_000) {
  const inicio = Date.now();
  while (Date.now() - inicio < limiteMs) {
    try {
      const resposta = await fetch(`${API_URL}/saude`, { cache: 'no-store' });
      if (resposta.ok) return true;
    } catch {
      // ainda acordando: tenta de novo daqui a pouco
    }
    await esperar(4000);
  }
  return false;
}

async function requisicao(caminho, { metodo = 'GET', corpo } = {}) {
  const headers = { Authorization: `Bearer ${await obterToken()}` };
  if (corpo !== undefined) headers['Content-Type'] = 'application/json';

  const enviar = () =>
    fetch(`${API_URL}${caminho}`, {
      method: metodo,
      headers,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });

  let resposta;
  try {
    resposta = await enviar();
  } catch {
    // fetch só falha quando não recebe resposta utilizável: API dormindo, sem internet
    // ou erro no servidor sem cabeçalhos de CORS. Espera a API acordar e tenta uma vez mais.
    const noAr = await esperarApiAcordar();
    if (!noAr) {
      throw new Error('Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.');
    }
    try {
      resposta = await enviar();
    } catch {
      throw new Error('O servidor está no ar, mas não conseguiu concluir o pedido. Tente de novo em instantes.');
    }
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
    const erro = new Error(corpo?.mensagem ?? `Erro na API: ${resposta.status}`);
    erro.status = resposta.status; // ex.: 404 = conversa não existe mais
    throw erro;
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

// Conversas e mensagens (sincronizadas entre celular, tablet e PC)
export const conversasApi = {
  listar: () => requisicao('/api/conversas'),
  obter: (id) => requisicao(`/api/conversas/${id}`),
  criar: (materia, estilo) => requisicao('/api/conversas', { metodo: 'POST', corpo: { materia, estilo } }),
  salvarMensagens: (id, mensagens) =>
    requisicao(`/api/conversas/${id}/mensagens`, { metodo: 'PUT', corpo: { mensagens } }),
  salvarEstilo: (id, estilo) => requisicao(`/api/conversas/${id}/estilo`, { metodo: 'PUT', corpo: { estilo } }),
  importar: (conversas) => requisicao('/api/conversas/importar', { metodo: 'POST', corpo: { conversas } }),
};

// Resultados dos exercícios (tela de Desempenho)
export const resultadosApi = {
  listar: () => requisicao('/api/resultados'),
  registrar: (materia, total, acertos, topicosErrados) =>
    requisicao('/api/resultados', { metodo: 'POST', corpo: { materia, total, acertos, topicosErrados } }),
  importar: (resultados) => requisicao('/api/resultados/importar', { metodo: 'POST', corpo: { resultados } }),
};

// Dias estudados (sequência de dias seguidos)
export const estudosApi = {
  listarDias: () => requisicao('/api/estudos/dias'),
  registrarDias: (dias) => requisicao('/api/estudos/dias', { metodo: 'POST', corpo: { dias } }),
};
