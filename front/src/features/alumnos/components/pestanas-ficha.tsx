// Por ahora solo "Datos personales" tiene contenido. Las demás se habilitan a medida que
// existan sus módulos (inscripciones, cuotas, asistencia, rutinas); entonces conviene pasar
// a pestañas con ruta propia (/app/alumnos/:id/pagos) para poder compartir el enlace.
const PESTANAS = [
  { etiqueta: "1. Datos personales", disponible: true },
  { etiqueta: "2. Plan y horarios", disponible: false },
  { etiqueta: "3. Cuotas y cobros", disponible: false },
  { etiqueta: "4. Asistencia", disponible: false },
  { etiqueta: "5. Progreso y rutina", disponible: false },
] as const;

export function PestanasFicha() {
  return (
    <div className="-mx-4 border-b border-border px-4 sm:mx-0 sm:px-0">
      <nav aria-label="Secciones de la ficha" className="max-w-full overflow-x-auto">
        <ul className="flex gap-1">
          {PESTANAS.map(({ etiqueta, disponible }) => (
            <li key={etiqueta}>
              {disponible ? (
                <span
                  aria-current="page"
                  className="block whitespace-nowrap border-b-2 border-primary px-3 py-3 text-sm font-bold text-primary sm:px-4 dark:text-pink-300"
                >
                  {etiqueta}
                </span>
              ) : (
                <span
                  aria-disabled="true"
                  title="Disponible próximamente"
                  className="block whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-sm font-bold text-slate-500 sm:px-4 dark:text-slate-400"
                >
                  {etiqueta}
                  <span className="sr-only"> (próximamente)</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
