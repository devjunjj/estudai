import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { askStudyAssistant, summarizeText, explainAudio } from '../lib/aiClient';
import { getUserId } from '../lib/userIdentity';
import { carregarConversa, salvarMensagens } from '../lib/conversationsStore';
import NotesPanel from '../components/NotesPanel';

function arquivoParaBase64(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result.split(',')[1]);
    leitor.onerror = reject;
    leitor.readAsDataURL(arquivo);
  });
}

export default function Chat() {
  const navigate = useNavigate();
  const conversaId = sessionStorage.getItem('estudai_conversa_id');
  const inputTextoRef = useRef(null);
  const inputAudioRef = useRef(null);
  const fimRef = useRef(null);

  const [userId, setUserId] = useState(null);
  const [materia, setMateria] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [input, setInput] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [notasAbertas, setNotasAbertas] = useState(false);
  const [pronto, setPronto] = useState(false);

  // Carrega a conversa (matéria + histórico) assim que sabemos quem é o usuário
  useEffect(() => {
    if (!conversaId) {
      navigate('/', { replace: true });
      return;
    }
    getUserId().then((uid) => {
      const conversa = carregarConversa(uid, conversaId);
      if (!conversa) {
        navigate('/', { replace: true });
        return;
      }
      setUserId(uid);
      setMateria(conversa.materia);
      setMensagens(
        conversa.mensagens.length > 0
          ? conversa.mensagens
          : [{ autor: 'ia', texto: `Vamos começar a estudar ${conversa.materia}. O que você já sabe sobre o tema, ou por onde quer começar?` }]
      );
      setPronto(true);
    });
  }, [conversaId, navigate]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  // Se veio da tela de resultado dos exercícios com uma pergunta pendente
  // ("me ensine o que preciso revisar"), envia ela automaticamente assim que a conversa carrega.
  useEffect(() => {
    if (!pronto) return;
    const pendente = sessionStorage.getItem('estudai_pergunta_pendente');
    if (!pendente) return;
    sessionStorage.removeItem('estudai_pergunta_pendente');
    enviarMensagemAutomatica(pendente);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronto]);

  async function enviarMensagemAutomatica(texto) {
    const novaLista = [...mensagens, { autor: 'usuario', texto }];
    atualizarMensagens(novaLista);
    setCarregando(true);
    try {
      const resposta = await askStudyAssistant({ materia, historico: novaLista });
      atualizarMensagens([...novaLista, { autor: 'ia', texto: resposta }]);
    } catch (err) {
      atualizarMensagens([...novaLista, { autor: 'ia', texto: 'Não consegui responder agora. Tenta de novo em instantes.' }]);
    } finally {
      setCarregando(false);
    }
  }

  function atualizarMensagens(novaLista) {
    setMensagens(novaLista);
    if (userId && conversaId) salvarMensagens(userId, conversaId, novaLista);
  }

  function adicionarMensagem(msg) {
    atualizarMensagens([...mensagens, msg]);
  }

  async function enviarMensagem(e) {
    e.preventDefault();
    const texto = input.trim();
    if (!texto || carregando) return;

    const novaLista = [...mensagens, { autor: 'usuario', texto }];
    atualizarMensagens(novaLista);
    setInput('');
    setCarregando(true);

    try {
      const resposta = await askStudyAssistant({ materia, historico: novaLista });
      atualizarMensagens([...novaLista, { autor: 'ia', texto: resposta }]);
    } catch (err) {
      atualizarMensagens([...novaLista, { autor: 'ia', texto: 'Não consegui responder agora. Tenta de novo em instantes.' }]);
    } finally {
      setCarregando(false);
    }
  }

  async function handleUploadTexto(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;

    const conteudo = await arquivo.text();
    const comAnexo = [...mensagens, { autor: 'usuario', texto: `📄 Enviou o texto "${arquivo.name}" para resumir.` }];
    atualizarMensagens(comAnexo);
    setCarregando(true);
    try {
      const resumo = await summarizeText({ materia, texto: conteudo });
      atualizarMensagens([...comAnexo, { autor: 'ia', texto: resumo }]);
    } catch {
      atualizarMensagens([...comAnexo, { autor: 'ia', texto: 'Não consegui resumir esse texto agora. Tenta de novo.' }]);
    } finally {
      setCarregando(false);
    }
  }

  async function handleUploadAudio(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;

    const comAnexo = [...mensagens, { autor: 'usuario', texto: `🎧 Enviou o áudio "${arquivo.name}" para explicar.` }];
    atualizarMensagens(comAnexo);
    setCarregando(true);
    try {
      const base64 = await arquivoParaBase64(arquivo);
      const explicacao = await explainAudio({ materia, arquivoBase64: base64, mimeType: arquivo.type || 'audio/mpeg' });
      atualizarMensagens([...comAnexo, { autor: 'ia', texto: explicacao }]);
    } catch {
      atualizarMensagens([...comAnexo, { autor: 'ia', texto: 'Não consegui ouvir esse áudio agora. Tenta de novo.' }]);
    } finally {
      setCarregando(false);
    }
  }

  function abrirExercicios() {
    localStorage.setItem('estudai_materia', materia);
    const contexto = mensagens
      .filter((m) => m.texto)
      .map((m) => `${m.autor === 'usuario' ? 'Aluno' : 'Tutor'}: ${m.texto}`)
      .join('\n');
    sessionStorage.setItem('estudai_exercicios_contexto', contexto);
    navigate('/exercicios');
  }

  function abrirDesempenho() {
    localStorage.setItem('estudai_materia', materia);
    navigate('/desempenho');
  }

  if (!pronto) return null;

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--text-secondary)', flexShrink: 0 }}
            aria-label="Voltar"
          >
            ←
          </button>
          <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{materia}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button
            onClick={abrirDesempenho}
            style={{ background: 'none', border: 'none', fontSize: 18 }}
            aria-label="Ver desempenho"
          >
            📊
          </button>
          <button
            onClick={abrirExercicios}
            style={{ background: 'var(--blue-light)', border: 'none', borderRadius: 20, padding: '6px 12px', fontSize: 12, color: 'var(--blue-dark)', fontWeight: 600 }}
          >
            📝 Exercícios
          </button>
          <button
            onClick={() => setNotasAbertas(true)}
            style={{ background: 'none', border: 'none', fontSize: 18 }}
            aria-label="Abrir anotações"
          >
            📌
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {mensagens.filter((m) => m.texto).map((m, i) => (
          <div
            key={i}
            className={m.autor === 'ia' ? 'bolha-markdown' : undefined}
            style={{
              alignSelf: m.autor === 'usuario' ? 'flex-end' : 'flex-start',
              background: m.autor === 'usuario' ? 'var(--blue)' : 'var(--surface)',
              color: m.autor === 'usuario' ? '#fff' : 'var(--text-primary)',
              border: m.autor === 'usuario' ? 'none' : '1px solid var(--border)',
              borderRadius: m.autor === 'usuario' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              padding: '9px 13px',
              fontSize: 13,
              maxWidth: '85%',
              whiteSpace: m.autor === 'usuario' ? 'pre-wrap' : 'normal',
            }}
          >
            {m.autor === 'ia' ? <ReactMarkdown>{m.texto}</ReactMarkdown> : m.texto}
          </div>
        ))}
        {carregando && (
          <div style={{ alignSelf: 'flex-start', fontSize: 12, color: 'var(--text-muted)' }}>Digitando...</div>
        )}
        <div ref={fimRef} />
      </div>

      <form onSubmit={enviarMensagem} style={{ padding: '0.75rem 1.25rem 1rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
          <button
            type="button"
            onClick={() => inputTextoRef.current?.click()}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: 'var(--text-secondary)' }}
          >
            📄 Resumir texto
          </button>
          <button
            type="button"
            onClick={() => inputAudioRef.current?.click()}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: 'var(--text-secondary)' }}
          >
            🎧 Enviar áudio
          </button>
          <input ref={inputTextoRef} type="file" accept=".txt,.md" onChange={handleUploadTexto} style={{ display: 'none' }} />
          <input ref={inputAudioRef} type="file" accept="audio/*" onChange={handleUploadAudio} style={{ display: 'none' }} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            className="text-input"
            style={{ flex: 1, borderRadius: 20 }}
            placeholder="Digite sua dúvida"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={carregando}
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--blue)', border: 'none', color: '#fff', flexShrink: 0 }}
            aria-label="Enviar"
          >
            ➤
          </button>
        </div>
      </form>

      <NotesPanel materia={materia} aberto={notasAbertas} onFechar={() => setNotasAbertas(false)} />
    </div>
  );
}
