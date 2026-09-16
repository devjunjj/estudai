// Histórico de resultados de exercícios, salvo por usuário + matéria,
// para alimentar a aba de Desempenho.

function chave(userId, materia) {
  return `estudai_desempenho_${userId}_${materia.trim().toLowerCase()}`;
}

export function listarResultados(userId, materia) {
  try {
    const bruto = localStorage.getItem(chave(userId, materia));
    return bruto ? JSON.parse(bruto) : [];
  } catch {
    return [];
  }
}

export function registrarResultado(userId, materia, { total, acertos, topicosErrados }) {
  const resultados = listarResultados(userId, materia);
  resultados.push({
    id: Date.now(),
    data: new Date().toISOString(),
    total,
    acertos,
    percentual: Math.round((acertos / total) * 100),
    topicosErrados,
  });
  localStorage.setItem(chave(userId, materia), JSON.stringify(resultados));
  return resultados;
}
