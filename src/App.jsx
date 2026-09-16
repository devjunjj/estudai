import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import Login from './pages/Login';
import Home from './pages/Home';
import NewChat from './pages/NewChat';
import Chat from './pages/Chat';
import Exercises from './pages/Exercises';
import Performance from './pages/Performance';

function RotaPrivada({ sessao, carregando, children }) {
  if (carregando) return null; // evita "piscar" a tela de login antes de checar
  return sessao ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setCarregando(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RotaPrivada sessao={sessao} carregando={carregando}><Home /></RotaPrivada>} />
          <Route path="/nova" element={<RotaPrivada sessao={sessao} carregando={carregando}><NewChat /></RotaPrivada>} />
          <Route path="/chat" element={<RotaPrivada sessao={sessao} carregando={carregando}><Chat /></RotaPrivada>} />
          <Route path="/exercicios" element={<RotaPrivada sessao={sessao} carregando={carregando}><Exercises /></RotaPrivada>} />
          <Route path="/desempenho" element={<RotaPrivada sessao={sessao} carregando={carregando}><Performance /></RotaPrivada>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
