import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, LogOut, Moon, Scale, Sun, Zap } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { supabase } from '../lib/supabaseClient';
import { limparDadosDoUsuario } from '../lib/useUsuario';
import { definirTema, temaAtualEhEscuro } from '../lib/theme';
import { ESTILOS, ORDEM_ESTILOS, carregarEstiloPreferido, salvarEstiloPreferido } from '../lib/preferencias';

const ICONES_ESTILO = { direto: Zap, equilibrado: Scale, detalhado: BookOpen };

function ConteudoConta({ usuario }) {
  const navigate = useNavigate();
  const [escuro, setEscuro] = useState(temaAtualEhEscuro);
  const [estilo, setEstilo] = useState(() => carregarEstiloPreferido(usuario.userId));

  function escolherTema(valor) {
    definirTema(valor);
    setEscuro(valor);
  }

  function escolherEstilo(valor) {
    salvarEstiloPreferido(usuario.userId, valor);
    setEstilo(valor);
  }

  async function sair() {
    limparDadosDoUsuario();
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <div className="pagina estreita">
      <h1 className="pagina-titulo">Conta</h1>

      <div className="cartao conta-perfil">
        <span className="avatar" aria-hidden="true">{usuario.email.slice(0, 2) || '?'}</span>
        <div>
          <p className="pagina-subtitulo" style={{ margin: 0 }}>Conectado como</p>
          <p className="conta-email">{usuario.email}</p>
        </div>
      </div>

      <section className="conta-secao">
        <h2 className="secao-titulo">Aparência</h2>
        <div className="alternador" role="group" aria-label="Tema">
          <button type="button" aria-pressed={!escuro} onClick={() => escolherTema(false)}>
            <Sun size={22} aria-hidden="true" /> Claro
          </button>
          <button type="button" aria-pressed={escuro} onClick={() => escolherTema(true)}>
            <Moon size={22} aria-hidden="true" /> Escuro
          </button>
        </div>
      </section>

      <section className="conta-secao">
        <h2 className="secao-titulo">Tamanho das respostas</h2>
        <p className="texto-suave" style={{ margin: '-4px 0 0', fontSize: 14 }}>
          Vem marcado ao criar uma nova conversa.
        </p>
        <div className="alternador tres" role="group" aria-label="Tamanho padrão das respostas">
          {ORDEM_ESTILOS.map((chave) => {
            const Icone = ICONES_ESTILO[chave];
            return (
              <button key={chave} type="button" aria-pressed={estilo === chave} onClick={() => escolherEstilo(chave)}>
                <Icone size={22} aria-hidden="true" /> {ESTILOS[chave].rotulo}
              </button>
            );
          })}
        </div>
      </section>

      <button type="button" className="btn btn-secundario btn-bloco btn-sair" onClick={sair}>
        <LogOut size={18} aria-hidden="true" /> Sair da conta
      </button>
    </div>
  );
}

export default function Conta() {
  return (
    <AppLayout>
      {(usuario) => (usuario.carregando ? null : <ConteudoConta usuario={usuario} />)}
    </AppLayout>
  );
}
