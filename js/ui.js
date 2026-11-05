/* ============================================================
   ui.js  ·  Pantallas de los 4 pasos y datos compartidos.

   Estado global E (todo lo que debe recordar el programa):
     n, modo, unidad, paso, grafo, pos (posiciones de los nodos),
     res (resultado de la fuerza bruta), posPaso (ruta que se está viendo)...
   ============================================================ */
(function (global) {
  "use strict";

  const UNIDADES = { km: "Distancia (km)", USD: "Costo (USD)", h: "Tiempo (h)" };
  const $ = function (id) { return document.getElementById(id); };
  const fmt = D.formato;

  const E = {
    n: 6, modo: "manual", unidad: "km", paso: 1,
    grafo: null, pos: null,
    form: { v1: 0, v2: 1, peso: 1 },
    aleatorio: { prob: 70, wmin: 1, wmax: 20, ciclo: true },   // controles del modo aleatorio
    validacion: null, validSig: null, altSel: 0,
    res: null, resSig: null, posPaso: 0, soloValidos: false, tiempoPlay: null,
    optSel: 0, ranking: null, rankMostrar: 200, avisoN: ""
  };

  // ---------- utilidades ----------
  /** Tiempo legible: milisegundos si es menos de 1 segundo. */
  function tiempo(seg) { return seg < 1 ? Math.max(0.1, seg * 1000).toFixed(1) + " ms" : seg.toFixed(2) + " s"; }

  function textoRuta(ruta) {
    return ruta.concat([ruta[0]]).map(function (v) { return G.ETIQ[v]; }).join(" → ");
  }

  function nuevoGrafo(n) {
    E.n = n;
    E.grafo = G.emptyGraph(n);
    E.pos = D.circlePositions(n);
    E.form = { v1: 0, v2: 1, peso: E.form.peso || 1 };
    cambioGrafo();
  }

  /** Cualquier cambio en el grafo hace que los resultados anteriores ya no valgan. */
  function cambioGrafo() {
    E.res = null; E.resSig = null; E.ranking = null;
    E.posPaso = 0; E.optSel = 0; E.altSel = 0; E.rankMostrar = 200;
  }

  function obtenerValidacion() {
    const firma = G.signature(E.grafo);
    if (E.validSig !== firma) { E.validacion = G.missingEdges(E.grafo); E.validSig = firma; }
    return E.validacion;
  }

  function hayResultados() { return E.res !== null && E.resSig === G.signature(E.grafo); }

  const pendientes = [];       // gráficos por dibujar después de insertar el HTML
  function montarGrafo(id, opciones) { pendientes.push({ id: id, op: opciones }); }
  function dibujarPendientes() {
    pendientes.splice(0).forEach(function (p) {
      const host = $(p.id);
      if (host) D.renderGraph(host, E.grafo, E.pos, p.op);
    });
  }

  /** Leyenda de colores del grafo (para que cualquiera entienda qué significa cada trazo). */
  function leyenda(tipos) {
    const piezas = {
      nodo: '<li><i class="punto"></i>Vértice (arrástralo)</li>',
      arista: '<li><i style="--c:#94a3b8"></i>Arista que existe</li>',
      ruta: '<li><i style="--c:#0d9488"></i>Ruta evaluada</li>',
      faltante: '<li><i class="disc" style="--c:#e11d48"></i>Arista que no existe</li>',
      optimo: '<li><i style="--c:#f59e0b"></i>Ciclo óptimo</li>'
    };
    return '<ul class="leyenda" aria-label="Leyenda de colores">' + tipos.map(function (t) { return piezas[t]; }).join("") + "</ul>";
  }

  /** Cuadro negro con 2 o 3 instrucciones: qué hacer en este paso. */
  function guia(pasos) {
    return '<div class="guia"><strong>Qué hacer ahora</strong><ol>' + pasos.map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ol></div>";
  }

  /** Botón al final de cada paso para avanzar sin buscar el menú. */
  function siguiente(paso, texto) {
    return '<div class="siguiente"><button class="boton boton-negro grande" data-act="paso-ir" data-paso="' + paso + '">' + texto + " →</button></div>";
  }

  function figura(id, num, titulo, nota, tipos) {
    return '<figure><div class="lienzo" id="' + id + '"></div>' + (tipos ? leyenda(tipos) : "") +
      '<div class="pista"><span>Arrastra los vértices para acomodar el grafo.</span>' +
      '<button class="boton boton-claro chico" data-act="circulo">Acomodar en círculo</button></div>' +
      '<figcaption><strong>Figura ' + num + '</strong><br><em>' + titulo + '</em><br>' +
      '<span class="nota"><em>Nota.</em> ' + nota + ' Elaboración propia.</span></figcaption></figure>';
  }

  /** Tarjeta con un número grande (destaque = true la resalta en verde). */
  function metrica(valor, nombre, destaque) {
    return '<div class="metrica' + (destaque ? " destaque" : "") + '"><div class="valor">' + valor + '</div><div class="nombre">' + nombre + "</div></div>";
  }

  function opcionesVertices(sel) {
    let h = "";
    for (let i = 0; i < E.n; i++) h += '<option value="' + i + '"' + (i === sel ? " selected" : "") + ">" + G.ETIQ[i] + "</option>";
    return h;
  }

  /** Tabla de una matriz. orden: vértices en el orden mostrado. clase(i, j, valor): clase CSS de la celda. */
  function tablaMatriz(matriz, orden, clase) {
    orden = orden || matriz.map(function (_, i) { return i; });
    let h = '<div class="tabla-caja"><table><thead><tr><th></th>';
    orden.forEach(function (v) { h += "<th>" + G.ETIQ[v] + "</th>"; });
    h += "</tr></thead><tbody>";
    orden.forEach(function (i) {
      h += "<tr><th>" + G.ETIQ[i] + "</th>";
      orden.forEach(function (j) {
        const val = matriz[i][j];
        const txt = val === Infinity ? "∞" : fmt(val);
        h += '<td class="' + (clase ? clase(i, j, val) : "") + '">' + txt + "</td>";
      });
      h += "</tr>";
    });
    return h + "</tbody></table></div>";
  }

  // ============================================================
  // Barra superior de configuración
  // ============================================================
  function renderConfig() {
    $("config").innerHTML =
      '<div class="campo"><label for="inp-n">Número de nodos n (5 a 10)</label>' +
        '<div class="numero"><button class="boton boton-claro" data-act="n-menos" aria-label="Quitar un nodo">−</button>' +
        '<input id="inp-n" type="number" min="5" max="10" step="1" value="' + E.n + '" inputmode="numeric">' +
        '<button class="boton boton-claro" data-act="n-mas" aria-label="Agregar un nodo">+</button></div>' +
        '<div class="aviso-n" id="aviso-n">' + E.avisoN + "</div></div>" +
      '<div class="campo"><span class="rotulo">Creación del grafo</span><div class="segmentado" role="group">' +
        '<button data-act="modo" data-modo="manual" aria-pressed="' + (E.modo === "manual") + '">Manual</button>' +
        '<button data-act="modo" data-modo="aleatorio" aria-pressed="' + (E.modo === "aleatorio") + '">Aleatorio</button></div></div>' +
      '<div class="campo"><label for="sel-unidad">Los pesos representan</label><select id="sel-unidad">' +
        Object.keys(UNIDADES).map(function (k) { return '<option value="' + k + '"' + (k === E.unidad ? " selected" : "") + ">" + UNIDADES[k] + "</option>"; }).join("") +
      "</select></div>";
  }

  function renderPasos() {
    const nombres = ["Grafo", "Validación", "Paso a paso", "Resultados"];
    const subtitulos = ["Crea las aristas", "¿Hay ciclo?", "Recorre las rutas", "Ciclo óptimo"];
    const validado = E.grafo.edges.size > 0 && E.validSig === G.signature(E.grafo) && E.validacion && E.validacion.minimo === 0;
    const hechos = [E.grafo.edges.size > 0, validado, hayResultados(), hayResultados() && E.paso === 4];
    $("pasos").innerHTML = nombres.map(function (nom, i) {
      const marca = hechos[i] && E.paso !== i + 1;
      return '<button class="paso-btn' + (marca ? " hecho" : "") + '" data-act="paso" data-paso="' + (i + 1) + '"' + (E.paso === i + 1 ? ' aria-current="step"' : "") +
        '><span class="num">' + (marca ? "✓" : i + 1) + "</span><span>" + nom + "<small>" + subtitulos[i] + "</small></span></button>";
    }).join("");
  }

  // ============================================================
  // PASO 1: construir el grafo
  // ============================================================
  function panel1() {
    const g = E.grafo, n = E.n;
    const posibles = n * (n - 1) / 2;
    let controles;
    if (E.modo === "manual") {
      const lista = G.edgeList(g);
      controles =
        "<h3>Agregar una arista</h3>" +
        '<div class="fila"><div class="campo"><label for="f-v1">Vértice 1</label><select id="f-v1" data-bind="v1">' + opcionesVertices(E.form.v1) + "</select></div>" +
        '<div class="campo"><label for="f-v2">Vértice 2</label><select id="f-v2" data-bind="v2">' + opcionesVertices(E.form.v2) + "</select></div>" +
        '<div class="campo"><label for="f-peso">Peso (' + E.unidad + ')</label><input id="f-peso" type="number" min="0.01" step="any" value="' + E.form.peso + '" data-bind="peso"></div></div>' +
        '<div class="mensaje mal" id="msg-arista" hidden></div>' +
        '<div class="fila auto" style="margin-top:12px"><button class="boton boton-primario" data-act="add">Agregar / actualizar arista</button></div>' +
        '<div class="separador"></div>' +
        '<div class="fila auto"><button class="boton boton-claro" data-act="ejemplo-ciclo" title="Grafo que sí tiene ciclo hamiltoniano">Ejemplo con ciclo</button>' +
        '<button class="boton boton-claro" data-act="ejemplo-sin" title="Dos grupos unidos por una arista: faltan aristas">Ejemplo sin ciclo</button>' +
        '<button class="boton boton-peligro" data-act="vaciar">Vaciar grafo</button></div>' +
        (lista.length ? '<div class="separador"></div><h3>Aristas actuales (' + lista.length + ")</h3>" +
          '<div class="tabla-caja"><table><thead><tr><th class="izq">Arista</th><th>Peso (' + E.unidad + ')</th><th></th></tr></thead><tbody>' +
          lista.map(function (e) {
            return '<tr><td class="izq">' + G.edgeName(e.a, e.b) + "</td><td>" + fmt(e.w) + '</td><td><button class="boton boton-peligro chico" data-act="del" data-a="' + e.a + '" data-b="' + e.b + '" aria-label="Eliminar ' + G.edgeName(e.a, e.b) + '">✕</button></td></tr>';
          }).join("") + "</tbody></table></div>" : "");
    } else {
      const a = E.aleatorio;
      controles =
        "<h3>Grafo aleatorio</h3>" +
        '<p class="sub">Tú decides qué tan lleno será el grafo y entre qué valores van los pesos.</p>' +
        '<div class="campo"><label for="alea-prob">Probabilidad de que exista cada arista: <b id="alea-prob-val">' + a.prob + ' %</b></label>' +
        '<input class="rango" id="alea-prob" type="range" min="0" max="100" step="5" value="' + a.prob + '" data-alea="prob">' +
        '<div class="pista"><span>0 % = casi sin aristas</span><span>100 % = todas las aristas</span></div></div>' +
        '<div class="fila"><div class="campo"><label for="alea-min">Peso desde (' + E.unidad + ')</label><input id="alea-min" type="number" min="1" step="1" value="' + a.wmin + '" data-alea="wmin"></div>' +
        '<div class="campo"><label for="alea-max">Peso hasta (' + E.unidad + ')</label><input id="alea-max" type="number" min="1" step="1" value="' + a.wmax + '" data-alea="wmax"></div></div>' +
        '<label class="opcion"><input type="checkbox" id="alea-ciclo" data-alea="ciclo"' + (a.ciclo ? " checked" : "") + '><span>Garantizar que exista un ciclo hamiltoniano</span></label>' +
        '<p class="mini-ayuda">Si la desmarcas, el grafo puede no tener ciclo: sirve para ver cómo el Paso 2 indica las aristas que faltan.</p>' +
        '<div class="fila auto"><button class="boton boton-primario" data-act="aleatorio">🎲 Generar grafo aleatorio</button>' +
        '<button class="boton boton-peligro" data-act="vaciar">Vaciar grafo</button></div>';
    }
    $("panel").innerHTML =
      "<h2>Paso 1 · Construir el grafo</h2>" +
      guia(["Elige cuántos nodos quieres (<b>n</b>, de 5 a 10) y si el grafo será manual o aleatorio.",
        E.modo === "manual" ? "Agrega aristas: escoge dos vértices, escribe el peso y pulsa «Agregar» (o usa un ejemplo)." : "Ajusta la probabilidad de las aristas y el rango de pesos, y pulsa «Generar grafo aleatorio».",
        "Arrastra los vértices del dibujo para acomodarlos como prefieras."]) +
      '<p class="sub">Grafo no dirigido y ponderado con vértices ' + G.ETIQ[0] + "–" + G.ETIQ[n - 1] + ". Cada peso representa " + UNIDADES[E.unidad].toLowerCase() + ".</p>" +
      '<div class="metricas">' + metrica(n, "vértices") + metrica(g.edges.size + " / " + posibles, "aristas") +
      metrica(S.cycleCount(n).toLocaleString("es-PE"), "ciclos por evaluar (n−1)!/2") + "</div>" +
      '<div class="dos"><div class="tarjeta">' + controles + "</div><div>" +
      figura("g1", 1, "Grafo ponderado no dirigido", "Los números sobre las aristas son los pesos en " + E.unidad + ".", ["nodo", "arista"]) + "</div></div>" +
      (g.edges.size > 0 ? siguiente(2, "Ir al Paso 2: validar el grafo") : "");
    montarGrafo("g1", {});
  }

  // ============================================================
  // PASO 2: validar ciclos hamiltonianos
  // ============================================================
  function panel2() {
    const g = E.grafo;
    if (g.edges.size === 0) {
      $("panel").innerHTML = "<h2>Paso 2 · Validar ciclos hamiltonianos</h2>" +
        '<div class="mensaje info">Primero crea el grafo en el Paso 1.</div>';
      return;
    }
    const caminos = G.pathMatrix(g);
    const comps = G.components(caminos);
    const val = obtenerValidacion();
    const grados = G.degrees(g);
    let izq = "", faltantes = null;

    if (val.minimo === 0) {
      izq = '<div class="mensaje ok">El grafo SÍ tiene al menos un ciclo hamiltoniano. Puedes continuar al Paso 3.</div>';
    } else {
      izq = '<div class="mensaje mal">El grafo NO tiene ciclo hamiltoniano. Faltan como mínimo ' + val.minimo + " arista(s).</div>";
      if (comps.length > 1) {
        izq += "<p>• No es conexo: tiene " + comps.length + " componentes " + comps.map(function (c) {
          return "{" + c.map(function (v) { return G.ETIQ[v]; }).join(", ") + "}";
        }).join(" y ") + ".</p>";
      }
      grados.forEach(function (d, v) {
        if (d < 2) izq += "<p>• El vértice " + G.ETIQ[v] + " tiene menos de 2 aristas; en un ciclo cada vértice necesita 2.</p>";
      });
      E.altSel = Math.min(E.altSel, val.alternativas.length - 1);
      faltantes = val.alternativas[E.altSel];
      izq += "<h3>Aristas que faltan</h3><p class=\"sub\">Elige una alternativa, asigna el peso de cada arista y agrégala al grafo.</p>";
      izq += val.alternativas.map(function (alt, k) {
        return '<label class="opcion"><input type="radio" name="alt" value="' + k + '"' + (k === E.altSel ? " checked" : "") + "><span>Opción " + (k + 1) + ": " +
          alt.map(function (p) { return G.edgeName(p[0], p[1]); }).join(" y ") + "</span></label>";
      }).join("");
      const pesos = Array.from(g.edges.values());
      const promedio = Math.max(1, Math.round(pesos.reduce(function (s, x) { return s + x; }, 0) / pesos.length));
      izq += '<div class="fila" style="margin-top:10px">' + faltantes.map(function (p) {
        return '<div class="campo"><label>Peso de ' + G.edgeName(p[0], p[1]) + " (" + E.unidad + ')</label><input type="number" min="0.01" step="any" class="peso-falt" data-a="' + p[0] + '" data-b="' + p[1] + '" value="' + promedio + '"></div>';
      }).join("") + "</div>" +
        '<div class="fila auto" style="margin-top:12px"><button class="boton boton-primario" data-act="agregar-faltantes">Agregar estas aristas al grafo</button></div>';
    }

    const orden = G.orderByOnes(caminos);
    const ordenada = orden.map(function (i) { return orden.map(function (j) { return caminos[i][j]; }); });
    const adj = G.adjacency(g);
    const uno = function (_i, _j, v) { return v === 1 ? "uno" : ""; };
    // la matriz ordenada se muestra con las etiquetas en el nuevo orden
    function tablaOrdenada() {
      let h = '<div class="tabla-caja"><table><thead><tr><th></th>' + orden.map(function (v) { return "<th>" + G.ETIQ[v] + "</th>"; }).join("") + "</tr></thead><tbody>";
      ordenada.forEach(function (fila, i) {
        h += "<tr><th>" + G.ETIQ[orden[i]] + "</th>" + fila.map(function (v) { return '<td class="' + (v === 1 ? "uno" : "") + '">' + v + "</td>"; }).join("") + "</tr>";
      });
      return h + "</tbody></table></div>";
    }

    $("panel").innerHTML =
      "<h2>Paso 2 · Validar ciclos hamiltonianos</h2>" +
      guia(val.minimo === 0 ? ["¡Listo! El grafo ya tiene al menos un ciclo hamiltoniano.", "Revisa abajo las matrices y las componentes conexas.", "Continúa al Paso 3 para ejecutar la fuerza bruta."]
        : ["El grafo todavía no permite un ciclo: faltan aristas.", "Elige una alternativa de la lista, escribe el peso de cada arista nueva y pulsa «Agregar estas aristas».", "Las líneas rojas discontinuas del dibujo muestran dónde irían."]) +
      '<p class="sub">Un ciclo hamiltoniano pasa una sola vez por cada vértice y regresa al inicio. Si el grafo no tiene ninguno, el programa calcula el mínimo de aristas que faltan.</p>' +
      '<div class="dos"><div class="tarjeta">' + izq + "</div><div>" +
      figura("g2", 2, "Grafo y aristas faltantes para un ciclo hamiltoniano",
        faltantes ? "Las líneas rojas discontinuas son las aristas de la alternativa elegida que aún no existen." : "El grafo ya admite al menos un ciclo hamiltoniano.", faltantes ? ["nodo", "arista", "faltante"] : ["nodo", "arista"]) + "</div></div>" +
      '<div class="separador"></div><h3>Matrices (Lectura 5.1: componentes conexas)</h3>' +
      '<div class="matrices"><div><h4>Matriz de adyacencia (1 = hay arista)</h4>' + tablaMatriz(adj, null, uno) + "</div>" +
      "<div><h4>Matriz de caminos ordenada por cantidad de unos</h4>" + tablaOrdenada() + "</div></div>" +
      "<p style=\"margin-top:14px\"><strong>Componentes conexas</strong> (bloques de unos en la matriz de caminos): " +
      comps.map(function (c, k) { return "V" + (k + 1) + " = {" + c.map(function (v) { return G.ETIQ[v]; }).join(", ") + "}"; }).join(" · ") + "</p>" +
      (val.minimo === 0 ? siguiente(3, "Ir al Paso 3: fuerza bruta") : "");
    montarGrafo("g2", { faltantes: faltantes || [] });
  }

  // ============================================================
  // PASO 3: fuerza bruta paso a paso
  // ============================================================
  function vistaIdx(p) { return E.soloValidos ? E.res.validIdx[p] : p; }
  function vistaTam() { return E.soloValidos ? E.res.validIdx.length : E.res.total; }

  function panel3() {
    const g = E.grafo, n = E.n;
    if (g.edges.size === 0) {
      $("panel").innerHTML = "<h2>Paso 3 · Fuerza bruta paso a paso</h2>" + '<div class="mensaje info">Primero crea el grafo en el Paso 1.</div>';
      return;
    }
    if (obtenerValidacion().minimo !== 0) {
      $("panel").innerHTML = "<h2>Paso 3 · Fuerza bruta paso a paso</h2>" +
        '<div class="mensaje aviso">El grafo aún no tiene ciclo hamiltoniano. Complétalo en el Paso 2.</div>';
      return;
    }
    const listo = hayResultados();
    let h = "<h2>Paso 3 · Fuerza bruta paso a paso</h2>" +
      guia(["Pulsa «Ejecutar fuerza bruta»: el programa genera y evalúa todas las rutas.",
        "Avanza con «Siguiente» (también sirven las flechas ← → del teclado) o pulsa «Reproducir».",
        "Usa «Sig. mejora ★» para saltar a la siguiente ruta que baja el mejor costo."]) +
      '<p class="sub">La fuerza bruta fija A como inicio y prueba todas las permutaciones de los otros ' + (n - 1) +
      " vértices. Sin contar el sentido inverso son (n−1)!/2 = <strong>" + S.cycleCount(n).toLocaleString("es-PE") + "</strong> rutas.</p>" +
      '<div class="fila auto"><button class="boton boton-primario" data-act="ejecutar">' + (listo ? "Volver a ejecutar" : "🚀 Ejecutar fuerza bruta") + "</button></div>";
    if (!listo) {
      $("panel").innerHTML = h + '<div class="mensaje info">Pulsa «Ejecutar fuerza bruta» para generar todas las rutas y luego recórrelas una por una.</div>';
      return;
    }
    h += '<p class="sub" style="margin-top:12px">Se evaluaron ' + E.res.total.toLocaleString("es-PE") + " rutas en " + tiempo(E.res.elapsed) + ".</p>" +
      '<label class="opcion" style="max-width:420px"><input type="checkbox" id="solo-validos"' + (E.soloValidos ? " checked" : "") + "><span>Mostrar solo los ciclos hamiltonianos válidos</span></label>" +
      '<div class="controles">' +
      '<button class="boton boton-claro" data-act="p-inicio">⏮ Inicio</button><button class="boton boton-claro" data-act="p-ant">◀ Anterior</button>' +
      '<button class="boton boton-primario" data-act="p-sig">Siguiente ▶</button><button class="boton boton-claro" data-act="p-10">+10</button>' +
      '<button class="boton boton-claro" data-act="p-100">+100</button><button class="boton boton-ambar" data-act="p-mejora">Sig. mejora ★</button>' +
      '<button class="boton boton-claro" data-act="p-final">⏭ Final</button><button class="boton boton-claro" id="btn-play" data-act="p-play">▶ Reproducir</button></div>' +
      '<div class="fila"><div class="campo" style="flex:3"><label for="rango-paso">Ir al paso</label><input class="rango" id="rango-paso" type="range" min="1" max="1" value="1"></div>' +
      '<div class="campo" style="flex:1"><label for="num-paso">Número de ruta</label><input id="num-paso" type="number" min="1" max="1" value="1"></div></div>' +
      '<div class="barra"><i id="barra-prog" style="width:0"></i></div><div id="detalle-paso"></div>';
    $("panel").innerHTML = h;
    pintarPaso();
  }

  /** Muestra la ruta actual (solo se vuelve a dibujar esta zona, no toda la página). */
  function pintarPaso() {
    const res = E.res, g = E.grafo;
    const total = vistaTam();
    E.posPaso = Math.max(0, Math.min(E.posPaso, total - 1));
    const idx = vistaIdx(E.posPaso);
    const ruta = S.routeAt(res, idx);
    const costo = res.costs[idx];
    const tramos = S.evaluateRoute(g, ruta);
    const mejor = S.bestUntil(res, idx);
    const esMejora = res.improvements.indexOf(idx) !== -1;

    const rango = $("rango-paso"), num = $("num-paso");
    rango.max = total; rango.value = E.posPaso + 1;
    num.max = total; num.value = E.posPaso + 1;
    $("barra-prog").style.width = ((E.posPaso + 1) / total * 100) + "%";

    let estado;
    if (costo === Infinity) {
      const ult = tramos[tramos.length - 1];
      estado = '<div class="mensaje mal">Ruta descartada: no existe la arista ' + G.edgeName(ult.a, ult.b) + ".</div>";
    } else {
      estado = '<div class="mensaje ok">Ciclo hamiltoniano válido. Costo total = ' + fmt(costo) + " " + E.unidad + "</div>" +
        (esMejora ? '<div class="mensaje aviso">★ Nuevo mejor ciclo encontrado hasta ahora</div>' : "");
    }
    const filas = tramos.map(function (t) {
      return "<tr><td>" + G.ETIQ[t.a] + " → " + G.ETIQ[t.b] + "</td><td class=\"" + (t.w === null ? "rojo" : "") + "\">" +
        (t.w === null ? "no existe" : fmt(t.w)) + "</td><td>" + (t.acc === null ? "—" : fmt(t.acc)) + "</td></tr>";
    }).join("");

    $("detalle-paso").innerHTML = '<div class="dos"><div class="tarjeta">' +
      "<p><strong>Ruta " + (E.posPaso + 1).toLocaleString("es-PE") + " de " + total.toLocaleString("es-PE") + "</strong></p>" +
      '<div class="ruta-texto">' + textoRuta(ruta) + "</div>" + estado +
      '<div class="tabla-caja"><table><thead><tr><th>Tramo</th><th>Peso (' + E.unidad + ")</th><th>Acumulado</th></tr></thead><tbody>" + filas + "</tbody></table></div>" +
      '<div class="metricas" style="margin-top:14px">' + metrica(S.validUntil(res, idx).toLocaleString("es-PE"), "ciclos válidos hasta ahora") +
      metrica(mejor === Infinity ? "—" : fmt(mejor) + " " + E.unidad, "mejor costo hasta ahora") + "</div></div><div>" +
      figura("g3", 3, "Ruta evaluada en el paso actual", "Verde azulado: ruta evaluada. Rojo discontinuo: aristas que no existen. Los números indican el orden de visita.", ["nodo", "arista", "ruta", "faltante"]) + "</div></div>" +
      siguiente(4, "Ver los resultados");
    montarGrafo("g3", { ruta: ruta, color: D.COLOR.ruta, numeros: true });
    dibujarPendientes();
  }

  function moverPaso(nueva) { E.posPaso = nueva; pintarPaso(); }

  function siguienteMejora() {
    const res = E.res;
    const actual = vistaIdx(Math.min(E.posPaso, vistaTam() - 1));
    const k = S.lowerBound(res.improvements, actual + 1);
    if (k >= res.improvements.length) return;
    const destino = res.improvements[k];
    moverPaso(E.soloValidos ? S.lowerBound(res.validIdx, destino) : destino);
  }

  function alternarPlay() {
    if (E.tiempoPlay) { detenerPlay(); return; }
    $("btn-play").textContent = "⏸ Pausar";
    E.tiempoPlay = setInterval(function () {
      if (E.posPaso >= vistaTam() - 1) { detenerPlay(); return; }
      moverPaso(E.posPaso + 1);
    }, 350);
  }
  function detenerPlay() {
    if (E.tiempoPlay) { clearInterval(E.tiempoPlay); E.tiempoPlay = null; }
    const b = $("btn-play"); if (b) b.textContent = "▶ Reproducir";
  }

  // ============================================================
  // PASO 4: resultados
  // ============================================================
  function panel4() {
    if (!hayResultados()) {
      $("panel").innerHTML = "<h2>Paso 4 · Matriz de costos y solución óptima</h2>" +
        '<div class="mensaje info">Primero ejecuta la fuerza bruta en el Paso 3.</div>';
      return;
    }
    const res = E.res, g = E.grafo;
    const optimos = res.optimalIdx;
    E.optSel = Math.min(E.optSel, optimos.length - 1);
    const rutaOpt = S.routeAt(res, optimos[E.optSel]);

    let empate = "";
    if (optimos.length > 1) {
      empate = '<div class="campo" style="max-width:520px"><label for="sel-opt">Hay empate: elige el ciclo óptimo a resaltar</label><select id="sel-opt">' +
        optimos.map(function (i, k) { return '<option value="' + k + '"' + (k === E.optSel ? " selected" : "") + ">" + textoRuta(S.routeAt(res, i)) + "</option>"; }).join("") + "</select></div>";
    }

    const claves = new Set();
    rutaOpt.forEach(function (v, i) { const w = rutaOpt[(i + 1) % rutaOpt.length]; claves.add(Math.min(v, w) + "-" + Math.max(v, w)); });
    const costos = S.costMatrix(g);
    const tablaCostos = tablaMatriz(costos, null, function (i, j, val) {
      if (val === Infinity) return "rojo";
      return claves.has(Math.min(i, j) + "-" + Math.max(i, j)) && i !== j ? "resalta" : "";
    });

    if (!E.ranking) {                                  // ciclos ordenados de menor a mayor costo
      const lista = Array.from(res.validIdx);
      lista.sort(function (a, b) { return res.costs[a] - res.costs[b] || a - b; });
      E.ranking = lista;
    }
    const mostrar = Math.min(E.rankMostrar, E.ranking.length);
    let filas = "";
    for (let i = 0; i < mostrar; i++) {
      const idx = E.ranking[i];
      filas += '<tr class="' + (res.costs[idx] <= res.best + 1e-9 ? "optima" : "") + '"><td>' + (i + 1) + '</td><td class="izq">' +
        textoRuta(S.routeAt(res, idx)) + "</td><td>" + fmt(res.costs[idx]) + "</td></tr>";
    }

    $("panel").innerHTML =
      "<h2>Paso 4 · Matriz de costos y solución óptima</h2>" +
      guia(["Mira el ciclo óptimo (el de menor costo total) resaltado en ámbar sobre el grafo.",
        "Revisa la matriz de costos: las celdas ámbar son las aristas del ciclo óptimo.",
        "Más abajo está el costo de cada ciclo, de menor a mayor."]) +
      '<div class="metricas">' + metrica(res.validIdx.length.toLocaleString("es-PE"), "ciclos hamiltonianos encontrados") +
      metrica(fmt(res.best) + " " + E.unidad, "costo mínimo", true) + metrica(optimos.length, "ciclos con ese costo mínimo") +
      metrica(tiempo(res.elapsed), "tiempo de cómputo") + "</div>" + empate +
      '<div class="mensaje optimo">🏆 Ciclo óptimo: ' + textoRuta(rutaOpt) + " &nbsp;|&nbsp; costo total = " + fmt(res.best) + " " + E.unidad + "</div>" +
      '<div class="dos"><div class="tarjeta"><h3>Matriz de costos</h3><p class="sub">Peso de cada arista; ∞ significa que no existe. En ámbar, las aristas del ciclo óptimo.</p>' + tablaCostos + "</div><div>" +
      figura("g4", 4, "Ciclo hamiltoniano óptimo", "El trazo ámbar es el recorrido de menor costo (" + fmt(res.best) + " " + E.unidad + "); los números indican el orden de visita.", ["nodo", "arista", "optimo"]) + "</div></div>" +
      '<div class="separador"></div><h3>Costo total de cada ciclo hamiltoniano</h3>' +
      '<p class="sub">Ordenados de menor a mayor. Se muestran ' + mostrar.toLocaleString("es-PE") + " de " + E.ranking.length.toLocaleString("es-PE") + " ciclos.</p>" +
      '<div class="tabla-caja" style="max-height:440px"><table><thead><tr><th>Puesto</th><th class="izq">Ciclo</th><th>Costo (' + E.unidad + ")</th></tr></thead><tbody>" + filas + "</tbody></table></div>" +
      (mostrar < E.ranking.length ? '<div class="fila auto" style="margin-top:12px"><button class="boton boton-claro" data-act="mas">Mostrar más ciclos</button></div>' : "") +
      '<div class="siguiente"><button class="boton boton-negro grande" data-act="paso-ir" data-paso="1">Probar con otro grafo →</button></div>';
    montarGrafo("g4", { ruta: rutaOpt, color: D.COLOR.optimo, numeros: true });
  }

  // ============================================================
  // Estado del proyecto (barra lateral): qué pasos ya están listos
  // ============================================================
  function renderEstado() {
    const caja = $("estado");
    if (!caja) return;
    const g = E.grafo, aristas = g.edges.size;
    const validado = aristas > 0 && E.validSig === G.signature(g) && E.validacion;
    const items = [];
    items.push([aristas > 0 ? "ok" : "", aristas > 0 ? "✓" : "1", "<b>Grafo:</b> " + E.n + " vértices y " + aristas + (aristas === 1 ? " arista" : " aristas")]);
    if (validado && E.validacion.minimo === 0) items.push(["ok", "✓", "<b>Validación:</b> tiene ciclo hamiltoniano"]);
    else if (validado) items.push(["mal", "!", "<b>Validación:</b> faltan " + E.validacion.minimo + " arista(s)"]);
    else items.push(["", "2", "<b>Validación:</b> pendiente"]);
    if (hayResultados()) {
      items.push(["ok", "✓", "<b>Fuerza bruta:</b> " + E.res.total.toLocaleString("es-PE") + " rutas en " + tiempo(E.res.elapsed)]);
      items.push(["ok", "✓", "<b>Óptimo:</b> " + fmt(E.res.best) + " " + E.unidad]);
    } else {
      items.push(["", "3", "<b>Fuerza bruta:</b> pendiente"]);
      items.push(["", "4", "<b>Óptimo:</b> pendiente"]);
    }
    caja.innerHTML = items.map(function (it) {
      return '<li class="' + it[0] + '"><span class="ico">' + it[1] + "</span><span>" + it[2] + "</span></li>";
    }).join("");
  }

  // ============================================================
  // Dibujar la pantalla completa
  // ============================================================
  function render() {
    renderEstado();
    detenerPlay();
    renderPasos();
    [null, panel1, panel2, panel3, panel4][E.paso]();
    dibujarPendientes();
  }

  global.UI = {
    E: E, $: $, render: render, renderConfig: renderConfig,
    nuevoGrafo: nuevoGrafo, cambioGrafo: cambioGrafo, hayResultados: hayResultados,
    pintarPaso: pintarPaso, moverPaso: moverPaso, siguienteMejora: siguienteMejora, alternarPlay: alternarPlay,
    vistaTam: vistaTam
  };
})(window);
