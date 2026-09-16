import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserId } from '../lib/userIdentity';
import { listarResultados } from '../lib/performanceStore';

export default function Performance() {
  const navigate = useNavigate();
  const materia = localStorage.getItem('estudai_materia');
  const [resultados, setResultados] = useState(null);

  useEffect(() => {
    if (!materia) {
      navigate('/', { replace: true });
      return;
    }
    getUserId().then((userId) => {
      setResultados(listarResultados(userId, materia));
    });
  }, [materia, navigate]);

  if (!materia || resultados === null) return null;

  const totalRodadas = resultados.length;
  const mediaGeral = totalRodadas > 0
    ? Math.round(resultados.reduce((soma, r) => soma + r.percentual, 0) / totalRodadas)
    : 0;

  const contagemTopicos = {};
  resultados.forEach((r) => {
    (r.topicosErrados || []).forEach((t) => {
      contagemTopicos[t] = (contagemTopicos[t] || 0) + 1;
    });
  });
  const topicosParaFocar = Object.entries(contagemTopicos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="screen" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--text-secondary)' }} aria-label="Voltar">←</button>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Desempenho · {materia}</span>
      </div>

      {totalRodadas === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 60 }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>📊</p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Você ainda não fez exercícios em {materia}.<br />Faça uma rodada pra começar a ver sua evolução aqui.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--blue)', margin: 0 }}>{mediaGeral}%</p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 0' }}>Média geral</p>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--blue)', margin: 0 }}>{totalRodadas}</p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                {totalRodadas === 1 ? 'Rodada feita' : 'Rodadas feitas'}
              </p>
            </div>
          </div>

          <p className="field-label" style={{ marginBottom: 10 }}>Evolução</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, marginBottom: 6, padding: '0 2px' }}>
            {resultados.map((r) => (
              <div
                key={r.id}
                title={`${r.percentual}%`}
                style={{
                  flex: 1,
                  height: `${Math.max(r.percentual, 4)}%`,
                  background: r.percentual >= 70 ? 'var(--success)' : r.percentual >= 40 ? 'var(--warning)' : 'var(--danger)',
                  borderRadius: '4px 4px 0 0',
                  minWidth: 6,
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {new Date(resultados[0].data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {new Date(resultados[resultados.length - 1].data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </span>
          </div>

          {topicosParaFocar.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 10px' }}>📌 No que focar</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topicosParaFocar.map(([topico, vezes]) => (
                  <div key={topico} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{topico}</span>
                    <span style={{ fontSize: 11, color: 'var(--danger-text)', fontWeight: 600 }}>
                      {vezes} {vezes === 1 ? 'erro' : 'erros'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="field-label" style={{ marginBottom: 10 }}>Histórico de rodadas</p>
          <div className="lista-cards">
            {[...resultados].reverse().map((r) => (
              <div key={r.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {new Date(r.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: r.percentual >= 70 ? 'var(--success-text)' : r.percentual >= 40 ? 'var(--warning-text)' : 'var(--danger-text)' }}>
                  {r.acertos}/{r.total} · {r.percentual}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
