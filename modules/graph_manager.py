"""Manejo del grafo: crear aristas, matrices y validar ciclos hamiltonianos.

El grafo es un diccionario simple:
    {"n": 5, "aristas": {(0, 1): 4.0, (0, 2): 7.0, ...}}
Los vértices son 0, 1, 2... y se muestran como letras A, B, C...
Cada arista se guarda como (menor, mayor) con su peso.
"""

import itertools
import random

ETIQUETAS = "ABCDEFGHIJ"


# ---------------------------------------------------------------------------
# Crear y editar el grafo
# ---------------------------------------------------------------------------
def grafo_vacio(n: int) -> dict:
    """Crea un grafo con n vértices y sin aristas."""
    return {"n": n, "aristas": {}}


def nombre_arista(a: int, b: int) -> str:
    """Nombre legible de una arista, por ejemplo 'A–C'."""
    return ETIQUETAS[a] + "–" + ETIQUETAS[b]


def peso_arista(grafo: dict, a: int, b: int):
    """Devuelve el peso de la arista a–b, o None si no existe."""
    return grafo["aristas"].get((min(a, b), max(a, b)))


def agregar_arista(grafo: dict, a: int, b: int, peso: float):
    """Agrega o actualiza una arista. Devuelve un mensaje de error o None si todo salió bien."""
    if a == b:
        return "No se permite unir un vértice consigo mismo."
    if peso <= 0:
        return "El peso debe ser mayor que 0."
    grafo["aristas"][(min(a, b), max(a, b))] = peso
    return None


def grafo_aleatorio(n: int, densidad: float, peso_min: int, peso_max: int,
                    con_ciclo: bool, semilla=None) -> dict:
    """Crea un grafo aleatorio.

    densidad: probabilidad (0 a 1) de que exista cada arista.
    con_ciclo: si es True, primero se dibuja un ciclo que pasa por todos los
               vértices, así el grafo siempre tiene ciclo hamiltoniano.
    """
    azar = random.Random(semilla)
    grafo = grafo_vacio(n)

    if con_ciclo:
        orden = list(range(n))
        azar.shuffle(orden)
        for i in range(n):
            # orden[i - 1] es el vértice anterior (para i = 0 es el último)
            agregar_arista(grafo, orden[i - 1], orden[i], azar.randint(peso_min, peso_max))

    for a in range(n):
        for b in range(a + 1, n):
            if peso_arista(grafo, a, b) is None and azar.random() < densidad:
                agregar_arista(grafo, a, b, azar.randint(peso_min, peso_max))
    return grafo


def grafo_ejemplo(n: int, con_ciclo: bool) -> dict:
    """Grafo de ejemplo para demostrar el programa.

    con_ciclo=True : grafo que sí tiene ciclo hamiltoniano.
    con_ciclo=False: dos grupos de vértices unidos por una sola arista; NO tiene
                     ciclo hamiltoniano y la validación indica qué arista falta.
    """
    if con_ciclo:
        return grafo_aleatorio(n, 0.5, 2, 15, True, semilla=2026)

    azar = random.Random(2026)
    grafo = grafo_vacio(n)
    mitad = n // 2
    for a in range(n):
        for b in range(a + 1, n):
            mismo_grupo = (a < mitad and b < mitad) or (a >= mitad and b >= mitad)
            if mismo_grupo:
                agregar_arista(grafo, a, b, azar.randint(2, 15))
    agregar_arista(grafo, mitad - 1, mitad, azar.randint(2, 15))
    return grafo


# ---------------------------------------------------------------------------
# Matrices (Lectura 5.1: Componentes conexas)
# ---------------------------------------------------------------------------
def matriz_adyacencia(grafo: dict) -> list:
    """Matriz de adyacencia: 1 si hay arista entre i y j, 0 si no."""
    n = grafo["n"]
    matriz = [[0] * n for _ in range(n)]
    for (a, b) in grafo["aristas"]:
        matriz[a][b] = 1
        matriz[b][a] = 1
    return matriz


def multiplicar_booleana(x: list, y: list) -> list:
    """Producto de matrices donde 1 + 1 = 1 (basta con que exista un camino)."""
    n = len(x)
    resultado = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            for k in range(n):
                if x[i][k] == 1 and y[k][j] == 1:
                    resultado[i][j] = 1
    return resultado


def matriz_caminos(grafo: dict) -> list:
    """Matriz de caminos: 1 si existe algún camino entre i y j.

    Paso 1 de la lectura: a la matriz de adyacencia se le pone 1 en la diagonal.
    Paso 2: se multiplica esa matriz por sí misma varias veces (potencias),
    así se van sumando los caminos de longitud 1, 2, 3...
    """
    n = grafo["n"]
    base = matriz_adyacencia(grafo)
    for i in range(n):
        base[i][i] = 1

    caminos = base
    for _ in range(n):
        caminos = multiplicar_booleana(caminos, base)
    return caminos


def orden_por_unos(caminos: list) -> list:
    """Pasos 3 y 4 de la lectura: orden de filas/columnas por cantidad de unos.

    Se ordena de mayor a menor cantidad de unos; si empatan, va primero la fila
    cuyo primer 1 está más cerca de la primera columna.
    """
    filas = []
    for i in range(len(caminos)):
        cantidad_unos = sum(caminos[i])
        primer_uno = caminos[i].index(1)
        filas.append((-cantidad_unos, primer_uno, i))
    filas.sort()
    return [fila[2] for fila in filas]


def componentes_conexas(caminos: list) -> list:
    """Lista de componentes; cada una es la lista de vértices que se pueden alcanzar entre sí."""
    componentes = []
    vistos = []
    for i in range(len(caminos)):
        if i not in vistos:
            grupo = [j for j in range(len(caminos)) if caminos[i][j] == 1]
            componentes.append(grupo)
            vistos = vistos + grupo
    return componentes


def grados(grafo: dict) -> list:
    """Cantidad de aristas que tiene cada vértice."""
    return [sum(fila) for fila in matriz_adyacencia(grafo)]


# ---------------------------------------------------------------------------
# Validación: ¿existe un ciclo hamiltoniano? ¿qué aristas faltan?
# ---------------------------------------------------------------------------
def buscar_aristas_faltantes(grafo: dict, max_alternativas: int = 5):
    """Averigua cuántas aristas faltan (como mínimo) para tener un ciclo hamiltoniano.

    Se prueban todos los ciclos posibles del grafo COMPLETO. En cada uno se
    cuentan las aristas que el grafo actual no tiene. El ciclo al que le faltan
    menos aristas indica cuáles hay que agregar.

    Devuelve (minimo, alternativas):
        minimo       -> cantidad mínima de aristas faltantes (0 si ya hay ciclo).
        alternativas -> lista de opciones; cada opción es una lista de aristas (a, b).
    """
    n = grafo["n"]
    existe = matriz_adyacencia(grafo)
    minimo = n + 1
    alternativas = []

    for perm in itertools.permutations(range(1, n)):
        if perm[0] > perm[-1]:
            continue  # es el mismo ciclo recorrido al revés

        ruta = (0,) + perm + (0,)
        faltan = []
        for i in range(n):
            a, b = ruta[i], ruta[i + 1]
            if existe[a][b] == 0:
                faltan.append((min(a, b), max(a, b)))
        faltan.sort()

        if len(faltan) < minimo:
            minimo = len(faltan)
            alternativas = [faltan]
        elif len(faltan) == minimo and faltan not in alternativas:
            if len(alternativas) < max_alternativas:
                alternativas.append(faltan)
    return minimo, alternativas
