"""PASO 3: ejecutar la fuerza bruta y recorrer las rutas una por una."""

import time

import streamlit as st

from modules import estado
from modules import graph_manager as gm
from modules import tsp_solver as tsp
from modules import ui_components as ui

ss = st.session_state  # aquí se guardan los datos entre clic y clic


def mejor_hasta(lista: list, posicion: int) -> float:
    """Menor costo encontrado desde la primera ruta hasta la posición indicada."""
    mejor = tsp.INFINITO
    for i in range(posicion + 1):
        if lista[i][1] < mejor:
            mejor = lista[i][1]
    return mejor


def paso_3(grafo: dict, unidad: str) -> None:
    st.header("Paso 3 · Fuerza bruta paso a paso")
    if not grafo["aristas"]:
        st.info("Primero cree el grafo en el Paso 1.")
        return
    if estado.obtener_validacion(grafo)[0] != 0:
        st.warning("El grafo aún no tiene ciclo hamiltoniano. Complételo en el Paso 2.")
        return

    n = grafo["n"]
    st.write(f"La fuerza bruta fija A como inicio y prueba todas las permutaciones de los otros "
             f"{n - 1} vértices. Sin contar el sentido inverso son (n−1)!/2 = "
             f"**{tsp.cantidad_ciclos(n):,}** rutas.")

    if st.button("Ejecutar fuerza bruta"):
        inicio = time.time()
        ss.resultados = tsp.fuerza_bruta(grafo)
        ss.tiempo = time.time() - inicio
        ss.firma_resultados = estado.firma(grafo)
        ss.posicion = 0

    if ss.get("firma_resultados") != estado.firma(grafo):
        st.info("Pulse «Ejecutar fuerza bruta» para generar todas las rutas.")
        return

    st.caption(f"Se evaluaron {len(ss.resultados):,} rutas en {ss.tiempo:.2f} segundos.")

    # lista de rutas a recorrer
    lista = ss.resultados
    if st.checkbox("Mostrar solo los ciclos hamiltonianos válidos"):
        lista = [r for r in ss.resultados if r[1] != tsp.INFINITO]
    total = len(lista)

    # botones para moverse entre rutas
    botones = st.columns(7)
    if botones[0].button("⏮ Inicio"):
        ss.posicion = 0
    if botones[1].button("◀ Anterior"):
        ss.posicion = ss.posicion - 1
    if botones[2].button("Siguiente ▶"):
        ss.posicion = ss.posicion + 1
    if botones[3].button("+10"):
        ss.posicion = ss.posicion + 10
    if botones[4].button("+100"):
        ss.posicion = ss.posicion + 100
    if botones[5].button("Sig. mejora ★"):
        actual = mejor_hasta(lista, min(ss.posicion, total - 1))
        for i in range(ss.posicion + 1, total):
            if lista[i][1] < actual:
                ss.posicion = i
                break
    if botones[6].button("⏭ Final"):
        ss.posicion = total - 1
    ss.posicion = max(0, min(ss.posicion, total - 1))

    ruta, costo = lista[ss.posicion]
    tramos = tsp.evaluar_ruta(grafo, ruta)
    validas_hasta_ahora = 0
    for i in range(ss.posicion + 1):
        if lista[i][1] != tsp.INFINITO:
            validas_hasta_ahora = validas_hasta_ahora + 1
    mejor = mejor_hasta(lista, ss.posicion)

    izq, der = st.columns(2)
    izq.write(f"**Ruta {ss.posicion + 1:,} de {total:,}**")
    izq.write(ui.texto_ruta(ruta))
    if costo == tsp.INFINITO:
        a, b = tramos[-1][0], tramos[-1][1]
        izq.error(f"Ruta descartada: no existe la arista {gm.nombre_arista(a, b)}.")
    else:
        izq.success(f"Ciclo hamiltoniano válido. Costo total = {ui.formato(costo)} {unidad}")

    detalle = []
    for (a, b, peso, acumulado) in tramos:
        detalle.append({
            "Tramo": gm.ETIQUETAS[a] + " → " + gm.ETIQUETAS[b],
            f"Peso ({unidad})": "no existe" if peso is None else ui.formato(peso),
            "Acumulado": "—" if acumulado is None else ui.formato(acumulado),
        })
    izq.dataframe(detalle, hide_index=True)
    izq.write(f"Ciclos válidos encontrados hasta ahora: **{validas_hasta_ahora:,}**")
    if mejor == tsp.INFINITO:
        izq.write("Mejor costo hasta ahora: aún no hay ninguno")
    else:
        izq.write(f"Mejor costo hasta ahora: **{ui.formato(mejor)} {unidad}**")

    fig = ui.dibujar_grafo(grafo, ruta)
    ui.mostrar_grafico(fig, der)
    ui.pie_de_figura(3, "Ruta evaluada en el paso actual",
                     "Verde: aristas que existen. Rojo discontinuo: aristas que no existen. Elaboración propia.", der)
