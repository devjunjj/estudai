// Anotações são salvas por matéria, assim cada assunto tem seu próprio bloco de notas.

function chave(materia) {
  return `estudai_notas_${materia.trim().toLowerCase()}`;
}

export function carregarNotas(materia) {
  try {
    const bruto = localStorage.getItem(chave(materia));
    return bruto ? JSON.parse(bruto) : [];
  } catch {
    return [];
  }
}

export function salvarNota(materia, textoNota) {
  const notas = carregarNotas(materia);
  const novaNota = {
    id: Date.now(),
    texto: textoNota,
    criadaEm: new Date().toISOString(),
  };
  const atualizadas = [novaNota, ...notas];
  localStorage.setItem(chave(materia), JSON.stringify(atualizadas));
  return atualizadas;
}

export function removerNota(materia, id) {
  const atualizadas = carregarNotas(materia).filter((n) => n.id !== id);
  localStorage.setItem(chave(materia), JSON.stringify(atualizadas));
  return atualizadas;
}
