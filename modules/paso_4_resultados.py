"""PASO 4: matriz de costos, costo de cada ciclo y ciclo óptimo."""

import pandas as pd
import streamlit as st

from modules import estado
from modules import tsp_solver as tsp
from modules import ui_components as ui

ss = st.session_state  # aquí se guardan los datos entre clic y clic


def paso_4(grafo: dict, unidad: str) -> None:
    st.header("Paso 4 · Matriz de costos y solución óptima")
    if ss.get("firma_resultados") != estado.firma(grafo):
        st.info("Primero ejecute la fuerza bruta en el Paso 3.")
        return

    # ciclos válidos y el de menor costo
    validas = [r for r in ss.resultados if r[1] != tsp.INFINITO]
    mejor = validas[0][1]
    for ruta, costo in validas:
        if costo < mejor:
            mejor = costo
    optimos = [ruta for ruta, costo in validas if costo == mejor]

    c1, c2, c3 = st.columns(3)
    c1.metric("Ciclos hamiltonianos encontrados", f"{len(validas):,}")
    c2.metric(f"Costo mínimo ({unidad})", ui.formato(mejor))
    c3.metric("Ciclos con ese costo mínimo", len(optimos))

    textos = [ui.texto_ruta(r) for r in optimos]
    elegido = optimos[0]
    if len(optimos) > 1:
        elegido = optimos[textos.index(st.selectbox("Hay empate: elija el ciclo óptimo a resaltar", textos))]
    st.success(f"Ciclo óptimo: {ui.texto_ruta(elegido)}   |   costo total = {ui.formato(mejor)} {unidad}")

    izq, der = st.columns(2)
    izq.subheader("Matriz de costos")
    izq.write("Peso de cada arista; ∞ significa que no existe.")
    izq.dataframe(ui.tabla_matriz(tsp.matriz_costos(grafo)))
    fig = ui.dibujar_grafo(grafo, elegido, ui.COLOR_OPTIMO)
    ui.mostrar_grafico(fig, der)
    ui.pie_de_figura(4, "Ciclo hamiltoniano óptimo",
                     f"El trazo naranja es el recorrido de menor costo ({ui.formato(mejor)} {unidad}). "
                     "Elaboración propia.", der)

    # costo de cada ciclo, ordenados de menor a mayor
    st.subheader("Costo total de cada ciclo hamiltoniano")
    ordenadas = sorted([(costo, ruta) for ruta, costo in validas])
    mostrar = min(len(ordenadas), 1000)
    filas = []
    for i in range(mostrar):
        costo, ruta = ordenadas[i]
        filas.append({"Puesto": i + 1, "Ciclo": ui.texto_ruta(ruta), f"Costo ({unidad})": costo})
    st.write(f"Ordenados de menor a mayor. Se muestran {mostrar:,} de {len(ordenadas):,}.")
    st.dataframe(pd.DataFrame(filas), hide_index=True)
