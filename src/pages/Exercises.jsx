import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gerarExercicios } from '../lib/aiClient';
import { getUserId } from '../lib/userIdentity';
import { registrarResultado } from '../lib/performanceStore';

export default function Exercises() {
  const navigate = useNavigate();
  const materia = localStorage.getItem('estudai_materia');
  const contexto = sessionStorage.getItem('estudai_exercicios_contexto') || '';
  const [exercicios, setExercicios] = useState(null);
  const [indice, setIndice] = useState(0);
  const [selecionada, setSelecionada] = useState(null);
  const [respondida, setRespondida] = useState(false);
  const [respostas, setRespostas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [finalizado, setFinalizado] = useState(false);

  useEffect(() => {
    if (!materia) {
      navigate('/', { replace: true });
      return;
    }
    gerarExercicios({ materia, quantidade: 5, contexto })
      .then(setExercicios)
      .finally(() => setCarregando(false));
  }, [materia, contexto, navigate]);

  if (!materia) return null;

  if (carregando) {
    return (
      <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Gerando exercícios de {materia}...</p>
      </div>
    );
  }

  if (!exercicios || exercicios.length === 0) {
    return (
      <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Não foi possível gerar exercícios agora.</p>
      </div>
    );
  }

  if (finalizado) {
    return (
      <TelaResultado
        materia={materia}
        respostas={respostas}
        onSair={() => navigate('/')}
        onRefazer={() => window.location.reload()}
        onRevisar={(topicos) => {
          const pergunta = `Pode me ensinar sobre esses tópicos que eu errei nos exercícios de ${materia}: ${topicos.join(', ')}? Explica cada um com calma.`;
          sessionStorage.setItem('estudai_pergunta_pendente', pergunta);
          navigate('/chat');
        }}
      />
    );
  }

  const atual = exercicios[indice];
  const progresso = Math.round(((indice + 1) / exercicios.length) * 100);

  function responder() {
    const acertou = selecionada === atual.correta;
    setRespostas([...respostas, { pergunta: atual.pergunta, topico: atual.topico, acertou }]);
    setRespondida(true);
  }

  function proxima() {
    if (indice < exercicios.length - 1) {
      setIndice(indice + 1);
      setSelecionada(null);
      setRespondida(false);
    } else {
      setFinalizado(true);
    }
  }

  return (
    <div className="screen" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--text-secondary)' }} aria-label="Voltar">←</button>
        <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{materia}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>Exercício {indice + 1} de {exercicios.length}</span>
        <span style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600 }}>{progresso}%</span>
      </div>
      <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ width: `${progresso}%`, height: '100%', background: 'var(--blue)', borderRadius: 3, transition: 'width 0.3s' }} />
      </div>

      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{atual.pergunta}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {atual.alternativas.map((alt, i) => {
          let estilo = { borderColor: 'var(--border)', borderWidth: 1, background: 'var(--surface)', color: 'var(--text-primary)' };
          if (respondida) {
            if (i === atual.correta) {
              estilo = { borderColor: 'var(--success)', borderWidth: 2, background: 'var(--success-bg)', color: 'var(--success-text)', fontWeight: 600 };
            } else if (i === selecionada) {
              estilo = { borderColor: 'var(--danger)', borderWidth: 2, background: 'var(--danger-bg)', color: 'var(--danger-text)', fontWeight: 600 };
            }
          } else if (selecionada === i) {
            estilo = { borderColor: 'var(--blue)', borderWidth: 2, background: 'var(--blue-light)', color: 'var(--blue-dark)', fontWeight: 600 };
          }

          return (
            <button
              key={i}
              onClick={() => !respondida && setSelecionada(i)}
              disabled={respondida}
              className="card"
              style={{ textAlign: 'left', fontSize: 13, ...estilo }}
            >
              {alt}
            </button>
          );
        })}
      </div>

      {!respondida ? (
        <button className="btn-primary" onClick={responder} disabled={selecionada === null}>
          Confirmar resposta
        </button>
      ) : (
        <button className="btn-primary" onClick={proxima}>
          {indice < exercicios.length - 1 ? 'Próxima questão' : 'Ver resultado'}
        </button>
      )}
    </div>
  );
}

function TelaResultado({ materia, respostas, onSair, onRefazer, onRevisar }) {
  const total = respostas.length;
  const acertos = respostas.filter((r) => r.acertou).length;
  const erros = total - acertos;
  const percentual = Math.round((acertos / total) * 100);

  const topicosParaFocar = [...new Set(respostas.filter((r) => !r.acertou).map((r) => r.topico).filter(Boolean))];

  useEffect(() => {
    getUserId().then((userId) => {
      registrarResultado(userId, materia, { total, acertos, topicosErrados: topicosParaFocar });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="screen" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <button onClick={onSair} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--text-secondary)' }} aria-label="Voltar">←</button>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Resultado · {materia}</span>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <p style={{ fontSize: 38, fontWeight: 700, color: 'var(--blue)', margin: 0 }}>{percentual}%</p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          {acertos} de {total} questões corretas
        </p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
          <span style={{ color: 'var(--success-text)', fontWeight: 600 }}>✓ Acertos ({acertos})</span>
          <span style={{ color: 'var(--danger-text)', fontWeight: 600 }}>✗ Erros ({erros})</span>
        </div>
        <div style={{ height: 14, borderRadius: 7, overflow: 'hidden', display: 'flex', background: 'var(--bg)' }}>
          <div style={{ width: `${(acertos / total) * 100}%`, background: 'var(--success)' }} />
          <div style={{ width: `${(erros / total) * 100}%`, background: 'var(--danger)' }} />
        </div>
      </div>

      {topicosParaFocar.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px' }}>📌 O que revisar</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {topicosParaFocar.map((t, i) => (
              <span key={i} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>• {t}</span>
            ))}
          </div>
          <button
            onClick={() => onRevisar(topicosParaFocar)}
            style={{ width: '100%', background: 'var(--blue-light)', color: 'var(--blue-dark)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '10px 0', fontSize: 12, fontWeight: 600 }}
          >
            🎓 Me ensine as matérias que preciso revisar
          </button>
        </div>
      )}

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn-primary" onClick={onRefazer}>Fazer mais exercícios</button>
        <button className="btn-secondary" onClick={onSair}>Voltar ao início</button>
      </div>
    </div>
  );
}
