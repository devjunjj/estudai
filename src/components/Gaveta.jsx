import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// Painel que sobe de baixo (celular) ou desliza da direita (tablet).
// Fecha com Esc, com o X ou tocando fora.
export default function Gaveta({ titulo, aberta, onFechar, children }) {
  const painelRef = useRef(null);

  useEffect(() => {
    if (!aberta) return;
    painelRef.current?.focus();
    function aoTeclar(e) {
      if (e.key === 'Escape') onFechar();
    }
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aberta, onFechar]);

  if (!aberta) return null;

  return (
    <div className="gaveta-fundo" onClick={onFechar}>
      <div
        ref={painelRef}
        className="gaveta"
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gaveta-topo">
          <h2>{titulo}</h2>
          <button type="button" className="btn-icone" onClick={onFechar} aria-label="Fechar">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="gaveta-corpo">{children}</div>
      </div>
    </div>
  );
}
