// Ponto único de integração com a IA.
//
// Em DESENVOLVIMENTO (npm run dev): chama o Gemini direto do navegador,
// usando a chave em VITE_GEMINI_API_KEY do seu .env local — só pra facilitar
// o teste no seu próprio computador.
//
// Em PRODUÇÃO (site publicado na Vercel): chama a função serverless em
// /api/gemini.js, que guarda a chave real no servidor (GEMINI_API_KEY,
// configurada só no painel da Vercel). Assim a chave nunca aparece no
// código que roda no navegador de quem visita o site.

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL = 'gemini-3.5-flash-lite';
const BASE_URL_DIRETO = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const USAR_PROXY = !import.meta.env.DEV;

// parts pode misturar texto e arquivos (áudio/imagem) numa única chamada
async function chamarGemini(parts) {
  if (!USAR_PROXY && !API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY não configurada. Veja o arquivo .env.example.');
  }

  const corpo = JSON.stringify({ contents: [{ parts }] });

  const resposta = USAR_PROXY
    ? await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: corpo,
      })
    : await fetch(`${BASE_URL_DIRETO}?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: corpo,
      });

  if (!resposta.ok) {
    throw new Error(`Erro na API do Gemini: ${resposta.status}`);
  }

  const dados = await resposta.json();
  return dados.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
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

  return chamarGemini([{ text: prompt }]);
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

  const textoResposta = await chamarGemini([{ text: prompt }]);
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

  return chamarGemini([{ text: prompt }]);
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

  return chamarGemini([
    { text: prompt },
    { inline_data: { mime_type: mimeType, data: arquivoBase64 } },
  ]);
}