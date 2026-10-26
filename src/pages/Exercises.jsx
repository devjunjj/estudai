import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, GraduationCap, RotateCcw, X } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { gerarExercicios } from '../lib/aiClient';
import { classeMateria, registrarDiaDeEstudo } from '../lib/estudos';
import { registrarResultado } from '../lib/performanceStore';

const LETRAS = ['A', 'B', 'C', 'D', 'E'];

function voltarParaConversa(navigate) {
  const id = sessionStorage.getItem('estudai_conversa_id');
  navigate(id ? `/chat/${id}` : '/');
}

function Topo({ materia }) {
  const navigate = useNavigate();
  return (
    <div className="pagina-topo" style={{ justifyContent: 'flex-start' }}>
      <button type="button" className="btn-icone contorno" onClick={() => voltarParaConversa(navigate)} aria-label="Voltar para a conversa">
        <ArrowLeft size={20} aria-hidden="true" />
      </button>
      <div>
        <p className="pagina-subtitulo" style={{ margin: 0 }}>Exercícios</p>
        <span className={`etiqueta-materia ${classeMateria(materia)}`}>{materia}</span>
      </div>
    </div>
  );
}

function Rodada({ userId, materia, contexto, onNovaRodada }) {
  const navigate = useNavigate();
  const [exercicios, setExercicios] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [indice, setIndice] = useState(0);
  const [selecionada, setSelecionada] = useState(null);
  const [respondida, setRespondida] = useState(false);
  const [respostas, setRespostas] = useState([]);
  const [finalizado, setFinalizado] = useState(false);

  useEffect(() => {
    let ativo = true;
    gerarExercicios({ materia, quantidade: 5, contexto })
      .then((lista) => ativo && setExercicios(lista))
      .catch((erro) => {
        console.error('Falha ao gerar exercícios:', erro);
        if (ativo) setExercicios(null);
      })
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [materia, contexto]);

  if (carregando) {
    return (
      <div className="carregando-centro" role="status">
        <span className="indicador-pensando">
          Preparando 5 questões de {materia}
          <span className="pontos-pensando" aria-hidden="true"><span /><span /><span /></span>
        </span>
      </div>
    );
  }

  if (!exercicios || exercicios.length === 0) {
    return (
      <div className="estado-vazio">
        <p>Não foi possível gerar os exercícios agora.</p>
        <button type="button" className="btn btn-primario" onClick={onNovaRodada}>
          <RotateCcw size={18} aria-hidden="true" /> Tentar de novo
        </button>
      </div>
    );
  }

  if (finalizado) {
    return (
      <Resultado
        userId={userId}
        materia={materia}
        respostas={respostas}
        onRefazer={onNovaRodada}
        onVoltar={() => voltarParaConversa(navigate)}
        onRevisar={(topicos) => {
          const pergunta = `Pode me ensinar estes tópicos que eu errei nos exercícios de ${materia}: ${topicos.join(', ')}? Explica um de cada vez.`;
          sessionStorage.setItem('estudai_pergunta_pendente', pergunta);
          voltarParaConversa(navigate);
        }}
      />
    );
  }

  const atual = exercicios[indice];
  const progresso = Math.round(((indice + (respondida ? 1 : 0)) / exercicios.length) * 100);
  const acertou = respondida && selecionada === atual.correta;

  function responder() {
    setRespostas([...respostas, { pergunta: atual.pergunta, topico: atual.topico, acertou: selecionada === atual.correta }]);
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

  function classeAlternativa(i) {
    if (respondida) {
      if (i === atual.correta) return 'alternativa correta';
      if (i === selecionada) return 'alternativa errada';
      return 'alternativa';
    }
    return i === selecionada ? 'alternativa selecionada' : 'alternativa';
  }

  return (
    <>
      <div className="exercicio-progresso">
        <div className="exercicio-progresso-linha">
          <span>Questão {indice + 1} de {exercicios.length}</span>
          <span>{progresso}%</span>
        </div>
        <div className="barra" aria-hidden="true">
          <div className="barra-preenchida" style={{ width: `${progresso}%` }} />
        </div>
      </div>

      <div className="cartao" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {atual.topico && <span className="sobretitulo">{atual.topico}</span>}
        <h1 className="pergunta">{atual.pergunta}</h1>
        <ul className="alternativas">
          {atual.alternativas.map((alt, i) => (
            <li key={i}>
              <button
                type="button"
                className={classeAlternativa(i)}
                onClick={() => setSelecionada(i)}
                disabled={respondida}
                aria-pressed={selecionada === i}
              >
                <span className="alternativa-letra" aria-hidden="true">
                  {respondida && i === atual.correta ? <Check size={18} strokeWidth={3} /> : respondida && i === selecionada ? <X size={18} strokeWidth={3} /> : LETRAS[i]}
                </span>
                {alt}
              </button>
            </li>
          ))}
        </ul>
        {respondida && (
          <p role="status" className={acertou ? 'texto-sucesso' : 'texto-perigo'} style={{ margin: 0, fontWeight: 700 }}>
            {acertou ? 'Isso aí, resposta certa!' : `Não foi dessa vez. A certa é a ${LETRAS[atual.correta]}.`}
          </p>
        )}
      </div>

      {!respondida ? (
        <button type="button" className="btn btn-primario btn-bloco" onClick={responder} disabled={selecionada === null}>
          Confirmar resposta
        </button>
      ) : (
        <button type="button" className="btn btn-primario btn-bloco" onClick={proxima}>
          {indice < exercicios.length - 1 ? 'Próxima questão' : 'Ver resultado'}
        </button>
      )}
    </>
  );
}

function Resultado({ userId, materia, respostas, onRefazer, onVoltar, onRevisar }) {
  const total = respostas.length;
  const acertos = respostas.filter((r) => r.acertou).length;
  const erros = total - acertos;
  const percentual = Math.round((acertos / total) * 100);
  const topicosParaFocar = [...new Set(respostas.filter((r) => !r.acertou).map((r) => r.topico).filter(Boolean))];

  useEffect(() => {
    registrarResultado(userId, materia, { total, acertos, topicosErrados: topicosParaFocar });
    registrarDiaDeEstudo(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="cartao" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p className="resultado-percentual">{percentual}%</p>
        <p className="texto-suave" style={{ margin: 0, textAlign: 'center', fontSize: 15 }}>
          {acertos} de {total} questões certas
        </p>
        <div className="legenda-resultado">
          <span className="texto-sucesso">{acertos} {acertos === 1 ? 'acerto' : 'acertos'}</span>
          <span className="texto-perigo">{erros} {erros === 1 ? 'erro' : 'erros'}</span>
        </div>
        <div className="barra-resultado" aria-hidden="true">
          <div className="acertos" style={{ width: `${(acertos / total) * 100}%` }} />
          <div className="erros" style={{ width: `${(erros / total) * 100}%` }} />
        </div>
      </div>

      {topicosParaFocar.length > 0 && (
        <div className="cartao" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="secao-titulo">O que revisar</h2>
          <ul className="topicos">
            {topicosParaFocar.map((t) => (
              <li key={t} className="topico">{t}</li>
            ))}
          </ul>
          <button type="button" className="btn btn-suave btn-bloco" onClick={() => onRevisar(topicosParaFocar)}>
            <GraduationCap size={18} aria-hidden="true" /> Me ensine o que eu errei
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button type="button" className="btn btn-primario btn-bloco" onClick={onRefazer}>
          Fazer mais exercícios
        </button>
        <button type="button" className="btn btn-secundario btn-bloco" onClick={onVoltar}>
          Voltar para a conversa
        </button>
      </div>
    </>
  );
}

function PaginaExercicios({ userId }) {
  const navigate = useNavigate();
  const materia = localStorage.getItem('estudai_materia');
  const contexto = sessionStorage.getItem('estudai_exercicios_contexto') || '';
  const [rodada, setRodada] = useState(0); // trocar a key gera uma rodada nova

  useEffect(() => {
    if (!materia) navigate('/', { replace: true });
  }, [materia, navigate]);

  if (!materia) return null;

  return (
    <div className="pagina estreita">
      <Topo materia={materia} />
      <Rodada key={rodada} userId={userId} materia={materia} contexto={contexto} onNovaRodada={() => setRodada((r) => r + 1)} />
    </div>
  );
}

export default function Exercises() {
  return (
    <AppLayout semAbasNoCelular>
      {(usuario) => (usuario.carregando ? null : <PaginaExercicios userId={usuario.userId} />)}
    </AppLayout>
  );
}
