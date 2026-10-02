"""Problema del Agente Viajero (TSP) por fuerza bruta — programa principal.

Se ejecuta con:   python -m streamlit run app.py

La pantalla tiene 4 pasos (se eligen arriba); cada uno está en su propio archivo:
    1. Grafo        -> modules/paso_1_grafo.py
    2. Validación   -> modules/paso_2_validacion.py
    3. Paso a paso  -> modules/paso_3_fuerza_bruta.py
    4. Resultados   -> modules/paso_4_resultados.py
"""

import streamlit as st

from modules import graph_manager as gm
from modules import paso_1_grafo, paso_2_validacion, paso_3_fuerza_bruta, paso_4_resultados

UNIDADES = {"Distancia (km)": "km", 
            "Costo (USD)": "USD", 
            "Tiempo (h)": "h"}

ss = st.session_state  # aquí se guardan los datos entre clic y clic

st.set_page_config(page_title="TSP por fuerza bruta", layout="wide")
st.title("Problema del Agente Viajero por fuerza bruta",text_alignment="center")

# barra lateral: datos generales
n = st.sidebar.number_input("Número de nodos n (entre 5 y 10)", min_value=5, max_value=10, value=6, step=1)
modo = st.sidebar.radio("Cómo crear el grafo", ["Manual", "Aleatorio"])
unidad = UNIDADES[st.sidebar.selectbox("Los pesos representan...", list(UNIDADES))]
# si cambia n, se empieza con un grafo nuevo
if "grafo" not in ss or ss.grafo["n"] != n:
    ss.grafo = gm.grafo_vacio(int(n))
    ss.posicion = 0
    ss.firma_resultados = None
grafo = ss.grafo

# elegir el paso y mostrarlo
paso = st.radio("Paso", ["1. Grafo", "2. Validación", "3. Paso a paso", "4. Resultados"], horizontal=True)
if paso == "1. Grafo":
    paso_1_grafo.paso_1(grafo, modo, unidad)
elif paso == "2. Validación":
    paso_2_validacion.paso_2(grafo, unidad)
elif paso == "3. Paso a paso":
    paso_3_fuerza_bruta.paso_3(grafo, unidad)
else:
    paso_4_resultados.paso_4(grafo, unidad)

