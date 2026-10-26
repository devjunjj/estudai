import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft,
  ArrowUp,
  BookmarkPlus,
  ChartColumn,
  FileText,
  ListChecks,
  Maximize2,
  Mic,
  Minimize2,
  NotebookPen,
  Sparkles,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import Gaveta from '../components/Gaveta';
import NotesPanel from '../components/NotesPanel';
import { askStudyAssistant, explainAudio, summarizeText } from '../lib/aiClient';
import { notasApi } from '../lib/api';
import { carregarConversa, salvarEstilo, salvarMensagens } from '../lib/conversationsStore';
import { classeMateria, registrarDiaDeEstudo } from '../lib/estudos';
import { tituloConversa } from '../lib/formatacao';
import { listarResultados } from '../lib/performanceStore';
import { useMediaQuery } from '../lib/useMediaQuery';
import {
  ESTILOS,
  ORDEM_ESTILOS,
  estiloMaisCurto,
  estiloMaisLongo,
  salvarEstiloPreferido,
} from '../lib/preferencias';

const ERRO_IA = 'Não consegui responder agora. Tenta de novo em instantes.';

function arquivoParaBase64(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result.split(',')[1]);
    leitor.onerror = reject;
    leitor.readAsDataURL(arquivo);
  });
}

function mensagemInicial(materia) {
  return {
    autor: 'ia',
    texto: `Vamos estudar **${materia}**! O que você já sabe sobre o tema, ou por onde quer começar?`,
    boasVindas: true,
  };
}

// Resumo do desempenho na matéria, mostrado no painel lateral do PC
function ResumoDesempenho({ userId, materia, onPraticar }) {
  const resultados = listarResultados(userId, materia);

  if (resultados.length === 0) {
    return (
      <section className="resumo-desempenho">
        <h2>Seu desempenho</h2>
        <p>Faça uma rodada de exercícios para ver aqui seus acertos e o que vale revisar.</p>
        <button type="button" className="btn btn-escuro btn-bloco" onClick={onPraticar}>
          Gerar exercícios
        </button>
      </section>
    );
  }

  const media = Math.round(resultados.reduce((soma, r) => soma + r.percentual, 0) / resultados.length);
  const contagem = {};
  resultados.forEach((r) => (r.topicosErrados || []).forEach((t) => (contagem[t] = (contagem[t] || 0) + 1)));
  const revisar = Object.entries(contagem)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);

  return (
    <section className="resumo-desempenho">
      <h2>Seu desempenho</h2>
      <div className="numero-grande">
        <strong>{media}%</strong> de acertos em {materia}
      </div>
      <div className="barra" aria-hidden="true">
        <div className="barra-preenchida" style={{ width: `${media}%` }} />
      </div>
      {revisar.length > 0 && (
        <>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Vale revisar</span>
          <ul className="topicos">
            {revisar.map((t) => (
              <li key={t} className="topico">{t}</li>
            ))}
          </ul>
        </>
      )}
      <button type="button" className="btn btn-escuro btn-bloco" onClick={onPraticar}>
        {revisar.length > 0 ? 'Praticar esses tópicos' : 'Fazer mais exercícios'}
      </button>
    </section>
  );
}

