import { useState } from 'react';
import { carregarNotas, salvarNota, removerNota } from '../lib/notesStore';

export default function NotesPanel({ materia, aberto, onFechar }) {
  const [notas, setNotas] = useState(() => carregarNotas(materia));
  const [rascunho, setRascunho] = useState('');

  function adicionar() {
    const texto = rascunho.trim();
    if (!texto) return;
    setNotas(salvarNota(materia, texto));
    setRascunho('');
  }

  function excluir(id) {
    setNotas(removerNota(materia, id));
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
          <button className="btn-primary" onClick={adicionar} disabled={!rascunho.trim()}>
            Salvar anotação
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notas.length === 0 && (
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
