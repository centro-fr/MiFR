// Aplica el tema guardado antes del primer pintado para que el splash respete el tema claro u oscuro
// desde el inicio (misma clave que theme-store). Es un archivo y no un <script> en index.html para que
// la Content-Security-Policy de netlify.toml no tenga que habilitar scripts inline.
try {
  if (localStorage.getItem("mifr:tema") === "oscuro") {
    document.documentElement.classList.add("dark");
    document.querySelector('meta[name="theme-color"]').setAttribute("content", "#0f131d");
  }
} catch (e) {
  /* sin almacenamiento: tema claro por defecto */
}
