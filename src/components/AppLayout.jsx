import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { ChartColumn, House, LogOut, MessageCircle, Moon, Plus, Sparkles, Sun, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { acordarApi } from '../lib/api';
import { supabase } from '../lib/supabaseClient';
import { useUsuario } from '../lib/useUsuario';
import { calcularSequencia, classeMateria } from '../lib/estudos';
import { tituloConversa } from '../lib/formatacao';
import { abrirConversa } from '../lib/navegacao';
import { alternarTema, temaAtualEhEscuro } from '../lib/theme';
import Sequencia from './Sequencia';

export function Logo() {
  return (
    <span className="logo">
      <span className="logo-icone">
        <Sparkles size={20} fill="currentColor" aria-hidden="true" />
      </span>
      <span>
        Estud<span className="logo-destaque">AI</span>
      </span>
    </span>
  );
}

export function BotaoTema() {
  const [escuro, setEscuro] = useState(temaAtualEhEscuro);
  return (
    <button
      type="button"
      className="btn-icone"
      onClick={() => setEscuro(alternarTema())}
      aria-label={escuro ? 'Usar tema claro' : 'Usar tema escuro'}
    >
      {escuro ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
    </button>
  );
}

export function BotaoSair() {
  const navigate = useNavigate();
  async function sair() {
    await supabase.auth.signOut();
    navigate('/login');
  }
  return (
    <button type="button" className="btn-icone" onClick={sair} aria-label="Sair da conta">
      <LogOut size={20} aria-hidden="true" />
    </button>
  );
}

function classeLink({ isActive }) {
  return isActive ? 'menu-link ativo' : 'menu-link';
}

function MenuLateral({ usuario }) {
  const navigate = useNavigate();
  const { id: conversaAtiva } = useParams();
  const recentes = usuario.conversas.slice(0, 8);
  const sequencia = usuario.userId ? calcularSequencia(usuario.userId, usuario.conversas) : null;

  return (
    <aside className="menu-lateral">
      <Logo />

      <NavLink to="/nova" className="btn btn-primario btn-bloco">
        <Plus size={18} strokeWidth={2.6} aria-hidden="true" />
        Nova conversa
      </NavLink>

      <nav className="menu-nav" aria-label="Principal">
        <NavLink to="/" end className={classeLink}>
          <House size={19} aria-hidden="true" /> Início
        </NavLink>
        <NavLink to="/conversas" className={classeLink}>
          <MessageCircle size={19} aria-hidden="true" /> Conversas
        </NavLink>
        <NavLink to="/desempenho" className={classeLink}>
          <ChartColumn size={19} aria-hidden="true" /> Desempenho
        </NavLink>
      </nav>

      {recentes.length > 0 && (
        <div className="menu-recentes">
          <h2 className="menu-titulo">Recentes</h2>
          {recentes.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`menu-conversa ${classeMateria(c.materia)}${c.id === conversaAtiva ? ' ativo' : ''}`}
              onClick={() => abrirConversa(navigate, c)}
              aria-current={c.id === conversaAtiva ? 'page' : undefined}
            >
              <span className="ponto-materia" aria-hidden="true" />
              <span className="menu-conversa-textos">
                <span className="menu-conversa-titulo">{tituloConversa(c)}</span>
                <span className="menu-conversa-materia">{c.materia}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="menu-rodape" style={{ marginTop: recentes.length > 0 ? 0 : 'auto' }}>
        {sequencia && <Sequencia dados={sequencia} variante="compacta" />}
        <div className="usuario">
          <NavLink to="/conta" className="usuario-link" title="Minha conta">
            <span className="avatar" aria-hidden="true">{usuario.email.slice(0, 2) || '?'}</span>
            <span className="usuario-email">{usuario.email}</span>
          </NavLink>
          <BotaoTema />
          <BotaoSair />
        </div>
      </div>
    </aside>
  );
}

function Abas() {
  const classeAba = ({ isActive }) => (isActive ? 'aba ativo' : 'aba');
  return (
    <nav className="abas" aria-label="Principal">
      <NavLink to="/" end className={classeAba}>
        <House size={23} aria-hidden="true" /> Início
      </NavLink>
      <NavLink to="/conversas" className={classeAba}>
        <MessageCircle size={23} aria-hidden="true" /> Conversas
      </NavLink>
      <NavLink to="/nova" className="aba-nova" aria-label="Nova conversa">
        <Plus size={26} strokeWidth={2.6} aria-hidden="true" />
      </NavLink>
      <NavLink to="/desempenho" className={classeAba}>
        <ChartColumn size={23} aria-hidden="true" /> Desempenho
      </NavLink>
      <NavLink to="/conta" className={classeAba}>
        <UserRound size={23} aria-hidden="true" /> Conta
      </NavLink>
    </nav>
  );
}

// Estrutura de todas as telas logadas:
// PC/tablet = menu lateral + conteúdo · celular = conteúdo + abas embaixo
export default function AppLayout({ children, semAbasNoCelular = false }) {
  const usuario = useUsuario();

  // Começa a acordar a API (Render grátis) assim que qualquer tela logada abre
  useEffect(() => {
    acordarApi();
  }, []);

  return (
    <div className="app">
      <MenuLateral usuario={usuario} />
      <main className={semAbasNoCelular ? 'app-conteudo sem-abas' : 'app-conteudo'}>
        {typeof children === 'function' ? children(usuario) : children}
      </main>
      {!semAbasNoCelular && <Abas />}
    </div>
  );
}
