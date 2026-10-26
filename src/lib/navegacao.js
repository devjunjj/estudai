// Abre uma conversa e lembra qual foi a última (usada por Exercícios e Desempenho)
export function abrirConversa(navigate, conversa) {
  sessionStorage.setItem('estudai_conversa_id', conversa.id);
  localStorage.setItem('estudai_materia', conversa.materia);
  navigate(`/chat/${conversa.id}`);
}
