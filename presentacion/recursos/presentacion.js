// Controla una filmina: crea los controles, mide el tiempo y navega a la siguiente.
// Requiere que filminas.js se haya cargado antes (define window.FILMINAS).
(function iniciarFilmina() {
  const RUTA_INDICE = '../index.html';
  const CLAVE_PAUSA = 'presentacion:pausada';
  const ICONOS = {
    anterior: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    siguiente: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    pausa: '<svg class="icono-pausa" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor"/></svg>',
    reanudar: '<svg class="icono-reanudar" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
  };

  const filminas = window.FILMINAS;
  if (!Array.isArray(filminas)) {
    console.error('[presentacion] window.FILMINAS no está definido: cargá filminas.js antes que presentacion.js.');
    return;
  }

  const archivoActual = decodeURIComponent(location.pathname.split('/').pop());
  const indiceActual = filminas.findIndex((filmina) => filmina.archivo === archivoActual);
  if (indiceActual === -1) {
    console.error(`[presentacion] "${archivoActual}" no está registrada en filminas.js.`);
    return;
  }

  const ultimoIndice = filminas.length - 1;
  const diapositiva = document.querySelector('.diapositiva');
  const controles = crearControles();
  let pausada = leerPausaGuardada();
  let navegando = false;

  function crearControles() {
    document.body.insertAdjacentHTML('beforeend', `
      <nav class="navegacion" aria-label="Navegación de filminas">
        <button type="button" class="boton-nav" data-control="anterior" aria-label="Filmina anterior">${ICONOS.anterior}</button>
        <div class="indicadores"></div>
        <button type="button" class="boton-nav" data-control="pausa" aria-label="Pausar">${ICONOS.pausa}${ICONOS.reanudar}</button>
        <button type="button" class="boton-nav" data-control="siguiente" aria-label="Filmina siguiente">${ICONOS.siguiente}</button>
      </nav>
      <div class="barra-tiempo" aria-hidden="true"><div class="barra-tiempo__progreso"></div></div>
      <p class="solo-lectores" aria-live="polite"></p>`);

    const navegacion = document.querySelector('.navegacion');
    navegacion.querySelector('.indicadores').append(...filminas.map(crearIndicador));
    return {
      anterior: navegacion.querySelector('[data-control="anterior"]'),
      siguiente: navegacion.querySelector('[data-control="siguiente"]'),
      pausa: navegacion.querySelector('[data-control="pausa"]'),
      progreso: document.querySelector('.barra-tiempo__progreso'),
      anuncio: document.querySelector('.solo-lectores[aria-live]'),
    };
  }

  function crearIndicador(filmina, indice) {
    const punto = document.createElement('a');
    punto.className = 'indicador';
    punto.href = filmina.archivo;
    punto.setAttribute('aria-label', `Filmina ${indice + 1}: ${filmina.titulo}`);
    if (indice === indiceActual) punto.setAttribute('aria-current', 'page');
    punto.addEventListener('click', (evento) => {
      evento.preventDefault();
      irA(indice);
    });
    return punto;
  }

  // La pausa se recuerda entre filminas porque cada una es una página distinta.
  // sessionStorage puede no estar disponible (modo privado, file:// en algunos navegadores).
  function leerPausaGuardada() {
    try {
      return sessionStorage.getItem(CLAVE_PAUSA) === 'true';
    } catch {
      return false;
    }
  }

  function guardarPausa() {
    try {
      sessionStorage.setItem(CLAVE_PAUSA, String(pausada));
    } catch {
      // Sin almacenamiento la pausa solo dura en esta filmina; no afecta al resto.
    }
  }

  function aplicarPausa() {
    document.body.classList.toggle('presentacion-pausada', pausada);
    controles.pausa.setAttribute('aria-label', pausada ? 'Reanudar' : 'Pausar');
  }

  function alternarPausa() {
    pausada = !pausada;
    aplicarPausa();
    guardarPausa();
    controles.anuncio.textContent = pausada ? 'Presentación en pausa' : 'Presentación reanudada';
  }

  // El tiempo lo mide la propia animación de la barra (dura --tiempo-por-filmina):
  // así la barra y el avance nunca se desincronizan, y pausar es solo pausar la animación.
  function iniciarTemporizador() {
    const esUltima = indiceActual === ultimoIndice;
    controles.progreso.parentElement.hidden = esUltima;
    controles.progreso.classList.remove('corriendo');
    if (esUltima) return;
    void controles.progreso.offsetWidth;
    controles.progreso.classList.add('corriendo');
  }

  function duracionSalidaMs() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
    const valor = getComputedStyle(document.documentElement).getPropertyValue('--duracion-fade').trim();
    const numero = parseFloat(valor);
    if (Number.isNaN(numero)) return 0;
    return valor.endsWith('ms') ? numero : numero * 1000;
  }

  function salirHacia(url) {
    if (navegando) return;
    navegando = true;
    diapositiva.classList.add('saliendo');
    setTimeout(() => { location.href = url; }, duracionSalidaMs());
  }

  function irA(indiceDestino) {
    const fueraDeRango = indiceDestino < 0 || indiceDestino > ultimoIndice;
    if (fueraDeRango || indiceDestino === indiceActual) return;
    salirHacia(filminas[indiceDestino].archivo);
  }

  function manejarTeclado(evento) {
    const teclasSiguiente = ['ArrowRight', 'ArrowDown', 'PageDown'];
    const teclasAnterior = ['ArrowLeft', 'ArrowUp', 'PageUp'];
    // Sobre un botón o enlace, Espacio ya lo activa; no hay que pausar además.
    const espacioSobreControl = evento.key === ' ' && evento.target.closest('button, a');

    if (teclasSiguiente.includes(evento.key)) {
      evento.preventDefault();
      irA(indiceActual + 1);
    } else if (teclasAnterior.includes(evento.key)) {
      evento.preventDefault();
      irA(indiceActual - 1);
    } else if (evento.key === 'Home') {
      irA(0);
    } else if (evento.key === 'End') {
      irA(ultimoIndice);
    } else if (evento.key === 'Escape') {
      salirHacia(RUTA_INDICE);
    } else if ((evento.key === ' ' || evento.key.toLowerCase() === 'p') && !espacioSobreControl) {
      evento.preventDefault();
      alternarPausa();
    }
  }

  // Al volver con "Atrás" el navegador puede restaurar la página desde su caché
  // tal como quedó (desvanecida): hay que mostrarla de nuevo y reiniciar el tiempo.
  function restaurarDesdeCache(evento) {
    if (!evento.persisted) return;
    navegando = false;
    diapositiva.classList.remove('saliendo');
    pausada = leerPausaGuardada();
    aplicarPausa();
    iniciarTemporizador();
  }

  controles.anterior.disabled = indiceActual === 0;
  controles.siguiente.disabled = indiceActual === ultimoIndice;
  controles.anterior.addEventListener('click', () => irA(indiceActual - 1));
  controles.siguiente.addEventListener('click', () => irA(indiceActual + 1));
  controles.pausa.addEventListener('click', alternarPausa);
  controles.progreso.addEventListener('animationend', () => irA(indiceActual + 1));
  document.addEventListener('keydown', manejarTeclado);
  window.addEventListener('pageshow', restaurarDesdeCache);

  aplicarPausa();
  iniciarTemporizador();
})();
