"""Componentes de la interfaz: dibujo del grafo, tablas y pie de figura APA."""

import math

import matplotlib.pyplot as plt
import pandas as pd
import streamlit as st

from modules.graph_manager import ETIQUETAS, peso_arista

COLOR_ARISTA = "gray"
COLOR_RUTA = "green"
COLOR_OPTIMO = "orange"
COLOR_FALTANTE = "red"


def formato(numero: float) -> str:
    """Escribe un número sin ceros de más: 5.0 -> '5' y 2.5 -> '2.5'."""
    return f"{numero:g}"


def texto_ruta(ruta: list) -> str:
    """Ruta como texto cerrado: 'A → C → B → A'."""
    letras = [ETIQUETAS[v] for v in ruta + [ruta[0]]]
    return " → ".join(letras)


def posiciones(n: int) -> list:
    """Coordenadas (x, y) de los n vértices sobre una circunferencia, con A arriba."""
    puntos = []
    for i in range(n):
        angulo = math.pi / 2 - 2 * math.pi * i / n
        puntos.append((math.cos(angulo), math.sin(angulo)))
    return puntos


def dibujar_grafo(grafo: dict, ruta=None, color_ruta=COLOR_RUTA, faltantes=None):
    """Dibuja el grafo con letras en los vértices y pesos sobre las aristas.

    ruta     : lista de vértices que se resalta (se cierra sola). Sus aristas que
               no existen en el grafo se dibujan en rojo discontinuo.
    faltantes: lista de aristas (a, b) sugeridas, también en rojo discontinuo.
    """
    n = grafo["n"]
    pos = posiciones(n)
    fig, ax = plt.subplots(figsize=(6, 6))
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_xlim(-1.3, 1.3)
    ax.set_ylim(-1.3, 1.3)

    # 1) todas las aristas en gris
    for (a, b) in grafo["aristas"]:
        ax.plot([pos[a][0], pos[b][0]], [pos[a][1], pos[b][1]], color=COLOR_ARISTA, linewidth=1)

    # 2) la ruta resaltada
    if ruta:
        cerrada = ruta + [ruta[0]]
        for i in range(len(ruta)):
            a, b = cerrada[i], cerrada[i + 1]
            xs = [pos[a][0], pos[b][0]]
            ys = [pos[a][1], pos[b][1]]
            if peso_arista(grafo, a, b) is None:
                ax.plot(xs, ys, color=COLOR_FALTANTE, linewidth=2.5, linestyle="--")
            else:
                ax.plot(xs, ys, color=color_ruta, linewidth=4)

    # 3) aristas que faltan
    if faltantes:
        for (a, b) in faltantes:
            ax.plot([pos[a][0], pos[b][0]], [pos[a][1], pos[b][1]],
                    color=COLOR_FALTANTE, linewidth=2.5, linestyle="--")

    # 4) pesos (a distinta altura de la arista para que no se encimen)
    for (a, b), peso in grafo["aristas"].items():
        t = 0.3 if (a + b) % 2 == 0 else 0.7
        x = pos[a][0] + t * (pos[b][0] - pos[a][0])
        y = pos[a][1] + t * (pos[b][1] - pos[a][1])
        ax.text(x, y, formato(peso), fontsize=8, ha="center", va="center",
                bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="none"))

    # 5) vértices
    for v in range(n):
        ax.text(pos[v][0], pos[v][1], ETIQUETAS[v], fontsize=13, fontweight="bold",
                ha="center", va="center",
                bbox=dict(boxstyle="circle,pad=0.4", fc="lightblue", ec="navy", linewidth=2))
    return fig


def mostrar_grafico(fig, donde=st) -> None:
    """Muestra la figura (en la página o en una columna) y libera su memoria."""
    donde.pyplot(fig)
    plt.close(fig)


def pie_de_figura(numero: int, titulo: str, nota: str, donde=st) -> None:
    """Pie de figura en formato APA: número, título y nota."""
    donde.markdown(f"**Figura {numero}**  \n*{titulo}*  \n*Nota.* {nota}")


def tabla_matriz(matriz: list, orden=None) -> pd.DataFrame:
    """Convierte una matriz en tabla con letras; el infinito se muestra como ∞.

    orden: lista de vértices si las filas/columnas vienen reordenadas.
    """
    if orden is None:
        orden = list(range(len(matriz)))
    letras = [ETIQUETAS[v] for v in orden]
    filas = []
    for fila in matriz:
        filas.append(["∞" if valor == float("inf") else formato(valor) for valor in fila])
    return pd.DataFrame(filas, index=letras, columns=letras)
