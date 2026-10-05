"""Datos que comparten los pasos de la pantalla."""

import streamlit as st

from modules import graph_manager as gm

ss = st.session_state  # aquí se guardan los datos entre clic y clic


def firma(grafo: dict) -> str:
    """Texto que identifica al grafo; si cambia, hay que recalcular."""
    return str(sorted(grafo["aristas"].items()))


def obtener_validacion(grafo: dict):
    """Devuelve (minimo, alternativas) de aristas faltantes; solo recalcula si el grafo cambió."""
    if ss.get("firma_validacion") != firma(grafo):
        ss.validacion = gm.buscar_aristas_faltantes(grafo)
        ss.firma_validacion = firma(grafo)
    return ss.validacion
