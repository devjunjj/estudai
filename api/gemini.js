// Função serverless da Vercel (roda no servidor, não no navegador).
// A chave GEMINI_API_KEY é lida de uma variável de ambiente SEM o prefixo
// VITE_ — por isso ela nunca é incluída no código enviado ao navegador.
// Configure essa variável apenas no painel da Vercel (Settings > Environment Variables).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor.' });
    return;
  }

  const model = 'gemini-3.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const respostaGemini = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const dados = await respostaGemini.json();
    res.status(respostaGemini.status).json(dados);
  } catch (erro) {
    res.status(500).json({ error: 'Falha ao contatar a API do Gemini.' });
  }
}