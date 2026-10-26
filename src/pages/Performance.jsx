import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChartColumn } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { classeMateria, resumoDaMateria } from '../lib/estudos';

function nivel(percentual) {
  if (percentual >= 70) return '';
  if (percentual >= 40) return 'medio';
  return 'baixo';
}

function classeTexto(percentual) {
  if (percentual >= 70) return 'texto-sucesso';
  if (percentual >= 40) return 'texto-alerta';
  return 'texto-perigo';
}

function PainelDesempenho({ usuario }) {
  const navigate = useNavigate();
  const materias = [...new Set(usuario.conversas.map((c) => c.materia))];
  const salva = localStorage.getItem('estudai_materia');
  const [materia, setMateria] = useState(materias.includes(salva) ? salva : materias[0]);

  if (materias.length === 0) {
    return (
      <div className="pagina estreita">
        <h1 className="pagina-titulo">Desempenho</h1>
        <div className="estado-vazio">
          <span className="icone-circulo"><ChartColumn size={26} aria-hidden="true" /></span>
          <p>Comece a estudar uma matéria e faça exercícios para acompanhar sua evolução aqui.</p>
          <Link to="/nova" className="btn btn-primario">Começar a estudar</Link>
        </div>
      </div>
    );
  }

  const resumo = resumoDaMateria(usuario.resultados, materia);
  const resultados = resumo.resultados;
  const total = resultados.length;
  const media = resumo.media ?? 0;
  const melhor = total ? Math.max(...resultados.map((r) => r.percentual)) : 0;
  const focar = resumo.topicos.slice(0, 5);

  function escolher(m) {
    setMateria(m);
    localStorage.setItem('estudai_materia', m);
  }

  function praticar() {
    localStorage.setItem('estudai_materia', materia);
    sessionStorage.setItem('estudai_exercicios_contexto', focar.length ? `Tópicos que o aluno mais erra: ${focar.map(([t]) => t).join(', ')}` : '');
    const conversa = usuario.conversas.find((c) => c.materia === materia);
    if (conversa) sessionStorage.setItem('estudai_conversa_id', conversa.id);
    navigate('/exercicios');
  }

  return (
    <div className="pagina">
      <div className="pagina-topo">
        <h1 className="pagina-titulo">Desempenho</h1>
        <button type="button" className="btn btn-primario so-tablet-pc" onClick={praticar}>Praticar agora</button>
      </div>

      <div className="filtros" role="group" aria-label="Escolher matéria">
        {materias.map((m) => (
          <button key={m} type="button" className={`pilula ${m === materia ? 'ativa' : 'contorno'}`} onClick={() => escolher(m)} aria-pressed={m === materia}>
            {m}
          </button>
        ))}
      </div>

      {total === 0 ? (
        <div className="cartao estado-vazio">
          <span className="icone-circulo"><ChartColumn size={26} aria-hidden="true" /></span>
          <p>Você ainda não fez exercícios de <strong>{materia}</strong>. Faça uma rodada para ver sua evolução.</p>
          <button type="button" className="btn btn-primario" onClick={praticar}>Gerar exercícios</button>
        </div>
      ) : (
        <>
          <div className="estatisticas">
            <div className="cartao estatistica">
              <strong>{media}%</strong>
              <span>Média de acertos</span>
            </div>
            <div className="cartao estatistica">
              <strong>{total}</strong>
              <span>{total === 1 ? 'Rodada feita' : 'Rodadas feitas'}</span>
            </div>
            <div className="cartao estatistica">
              <strong>{melhor}%</strong>
              <span>Melhor resultado</span>
            </div>
          </div>

          <div className="desempenho-grade">
            <section className={`cartao ${classeMateria(materia)}`} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h2 className="secao-titulo">Evolução</h2>
              <ul className="grafico-evolucao" aria-label="Percentual de acertos em cada rodada, da mais antiga para a mais recente">
                {resultados.map((r) => (
                  <li
                    key={r.id}
                    className={nivel(r.percentual)}
                    style={{ height: `${Math.max(r.percentual, 4)}%` }}
                    title={`${r.percentual}%`}
                    aria-label={`${r.percentual}%`}
                  />
                ))}
              </ul>
              <div className="grafico-datas">
                <span>{new Date(resultados[0].data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                <span>{new Date(resultados[total - 1].data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
              </div>
            </section>

            <div className="coluna" style={{ gap: 16 }}>
              {focar.length > 0 && (
                <section className="cartao">
                  <h2 className="secao-titulo" style={{ marginBottom: 6 }}>No que focar</h2>
                  {focar.map(([topico, vezes]) => (
                    <div key={topico} className="linha-topico">
                      <span>{topico}</span>
                      <span className="topico">{vezes} {vezes === 1 ? 'erro' : 'erros'}</span>
                    </div>
                  ))}
                  <button type="button" className="btn btn-escuro btn-bloco" style={{ marginTop: 10 }} onClick={praticar}>
                    Praticar esses tópicos
                  </button>
                </section>
              )}

              <section className="cartao">
                <h2 className="secao-titulo" style={{ marginBottom: 4 }}>Histórico</h2>
                {[...resultados].reverse().slice(0, 8).map((r) => (
                  <div key={r.id} className="linha-historico">
                    <span className="texto-suave">
                      {new Date(r.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <strong className={classeTexto(r.percentual)}>
                      {r.acertos}/{r.total} · {r.percentual}%
                    </strong>
                  </div>
                ))}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Performance() {
  return (
    <AppLayout>
      {(usuario) => (usuario.carregando ? null : <PainelDesempenho usuario={usuario} />)}
    </AppLayout>
  );
}
