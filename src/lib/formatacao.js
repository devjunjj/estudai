// Textos de apoio para mostrar conversas em listas

// Aceita tanto a conversa completa (com mensagens) quanto o resumo vindo da API (com titulo)
export function tituloConversa(conversa) {
  const texto = conversa.titulo ?? conversa.mensagens?.find((m) => m.autor === 'usuario' && m.texto)?.texto;
  if (!texto) return 'Conversa nova';
  return texto.length > 60 ? texto.slice(0, 60) + '…' : texto;
}

export function resumoConversa(conversa) {
  const ultima = conversa.ultimaMensagem != null
    ? { autor: conversa.ultimoAutor, texto: conversa.ultimaMensagem }
    : conversa.mensagens?.[conversa.mensagens.length - 1];
  if (!ultima?.texto) return 'Toque para começar';
  const prefixo = ultima.autor === 'usuario' ? 'Você: ' : '';
  const texto = ultima.texto.replace(/[#*_`>]/g, '').replace(/\s+/g, ' ').trim();
  return prefixo + (texto.length > 90 ? texto.slice(0, 90) + '…' : texto);
}

export function dataCurta(iso) {
  const data = new Date(iso);
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);
  if (data.toDateString() === hoje.toDateString()) {
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  if (data.toDateString() === ontem.toDateString()) return 'ontem';
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}
