import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import Login from './pages/Login';
import Home from './pages/Home';
import Conversas from './pages/Conversas';
import NewChat from './pages/NewChat';
import Chat from './pages/Chat';
import Exercises from './pages/Exercises';
import Performance from './pages/Performance';

function RotaPrivada({ sessao, carregando, children }) {
  if (carregando) return null; // evita "piscar" a tela de login antes de checar
  return sessao ? children : <Navigate to="/login" replace />;
}

// A "key" faz o Chat recomeçar do zero ao trocar de conversa pelo menu lateral
function ChatDaRota() {
  const { id } = useParams();
  return <Chat key={id} conversaId={id} />;
}

// Endereço antigo (/chat): volta para a última conversa aberta
function UltimoChat() {
  const id = sessionStorage.getItem('estudai_conversa_id');
  return <Navigate to={id ? `/chat/${id}` : '/'} replace />;
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

  const privada = (elemento) => (
    <RotaPrivada sessao={sessao} carregando={carregando}>
      {elemento}
    </RotaPrivada>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={privada(<Home />)} />
        <Route path="/conversas" element={privada(<Conversas />)} />
        <Route path="/nova" element={privada(<NewChat />)} />
        <Route path="/chat/:id" element={privada(<ChatDaRota />)} />
        <Route path="/chat" element={privada(<UltimoChat />)} />
        <Route path="/exercicios" element={privada(<Exercises />)} />
        <Route path="/desempenho" element={privada(<Performance />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
