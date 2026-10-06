// Arma la lista del índice general a partir de filminas.js (única fuente del orden).
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

    enlace.href = `filminas/${filmina.archivo}`;
    numero.className = 'lista-filminas__numero';
    numero.textContent = String(indice + 1).padStart(2, '0');
    titulo.textContent = filmina.titulo;

    enlace.append(numero, titulo);
    item.append(enlace);
    return item;
  });

  lista.append(...items);
})();
