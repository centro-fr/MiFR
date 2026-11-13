// Miniatura de un ejercicio: la usan el editor de rutinas (US-27) y la rutina del alumno (US-28).

// Fijado al mismo commit que el catálogo (public/ejercicios-es.LICENSE.md) y no a main: el repositorio es
// de un tercero, y con main un cambio o un borrado suyo aparecería en las rutinas sin que nadie lo revise.
const COMMIT_DEL_DATASET = "7455efae41b330c265e7cd4b78dfa848e7ce5ebd";
const CDN_EJERCICIOS = `https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@${COMMIT_DEL_DATASET}`;
const RESPALDO_EJERCICIOS = `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/${COMMIT_DEL_DATASET}`;

function inicialesDe(texto: string): string {
  const partes = texto.trim().split(/\s+/);
  if (partes.length >= 2) {
    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
  }
  return texto.slice(0, 2).toUpperCase();
}

/** El GIF del ejercicio (del dataset, con un respaldo si el CDN falla) o sus iniciales si no hay. */
export function MiniaturaEjercicio({ nombre, gifUrl, className }: { nombre: string; gifUrl?: string; className: string }) {
  if (!gifUrl) {
    return (
      <span
        className={`${className} flex shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200`}
      >
        {inicialesDe(nombre)}
      </span>
    );
  }
  return (
    <img
      src={`${CDN_EJERCICIOS}/${gifUrl}`}
      alt={nombre}
      loading="lazy"
      className={`${className} shrink-0 rounded-lg border border-slate-200 bg-slate-100 object-cover dark:border-slate-700 dark:bg-slate-700`}
      onError={(e) => {
        e.currentTarget.src = `${RESPALDO_EJERCICIOS}/${gifUrl}`;
      }}
    />
  );
}
