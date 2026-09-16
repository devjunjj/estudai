import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

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
        setMensagem('Conta criada! Verifique seu e-mail pra confirmar antes de entrar.');
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
    else setMensagem('Enviamos um link de redefinição de senha pro seu e-mail.');
  }

  return (
    <div className="screen">
      <div className="header-blue" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div className="logo-badge">⚡</div>
        <h1 style={{ fontSize: 19, fontWeight: 600, margin: '12px 0 4px' }}>EstudAI</h1>
        <p style={{ fontSize: 13, opacity: 0.85, margin: 0 }}>Aprenda no seu ritmo</p>
      </div>

      <form onSubmit={handleSubmit} className="conteudo-estreito" style={{ padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 14px' }}>
          {modoCadastro ? 'Criar conta' : 'Entrar'}
        </p>

        <label className="field-label" htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          className="text-input"
          placeholder="voce@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginBottom: 14 }}
          required
        />

        <label className="field-label" htmlFor="senha">Senha</label>
        <input
          id="senha"
          type="password"
          className="text-input"
          placeholder="••••••••"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          minLength={6}
          style={{ marginBottom: 8 }}
          required
        />

        {!modoCadastro && (
          <div style={{ textAlign: 'right', marginBottom: 12 }}>
            <button type="button" className="link-accent" style={{ fontSize: 12 }} onClick={handleEsqueciSenha}>
              Esqueceu a senha?
            </button>
          </div>
        )}

        {erro && <p style={{ color: '#D0333F', fontSize: 12, margin: '0 0 10px' }}>{erro}</p>}
        {mensagem && <p style={{ color: 'var(--blue-dark)', fontSize: 12, margin: '0 0 10px' }}>{mensagem}</p>}

        <button type="submit" className="btn-primary" disabled={carregando} style={{ marginTop: modoCadastro ? 8 : 0, marginBottom: 12 }}>
          {carregando ? 'Aguarde...' : modoCadastro ? 'Criar conta' : 'Entrar'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
          {modoCadastro ? 'Já tem conta?' : 'Não tem conta?'}{' '}
          <button
            type="button"
            className="link-accent"
            onClick={() => { setModoCadastro(!modoCadastro); setErro(''); setMensagem(''); }}
          >
            {modoCadastro ? 'Entrar' : 'Criar conta'}
          </button>
        </p>
      </form>
    </div>
  );
}

function traduzErro(msg) {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('User already registered')) return 'Já existe uma conta com esse e-mail.';
  if (msg.includes('Password should be')) return 'A senha precisa ter pelo menos 6 caracteres.';
  return msg;
}
