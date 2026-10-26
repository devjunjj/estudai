import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChartColumn, ListChecks, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Logo } from '../components/AppLayout';

export default function Login() {
  const navigate = useNavigate();
  const [modoCadastro, setModoCadastro] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setMensagem('');
    setCarregando(true);

    try {
      if (modoCadastro) {
        const { error } = await supabase.auth.signUp({ email, password: senha });
        if (error) throw error;
        setMensagem('Conta criada! Verifique seu e-mail para confirmar antes de entrar.');
        setModoCadastro(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        navigate('/');
      }
    } catch (err) {
      setErro(traduzErro(err.message));
    } finally {
      setCarregando(false);
    }
  }

  async function handleEsqueciSenha() {
    if (!email) {
      setErro('Digite seu e-mail acima primeiro, depois clique aqui.');
      return;
    }
    setErro('');
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) setErro(traduzErro(error.message));
    else setMensagem('Enviamos um link de redefinição de senha para o seu e-mail.');
  }

  function alternarModo() {
    setModoCadastro(!modoCadastro);
    setErro('');
    setMensagem('');
  }

  return (
    <div className="login">
      <section className="login-marca">
        <Logo />
        <div>
          <h1 className="login-chamada">Estude qualquer matéria no seu ritmo.</h1>
          <ul className="login-vantagens">
            <li>
              <span className="icone"><MessageCircle size={19} aria-hidden="true" /></span>
              Um tutor que explica do jeito que você prefere
            </li>
            <li>
              <span className="icone"><ListChecks size={19} aria-hidden="true" /></span>
              Exercícios gerados a partir do que você estudou
            </li>
            <li>
              <span className="icone"><ChartColumn size={19} aria-hidden="true" /></span>
              Acompanhe sua evolução e o que revisar
            </li>
          </ul>
        </div>
        <p className="login-rodape">Projeto pessoal de Jonas Vicente</p>
      </section>

      <div className="login-formulario">
        <form className="login-caixa" onSubmit={handleSubmit}>
          <div className="login-logo-celular">
            <Logo />
          </div>

          <div>
            <h2 className="pagina-titulo">{modoCadastro ? 'Criar conta' : 'Bem-vindo de volta'}</h2>
            <p className="texto-suave" style={{ margin: '6px 0 0', fontSize: 15 }}>
              {modoCadastro ? 'Leva menos de um minuto.' : 'Entre para continuar estudando.'}
            </p>
          </div>

          <div className="campo">
            <label className="campo-rotulo" htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              className="campo-texto"
              placeholder="voce@email.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="campo">
            <label className="campo-rotulo" htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              className="campo-texto"
              placeholder="Mínimo de 6 caracteres"
              autoComplete={modoCadastro ? 'new-password' : 'current-password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              minLength={6}
              required
            />
            {!modoCadastro && (
              <button type="button" className="btn-link" style={{ alignSelf: 'flex-end', fontSize: 13, minHeight: 32 }} onClick={handleEsqueciSenha}>
                Esqueceu a senha?
              </button>
            )}
          </div>

          {erro && <p className="mensagem-erro" role="alert">{erro}</p>}
          {mensagem && <p className="mensagem-ok" role="status">{mensagem}</p>}

          <button type="submit" className="btn btn-primario btn-bloco" disabled={carregando}>
            {carregando ? 'Aguarde…' : modoCadastro ? 'Criar conta' : 'Entrar'}
          </button>

          <p className="login-alternar">
            {modoCadastro ? 'Já tem conta?' : 'Não tem conta?'}{' '}
            <button type="button" className="btn-link" onClick={alternarModo}>
              {modoCadastro ? 'Entrar' : 'Criar conta'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

function traduzErro(msg) {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('User already registered')) return 'Já existe uma conta com esse e-mail.';
  if (msg.includes('Password should be')) return 'A senha precisa ter pelo menos 6 caracteres.';
  return msg;
}
