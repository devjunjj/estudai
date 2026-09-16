import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserId } from '../lib/userIdentity';
import { criarConversa } from '../lib/conversationsStore';

export default function NewChat() {
  const navigate = useNavigate();
  const [materia, setMateria] = useState('');
  const [criando, setCriando] = useState(false);

  async function handleStart(e) {
    e.preventDefault();
    if (!materia.trim() || criando) return;
    setCriando(true);

    const userId = await getUserId();
    const conversa = criarConversa(userId, materia.trim());
    sessionStorage.setItem('estudai_conversa_id', conversa.id);
    navigate('/chat');
  }

  return (
    <div className="screen">
      <div className="header-blue">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: '#fff', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Voltar"
          >
            ←
          </button>
          <span style={{ fontWeight: 600, fontSize: 16 }}>Nova conversa</span>
        </div>
        <p style={{ fontSize: 19, fontWeight: 600, margin: 0 }}>O que vamos estudar hoje?</p>
      </div>

      <form onSubmit={handleStart} className="conteudo-estreito" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <label className="field-label" htmlFor="materia">Matéria</label>
        <input
          id="materia"
          type="text"
          className="text-input"
          placeholder="Ex: Engenharia de Produção"
          value={materia}
          onChange={(e) => setMateria(e.target.value)}
          style={{ marginBottom: 18 }}
          autoFocus
        />

        <div style={{ marginTop: 'auto' }}>
          <button type="submit" className="btn-primary" disabled={!materia.trim() || criando}>
            {criando ? 'Aguarde...' : 'Começar'}
          </button>
        </div>
      </form>
    </div>
  );
}
