import { Check, Flame } from 'lucide-react';

function textoSequencia(sequencia, estudouHoje) {
  if (sequencia === 0) return 'Estude hoje para começar uma sequência';
  if (!estudouHoje) return 'Estude hoje para não perder a sequência';
  return 'Você já estudou hoje. Mandou bem!';
}

// Card de dias seguidos estudados. "destaque" = card azul do Início; "compacta" = menu lateral.
export default function Sequencia({ dados, variante = 'destaque' }) {
  const { sequencia, estudouHoje, semana } = dados;
  const titulo = sequencia === 1 ? '1 dia seguido' : `${sequencia} dias seguidos`;

  if (variante === 'compacta') {
    return (
      <section className="sequencia-compacta" aria-label="Sequência de estudos">
        <div className="sequencia-topo">
          <Flame size={24} color="#f97316" fill="#f97316" aria-hidden="true" />
          <div>
            <p className="sequencia-numero">{titulo}</p>
            <p className="sequencia-texto">{estudouHoje ? 'Hoje já conta!' : 'Estude hoje para manter'}</p>
          </div>
        </div>
        <ul className="semana-mini">
          {semana.map((d, i) => (
            <li key={i} className={d.feito ? 'feito' : undefined} aria-label={d.feito ? 'Estudou' : 'Não estudou'}>
              {d.letra}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section className="sequencia" aria-label="Sequência de estudos">
      <div className="sequencia-topo">
        <span className="sequencia-icone">
          <Flame size={24} fill="currentColor" aria-hidden="true" />
        </span>
        <div>
          <p className="sequencia-numero">{titulo}</p>
          <p className="sequencia-texto">{textoSequencia(sequencia, estudouHoje)}</p>
        </div>
      </div>
      <ul className="semana">
        {semana.map((d, i) => (
          <li key={i} className={`semana-dia${d.feito ? ' feito' : ''}${d.hoje ? ' hoje' : ''}`}>
            <span className="semana-bolinha">
              {d.feito && <Check size={15} strokeWidth={3.2} aria-label="Estudou" />}
            </span>
            {d.letra}
          </li>
        ))}
      </ul>
    </section>
  );
}
