export function alternarTema() {
  const escuro = document.documentElement.classList.toggle('dark');
  localStorage.setItem('estudai_tema', escuro ? 'dark' : 'light');
  return escuro;
}

export function temaAtualEhEscuro() {
  return document.documentElement.classList.contains('dark');
}
