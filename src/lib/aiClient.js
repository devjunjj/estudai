// Ponto único de integração com a IA.
//
// O navegador NÃO fala com o Gemini: ele chama a API em C# (POST /api/ia/gerar),
// que exige login, limita o número de pedidos por minuto e guarda a chave da IA
// só no servidor. Aqui ficam apenas os prompts de cada funcionalidade.

import { iaApi } from './api';

// arquivo (opcional): { mimeType, dadosBase64 } para áudio
async function chamarIA(prompt, arquivo = null) {
  const { texto } = await iaApi.gerar(prompt, arquivo);
  return texto ?? '';
}

// Como a IA deve escrever em cada estilo escolhido pelo aluno
const INSTRUCOES_ESTILO = {
  direto: `Responda de forma CURTA: no máximo 2 parágrafos curtos (ou até 4 tópicos).
Vá direto ao essencial e use no máximo um exemplo rápido. Não faça introdução.`,
  equilibrado: `Responda com tamanho MÉDIO: a ideia principal primeiro, depois um exemplo concreto.
Use blocos curtos (parágrafos de 2 a 3 linhas ou tópicos) e destaque em **negrito** os termos-chave.`,
  detalhado: `Responda de forma DETALHADA: explique passo a passo, mostrando o porquê de cada etapa,
com exemplos e os erros mais comuns. Mesmo longa, organize em seções curtas com títulos e tópicos,
para a leitura não cansar.`,
};

// Regras que valem para qualquer estilo: o texto nunca pode desanimar quem está estudando
const REGRAS_GERAIS = `Regras de escrita:
- Comece pela resposta, sem frases de introdução como "Ótima pergunta".
- Parágrafos curtos; nada de blocos enormes de texto.
- Linguagem simples, como um bom professor falando com o aluno.
- Termine com UMA pergunta curta para checar se o aluno entendeu ou oferecendo aprofundar um ponto.`;

export async function askStudyAssistant({ materia, historico, estilo = 'equilibrado' }) {
  const contexto = historico
    .map((m) => `${m.autor === 'usuario' ? 'Aluno' : 'Tutor'}: ${m.texto}`)
    .join('\n');

  const prompt = `Você é um tutor paciente e didático ensinando ${materia} para um aluno.
Continue a conversa abaixo respondendo à última mensagem do aluno.

${INSTRUCOES_ESTILO[estilo] ?? INSTRUCOES_ESTILO.equilibrado}

${REGRAS_GERAIS}

${contexto}
Tutor:`;

  return chamarIA(prompt);
}

export async function gerarExercicios({ materia, quantidade = 5, contexto = '' }) {
  const blocoContexto = contexto
    ? `\nLeve em conta o que já foi conversado com o aluno, focando nos temas discutidos:\n"""\n${contexto}\n"""\n`
    : '';

  const prompt = `Gere ${quantidade} questões de múltipla escolha sobre ${materia},
de dificuldade progressiva, cada uma com 3 alternativas (apenas uma correta).
${blocoContexto}
Cada questão deve ter um campo "topico": um subtema curto (2-4 palavras) dentro de ${materia}
que aquela questão avalia (ex: "Gestão da qualidade", "Derivadas", "Lei de Ohm").
Responda SOMENTE em JSON válido, no formato:
[{"pergunta": "...", "alternativas": ["...", "...", "..."], "correta": 0, "topico": "..."}]
Sem markdown, sem texto adicional, apenas o JSON.`;

  const textoResposta = await chamarIA(prompt);
  const limpo = textoResposta.replace(/```json|```/g, '').trim();
  return JSON.parse(limpo);
}

// Resume um texto colado/enviado pelo aluno de forma clara e didática
export async function summarizeText({ materia, texto, estilo = 'equilibrado' }) {
  const prompt = `Você é um tutor de ${materia}. Resuma o texto abaixo de forma clara
e didática para um aluno entender com facilidade. Use tópicos curtos quando ajudar
a organizar as ideias. Seja fiel ao conteúdo original, sem inventar informações.

${INSTRUCOES_ESTILO[estilo] ?? INSTRUCOES_ESTILO.equilibrado}

Texto:
"""
${texto}
"""

Resumo claro:`;

  return chamarIA(prompt);
}

// Transcreve e explica um arquivo de áudio enviado pelo aluno.
// arquivoBase64: string base64 (sem o prefixo "data:...;base64,")
// mimeType: ex. "audio/mpeg", "audio/mp4", "audio/wav"
export async function explainAudio({ materia, arquivoBase64, mimeType, estilo = 'equilibrado' }) {
  const prompt = `Você é um tutor de ${materia}. Ouça o áudio a seguir, transcreva
o conteúdo principal e depois explique de forma clara e didática o que foi dito,
como se estivesse ensinando um aluno. Estruture a resposta em duas partes:
"Transcrição:" e "Explicação:". Na explicação, siga este tamanho:
${INSTRUCOES_ESTILO[estilo] ?? INSTRUCOES_ESTILO.equilibrado}`;

  return chamarIA(prompt, { mimeType, dadosBase64: arquivoBase64 });
}