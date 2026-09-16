import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getUserId } from '../lib/userIdentity';
import { listarConversas } from '../lib/conversationsStore';
import { alternarTema, temaAtualEhEscuro } from '../lib/theme';

function tituloConversa(conversa) {
  const primeiraDoAluno = conversa.mensagens.find((m) => m.autor === 'usuario' && m.texto);
  if (!primeiraDoAluno) return 'Conversa recém-criada';
  const texto = primeiraDoAluno.texto;
  return texto.length > 48 ? texto.slice(0, 48) + '…' : texto;
}

function resumo(conversa) {
  const ultima = conversa.mensagens[conversa.mensagens.length - 1];
  if (!ultima) return 'Toque pra continuar de onde parou';
  const prefixo = ultima.autor === 'usuario' ? 'Você: ' : 'EstudAI: ';
  const texto = ultima.texto.length > 72 ? ultima.texto.slice(0, 72) + '…' : ultima.texto;
  return prefixo + texto;
}

function dataParte(iso) {
  const data = new Date(iso);
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);
  if (data.toDateString() === hoje.toDateString()) return 'Hoje';
  if (data.toDateString() === ontem.toDateString()) return 'Ontem';
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function horaParte(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function Home() {
  const navigate = useNavigate();
  const [conversas, setConversas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    setEscuro(temaAtualEhEscuro());
    getUserId().then((userId) => {
      setConversas(listarConversas(userId));
      setCarregando(false);
    });
  }, []);

  function handleAlternarTema() {
    setEscuro(alternarTema());
  }

  async function handleSair() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  function abrirConversa(conversa) {
    sessionStorage.setItem('estudai_conversa_id', conversa.id);
    localStorage.setItem('estudai_materia', conversa.materia);
    navigate('/chat');
  }

  return (
    <div className="screen">
      <div className="header-blue">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="logo-badge" style={{ width: 34, height: 34, fontSize: 16 }}>⚡</div>
            <span style={{ fontWeight: 600, fontSize: 17 }}>EstudAI</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleAlternarTema}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: '#fff', width: 30, height: 30, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Alternar tema"
            >
              {escuro ? '☀️' : '🌙'}
            </button>
            <button
              onClick={handleSair}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, padding: '6px 10px' }}
            >
              Sair
            </button>
          </div>
        </div>
        <p style={{ fontSize: 13, opacity: 0.85, margin: '0 0 4px' }}>Bom te ver de novo</p>
        <p style={{ fontSize: 19, fontWeight: 600, margin: 0 }}>Suas conversas</p>
      </div>

      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <button className="btn-primary" onClick={() => navigate('/nova')} style={{ marginBottom: 20 }}>
          + Nova conversa
        </button>

        {carregando && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>Carregando...</p>
        )}

        {!carregando && conversas.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginTop: 20 }}>
            Você ainda não tem conversas. Comece uma nova acima.
          </p>
        )}

        <div className="lista-conversas">
          {conversas.map((c) => (
            <button
              key={c.id}
              onClick={() => abrirConversa(c)}
              className="card conversa-card"
            >
              <div className="conversa-card-topo">
                <span className="materia-badge">📘 {c.materia}</span>
                <span className="conversa-card-data">{dataParte(c.atualizadaEm)} · {horaParte(c.atualizadaEm)}</span>
              </div>
              <p className="conversa-card-titulo">{tituloConversa(c)}</p>
              <p className="conversa-card-resumo">{resumo(c)}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
