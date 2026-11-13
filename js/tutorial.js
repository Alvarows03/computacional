/* ============================================================
   tutorial.js  ·  Recorrido guiado de bienvenida.
   Resalta cada parte importante de la pantalla y explica para qué
   sirve. Se muestra al abrir la página; se puede omitir con el botón
   de abajo a la derecha (o con la tecla Esc) y repetir desde la
   barra lateral con «Ver tutorial».
   ============================================================ */
(function () {
  "use strict";

  const CLAVE = "tspTutorialNoMostrar";        // marca guardada en el navegador del usuario
  const $ = function (id) { return document.getElementById(id); };

  /** Cada paso: qué elemento resaltar (sel) y qué decir. Sin sel = mensaje centrado. */
  const PASOS = [
    { sel: null, titulo: "¡Bienvenido! 👋",
      texto: "Este programa resuelve el <b>Problema del Agente Viajero</b>: encuentra la ruta cerrada más corta que pasa una vez por cada nodo. En 1 minuto te muestro cómo usarlo." },
    { sel: "#config", titulo: "1 · Configura el problema",
      texto: "Elige cuántos nodos tendrá el grafo (<b>de 5 a 10</b>), si lo creas a mano o al azar y qué representan los pesos (distancia, costo o tiempo)." },
    { sel: "#pasos", titulo: "2 · Cuatro pasos",
      texto: "Avanzas de izquierda a derecha: <b>Grafo, Validación, Paso a paso y Resultados</b>. Los pasos que ya terminaste se marcan con ✓." },
    { sel: ".guia", titulo: "3 · Qué hacer ahora",
      texto: "En cada paso hay un cuadro azul con las instrucciones exactas. Si te pierdes, lee ese cuadro." },
    { sel: ".dos > .tarjeta", titulo: "4 · Crea las aristas",
      texto: "Aquí construyes el grafo: agrega aristas con su peso, genera uno al azar o carga un <b>ejemplo</b> para empezar rápido." },
    { sel: "#g1", titulo: "5 · Mueve los nodos",
      texto: "El dibujo es interactivo: <b>arrastra cualquier vértice</b> con el mouse o el dedo para acomodar el grafo como prefieras." },
    { sel: "#estado", titulo: "6 · Tu avance",
      texto: "Aquí ves de un vistazo qué pasos ya están listos: grafo, validación, fuerza bruta y el ciclo óptimo con su costo." },
    { sel: null, titulo: "¡Listo para empezar! 🚀",
      texto: "Prueba con un ejemplo: te cargo un grafo y luego pulsa <b>«Ir al Paso 2»</b>. Puedes volver a ver este tutorial con el botón <b>«Ver tutorial»</b> de la barra lateral.",
      final: true }
  ];

  let indice = 0, abierto = false;
  let velo, foco, tarjeta, barra, casilla;

  function guardado() { try { return localStorage.getItem(CLAVE) === "1"; } catch (e) { return false; } }
  function guardar(valor) { try { localStorage.setItem(CLAVE, valor ? "1" : "0"); } catch (e) { /* sin almacenamiento: no pasa nada */ } }

  function crear() {
    velo = document.createElement("div"); velo.className = "tuto-velo";
    foco = document.createElement("div"); foco.className = "tuto-foco";
    tarjeta = document.createElement("div"); tarjeta.className = "tuto-tarjeta"; tarjeta.setAttribute("role", "dialog"); tarjeta.setAttribute("aria-label", "Tutorial de bienvenida");
    barra = document.createElement("div"); barra.className = "tuto-barra";
    barra.innerHTML =
      '<label class="tuto-casilla"><input type="checkbox" id="tuto-no-mostrar"> No volver a mostrar al iniciar</label>' +
      '<span class="tuto-cuenta" id="tuto-cuenta"></span>' +
      '<button class="boton chico" id="tuto-atras">← Atrás</button>' +
      '<button class="boton boton-primario chico" id="tuto-sig">Siguiente →</button>' +
      '<button class="boton chico tuto-omitir" id="tuto-omitir">Omitir tutorial ✕</button>';
    document.body.appendChild(velo); document.body.appendChild(foco); document.body.appendChild(tarjeta); document.body.appendChild(barra);
    casilla = $("tuto-no-mostrar");
    $("tuto-atras").addEventListener("click", function () { ir(indice - 1); });
    $("tuto-sig").addEventListener("click", function () { if (indice >= PASOS.length - 1) cerrar(); else ir(indice + 1); });
    $("tuto-omitir").addEventListener("click", cerrar);
    casilla.addEventListener("change", function () { guardar(casilla.checked); });
  }

  /** Coloca la tarjeta de texto junto al elemento resaltado (a la derecha, debajo o encima). */
  function colocarTarjeta(r) {
    const ancho = Math.min(380, window.innerWidth - 24);
    tarjeta.style.width = ancho + "px";
    const alto = tarjeta.offsetHeight, margen = 14;
    let x, y;
    if (!r) {                                                   // mensaje centrado
      x = (window.innerWidth - ancho) / 2; y = Math.max(16, (window.innerHeight - alto) / 2 - 30);
    } else if (r.right + ancho + 2 * margen < window.innerWidth && r.width < window.innerWidth * 0.5) {
      x = r.right + margen; y = r.top;                          // a la derecha
    } else if (r.bottom + alto + margen < window.innerHeight - 70) {
      x = r.left; y = r.bottom + margen;                        // debajo
    } else if (r.top - alto - margen > 10) {
      x = r.left; y = r.top - alto - margen;                    // encima
    } else {
      x = r.left + 16; y = Math.max(12, window.innerHeight - alto - 80);   // sobre el elemento, si es muy grande
    }
    x = Math.min(Math.max(12, x), window.innerWidth - ancho - 12);
    y = Math.min(Math.max(12, y), window.innerHeight - alto - 70);
    tarjeta.style.left = x + "px"; tarjeta.style.top = y + "px";
  }

  function mostrar() {
    const p = PASOS[indice];
    tarjeta.innerHTML = '<div class="tuto-paso">Paso ' + (indice + 1) + " de " + PASOS.length + "</div><h3>" + p.titulo + "</h3><p>" + p.texto + "</p>" +
      (p.final ? '<button class="boton boton-primario" id="tuto-ejemplo">Probar con un ejemplo</button>' : "");
    $("tuto-cuenta").textContent = (indice + 1) + " / " + PASOS.length;
    $("tuto-atras").disabled = indice === 0;
    $("tuto-sig").textContent = indice === PASOS.length - 1 ? "¡Empezar!" : "Siguiente →";
    if (p.final) {
      $("tuto-ejemplo").addEventListener("click", function () {
        const b = document.querySelector('[data-act="ejemplo-ciclo"], [data-act="aleatorio"]');
        cerrar(); if (b) b.click();
      });
    }
    const el = p.sel ? document.querySelector(p.sel) : null;
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "auto" });
      const r = el.getBoundingClientRect(), pad = 8;
      foco.style.display = "block"; velo.classList.remove("tuto-oscuro");
      foco.style.left = (r.left - pad) + "px"; foco.style.top = (r.top - pad) + "px";
      foco.style.width = (r.width + 2 * pad) + "px"; foco.style.height = (r.height + 2 * pad) + "px";
      colocarTarjeta(r);
    } else {
      foco.style.display = "none"; velo.classList.add("tuto-oscuro");   // sin elemento: se oscurece toda la pantalla
      colocarTarjeta(null);
    }
    $("tuto-sig").focus({ preventScroll: true });
  }

  function ir(i) { indice = Math.max(0, Math.min(PASOS.length - 1, i)); mostrar(); }

  function alTeclear(ev) {
    if (!abierto) return;
    if (ev.key === "Escape") { cerrar(); ev.preventDefault(); }
    else if (ev.key === "ArrowRight") { if (indice < PASOS.length - 1) ir(indice + 1); ev.preventDefault(); ev.stopPropagation(); }
    else if (ev.key === "ArrowLeft") { ir(indice - 1); ev.preventDefault(); ev.stopPropagation(); }
  }
  function alCambiarTamano() { if (abierto) mostrar(); }

  function abrir() {
    if (abierto) return;
    UI.E.paso = 1; UI.render();                                 // el recorrido siempre empieza en el paso 1
    window.scrollTo(0, 0);
    if (!velo) crear();
    [velo, foco, tarjeta, barra].forEach(function (e) { e.style.display = ""; e.classList.add("tuto-visible"); });
    casilla.checked = guardado();
    abierto = true; indice = 0; mostrar();
  }

  function cerrar() {
    abierto = false;
    [velo, foco, tarjeta, barra].forEach(function (e) { if (e) { e.classList.remove("tuto-visible"); e.style.display = "none"; } });
    window.scrollTo(0, 0);
  }

  document.addEventListener("keydown", alTeclear, true);
  window.addEventListener("resize", alCambiarTamano);
  const boton = $("btn-tutorial");
  if (boton) boton.addEventListener("click", abrir);

  if (!guardado()) setTimeout(abrir, 350);                      // se muestra al entrar, salvo que el usuario lo haya desactivado
})();
