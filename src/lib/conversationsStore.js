// Conversas salvas no navegador, por usuário logado.

import { estiloValido } from './preferencias';

function chave(userId) {
  return `estudai_conversas_${userId}`;
}

function carregarTodas(userId) {
  try {
    const bruto = localStorage.getItem(chave(userId));
    return bruto ? JSON.parse(bruto) : [];
  } catch {
    return [];
  }
}

function salvarTodas(userId, conversas) {
  localStorage.setItem(chave(userId), JSON.stringify(conversas));
  // avisa o resto do app (ex.: lista de recentes no menu) que algo mudou
  window.dispatchEvent(new Event('estudai:conversas'));
}

export function listarConversas(userId) {
  return carregarTodas(userId).sort((a, b) => new Date(b.atualizadaEm) - new Date(a.atualizadaEm));
}

export function criarConversa(userId, materia, estilo) {
  const conversas = carregarTodas(userId);
  const nova = {
    id: `conv_${Date.now()}`,
    materia,
    estilo: estiloValido(estilo),
    mensagens: [],
    criadaEm: new Date().toISOString(),
    atualizadaEm: new Date().toISOString(),
  };
  conversas.push(nova);
  salvarTodas(userId, conversas);
  return nova;
}

export function carregarConversa(userId, id) {
  const conversa = carregarTodas(userId).find((c) => c.id === id);
  // conversas antigas não tinham estilo: usam o padrão
  return conversa ? { ...conversa, estilo: estiloValido(conversa.estilo) } : null;
}

export function salvarEstilo(userId, id, estilo) {
  const conversas = carregarTodas(userId);
  const idx = conversas.findIndex((c) => c.id === id);
  if (idx === -1) return;
  conversas[idx].estilo = estiloValido(estilo);
  salvarTodas(userId, conversas);
}

export function salvarMensagens(userId, id, mensagens) {
  const conversas = carregarTodas(userId);
  const idx = conversas.findIndex((c) => c.id === id);
  if (idx === -1) return;
  conversas[idx].mensagens = mensagens;
  conversas[idx].atualizadaEm = new Date().toISOString();
  salvarTodas(userId, conversas);
}
