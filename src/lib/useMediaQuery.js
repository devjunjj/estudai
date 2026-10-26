import { useEffect, useState } from 'react';

// true enquanto a tela atende à media query (ex.: '(min-width: 1200px)')
export function useMediaQuery(query) {
  const [atende, setAtende] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const lista = window.matchMedia(query);
    const aoMudar = () => setAtende(lista.matches);
    aoMudar();
    lista.addEventListener('change', aoMudar);
    return () => lista.removeEventListener('change', aoMudar);
  }, [query]);

  return atende;
}
