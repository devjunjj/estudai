// Importação única dos dados que ficavam só no navegador (antes da sincronização).
// Roda no primeiro acesso de cada aparelho: envia conversas, resultados e dias
// para a API, que ignora o que já foi importado (não cria duplicatas).

import { conversasApi, estudosApi, resultadosApi } from './api';

function lerJson(chave, padrao) {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? JSON.parse(bruto) : padrao;
  } catch {
    return padrao;
  }
}

function paraDia(data) {
  const d = new Date(data);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function importarDadosLocais(userId) {
  const chaveFeito = `estudai_importado_${userId}`;
  if (localStorage.getItem(chaveFeito)) return;

  // Conversas (com as mensagens)
  const conversas = lerJson(`estudai_conversas_${userId}`, []);
  const conversasParaEnviar = conversas.map((c) => ({
    idLocal: String(c.id),
    materia: c.materia,
    estilo: c.estilo ?? null,
    criadaEm: c.criadaEm,
    atualizadaEm: c.atualizadaEm ?? c.criadaEm,
    mensagens: (c.mensagens ?? [])
      .filter((m) => m.texto && (m.autor === 'usuario' || m.autor === 'ia'))
      .map((m) => ({
        autor: m.autor,
        texto: m.texto,
        anexo: Boolean(m.anexo),
        erro: Boolean(m.erro),
        sugestoes: m.sugestoes ?? [],
      })),
  }));

  // Resultados: ficavam numa chave por matéria (em minúsculas); recupera o nome original pelas conversas
  const nomePorChave = new Map(conversas.map((c) => [c.materia.trim().toLowerCase(), c.materia]));
  const prefixo = `estudai_desempenho_${userId}_`;
  const resultadosParaEnviar = [];
  for (let i = 0; i < localStorage.length; i++) {
    const chave = localStorage.key(i);
    if (!chave?.startsWith(prefixo)) continue;
    const materiaChave = chave.slice(prefixo.length);
    const materia = nomePorChave.get(materiaChave) ?? materiaChave;
    lerJson(chave, []).forEach((r) => {
      resultadosParaEnviar.push({
        idLocal: `${materiaChave}-${r.id}`,
        materia,
        data: r.data,
        total: r.total,
        acertos: r.acertos,
        topicosErrados: r.topicosErrados ?? [],
      });
    });
  }

  // Dias estudados: os registrados + os dias em que alguma conversa teve mensagem do aluno
  const dias = new Set(lerJson(`estudai_dias_${userId}`, []));
  conversas.forEach((c) => {
    if (c.mensagens?.some((m) => m.autor === 'usuario')) dias.add(paraDia(c.atualizadaEm));
  });

  if (conversasParaEnviar.length) await conversasApi.importar(conversasParaEnviar);
  if (resultadosParaEnviar.length) await resultadosApi.importar(resultadosParaEnviar);
  if (dias.size) await estudosApi.registrarDias([...dias]);

  // Só marca como feito depois de tudo dar certo; se falhar, tenta de novo no próximo acesso
  localStorage.setItem(chaveFeito, new Date().toISOString());
}
