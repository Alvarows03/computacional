"""Problema del Agente Viajero por fuerza bruta.

Idea: probar TODAS las rutas que salen de A, pasan una vez por cada vértice y
regresan a A; sumar los pesos de cada una y quedarse con la de menor costo.
"""

import itertools
import math

from modules.graph_manager import peso_arista

INFINITO = float("inf")


def matriz_costos(grafo: dict) -> list:
    """Matriz de costos: peso de la arista i–j, infinito si no existe, 0 en la diagonal."""
    n = grafo["n"]
    matriz = [[INFINITO] * n for _ in range(n)]
    for i in range(n):
        matriz[i][i] = 0
    for (a, b), peso in grafo["aristas"].items():
        matriz[a][b] = peso
        matriz[b][a] = peso
    return matriz


def cantidad_ciclos(n: int) -> int:
    """Cantidad de ciclos distintos en un grafo completo: (n-1)! / 2 (Lectura 7)."""
    return math.factorial(n - 1) // 2


def fuerza_bruta(grafo: dict) -> list:
    """Genera y evalúa todas las rutas posibles.

    Devuelve una lista de pares (ruta, costo):
      - ruta  : vértices en orden, empezando en A (0). Se entiende que al final vuelve a A.
      - costo : suma de los pesos; es INFINITO si la ruta usa una arista que no existe.

    Se fija A como inicio porque un ciclo no tiene principio. Además, cada ciclo
    aparece dos veces (al derecho y al revés); solo se guarda uno de los dos.
    """
    n = grafo["n"]
    costos = matriz_costos(grafo)
    resultados = []

    for perm in itertools.permutations(range(1, n)):
        if perm[0] > perm[-1]:
            continue  # ruta repetida (mismo ciclo al revés)

        ruta = [0] + list(perm)
        cerrada = ruta + [0]
        total = 0
        for i in range(n):
            total = total + costos[cerrada[i]][cerrada[i + 1]]
        resultados.append((ruta, round(total, 6)))
    return resultados


def evaluar_ruta(grafo: dict, ruta: list) -> list:
    """Detalle de una ruta, tramo por tramo.

    Devuelve una lista de (origen, destino, peso, acumulado). Si un tramo no
    existe, peso y acumulado son None y ahí termina la lista.
    """
    cerrada = ruta + [ruta[0]]
    tramos = []
    acumulado = 0
    for i in range(len(ruta)):
        a, b = cerrada[i], cerrada[i + 1]
        peso = peso_arista(grafo, a, b)
        if peso is None:
            tramos.append((a, b, None, None))
            return tramos
        acumulado = acumulado + peso
        tramos.append((a, b, peso, acumulado))
    return tramos
