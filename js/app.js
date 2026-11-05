/* ============================================================
   app.js  ·  Arranque del programa y manejo de los clics.
   Cada botón de la página lleva un atributo data-act que dice
   qué hacer; aquí hay un solo "escuchador" para todos.
   ============================================================ */
(function () {
  "use strict";

  const E = UI.E;
  const $ = UI.$;

  function cambiarPaso(p) { E.paso = p; UI.render(); }

  /** Cambia n (solo acepta enteros entre 5 y 10) y empieza con un grafo nuevo. */
  function cambiarN(valor) {
    const n = Number(valor);
    if (!Number.isInteger(n) || n < G.MIN_N || n > G.MAX_N) {
      E.avisoN = "n debe ser un entero entre 5 y 10.";
      UI.renderConfig();
      return;
    }
    E.avisoN = "";
    if (n !== E.n) UI.nuevoGrafo(n);
    UI.renderConfig();
    UI.render();
  }

  function mostrarErrorArista(texto) {
    const m = $("msg-arista");
    if (!m) return;
    m.textContent = texto; m.hidden = !texto;
  }

  const acciones = {
    "paso": function (b) { cambiarPaso(Number(b.dataset.paso)); },
    "paso-ir": function (b) { cambiarPaso(Number(b.dataset.paso)); $("pasos").scrollIntoView({ behavior: "smooth", block: "start" }); },
    "n-menos": function () { cambiarN(E.n - 1); },
    "n-mas": function () { cambiarN(E.n + 1); },
    "modo": function (b) { E.modo = b.dataset.modo; UI.renderConfig(); UI.render(); },

    // ----- paso 1 -----
    "add": function () {
      const error = G.addEdge(E.grafo, Number(E.form.v1), Number(E.form.v2), Number(E.form.peso));
      if (error) { mostrarErrorArista(error); return; }
      UI.cambioGrafo(); UI.render();
    },
    "del": function (b) { G.removeEdge(E.grafo, Number(b.dataset.a), Number(b.dataset.b)); UI.cambioGrafo(); UI.render(); },
    "ejemplo-ciclo": function () { E.grafo = G.exampleGraph(E.n, true); UI.cambioGrafo(); UI.render(); },
    "ejemplo-sin": function () { E.grafo = G.exampleGraph(E.n, false); UI.cambioGrafo(); UI.render(); },
    "aleatorio": function () {
      const a = E.aleatorio;
      let desde = Math.max(1, Math.round(a.wmin) || 1), hasta = Math.max(1, Math.round(a.wmax) || 1);
      if (desde > hasta) { const t = desde; desde = hasta; hasta = t; }       // si pusiste el rango al revés, se corrige
      a.wmin = desde; a.wmax = hasta;
      E.grafo = G.randomGraph(E.n, a.prob / 100, desde, hasta, a.ciclo);
      UI.cambioGrafo(); UI.render();
    },
    "vaciar": function () { E.grafo = G.emptyGraph(E.n); UI.cambioGrafo(); UI.render(); },
    "circulo": function () {
      D.circlePositions(E.n).forEach(function (p, i) { E.pos[i].x = p.x; E.pos[i].y = p.y; });
      if (E.paso === 3 && UI.hayResultados()) UI.pintarPaso(); else UI.render();
    },

    // ----- paso 2 -----
    "agregar-faltantes": function () {
      let hayError = false;
      document.querySelectorAll(".peso-falt").forEach(function (inp) {
        if (G.addEdge(E.grafo, Number(inp.dataset.a), Number(inp.dataset.b), Number(inp.value))) hayError = true;
      });
      if (hayError) return;
      UI.cambioGrafo(); UI.render();
    },

    // ----- paso 3 -----
    "ejecutar": function () {
      E.res = S.bruteForce(E.grafo);
      E.resSig = G.signature(E.grafo);
      E.posPaso = 0; E.ranking = null; E.optSel = 0; E.rankMostrar = 200;
      UI.render();
    },
    "p-inicio": function () { UI.moverPaso(0); },
    "p-ant": function () { UI.moverPaso(E.posPaso - 1); },
    "p-sig": function () { UI.moverPaso(E.posPaso + 1); },
    "p-10": function () { UI.moverPaso(E.posPaso + 10); },
    "p-100": function () { UI.moverPaso(E.posPaso + 100); },
    "p-mejora": function () { UI.siguienteMejora(); },
    "p-final": function () { UI.moverPaso(UI.vistaTam() - 1); },
    "p-play": function () { UI.alternarPlay(); },

    // ----- paso 4 -----
    "mas": function () { E.rankMostrar += 500; UI.render(); }
  };

  // un solo escuchador para todos los botones con data-act
  document.addEventListener("click", function (ev) {
    const boton = ev.target.closest("[data-act]");
    if (!boton || boton.disabled) return;
    const accion = acciones[boton.dataset.act];
    if (accion) accion(boton);
  });

  /** Guarda lo que el usuario escribe en los controles del modo aleatorio. */
  function guardarAleatorio(t) {
    const clave = t.dataset.alea;
    E.aleatorio[clave] = t.type === "checkbox" ? t.checked : Number(t.value);
    if (clave === "prob") $("alea-prob-val").textContent = E.aleatorio.prob + " %";
  }

  // campos de texto y listas
  document.addEventListener("change", function (ev) {
    const t = ev.target;
    if (t.dataset.alea) { guardarAleatorio(t); return; }
    if (t.id === "inp-n") cambiarN(t.value);
    else if (t.id === "sel-unidad") { E.unidad = t.value; UI.render(); }
    else if (t.dataset.bind) E.form[t.dataset.bind] = Number(t.value);
    else if (t.name === "alt") { E.altSel = Number(t.value); UI.render(); }
    else if (t.id === "solo-validos") { E.soloValidos = t.checked; E.posPaso = 0; UI.pintarPaso(); }
    else if (t.id === "num-paso") { UI.moverPaso(Number(t.value) - 1); }
    else if (t.id === "sel-opt") { E.optSel = Number(t.value); UI.render(); }
  });
  document.addEventListener("input", function (ev) {
    const t = ev.target;
    if (t.dataset && t.dataset.alea) guardarAleatorio(t);
    else if (t.dataset && t.dataset.bind) E.form[t.dataset.bind] = Number(t.value);
    else if (t.id === "rango-paso") UI.moverPaso(Number(t.value) - 1);
  });

  // atajo: flechas del teclado para recorrer las rutas en el paso 3
  document.addEventListener("keydown", function (ev) {
    if (E.paso !== 3 || !UI.hayResultados()) return;
    const tag = (ev.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "select" || tag === "textarea") return;
    if (ev.key === "ArrowRight") { UI.moverPaso(E.posPaso + 1); ev.preventDefault(); }
    else if (ev.key === "ArrowLeft") { UI.moverPaso(E.posPaso - 1); ev.preventDefault(); }
  });

  // ----- inicio -----
  UI.nuevoGrafo(E.n);
  UI.renderConfig();
  UI.render();
})();
