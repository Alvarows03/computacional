/* ============================================================
   graph.js  ·  Manejo del grafo: crear aristas, matrices y
   validar ciclos hamiltonianos.

   El grafo es un objeto simple:
       { n: 5, edges: Map("0-1" -> 4, "0-2" -> 7, ...) }
   Los vértices son 0, 1, 2... y se muestran como letras A, B, C...
   Cada arista se guarda con la clave "menor-mayor" y su peso.
   ============================================================ */
(function (global) {
  "use strict";

  const ETIQ = "ABCDEFGHIJ";
  const MIN_N = 5;
  const MAX_N = 10;

  // ---------- crear y editar el grafo ----------
  function key(a, b) { return a < b ? a + "-" + b : b + "-" + a; }

  function emptyGraph(n) { return { n: n, edges: new Map() }; }

  function weight(g, a, b) {
    const w = g.edges.get(key(a, b));
    return w === undefined ? null : w;
  }

  /** Agrega o actualiza una arista. Devuelve un mensaje de error o null si todo salió bien. */
  function addEdge(g, a, b, w) {
    if (a === b) return "No se permite unir un vértice consigo mismo.";
    if (!(w > 0) || !isFinite(w)) return "El peso debe ser un número mayor que 0.";
    g.edges.set(key(a, b), w);
    return null;
  }

  function removeEdge(g, a, b) { g.edges.delete(key(a, b)); }

  /** Lista de aristas ordenada: [{a, b, w}, ...] */
  function edgeList(g) {
    const lista = [];
    g.edges.forEach(function (w, k) {
      const par = k.split("-");
      lista.push({ a: Number(par[0]), b: Number(par[1]), w: w });
    });
    lista.sort(function (x, y) { return x.a - y.a || x.b - y.b; });
    return lista;
  }

  /** Texto que identifica al grafo; si cambia, hay que recalcular. */
  function signature(g) {
    return g.n + "|" + edgeList(g).map(function (e) { return e.a + "-" + e.b + ":" + e.w; }).join(",");
  }

  function edgeName(a, b) { return ETIQ[a] + "–" + ETIQ[b]; }

  // ---------- grafos aleatorios y de ejemplo ----------
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randInt(rng, min, max) { return min + Math.floor(rng() * (max - min + 1)); }

  /**
   * Grafo aleatorio.
   * densidad: probabilidad (0 a 1) de que exista cada arista.
   * conCiclo: si es true, primero se dibuja un ciclo que pasa por todos los
   *           vértices, así el grafo siempre tiene ciclo hamiltoniano.
   */
  function randomGraph(n, densidad, wMin, wMax, conCiclo, seed) {
    const rng = (seed === undefined || seed === null) ? Math.random : mulberry32(seed);
    const g = emptyGraph(n);
    if (conCiclo) {
      const orden = [];
      for (let i = 0; i < n; i++) orden.push(i);
      for (let i = n - 1; i > 0; i--) {                 // mezclar (Fisher-Yates)
        const j = Math.floor(rng() * (i + 1));
        const tmp = orden[i]; orden[i] = orden[j]; orden[j] = tmp;
      }
      for (let i = 0; i < n; i++) {
        addEdge(g, orden[(i + n - 1) % n], orden[i], randInt(rng, wMin, wMax));
      }
    }
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        if (weight(g, a, b) === null && rng() < densidad) {
          addEdge(g, a, b, randInt(rng, wMin, wMax));
        }
      }
    }
    return g;
  }

  /**
   * Grafo de ejemplo para la demostración.
   * conCiclo = true : sí tiene ciclo hamiltoniano.
   * conCiclo = false: dos grupos de vértices unidos por una sola arista;
   *                   NO tiene ciclo y la validación indica qué arista falta.
   */
  function exampleGraph(n, conCiclo) {
    if (conCiclo) return randomGraph(n, 0.5, 2, 15, true, 2026);
    const rng = mulberry32(2026);
    const g = emptyGraph(n);
    const mitad = Math.floor(n / 2);
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        const mismoGrupo = (a < mitad && b < mitad) || (a >= mitad && b >= mitad);
        if (mismoGrupo) addEdge(g, a, b, randInt(rng, 2, 15));
      }
    }
    addEdge(g, mitad - 1, mitad, randInt(rng, 2, 15));
    return g;
  }

  // ---------- matrices (Lectura 5.1: Componentes conexas) ----------
  function zeros(n) {
    const m = [];
    for (let i = 0; i < n; i++) m.push(new Array(n).fill(0));
    return m;
  }

  /** Matriz de adyacencia: 1 si hay arista entre i y j, 0 si no. */
  function adjacency(g) {
    const m = zeros(g.n);
    g.edges.forEach(function (w, k) {
      const par = k.split("-");
      m[par[0]][par[1]] = 1;
      m[par[1]][par[0]] = 1;
    });
    return m;
  }

  /** Producto de matrices donde 1 + 1 = 1 (basta con que exista un camino). */
  function multiplyBool(x, y) {
    const n = x.length;
    const r = zeros(n);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        for (let k = 0; k < n; k++)
          if (x[i][k] === 1 && y[k][j] === 1) { r[i][j] = 1; break; }
    return r;
  }

  /**
   * Matriz de caminos: 1 si existe algún camino entre i y j.
   * Paso 1: a la adyacencia se le pone 1 en la diagonal.
   * Paso 2: se multiplica por sí misma (potencias) para sumar caminos de longitud 1, 2, 3...
   */
  function pathMatrix(g) {
    const base = adjacency(g);
    for (let i = 0; i < g.n; i++) base[i][i] = 1;
    let caminos = base;
    for (let k = 0; k < g.n; k++) caminos = multiplyBool(caminos, base);
    return caminos;
  }

  /** Pasos 3 y 4: orden de filas/columnas por cantidad de unos (mayor a menor; si empatan, el primer 1 más a la izquierda). */
  function orderByOnes(caminos) {
    const filas = caminos.map(function (fila, i) {
      const unos = fila.reduce(function (s, v) { return s + v; }, 0);
      return { unos: unos, primero: fila.indexOf(1), i: i };
    });
    filas.sort(function (x, y) { return y.unos - x.unos || x.primero - y.primero || x.i - y.i; });
    return filas.map(function (f) { return f.i; });
  }

  /** Componentes conexas: cada una es la lista de vértices que se alcanzan entre sí. */
  function components(caminos) {
    const comps = [];
    const vistos = new Set();
    for (let i = 0; i < caminos.length; i++) {
      if (vistos.has(i)) continue;
      const grupo = [];
      for (let j = 0; j < caminos.length; j++) if (caminos[i][j] === 1) grupo.push(j);
      grupo.forEach(function (v) { vistos.add(v); });
      comps.push(grupo);
    }
    return comps;
  }

  function degrees(g) {
    return adjacency(g).map(function (fila) { return fila.reduce(function (s, v) { return s + v; }, 0); });
  }

  // ---------- permutaciones en orden lexicográfico ----------
  /** Pasa el arreglo a su siguiente permutación; devuelve false si ya era la última. */
  function nextPermutation(a) {
    let i = a.length - 2;
    while (i >= 0 && a[i] >= a[i + 1]) i--;
    if (i < 0) return false;
    let j = a.length - 1;
    while (a[j] <= a[i]) j--;
    let t = a[i]; a[i] = a[j]; a[j] = t;
    for (let l = i + 1, r = a.length - 1; l < r; l++, r--) { t = a[l]; a[l] = a[r]; a[r] = t; }
    return true;
  }

  // ---------- validación: ¿existe ciclo hamiltoniano? ¿qué aristas faltan? ----------
  /**
   * Prueba todos los ciclos del grafo COMPLETO. En cada uno cuenta las aristas
   * que el grafo actual no tiene; el ciclo al que le faltan menos indica cuáles agregar.
   * Devuelve { minimo, alternativas }:
   *   minimo       -> cantidad mínima de aristas faltantes (0 si ya hay ciclo).
   *   alternativas -> lista de opciones; cada opción es una lista de pares [a, b].
   */
  function missingEdges(g, maxAlternativas) {
    maxAlternativas = maxAlternativas || 5;
    const n = g.n;
    const existe = adjacency(g);
    let minimo = n + 1;
    let alternativas = [];
    let vistas = new Set();
    const perm = [];
    for (let i = 1; i < n; i++) perm.push(i);

    do {
      if (perm[0] > perm[n - 2]) continue;               // mismo ciclo recorrido al revés
      // contar primero las aristas faltantes de esta ruta cerrada 0, perm..., 0
      let faltan = 0;
      let prev = 0;
      for (let k = 0; k < n; k++) {
        const sig = k < n - 1 ? perm[k] : 0;
        if (existe[prev][sig] === 0) faltan++;
        prev = sig;
      }
      if (faltan > minimo) continue;
      // armar la lista solo cuando puede ser útil
      const lista = [];
      prev = 0;
      for (let k = 0; k < n; k++) {
        const sig = k < n - 1 ? perm[k] : 0;
        if (existe[prev][sig] === 0) lista.push([Math.min(prev, sig), Math.max(prev, sig)]);
        prev = sig;
      }
      lista.sort(function (x, y) { return x[0] - y[0] || x[1] - y[1]; });
      const clave = lista.join(";");
      if (faltan < minimo) { minimo = faltan; alternativas = [lista]; vistas = new Set([clave]); }
      else if (!vistas.has(clave) && alternativas.length < maxAlternativas) { alternativas.push(lista); vistas.add(clave); }
    } while (nextPermutation(perm));

    return { minimo: minimo, alternativas: alternativas };
  }

  global.G = {
    ETIQ: ETIQ, MIN_N: MIN_N, MAX_N: MAX_N,
    emptyGraph: emptyGraph, weight: weight, addEdge: addEdge, removeEdge: removeEdge,
    edgeList: edgeList, signature: signature, edgeName: edgeName,
    randomGraph: randomGraph, exampleGraph: exampleGraph,
    adjacency: adjacency, pathMatrix: pathMatrix, orderByOnes: orderByOnes,
    components: components, degrees: degrees,
    nextPermutation: nextPermutation, missingEdges: missingEdges
  };
})(window);
