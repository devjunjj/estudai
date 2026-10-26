import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MessageCircle, Plus, Search } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { classeMateria, siglaMateria } from '../lib/estudos';
import { dataCurta, resumoConversa, tituloConversa } from '../lib/formatacao';
import { abrirConversa } from '../lib/navegacao';

function ListaDeConversas({ usuario }) {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState(null);

  if (usuario.carregando) return null;

  const materias = [...new Set(usuario.conversas.map((c) => c.materia))];
  const termo = busca.trim().toLowerCase();
  const visiveis = usuario.conversas.filter((c) => {
    if (filtro && c.materia !== filtro) return false;
    if (!termo) return true;
    return [c.materia, c.titulo, c.ultimaMensagem].some((t) => t?.toLowerCase().includes(termo));
  });

  return (
    <div className="pagina estreita">
      <div className="pagina-topo">
        <h1 className="pagina-titulo">Conversas</h1>
        <Link to="/nova" className="btn btn-primario so-tablet-pc">
          <Plus size={18} aria-hidden="true" /> Nova
        </Link>
      </div>

      <label className="busca">
        <Search size={19} aria-hidden="true" />
        <span className="so-leitor">Buscar conversas</span>
        <input
          type="search"
          placeholder="Buscar por matéria ou assunto"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </label>

      {materias.length > 1 && (
        <div className="filtros" role="group" aria-label="Filtrar por matéria">
          <button type="button" className={`pilula${filtro === null ? ' ativa' : ' contorno'}`} onClick={() => setFiltro(null)} aria-pressed={filtro === null}>
            Todas
          </button>
          {materias.map((m) => (
            <button
              key={m}
              type="button"
              className={`pilula ${filtro === m ? 'ativa' : 'contorno'}`}
              onClick={() => setFiltro(m)}
              aria-pressed={filtro === m}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {visiveis.length === 0 ? (
        <div className="estado-vazio">
          <span className="icone-circulo">
            <MessageCircle size={26} aria-hidden="true" />
          </span>
          <p>{usuario.conversas.length === 0 ? 'Você ainda não tem conversas.' : 'Nenhuma conversa encontrada.'}</p>
          {usuario.conversas.length === 0 && <Link to="/nova" className="btn btn-primario">Começar a estudar</Link>}
        </div>
      ) : (
        <ul className="lista-conversas">
          {visiveis.map((c) => (
            <li key={c.id}>
              <button type="button" className={`item-conversa ${classeMateria(c.materia)}`} onClick={() => abrirConversa(navigate, c)}>
                <span className="sigla-materia" aria-hidden="true">{siglaMateria(c.materia)}</span>
                <span className="item-conversa-textos">
                  <span className="item-conversa-linha">
                    <span className="item-conversa-titulo">{tituloConversa(c)}</span>
                    <span className="item-conversa-data">{dataCurta(c.atualizadaEm)}</span>
                  </span>
                  <span className="etiqueta-materia" style={{ alignSelf: 'flex-start' }}>{c.materia}</span>
                  <span className="item-conversa-resumo">{resumoConversa(c)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Conversas() {
  return <AppLayout>{(usuario) => <ListaDeConversas usuario={usuario} />}</AppLayout>;
}