function ConversaDeEstudo({ userId, conversaId }) {
  const navigate = useNavigate();
  const fimRef = useRef(null);
  const campoRef = useRef(null);
  const arquivoTextoRef = useRef(null);
  const arquivoAudioRef = useRef(null);

  const [conversa] = useState(() => carregarConversa(userId, conversaId));
  const [mensagens, setMensagens] = useState(() =>
    conversa?.mensagens.length ? conversa.mensagens : conversa ? [mensagemInicial(conversa.materia)] : []
  );
  const [estilo, setEstilo] = useState(conversa?.estilo);
  const [input, setInput] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [notasAbertas, setNotasAbertas] = useState(false);
  const [versaoNotas, setVersaoNotas] = useState(0);
  const [avisoNota, setAvisoNota] = useState('');
  const telaGrande = useMediaQuery('(min-width: 1200px)');
  const telaMedia = useMediaQuery('(min-width: 768px)');

  const materia = conversa?.materia;

  // Conversa inexistente (link antigo, outro navegador): volta para o início
  useEffect(() => {
    if (!conversa) navigate('/', { replace: true });
  }, [conversa, navigate]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensagens, carregando]);

  // Veio do resultado dos exercícios com uma pergunta pendente ("me ensine o que errei")
  useEffect(() => {
    if (!conversa) return;
    const pendente = sessionStorage.getItem('estudai_pergunta_pendente');
    if (!pendente) return;
    sessionStorage.removeItem('estudai_pergunta_pendente');
    perguntar(pendente);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!conversa) return null;

  function atualizarMensagens(novaLista) {
    setMensagens(novaLista);
    // a mensagem de boas-vindas é só visual, não precisa ser salva
    salvarMensagens(userId, conversaId, novaLista.filter((m) => !m.boasVindas));
  }

  async function responder(historico, estiloDaResposta = estilo) {
    setCarregando(true);
    try {
      const { texto, sugestoes } = await askStudyAssistant({ materia, historico, estilo: estiloDaResposta });
      atualizarMensagens([...historico, { autor: 'ia', texto, sugestoes }]);
    } catch {
      atualizarMensagens([...historico, { autor: 'ia', texto: ERRO_IA, erro: true }]);
    } finally {
      setCarregando(false);
    }
  }

  function perguntar(texto) {
    const limpo = texto.trim();
    if (!limpo || carregando) return;
    registrarDiaDeEstudo(userId);
    setAvisoNota('');
    const historico = [...mensagens, { autor: 'usuario', texto: limpo }];
    atualizarMensagens(historico);
    responder(historico);
  }

  function enviar(e) {
    e.preventDefault();
    perguntar(input);
    setInput('');
    if (campoRef.current) campoRef.current.style.height = 'auto';
  }

  // Enter envia; Shift+Enter quebra a linha
  function aoTeclar(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      enviar(e);
    }
  }

  // O campo cresce conforme o texto, até um limite
  function aoDigitar(e) {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  }

  function trocarEstilo(novoEstilo) {
    setEstilo(novoEstilo);
    salvarEstilo(userId, conversaId, novoEstilo);
    salvarEstiloPreferido(userId, novoEstilo);
  }

  // "Mais curto" / "Explica melhor": refaz a última resposta no novo estilo
  function refazerResposta(novoEstilo) {
    if (!novoEstilo || carregando) return;
    trocarEstilo(novoEstilo);
    setAvisoNota('');
    const historico = mensagens.slice(0, -1); // tira a última resposta da IA
    setMensagens(historico);
    responder(historico, novoEstilo);
  }

  async function salvarNasAnotacoes(texto) {
    setAvisoNota('');
    try {
      // tira os símbolos de formatação (**negrito**, # título, `código`) para a nota ficar limpa
      const limpo = texto.replace(/\*\*|__|`/g, '').replace(/^#+\s*/gm, '').trim();
      await notasApi.criar(materia, limpo.slice(0, 5000));
      setVersaoNotas((v) => v + 1);
      setAvisoNota('Salvo nas anotações.');
    } catch (e) {
      setAvisoNota(e.message);
    }
  }

  async function aoEscolherTexto(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo || carregando) return;
    registrarDiaDeEstudo(userId);

    const conteudo = await arquivo.text();
    const comAnexo = [...mensagens, { autor: 'usuario', texto: `Enviou o texto "${arquivo.name}" para resumir.`, anexo: true }];
    atualizarMensagens(comAnexo);
    setCarregando(true);
    try {
      const resumo = await summarizeText({ materia, texto: conteudo, estilo });
      atualizarMensagens([...comAnexo, { autor: 'ia', texto: resumo }]);
    } catch {
      atualizarMensagens([...comAnexo, { autor: 'ia', texto: 'Não consegui resumir esse texto agora. Tenta de novo.', erro: true }]);
    } finally {
      setCarregando(false);
    }
  }

  async function aoEscolherAudio(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo || carregando) return;
    registrarDiaDeEstudo(userId);

    const comAnexo = [...mensagens, { autor: 'usuario', texto: `Enviou o áudio "${arquivo.name}" para explicar.`, anexo: true }];
    atualizarMensagens(comAnexo);
    setCarregando(true);
    try {
      const base64 = await arquivoParaBase64(arquivo);
      const explicacao = await explainAudio({ materia, arquivoBase64: base64, mimeType: arquivo.type || 'audio/mpeg', estilo });
      atualizarMensagens([...comAnexo, { autor: 'ia', texto: explicacao }]);
    } catch {
      atualizarMensagens([...comAnexo, { autor: 'ia', texto: 'Não consegui ouvir esse áudio agora. Tenta de novo.', erro: true }]);
    } finally {
      setCarregando(false);
    }
  }

  function abrirExercicios() {
    localStorage.setItem('estudai_materia', materia);
    const contexto = mensagens
      .filter((m) => m.texto && !m.boasVindas)
      .map((m) => `${m.autor === 'usuario' ? 'Aluno' : 'Tutor'}: ${m.texto}`)
      .join('\n');
    sessionStorage.setItem('estudai_exercicios_contexto', contexto);
    navigate('/exercicios');
  }

  function abrirDesempenho() {
    localStorage.setItem('estudai_materia', materia);
    navigate('/desempenho');
  }

  const ultima = mensagens[mensagens.length - 1];
  const anterior = mensagens[mensagens.length - 2];
  // Os ajustes de tamanho só aparecem na última resposta, e só se ela respondeu a uma pergunta digitada
  const podeAjustar = !carregando && ultima?.autor === 'ia' && !ultima.erro && !ultima.boasVindas && anterior?.autor === 'usuario' && !anterior.anexo;
  const maisCurto = estiloMaisCurto(estilo);
  const maisLongo = estiloMaisLongo(estilo);
  const titulo = tituloConversa({ mensagens });

  return (
    <div className={`chat ${classeMateria(materia)}`}>
      <section className="chat-principal" aria-label="Conversa">
        <header className="chat-topo">
          <button type="button" className="btn-icone so-celular" onClick={() => navigate('/')} aria-label="Voltar para o início">
            <ArrowLeft size={22} aria-hidden="true" />
          </button>
          <div className="chat-topo-titulo">
            <span className="chat-topo-materia">{materia}</span>
            <h1>{titulo === 'Conversa nova' ? 'Nova conversa' : titulo}</h1>
          </div>
          <div className="chat-topo-acoes">
            <button type="button" className="btn-icone contorno sem-painel" onClick={() => setNotasAbertas(true)} aria-label="Anotações">
              <NotebookPen size={19} aria-hidden="true" />
            </button>
            <button type="button" className="btn-icone contorno sem-painel" onClick={abrirDesempenho} aria-label="Desempenho">
              <ChartColumn size={19} aria-hidden="true" />
            </button>
            <button type="button" className="btn btn-primario so-tablet-pc" onClick={abrirExercicios}>
              <ListChecks size={18} aria-hidden="true" /> Gerar exercícios
            </button>
            <button type="button" className="btn-icone btn-suave so-celular" onClick={abrirExercicios} aria-label="Gerar exercícios">
              <ListChecks size={20} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="chat-mensagens" aria-live="polite">
          <div className="chat-coluna">
            {mensagens.map((m, i) =>
              m.autor === 'usuario' ? (
                <div key={i} className="msg-aluno">{m.texto}</div>
              ) : (
                <div key={i} className="msg-ia">
                  <span className="msg-ia-avatar" aria-hidden="true">
                    <Sparkles size={16} fill="currentColor" />
                  </span>
                  <div className="msg-ia-corpo">
                    <div className="resposta-ia">
                      <ReactMarkdown>{m.texto}</ReactMarkdown>
                    </div>
                    {i === mensagens.length - 1 && !carregando && m.sugestoes?.length > 0 && (
                      <div className="sugestoes-resposta" role="group" aria-label="Respostas rápidas">
                        {m.sugestoes.map((sugestao) => (
                          <button key={sugestao} type="button" className="pilula" onClick={() => perguntar(sugestao)}>
                            {sugestao}
                          </button>
                        ))}
                      </div>
                    )}
                    {i === mensagens.length - 1 && podeAjustar && (
                      <div className="acoes-resposta">
                        {maisCurto && (
                          <button type="button" className="pilula contorno" onClick={() => refazerResposta(maisCurto)}>
                            <Minimize2 size={14} aria-hidden="true" /> Mais curto
                          </button>
                        )}
                        {maisLongo && (
                          <button type="button" className="pilula contorno" onClick={() => refazerResposta(maisLongo)}>
                            <Maximize2 size={14} aria-hidden="true" /> Explica melhor
                          </button>
                        )}
                        <button type="button" className="pilula contorno" onClick={() => salvarNasAnotacoes(m.texto)}>
                          <BookmarkPlus size={14} aria-hidden="true" /> Salvar nas anotações
                        </button>
                        {avisoNota && <span role="status" className="texto-suave" style={{ fontSize: 13, alignSelf: 'center' }}>{avisoNota}</span>}
                      </div>
                    )}
                  </div>
                </div>
              )
            )}

            {carregando && (
              <div className="msg-ia">
                <span className="msg-ia-avatar" aria-hidden="true">
                  <Sparkles size={16} fill="currentColor" />
                </span>
                <div className="indicador-pensando" role="status">
                  Pensando
                  <span className="pontos-pensando" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              </div>
            )}
            <div ref={fimRef} />
          </div>
        </div>

        <form className="chat-entrada" onSubmit={enviar}>
          <div className="chat-coluna">
            <div className="chat-entrada-linha">
              <label className="seletor-estilo">
                Respostas:
                <select value={estilo} onChange={(e) => trocarEstilo(e.target.value)} aria-label="Tamanho das respostas">
                  {ORDEM_ESTILOS.map((chave) => (
                    <option key={chave} value={chave}>{ESTILOS[chave].rotulo}</option>
                  ))}
                </select>
              </label>
              <button type="button" className="pilula" onClick={() => perguntar('Me dá outro exemplo sobre isso?')} disabled={carregando}>
                Outro exemplo
              </button>
              <button type="button" className="pilula" onClick={() => perguntar('Pode resumir o que estudamos até agora em tópicos?')} disabled={carregando}>
                Resumir a conversa
              </button>
            </div>

            <div className="caixa-mensagem">
              <button type="button" className="btn-icone" onClick={() => arquivoTextoRef.current?.click()} aria-label="Enviar texto para resumir (.txt ou .md)" disabled={carregando}>
                <FileText size={20} aria-hidden="true" />
              </button>
              <label htmlFor="campo-mensagem" className="so-leitor">Mensagem</label>
              <textarea
                id="campo-mensagem"
                ref={campoRef}
                rows={1}
                placeholder={telaMedia ? `Pergunte sobre ${materia}…` : 'Digite sua dúvida…'}
                value={input}
                onChange={aoDigitar}
                onKeyDown={aoTeclar}
              />
              <button type="button" className="btn-icone" onClick={() => arquivoAudioRef.current?.click()} aria-label="Enviar áudio para explicar" disabled={carregando}>
                <Mic size={20} aria-hidden="true" />
              </button>
              <button type="submit" className="btn-icone btn-enviar" disabled={!input.trim() || carregando} aria-label="Enviar mensagem">
                <ArrowUp size={20} strokeWidth={2.4} aria-hidden="true" />
              </button>
              <input ref={arquivoTextoRef} type="file" accept=".txt,.md" onChange={aoEscolherTexto} hidden />
              <input ref={arquivoAudioRef} type="file" accept="audio/*" onChange={aoEscolherAudio} hidden />
            </div>
          </div>
        </form>
      </section>

      {/* PC: anotações e desempenho sempre visíveis ao lado */}
      {telaGrande && (
        <aside className="painel-chat" aria-label="Anotações e desempenho">
          <NotesPanel userId={userId} materia={materia} versao={versaoNotas} />
          <ResumoDesempenho userId={userId} materia={materia} onPraticar={abrirExercicios} />
        </aside>
      )}

      {/* Tablet e celular: anotações numa gaveta */}
      <Gaveta titulo={`Anotações · ${materia}`} aberta={notasAbertas && !telaGrande} onFechar={() => setNotasAbertas(false)}>
        <NotesPanel userId={userId} materia={materia} mostrarTitulo={false} versao={versaoNotas} />
      </Gaveta>
    </div>
  );
}

export default function Chat({ conversaId }) {
  return (
    <AppLayout semAbasNoCelular>
      {(usuario) =>
        usuario.carregando ? null : <ConversaDeEstudo userId={usuario.userId} conversaId={conversaId} />
      }
    </AppLayout>
  );
}
