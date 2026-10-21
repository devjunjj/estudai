// Anotações salvas por usuário + matéria: cada aluno tem seu próprio
// bloco de notas para cada assunto, mesmo usando o mesmo navegador.

function chave(userId, materia) {
  return `estudai_notas_${userId}_${materia.trim().toLowerCase()}`;
}

export function carregarNotas(userId, materia) {
  try {
    const bruto = localStorage.getItem(chave(userId, materia));
    return bruto ? JSON.parse(bruto) : [];
  } catch {
    return [];
  }
}

export function salvarNota(userId, materia, textoNota) {
  const notas = carregarNotas(userId, materia);
  const novaNota = {
    id: Date.now(),
    texto: textoNota,
    criadaEm: new Date().toISOString(),
  };
  const atualizadas = [novaNota, ...notas];
  localStorage.setItem(chave(userId, materia), JSON.stringify(atualizadas));
  return atualizadas;
}

export function removerNota(userId, materia, id) {
  const atualizadas = carregarNotas(userId, materia).filter((n) => n.id !== id);
  localStorage.setItem(chave(userId, materia), JSON.stringify(atualizadas));
  return atualizadas;
}
