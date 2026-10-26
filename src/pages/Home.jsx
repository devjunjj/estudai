import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, MessageCirclePlus } from 'lucide-react';
import AppLayout, { BotaoSair, BotaoTema } from '../components/AppLayout';
import Sequencia from '../components/Sequencia';
import { calcularSequencia, classeMateria, siglaMateria } from '../lib/estudos';
import { listarResultados } from '../lib/performanceStore';
import { abrirConversa } from '../lib/navegacao';
import { tituloConversa } from '../lib/formatacao';

// Uma entrada por matéria: a conversa mais recente e a média nos exercícios
function agruparMaterias(userId, conversas) {
  const porMateria = new Map();
  conversas.forEach((c) => {
    const chave = c.materia.trim().toLowerCase();
    if (!porMateria.has(chave)) porMateria.set(chave, c); // a lista já vem da mais recente para a mais antiga
  });
  return [...porMateria.values()].map((conversa) => {
    const resultados = listarResultados(userId, conversa.materia);
    const media = resultados.length
      ? Math.round(resultados.reduce((soma, r) => soma + r.percentual, 0) / resultados.length)
      : null;
    return { conversa, media };
  });
}

function ConteudoInicio({ usuario }) {
  const navigate = useNavigate();
  if (usuario.carregando) return null;

  const { userId, conversas } = usuario;
  const ultima = conversas[0];
  const materias = agruparMaterias(userId, conversas);
  const sequencia = calcularSequencia(userId, conversas);

  return (
    <div className="pagina">
      <div className="pagina-topo">
        <div>
          <p className="pagina-subtitulo">Olá!</p>
          <h1 className="pagina-titulo">O que vamos estudar hoje?</h1>
        </div>
        <div className="so-celular" style={{ gap: 4 }}>
          <BotaoTema />
          <BotaoSair />
        </div>
      </div>

      <div className="inicio-grade">
        <div className="coluna">
          {ultima ? (
            <button type="button" className={`continuar ${classeMateria(ultima.materia)}`} onClick={() => abrirConversa(navigate, ultima)}>
              <span className="sigla-materia" aria-hidden="true">{siglaMateria(ultima.materia)}</span>
              <span className="continuar-textos">
                <span className="sobretitulo">Continuar de onde parou</span>
                <span className="continuar-titulo">{tituloConversa(ultima)}</span>
                <span className="texto-suave" style={{ fontSize: 13 }}>{ultima.materia}</span>
              </span>
              <ChevronRight size={20} className="texto-suave" aria-hidden="true" />
            </button>
          ) : (
            <div className="cartao estado-vazio">
              <span className="icone-circulo">
                <MessageCirclePlus size={26} aria-hidden="true" />
              </span>
              <h2 className="secao-titulo">Comece sua primeira conversa</h2>
              <p>Escolha uma matéria e pergunte o que quiser. O tutor explica no tamanho que você preferir.</p>
              <Link to="/nova" className="btn btn-primario">Começar a estudar</Link>
            </div>
          )}

          {materias.length > 0 && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="secao-cabecalho">
                <h2 className="secao-titulo">Suas matérias</h2>
                <Link to="/conversas" className="btn-link" style={{ fontSize: 14 }}>Ver conversas</Link>
              </div>
              <div className="grade-materias">
                {materias.map(({ conversa, media }) => (
                  <button
                    key={conversa.id}
                    type="button"
                    className={`cartao-materia ${classeMateria(conversa.materia)}`}
                    onClick={() => abrirConversa(navigate, conversa)}
                  >
                    <span className="cartao-materia-icone" aria-hidden="true">{siglaMateria(conversa.materia)}</span>
                    <span className="cartao-materia-nome">{conversa.materia}</span>
                    <span className="cartao-materia-barra" aria-hidden="true">
                      <span style={{ width: `${media ?? 0}%` }} />
                    </span>
                    <span className="cartao-materia-info">
                      {media === null ? 'Sem exercícios ainda' : `${media}% de acertos`}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="coluna inicio-lateral">
          <Sequencia dados={sequencia} />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return <AppLayout>{(usuario) => <ConteudoInicio usuario={usuario} />}</AppLayout>;
}
