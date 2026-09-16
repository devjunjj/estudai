// Conversas salvas no navegador, por usuário logado.

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
}

export function listarConversas(userId) {
  return carregarTodas(userId).sort((a, b) => new Date(b.atualizadaEm) - new Date(a.atualizadaEm));
}

export function criarConversa(userId, materia) {
  const conversas = carregarTodas(userId);
  const nova = {
    id: `conv_${Date.now()}`,
    materia,
    mensagens: [],
    criadaEm: new Date().toISOString(),
    atualizadaEm: new Date().toISOString(),
  };
  conversas.push(nova);
  salvarTodas(userId, conversas);
  return nova;
}

export function carregarConversa(userId, id) {
  return carregarTodas(userId).find((c) => c.id === id) ?? null;
}

export function salvarMensagens(userId, id, mensagens) {
  const conversas = carregarTodas(userId);
  const idx = conversas.findIndex((c) => c.id === id);
  if (idx === -1) return;
  conversas[idx].mensagens = mensagens;
  conversas[idx].atualizadaEm = new Date().toISOString();
  salvarTodas(userId, conversas);
}
