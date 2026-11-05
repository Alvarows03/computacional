/* ============================================================
   solver.js  ·  Problema del Agente Viajero por fuerza bruta.

   Idea: probar TODAS las rutas que salen de A, pasan una vez por
   cada vértice y regresan a A; sumar los pesos de cada una y
   quedarse con la de menor costo.
   ============================================================ */
(function (global) {
  "use strict";

  const INF = Infinity;

  /** Matriz de costos: peso de la arista i–j, ∞ si no existe, 0 en la diagonal (Lectura 5.2). */
  function costMatrix(g) {
    const n = g.n;
    const m = [];
    for (let i = 0; i < n; i++) {
      m.push(new Array(n).fill(INF));
      m[i][i] = 0;
    }
    g.edges.forEach(function (w, k) {
      const par = k.split("-");
      m[par[0]][par[1]] = w;
      m[par[1]][par[0]] = w;
    });
    return m;
  }

  /** Cantidad de ciclos distintos en un grafo completo: (n-1)! / 2 (Lectura 7). */
  function cycleCount(n) {
    let f = 1;
    for (let k = 2; k <= n - 1; k++) f *= k;
    return f / 2;
  }

  /**
   * Genera y evalúa todas las rutas posibles.
   * Se fija A (vértice 0) como inicio porque un ciclo no tiene principio, y
   * solo se guarda uno de cada dos recorridos (cada ciclo aparece al derecho y al revés).
   * Devuelve un objeto con:
   *   routes -> todas las rutas (n números por ruta, empezando en 0)
   *   costs  -> costo de cada ruta (Infinity si usa una arista que no existe)
   *   validIdx, improvements, optimalIdx, best, elapsed ...
   */
  function bruteForce(g) {
    const t0 = performance.now();
    const n = g.n;
    const costos = costMatrix(g);
    const total = cycleCount(n);
    const routes = new Uint8Array(total * n);
    const costs = new Float64Array(total);

    const perm = [];
    for (let i = 1; i < n; i++) perm.push(i);

    let idx = 0;
    do {
      if (perm[0] > perm[n - 2]) continue;           // ruta repetida (mismo ciclo al revés)
      const base = idx * n;
      routes[base] = 0;
      let suma = costos[0][perm[0]];
      for (let k = 0; k < n - 1; k++) {
        routes[base + 1 + k] = perm[k];
        if (k < n - 2) suma += costos[perm[k]][perm[k + 1]];
      }
      suma += costos[perm[n - 2]][0];                // regreso a A
      costs[idx] = isFinite(suma) ? Math.round(suma * 1e6) / 1e6 : INF;
      idx++;
    } while (G.nextPermutation(perm));

    // estadísticas: ciclos válidos, mejoras sucesivas y empates en el mínimo
    const validList = [];
    const improvements = [];
    let best = INF;
    for (let i = 0; i < total; i++) {
      if (costs[i] === INF) continue;
      validList.push(i);
      if (costs[i] < best - 1e-9) { best = costs[i]; improvements.push(i); }
    }
    const optimalIdx = [];
    validList.forEach(function (i) { if (costs[i] <= best + 1e-9) optimalIdx.push(i); });

    return {
      n: n, total: total, routes: routes, costs: costs,
      validIdx: Int32Array.from(validList), improvements: improvements,
      best: best, optimalIdx: optimalIdx,
      elapsed: (performance.now() - t0) / 1000
    };
  }

  /** Ruta número i como arreglo de vértices. */
  function routeAt(res, i) {
    return Array.prototype.slice.call(res.routes, i * res.n, (i + 1) * res.n);
  }

  /**
   * Detalle de una ruta, tramo por tramo: [{a, b, w, acc}].
   * Si un tramo no existe, w y acc son null y ahí termina la lista.
   */
  function evaluateRoute(g, ruta) {
    const tramos = [];
    let acumulado = 0;
    for (let i = 0; i < ruta.length; i++) {
      const a = ruta[i];
      const b = ruta[(i + 1) % ruta.length];
      const w = G.weight(g, a, b);
      if (w === null) { tramos.push({ a: a, b: b, w: null, acc: null }); return tramos; }
      acumulado = Math.round((acumulado + w) * 1e6) / 1e6;
      tramos.push({ a: a, b: b, w: w, acc: acumulado });
    }
    return tramos;
  }

  /** Primera posición de arr (ordenado) con valor >= x. */
  function lowerBound(arr, x) {
    let lo = 0, hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid] < x) lo = mid + 1; else hi = mid;
    }
    return lo;
  }

  /** Mejor costo encontrado desde la primera ruta hasta la ruta idx (o Infinity). */
  function bestUntil(res, idx) {
    const k = lowerBound(res.improvements, idx + 1);   // mejoras con índice <= idx
    return k === 0 ? INF : res.costs[res.improvements[k - 1]];
  }

  /** Cantidad de ciclos válidos hasta la ruta idx (incluida). */
  function validUntil(res, idx) { return lowerBound(res.validIdx, idx + 1); }

  global.S = {
    costMatrix: costMatrix, cycleCount: cycleCount, bruteForce: bruteForce,
    routeAt: routeAt, evaluateRoute: evaluateRoute, lowerBound: lowerBound,
    bestUntil: bestUntil, validUntil: validUntil
  };
})(window);
