"""PASO 2: validar ciclos hamiltonianos y sugerir las aristas que faltan."""

import streamlit as st

from modules import estado
from modules import graph_manager as gm
from modules import ui_components as ui

ss = st.session_state  # aquí se guardan los datos entre clic y clic


def paso_2(grafo: dict, unidad: str) -> None:
    st.header("Paso 2 · Validar ciclos hamiltonianos")
    if not grafo["aristas"]:
        st.info("Primero cree el grafo en el Paso 1.")
        return

    n = grafo["n"]
    caminos = gm.matriz_caminos(grafo)
    componentes = gm.componentes_conexas(caminos)
    minimo, alternativas = estado.obtener_validacion(grafo)
    izq, der = st.columns(2)
    faltantes = None

    if minimo == 0:
        izq.success("El grafo SÍ tiene al menos un ciclo hamiltoniano. Puede continuar al Paso 3.")
    else:
        izq.error(f"El grafo NO tiene ciclo hamiltoniano. Faltan como mínimo {minimo} arista(s).")

        # explicar por qué falla
        if len(componentes) > 1:
            grupos = ["{" + ", ".join(gm.ETIQUETAS[v] for v in c) + "}" for c in componentes]
            izq.write("• No es conexo, tiene " + str(len(componentes)) + " componentes: " + " y ".join(grupos))
        grados = gm.grados(grafo)
        for v in range(n):
            if grados[v] < 2:
                izq.write(f"• El vértice {gm.ETIQUETAS[v]} tiene menos de 2 aristas; en un ciclo cada vértice necesita 2.")

        # aristas que faltan (alternativas)
        izq.subheader("Aristas que faltan")
        textos = []
        for k in range(len(alternativas)):
            nombres = [gm.nombre_arista(a, b) for (a, b) in alternativas[k]]
            textos.append(f"Opción {k + 1}: " + " y ".join(nombres))
        elegida = izq.radio("Elija una alternativa", textos)
        faltantes = alternativas[textos.index(elegida)]

        pesos = list(grafo["aristas"].values())
        promedio = max(1.0, round(sum(pesos) / len(pesos)))
        nuevos = []
        for (a, b) in faltantes:
            p = izq.number_input(f"Peso de {gm.nombre_arista(a, b)} ({unidad})", min_value=0.01,
                                 value=float(promedio), step=1.0, format="%g", key=f"peso_{a}_{b}")
            nuevos.append(p)
        if izq.button("Agregar estas aristas al grafo"):
            for k in range(len(faltantes)):
                gm.agregar_arista(grafo, faltantes[k][0], faltantes[k][1], nuevos[k])
            st.rerun()

    fig = ui.dibujar_grafo(grafo, faltantes=faltantes)
    ui.mostrar_grafico(fig, der)
    ui.pie_de_figura(2, "Grafo y aristas faltantes para un ciclo hamiltoniano",
                     "Las líneas rojas discontinuas son las aristas que aún no existen. Elaboración propia.", der)

    # matrices de la Lectura 5.1
    st.subheader("Matrices (Lectura 5.1: componentes conexas)")
    m1, m2 = st.columns(2)
    m1.write("Matriz de adyacencia (1 = hay arista)")
    m1.dataframe(ui.tabla_matriz(gm.matriz_adyacencia(grafo)))

    orden = gm.orden_por_unos(caminos)
    ordenada = [[caminos[i][j] for j in orden] for i in orden]
    m2.write("Matriz de caminos ordenada por cantidad de unos")
    m2.dataframe(ui.tabla_matriz(ordenada, orden))

    st.write("**Componentes conexas** (bloques de unos en la matriz de caminos):")
    for k in range(len(componentes)):
        st.write(f"V{k + 1} = {{" + ", ".join(gm.ETIQUETAS[v] for v in componentes[k]) + "}")
