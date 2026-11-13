// Lo que se ve mientras baja el código de la página pública, por ejemplo al recargar: el mismo fondo
// que la página, para que no aparezca el esqueleto de la aplicación con su barra lateral.
export function CargaPaginaPublica() {
  return <div role="status" aria-label="Cargando" className="min-h-dvh w-full bg-publico-tinta" />;
}
