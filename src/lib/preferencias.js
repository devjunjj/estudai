// Estilos de resposta da IA. O aluno escolhe ao criar a conversa e pode
// ajustar a qualquer momento ("Mais curto" / "Explica melhor").

export const ESTILOS = {
  direto: {
    rotulo: 'Direto ao ponto',
    descricao: 'Respostas curtas, só o essencial e um exemplo rápido.',
  },
  equilibrado: {
    rotulo: 'Equilibrado',
    descricao: 'Explicação clara em blocos curtos, com exemplo.',
  },
  detalhado: {
    rotulo: 'Bem detalhado',
    descricao: 'Passo a passo completo, com o porquê de cada etapa.',
  },
};

export const ORDEM_ESTILOS = ['direto', 'equilibrado', 'detalhado'];
export const ESTILO_PADRAO = 'equilibrado';

export function estiloValido(estilo) {
  return ORDEM_ESTILOS.includes(estilo) ? estilo : ESTILO_PADRAO;
}

// Um passo mais curto ou mais longo; null quando já está no limite
export function estiloMaisCurto(estilo) {
  const i = ORDEM_ESTILOS.indexOf(estiloValido(estilo));
  return i > 0 ? ORDEM_ESTILOS[i - 1] : null;
}

export function estiloMaisLongo(estilo) {
  const i = ORDEM_ESTILOS.indexOf(estiloValido(estilo));
  return i < ORDEM_ESTILOS.length - 1 ? ORDEM_ESTILOS[i + 1] : null;
}

function chave(userId) {
  return `estudai_estilo_${userId}`;
}

// Última escolha do aluno, para já vir marcada na próxima conversa
export function carregarEstiloPreferido(userId) {
  try {
    return estiloValido(localStorage.getItem(chave(userId)));
  } catch {
    return ESTILO_PADRAO;
  }
}

export function salvarEstiloPreferido(userId, estilo) {
  try {
    localStorage.setItem(chave(userId), estiloValido(estilo));
  } catch {
    // sem localStorage (modo privado): segue sem lembrar a preferência
  }
}
