import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { conversasApi, estudosApi, resultadosApi } from './api';
import { importarDadosLocais } from './sincronizacao';

const ESTADO_INICIAL = { carregando: true, erro: '', userId: null, email: '', conversas: [], resultados: [], dias: [] };

// Guarda a última carga em memória: ao trocar de tela, mostra na hora
// o que já tinha e atualiza em segundo plano.
let ultimaCarga = null;

// Dados do usuário logado, vindos da API: conversas (resumo), resultados e dias estudados.
// Recarrega uma parte quando outra tela avisa que algo mudou (eventos "estudai:*").
export function useUsuario() {
  const [dados, setDados] = useState(() => ultimaCarga ?? ESTADO_INICIAL);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;

    function atualizar(parcial) {
      if (!ativo) return;
      setDados((atual) => {
        const novo = { ...atual, ...parcial };
        if (!novo.carregando && !novo.erro) ultimaCarga = novo;
        return novo;
      });
    }

    const buscarConversas = () => conversasApi.listar().then((conversas) => atualizar({ conversas })).catch(() => {});
    const buscarResultados = () => resultadosApi.listar().then((resultados) => atualizar({ resultados })).catch(() => {});
    const buscarDias = () => estudosApi.listarDias().then((dias) => atualizar({ dias })).catch(() => {});

    (async () => {
      // getSession lê a sessão salva no aparelho (sem ir ao Supabase); quem confere o token é a API
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      const userId = user?.id;
      if (!userId) {
        atualizar({ carregando: false, erro: 'Sessão expirada. Faça login novamente.' });
        return;
      }
      atualizar({ userId, email: user?.email ?? '' });

      try {
        await importarDadosLocais(userId);
      } catch (erro) {
        console.warn('Importação dos dados locais adiada:', erro.message);
      }

      try {
        const [conversas, resultados, dias] = await Promise.all([
          conversasApi.listar(),
          resultadosApi.listar(),
          estudosApi.listarDias(),
        ]);
        atualizar({ carregando: false, erro: '', conversas, resultados, dias });
      } catch (erro) {
        atualizar({ carregando: false, erro: erro.message });
      }
    })();

    window.addEventListener('estudai:conversas', buscarConversas);
    window.addEventListener('estudai:resultados', buscarResultados);
    window.addEventListener('estudai:dias', buscarDias);
    return () => {
      ativo = false;
      window.removeEventListener('estudai:conversas', buscarConversas);
      window.removeEventListener('estudai:resultados', buscarResultados);
      window.removeEventListener('estudai:dias', buscarDias);
    };
  }, [tentativa]);

  const recarregar = useCallback(() => {
    setDados((atual) => ({ ...atual, carregando: true, erro: '' }));
    setTentativa((t) => t + 1);
  }, []);

  return { ...dados, recarregar };
}

// Esquece o que estava em memória (ex.: ao sair da conta)
export function limparDadosDoUsuario() {
  ultimaCarga = null;
}
