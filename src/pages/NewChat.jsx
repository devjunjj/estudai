import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Scale, Zap } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { criarConversa } from '../lib/conversationsStore';
import { abrirConversa } from '../lib/navegacao';
import { ESTILOS, ORDEM_ESTILOS, carregarEstiloPreferido, salvarEstiloPreferido } from '../lib/preferencias';

const ICONES_ESTILO = { direto: Zap, equilibrado: Scale, detalhado: BookOpen };

function FormularioNovaConversa({ usuario }) {
  const navigate = useNavigate();
  const [materia, setMateria] = useState('');
  const [estilo, setEstilo] = useState(() => carregarEstiloPreferido(usuario.userId));
  const [criando, setCriando] = useState(false);

  const materiasRecentes = [...new Set(usuario.conversas.map((c) => c.materia))].slice(0, 6);

  function comecar(e) {
    e.preventDefault();
    const nome = materia.trim();
    if (!nome || criando) return;
    setCriando(true);

    salvarEstiloPreferido(usuario.userId, estilo); // da próxima vez já vem marcado
    const conversa = criarConversa(usuario.userId, nome, estilo);
    abrirConversa(navigate, conversa);
  }

  return (
    <form className="pagina estreita" onSubmit={comecar}>
      <div>
        <p className="pagina-subtitulo">Nova conversa</p>
        <h1 className="pagina-titulo">O que vamos estudar hoje?</h1>
      </div>

      <div className="campo">
        <label className="campo-rotulo" htmlFor="materia">Matéria</label>
        <input
          id="materia"
          type="text"
          className="campo-texto"
          placeholder="Ex.: Cálculo I, Química, História do Brasil"
          value={materia}
          onChange={(e) => setMateria(e.target.value)}
          autoFocus
        />
      </div>

      {materiasRecentes.length > 0 && (
        <div className="sugestoes-materia" role="group" aria-label="Matérias que você já estudou">
          {materiasRecentes.map((m) => (
            <button key={m} type="button" className="pilula contorno" onClick={() => setMateria(m)}>
              {m}
            </button>
          ))}
        </div>
      )}

      <fieldset className="opcoes-estilo">
        <legend className="campo-rotulo" style={{ marginBottom: 10 }}>
          Como você prefere as respostas?
        </legend>
        {ORDEM_ESTILOS.map((chave) => {
          const Icone = ICONES_ESTILO[chave];
          return (
            <label key={chave} className="opcao-estilo">
              <input
                type="radio"
                name="estilo"
                value={chave}
                checked={estilo === chave}
                onChange={() => setEstilo(chave)}
              />
              <span className="opcao-estilo-icone" aria-hidden="true">
                <Icone size={20} />
              </span>
              <span className="opcao-estilo-textos">
                <span className="opcao-estilo-nome">{ESTILOS[chave].rotulo}</span>
                <span className="opcao-estilo-descricao">{ESTILOS[chave].descricao}</span>
              </span>
            </label>
          );
        })}
      </fieldset>
      <p className="texto-suave" style={{ margin: '-8px 0 0', fontSize: 13 }}>
        Dá para mudar a qualquer momento durante a conversa.
      </p>

      <button type="submit" className="btn btn-primario btn-bloco" disabled={!materia.trim() || criando}>
        {criando ? 'Abrindo…' : 'Começar a estudar'}
      </button>
    </form>
  );
}

export default function NewChat() {
  return (
    <AppLayout>
      {(usuario) => (usuario.carregando ? null : <FormularioNovaConversa usuario={usuario} />)}
    </AppLayout>
  );
}
