// Arma el índice de una presentación a partir de su filminas.js (única fuente del orden).
// El índice y las filminas de cada presentación viven en la misma carpeta.
(function renderizarIndice() {
  const lista = document.getElementById('lista-filminas');
  const filminas = window.FILMINAS;

  if (!lista || !Array.isArray(filminas)) {
    console.error('[presentacion] No se pudo armar el índice: falta #lista-filminas o filminas.js.');
    return;
  }

  const items = filminas.map((filmina, indice) => {
    const item = document.createElement('li');
    const enlace = document.createElement('a');
    const numero = document.createElement('span');
    const titulo = document.createElement('span');

    enlace.href = filmina.archivo;
    numero.className = 'lista-filminas__numero';
    numero.textContent = String(indice + 1).padStart(2, '0');
    titulo.textContent = filmina.titulo;

    enlace.append(numero, titulo);
    if (Number.isFinite(filmina.segundos)) enlace.append(crearDuracion(filmina.segundos));
    item.append(enlace);
    return item;
  });

  lista.append(...items);

  function crearDuracion(segundos) {
    const duracion = document.createElement('span');
    const minutos = Math.floor(segundos / 60);
    const resto = String(segundos % 60).padStart(2, '0');
    duracion.className = 'lista-filminas__duracion';
    duracion.textContent = `${minutos}:${resto}`;
    return duracion;
  }
})();
