// Dados de motivação: cor de cada matéria e sequência de dias estudados.

// Paleta de matérias. A cor é escolhida a partir do nome, então a mesma
// matéria sempre tem a mesma cor (as cores de verdade ficam no CSS: .tema-materia-N).
const TOTAL_CORES_MATERIA = 6;

export function indiceCorMateria(materia = '') {
  const nome = materia.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < nome.length; i++) {
    hash = (hash * 31 + nome.charCodeAt(i)) >>> 0;
  }
  return hash % TOTAL_CORES_MATERIA;
}

export function classeMateria(materia) {
  return `tema-materia-${indiceCorMateria(materia)}`;
}

// "Cálculo I" -> "Cá"
export function siglaMateria(materia = '') {
  const limpo = materia.trim();
  return limpo ? limpo.slice(0, 2) : '?';
}

// ---------- Sequência de dias estudados ----------

function chave(userId) {
  return `estudai_dias_${userId}`;
}

function paraDia(data) {
  const d = new Date(data);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function carregarDias(userId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(chave(userId)) ?? '[]'));
  } catch {
    return new Set();
  }
}

// Chamado sempre que o aluno estuda (manda mensagem, faz exercícios)
export function registrarDiaDeEstudo(userId) {
  const dias = carregarDias(userId);
  dias.add(paraDia(new Date()));
  try {
    localStorage.setItem(chave(userId), JSON.stringify([...dias]));
  } catch {
    // sem localStorage: a sequência só não fica salva
  }
}

// Dias estudados = os registrados + os dias em que alguma conversa foi atualizada
// (assim quem já usava o app antes dessa função também vê a sua sequência)
function diasEstudados(userId, conversas) {
  const dias = carregarDias(userId);
  conversas.forEach((c) => {
    if (c.mensagens?.some((m) => m.autor === 'usuario')) dias.add(paraDia(c.atualizadaEm));
  });
  return dias;
}

export function calcularSequencia(userId, conversas) {
  const dias = diasEstudados(userId, conversas);
  const hoje = new Date();

  // A sequência continua valendo se a pessoa estudou ontem e ainda não estudou hoje
  const cursor = new Date(hoje);
  if (!dias.has(paraDia(cursor))) cursor.setDate(cursor.getDate() - 1);

  let sequencia = 0;
  while (dias.has(paraDia(cursor))) {
    sequencia++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Semana atual, de segunda a domingo
  const segunda = new Date(hoje);
  segunda.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
  const letras = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  const semana = letras.map((letra, i) => {
    const dia = new Date(segunda);
    dia.setDate(segunda.getDate() + i);
    return {
      letra,
      feito: dias.has(paraDia(dia)),
      hoje: paraDia(dia) === paraDia(hoje),
    };
  });

  return { sequencia, estudouHoje: dias.has(paraDia(hoje)), semana };
}
