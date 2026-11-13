/* ============================================================
   draw.js  ·  Dibujo del grafo en SVG.
   Los vértices se pueden ARRASTRAR con el mouse o el dedo; las
   posiciones se guardan en Estado.pos y se comparten entre todos
   los pasos (si mueves un nodo en el paso 1, queda igual en el 3).
   ============================================================ */
(function (global) {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const TAM = 640;                 // lado del lienzo SVG (viewBox)
  const RADIO = 27;                // radio de cada vértice

  const COLOR = {
    arista: "#94a3b8", ruta: "#0d9488", optimo: "#f59e0b",
    faltante: "#e11d48", nodo: "#e0f2fe", borde: "#1d4ed8", texto: "#0b1b3f"
  };

  function svgEl(tag, attrs, padre) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (padre) padre.appendChild(e);
    return e;
  }

  /** Posiciones iniciales: vértices sobre una circunferencia, con A arriba (coordenadas de 0 a 1). */
  function circlePositions(n) {
    const pos = [];
    for (let i = 0; i < n; i++) {
      const ang = Math.PI / 2 - 2 * Math.PI * i / n;
      pos.push({ x: 0.5 + 0.38 * Math.cos(ang), y: 0.5 - 0.38 * Math.sin(ang) });
    }
    return pos;
  }

  function formato(x) { return String(parseFloat(Number(x).toFixed(6))); }

  /**
   * Dibuja el grafo dentro de `host`.
   * opciones:
   *   ruta      -> arreglo de vértices que se resalta (se cierra sola)
   *   color     -> color de la ruta
   *   faltantes -> lista de pares [a, b] que faltan (rojo discontinuo)
   *   numeros   -> si es true, numera los vértices según el orden de la ruta
   */
  function renderGraph(host, g, pos, opciones) {
    opciones = opciones || {};
    const n = g.n;
    const circulo = circlePositions(n);
    for (let i = 0; i < n; i++) {                           // protección: nunca dibujar con posiciones inválidas
      if (!pos[i] || !isFinite(pos[i].x) || !isFinite(pos[i].y)) pos[i] = { x: circulo[i].x, y: circulo[i].y };
    }
    host.innerHTML = "";
    const svg = svgEl("svg", {
      viewBox: "0 0 " + TAM + " " + TAM, class: "grafo-svg", role: "img",
      "aria-label": "Grafo ponderado de " + n + " vértices"
    }, host);

    const capaAristas = svgEl("g", {}, svg);
    const capaPesos = svgEl("g", {}, svg);
    const capaNumeros = svgEl("g", {}, svg);
    const capaNodos = svgEl("g", {}, svg);

    // --- aristas del grafo, resaltando las de la ruta ---
    const enRuta = new Set();
    if (opciones.ruta) {
      for (let i = 0; i < opciones.ruta.length; i++) {
        const a = opciones.ruta[i], b = opciones.ruta[(i + 1) % opciones.ruta.length];
        enRuta.add(Math.min(a, b) + "-" + Math.max(a, b));
      }
    }
    const lineas = [];                                    // {linea, a, b}
    const etiquetas = [];                                 // {grupo, rect, texto, a, b, t}

    G.edgeList(g).forEach(function (e) {
      const k = e.a + "-" + e.b;
      const resaltada = enRuta.has(k);
      const colorRuta = opciones.color || COLOR.ruta;
      const linea = svgEl("line", Object.assign({
        stroke: resaltada ? colorRuta : COLOR.arista,
        "stroke-width": resaltada ? 6 : 1.8, "stroke-linecap": "round"
      }, resaltada ? { pathLength: 1, class: "dibuja" } : {}), capaAristas);
      lineas.push({ linea: linea, a: e.a, b: e.b, resaltada: resaltada });

      const texto = String(formato(e.w));
      const grupo = svgEl("g", { class: "peso" }, capaPesos);
      const ancho = 12 * texto.length + 16;
      const rect = svgEl("rect", { width: ancho, height: 26, rx: 13, fill: "#fff", stroke: "#cbd5e1", "stroke-width": 1.2 }, grupo);
      const t = svgEl("text", { "text-anchor": "middle", "dominant-baseline": "central", "font-size": 16, "font-weight": 800, fill: COLOR.texto }, grupo);
      t.textContent = texto;
      etiquetas.push({ rect: rect, texto: t, ancho: ancho, a: e.a, b: e.b, t: ((e.a + e.b) % 2 === 0) ? 0.32 : 0.68 });
    });

    // --- aristas de la ruta (o sugeridas) que NO existen: rojo discontinuo ---
    const fantasmas = [];
    function agregarFantasma(a, b) {
      const linea = svgEl("line", {
        stroke: COLOR.faltante, "stroke-width": 3, "stroke-dasharray": "9 7", "stroke-linecap": "round"
      }, capaAristas);
      fantasmas.push({ linea: linea, a: a, b: b });
    }
    enRuta.forEach(function (k) {
      const par = k.split("-").map(Number);
      if (G.weight(g, par[0], par[1]) === null) agregarFantasma(par[0], par[1]);
    });
    (opciones.faltantes || []).forEach(function (p) { agregarFantasma(p[0], p[1]); });

    // --- números de orden de visita ---
    const insignias = [];
    if (opciones.numeros && opciones.ruta) {
      opciones.ruta.forEach(function (v, orden) {
        const grupo = svgEl("g", {}, capaNumeros);
        svgEl("circle", { r: 14, fill: opciones.color || COLOR.ruta }, grupo);
        const t = svgEl("text", { "text-anchor": "middle", "dominant-baseline": "central", "font-size": 15, "font-weight": 700, fill: "#fff" }, grupo);
        t.textContent = String(orden + 1);
        insignias.push({ grupo: grupo, v: v });
      });
    }

    // --- vértices (arrastrables) ---
    const nodos = [];
    for (let v = 0; v < n; v++) {
      const grupo = svgEl("g", { class: "nodo", tabindex: 0, "data-v": v }, capaNodos);
      svgEl("circle", { r: RADIO, fill: COLOR.nodo, stroke: COLOR.borde, "stroke-width": 3 }, grupo);
      const t = svgEl("text", {
        "text-anchor": "middle", "dominant-baseline": "central", "font-size": 22, "font-weight": 800, fill: COLOR.texto
      }, grupo);
      t.textContent = G.ETIQ[v];
      nodos.push(grupo);
    }

    // --- colocar todo según las posiciones actuales ---
    function px(v) { return { x: pos[v].x * TAM, y: pos[v].y * TAM }; }

    function colocar() {
      lineas.concat(fantasmas).forEach(function (l) {
        const p = px(l.a), q = px(l.b);
        l.linea.setAttribute("x1", p.x); l.linea.setAttribute("y1", p.y);
        l.linea.setAttribute("x2", q.x); l.linea.setAttribute("y2", q.y);
      });
      etiquetas.forEach(function (e) {
        const p = px(e.a), q = px(e.b);
        const x = p.x + e.t * (q.x - p.x), y = p.y + e.t * (q.y - p.y);
        e.rect.setAttribute("x", x - e.ancho / 2); e.rect.setAttribute("y", y - 13);
        e.texto.setAttribute("x", x); e.texto.setAttribute("y", y);
      });
      insignias.forEach(function (ins) {
        const p = px(ins.v);
        let dx = p.x - TAM / 2, dy = p.y - TAM / 2;
        const d = Math.hypot(dx, dy) || 1;
        ins.grupo.setAttribute("transform", "translate(" + (p.x + dx / d * 44) + "," + (p.y + dy / d * 44) + ")");
      });
      nodos.forEach(function (grupo, v) {
        const p = px(v);
        grupo.setAttribute("transform", "translate(" + p.x + "," + p.y + ")");
      });
    }
    colocar();

    // --- arrastrar con mouse o dedo ---
    let arrastrando = -1;
    function haciaCoordenadas(ev) {
      const r = svg.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return null;        // dibujo oculto o sin tamaño
      const x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
      return isFinite(x) && isFinite(y) ? { x: x, y: y } : null;
    }
    nodos.forEach(function (grupo, v) {
      grupo.addEventListener("pointerdown", function (ev) {
        arrastrando = v;
        grupo.setPointerCapture(ev.pointerId);
        grupo.classList.add("arrastrando");
        ev.preventDefault();
      });
      grupo.addEventListener("pointermove", function (ev) {
        if (arrastrando !== v) return;
        const c = haciaCoordenadas(ev);
        if (!c) return;
        const margen = (RADIO + 6) / TAM;                  // que el vértice no salga del lienzo
        pos[v].x = Math.min(1 - margen, Math.max(margen, c.x));
        pos[v].y = Math.min(1 - margen, Math.max(margen, c.y));
        colocar();
      });
      function soltar() { arrastrando = -1; grupo.classList.remove("arrastrando"); }
      grupo.addEventListener("pointerup", soltar);
      grupo.addEventListener("pointercancel", soltar);
      // también con el teclado: flechas
      grupo.addEventListener("keydown", function (ev) {
        const paso = 0.02;
        const mov = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] }[ev.key];
        if (!mov) return;
        pos[v].x = Math.min(0.96, Math.max(0.04, pos[v].x + mov[0]));
        pos[v].y = Math.min(0.96, Math.max(0.04, pos[v].y + mov[1]));
        colocar(); ev.preventDefault();
      });
    });
    return svg;
  }

  global.D = { COLOR: COLOR, circlePositions: circlePositions, renderGraph: renderGraph, formato: formato };
})(window);
