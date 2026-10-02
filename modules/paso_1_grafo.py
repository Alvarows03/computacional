"""PASO 1: construir el grafo (manual o aleatorio) y dibujarlo."""

import streamlit as st

from modules import graph_manager as gm
from modules import ui_components as ui

ss = st.session_state  # aquí se guardan los datos entre clic y clic


def paso_1(grafo: dict, modo: str, unidad: str) -> None:
    st.header("Paso 1 · Construir el grafo")
    n = grafo["n"]
    letras = list(gm.ETIQUETAS[:n])
    izq, der = st.columns(2)

    if modo == "Manual":
        izq.subheader("Agregar una arista")
        a = izq.selectbox("Vértice 1", letras)
        b = izq.selectbox("Vértice 2", letras, index=1)
        peso = izq.number_input(f"Peso ({unidad})", min_value=0.01, value=1.0, step=1.0, format="%g")
        if izq.button("Agregar / actualizar arista"):
            error = gm.agregar_arista(grafo, letras.index(a), letras.index(b), peso)
            if error:
                izq.error(error)
            else:
                st.rerun()

        c1, c2, c3 = izq.columns(3)
        if c1.button("Ejemplo con ciclo"):
            ss.grafo = gm.grafo_ejemplo(n, True)
            st.rerun()
        if c2.button("Ejemplo sin ciclo"):
            ss.grafo = gm.grafo_ejemplo(n, False)
            st.rerun()
        if c3.button("Vaciar grafo"):
            ss.grafo = gm.grafo_vacio(n)
            st.rerun()

        if grafo["aristas"]:
            izq.subheader(f"Aristas actuales ({len(grafo['aristas'])})")
            tabla = []
            for (x, y), p in sorted(grafo["aristas"].items()):
                tabla.append({"Arista": gm.nombre_arista(x, y), f"Peso ({unidad})": ui.formato(p)})
            izq.dataframe(tabla, hide_index=True)

            nombres = [gm.nombre_arista(x, y) for (x, y) in sorted(grafo["aristas"])]
            borrar = izq.selectbox("Eliminar una arista", nombres)
            if izq.button("Eliminar"):
                x, y = letras.index(borrar[0]), letras.index(borrar[2])
                del grafo["aristas"][(min(x, y), max(x, y))]
                st.rerun()
    else:
        izq.subheader("Grafo aleatorio")
        izq.write("Cada arista existe con 70 % de probabilidad y su peso es un entero entre 1 y 20.")
        if izq.button("Generar grafo aleatorio"):
            # densidad 0.7, pesos de 1 a 20, y siempre con ciclo hamiltoniano
            ss.grafo = gm.grafo_aleatorio(n, 0.7, 1, 20, True)
            st.rerun()

    fig = ui.dibujar_grafo(grafo)
    ui.mostrar_grafico(fig, der)
    ui.pie_de_figura(1, "Grafo ponderado no dirigido",
                     f"Los números sobre las aristas son los pesos en {unidad}. Elaboración propia.", der)
