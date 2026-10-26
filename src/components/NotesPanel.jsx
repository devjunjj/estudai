import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { notasApi } from '../lib/api';

// Anotações da matéria, salvas pela API em C#.
// O componente só mostra o conteúdo: quem usa decide se fica no painel lateral (PC) ou numa gaveta.
// `versao` muda quando outra parte da tela salva uma nota (ex.: "Salvar nas anotações" no chat)
export default function NotesPanel({ userId, materia, mostrarTitulo = true, versao = 0 }) {
  const [notas, setNotas] = useState([]);
  const [rascunho, setRascunho] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let cancelado = false; // evita atualizar o estado se o componente sair da tela antes da resposta
    setCarregando(true);
    setErro('');

    notasApi
      .listar(materia)
      .then((dados) => !cancelado && setNotas(dados))
      .catch((e) => !cancelado && setErro(e.message))
      .finally(() => !cancelado && setCarregando(false));

    return () => {
      cancelado = true;
    };
  }, [userId, materia, versao]);

  async function adicionar(e) {
    e.preventDefault();
    const texto = rascunho.trim();
    if (!texto) return;

    setSalvando(true);
    setErro('');
    try {
      const nova = await notasApi.criar(materia, texto);
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
      await notasApi.excluir(id);
      setNotas((atuais) => atuais.filter((n) => n.id !== id));
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <section className="notas" aria-label="Anotações">
      {mostrarTitulo && (
        <div className="notas-cabecalho">
          <h2>
            Anotações <span className="notas-contagem">· {notas.length}</span>
          </h2>
        </div>
      )}

      <form className="nova-nota" onSubmit={adicionar}>
        <label htmlFor={`nova-nota-${mostrarTitulo ? 'painel' : 'gaveta'}`} className="so-leitor">
          Nova anotação
        </label>
        <textarea
          id={`nova-nota-${mostrarTitulo ? 'painel' : 'gaveta'}`}
          className="campo-texto"
          placeholder="Anote algo importante…"
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
        />
        <button type="submit" className="btn btn-suave" disabled={!rascunho.trim() || salvando}>
          <Plus size={18} aria-hidden="true" />
          {salvando ? 'Salvando…' : 'Salvar anotação'}
        </button>
        {erro && <p className="mensagem-erro">{erro}</p>}
      </form>

      {carregando && <p className="notas-aviso">Carregando anotações…</p>}
      {!carregando && notas.length === 0 && !erro && (
        <p className="notas-aviso">Nenhuma anotação ainda. Salve aqui o que não pode esquecer.</p>
      )}

      <ul className="lista-notas">
        {notas.map((n) => (
          <li key={n.id} className="nota">
            <p className="nota-texto">{n.texto}</p>
            <div className="nota-rodape">
              <span>{new Date(n.criadaEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
              <button type="button" onClick={() => excluir(n.id)}>
                <Trash2 size={14} aria-hidden="true" /> Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
