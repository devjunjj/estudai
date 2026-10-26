import { useEffect, useState } from 'react';
import { notasApi } from '../lib/api';

export default function NotesPanel({ userId, materia, aberto, onFechar }) {
  const [notas, setNotas] = useState([]);
  const [rascunho, setRascunho] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Busca as notas na API sempre que o painel é aberto
  useEffect(() => {
    if (!aberto) return;

    let cancelado = false; // evita atualizar o estado se o painel fechar antes da resposta
    setCarregando(true);
    setErro('');

    notasApi
      .listar(userId, materia)
      .then((dados) => !cancelado && setNotas(dados))
      .catch((e) => !cancelado && setErro(e.message))
      .finally(() => !cancelado && setCarregando(false));

    return () => {
      cancelado = true;
    };
  }, [aberto, userId, materia]);

  async function adicionar() {
    const texto = rascunho.trim();
    if (!texto) return;

    setSalvando(true);
    setErro('');
    try {
      const nova = await notasApi.criar(userId, materia, texto);
      setNotas((atuais) => [nova, ...atuais]);
      setRascunho('');
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id) {
    setErro('');
    try {
      await notasApi.excluir(userId, id);
      setNotas((atuais) => atuais.filter((n) => n.id !== id));
    } catch (e) {
      setErro(e.message);
    }
  }

  if (!aberto) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.25)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 20,
      }}
      onClick={onFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '85%',
          maxWidth: 340,
          background: 'var(--surface)',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-2px 0 12px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Anotações · {materia}</span>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--text-secondary)' }} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <textarea
            className="text-input"
            style={{ width: '100%', minHeight: 70, resize: 'vertical', marginBottom: 8 }}
            placeholder="Anote algo importante..."
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
          />
          <button className="btn-primary" onClick={adicionar} disabled={!rascunho.trim() || salvando}>
            {salvando ? 'Salvando...' : 'Salvar anotação'}
          </button>
          {erro && (
            <p style={{ fontSize: 12, color: 'var(--danger-text)', margin: '8px 0 0' }}>{erro}</p>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {carregando && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginTop: 20 }}>
              Carregando anotações...
            </p>
          )}
          {!carregando && notas.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginTop: 20 }}>
              Nenhuma anotação ainda.
            </p>
          )}
          {notas.map((n) => (
            <div key={n.id} className="card" style={{ position: 'relative' }}>
              <p style={{ fontSize: 13, margin: 0, whiteSpace: 'pre-wrap' }}>{n.texto}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(n.criadaEm).toLocaleDateString('pt-BR')}
                </span>
                <button
                  onClick={() => excluir(n.id)}
                  style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--text-muted)' }}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
