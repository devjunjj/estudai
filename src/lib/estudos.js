import { estudosApi } from './api';

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


// Data local no formato aaaa-mm-dd (a "virada do dia" é a do aluno, não a do servidor)
export function paraDia(data) {
  const d = new Date(data);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Chamado sempre que o aluno estuda (manda mensagem, faz exercícios).
// Salva na API e avisa as outras telas para atualizar a sequência.
let ultimoDiaRegistrado = null;
export function registrarDiaDeEstudo() {
  const hoje = paraDia(new Date());
  if (ultimoDiaRegistrado === hoje) return; // um registro por dia basta
  ultimoDiaRegistrado = hoje;
  estudosApi
    .registrarDias([hoje])
    .then(() => window.dispatchEvent(new Event('estudai:dias')))
    .catch(() => {
      ultimoDiaRegistrado = null; // tenta de novo na próxima mensagem
    });
}

// dias: lista de "aaaa-mm-dd" vinda da API
export function calcularSequencia(diasEstudados = []) {
  const dias = new Set(diasEstudados);
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

// Média de acertos e tópicos mais errados de uma matéria, a partir dos resultados da API
export function resumoDaMateria(resultados = [], materia) {
  const daMateria = resultados.filter((r) => r.materia === materia);
  const media = daMateria.length
    ? Math.round(daMateria.reduce((soma, r) => soma + r.percentual, 0) / daMateria.length)
    : null;
  const contagem = {};
  daMateria.forEach((r) => (r.topicosErrados || []).forEach((t) => (contagem[t] = (contagem[t] || 0) + 1)));
  const topicos = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
  return { resultados: daMateria, media, topicos };
}
