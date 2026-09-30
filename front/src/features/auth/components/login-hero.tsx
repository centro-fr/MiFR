// Columna izquierda 50% dark brand — hero centrado verticalmente, sin logo
// superior (el logo vive en el panel derecho para evitar duplicación).
export function LoginHero() {
  return (
    <div className="relative flex w-full flex-col justify-center overflow-hidden bg-[#11141D] p-10 lg:h-full lg:w-1/2 lg:p-14">
      <div aria-hidden="true" className="absolute inset-0">
        <div className="absolute -right-[10%] -top-[15%] h-[480px] w-[480px] rounded-full bg-primary/20 blur-[70px]" />
        <div className="absolute -bottom-[15%] -left-[10%] h-[440px] w-[440px] rounded-full bg-primary-dark/20 blur-[80px]" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-xl">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-pink-500/20 bg-pink-500/10 px-3.5 py-1.5 text-xs font-semibold text-pink-300">
          <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          Acceso Unificado Multirrol
        </p>
        <h1 className="text-4xl font-extrabold leading-[1.15] tracking-tight text-white lg:text-5xl">
          Tu espacio de entrenamiento{" "}
          <span className="bg-gradient-to-r from-primary via-[#FF4D9E] to-pink-200 bg-clip-text text-transparent">
            inteligente.
          </span>
        </h1>
        <p className="mt-5 max-w-lg text-lg font-normal leading-relaxed text-slate-300">
          Gestioná tus rutinas, clases y progreso en un solo lugar.
        </p>
      </div>
    </div>
  );
}
