const EJERCICIOS_DE_MUESTRA = [
  ["Sentadilla con barra", "4 × 10"],
  ["Peso muerto rumano", "3 × 12"],
  ["Estocadas", "3 × 12"],
];

const TARJETA = "rounded-[18px] border border-[#e3e7ec] bg-white p-3.5";
const ROTULO = "text-xs font-bold text-[#5b6475]";

// Ilustración del panel del alumno con datos inventados: es decorativa, los lectores de pantalla la
// saltean y en mobile no se muestra (la lista de beneficios ya cuenta lo mismo).
export function CelularDeMuestra() {
  return (
    <div aria-hidden="true" className="relative hidden h-[600px] md:block">
      <div className="absolute inset-[40px_40px_0_40px] rounded-[40px] bg-[radial-gradient(circle_at_50%_40%,rgba(233,30,130,0.35),transparent_65%)]" />
      <div className="absolute left-1/2 top-0 h-[600px] w-[300px] -translate-x-1/2 rotate-[4deg] rounded-[46px] bg-publico-tinta p-3.5 shadow-[0_40px_80px_rgba(11,13,18,0.35)]">
        <div className="flex h-full flex-col gap-3 overflow-hidden rounded-[34px] bg-[#f6f8fa] px-[18px] pb-[18px] pt-[34px]">
          <div className={ROTULO}>Hola, Sofía</div>
          <div className="rounded-[18px] bg-publico-tinta p-4 text-white">
            <div className="text-xs text-publico-texto-tenue">Racha actual</div>
            <div className="font-display text-[44px] leading-[46px]">
              18 <span className="text-lg text-primary">clases</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/15">
              <div className="h-1.5 w-[72%] rounded-full bg-primary" />
            </div>
          </div>
          <div className={TARJETA}>
            <div className={ROTULO}>Rutina de hoy · Piernas</div>
            {EJERCICIOS_DE_MUESTRA.map(([ejercicio, series]) => (
              <div key={ejercicio} className="mt-1.5 flex justify-between text-[13px] first-of-type:mt-2">
                <span>{ejercicio}</span>
                <strong>{series}</strong>
              </div>
            ))}
          </div>
          <div className={TARJETA}>
            <div className={ROTULO}>Peso</div>
            <svg viewBox="0 0 220 60" width="100%" className="mt-1.5 block">
              <polyline
                points="0,12 36,18 72,26 108,30 144,36 180,44 220,48"
                fill="none"
                stroke="#e91e82"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="text-xs font-bold text-[#067647]">1,2 kg menos desde marzo</div>
          </div>
          <div className="flex gap-2">
            <span className="flex-1 rounded-[14px] bg-[#fde7f2] p-2.5 text-center text-xs font-extrabold text-[#8f0d4d]">
              Top 3 del mes
            </span>
            <span className="flex-1 rounded-[14px] bg-[#e7f6ee] p-2.5 text-center text-xs font-extrabold text-[#0f5132]">
              Cuota al día
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
