import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { listarConversas } from './conversationsStore';

// Dados do usuário logado + suas conversas, atualizados sempre que
// uma conversa é criada ou recebe mensagem.
export function useUsuario() {
  const [dados, setDados] = useState({ carregando: true, userId: null, email: '', conversas: [] });

  useEffect(() => {
    let ativo = true;
    let userId = null;

    function recarregarConversas() {
      if (ativo && userId) setDados((atual) => ({ ...atual, conversas: listarConversas(userId) }));
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!ativo) return;
      userId = data.user?.id ?? 'anonimo';
      setDados({
        carregando: false,
        userId,
        email: data.user?.email ?? '',
        conversas: listarConversas(userId),
      });
    });

    window.addEventListener('estudai:conversas', recarregarConversas);
    return () => {
      ativo = false;
      window.removeEventListener('estudai:conversas', recarregarConversas);
    };
  }, []);

  return dados;
}
