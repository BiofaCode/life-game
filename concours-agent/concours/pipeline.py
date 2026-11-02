"""Enchaînement veille → analyse, utilisé par la ligne de commande et le tableau."""
from __future__ import annotations

import os
from datetime import date
from typing import Any, Callable

from .analyse import AnalyseurIA, analyser_regles
from .config import Config, charger_sources
from .db import Base
from .modeles import Concours
from .sources import collecter, sources_actives, telecharger, texte_propre

Journal = Callable[[str], None]


def veille(config: Config, base: Base, journal: Journal = print) -> int:
    nouveaux = 0
    actives = sources_actives(charger_sources(config.racine))
    if not actives:
        journal("Aucune source active dans sources.yaml.")
    for source in actives:
        try:
            trouves = collecter(source)
        except Exception as e:  # une source cassée ne bloque pas les autres
            journal(f"  ✗ {source.get('nom')} : {e}")
            continue
        ajoutes = sum(base.ajouter(c) for c in trouves)
        nouveaux += ajoutes
        journal(f"  ✓ {source['nom']} : {len(trouves)} concours, {ajoutes} nouveaux")
    return nouveaux


def ia_disponible(config: Config) -> bool:
    if not config.ia.get("activer", True):
        return False
    return bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")
                or os.environ.get("ANTHROPIC_PROFILE")
                or os.path.isdir(os.path.expanduser("~/.config/anthropic")))


def analyser_un(c: Concours, config: Config, analyseur: AnalyseurIA | None,
                aujourdhui: date | None = None) -> Concours:
    try:
        texte_page = texte_propre(telecharger(c.url))
    except Exception:
        texte_page = ""  # page inaccessible : on analyse ce que la source a donné
    if analyseur is not None:
        try:
            return analyseur.analyser(c, config.preferences, texte_page, aujourdhui)
        except Exception as e:
            c.note = f"IA indisponible ({type(e).__name__}), tri par règles"
    return analyser_regles(c, config.preferences, texte_page, aujourdhui)


def analyser_nouveaux(config: Config, base: Base, journal: Journal = print,
                      forcer_regles: bool = False) -> int:
    analyseur = None
    if not forcer_regles and ia_disponible(config):
        analyseur = AnalyseurIA(config.ia)
    else:
        journal("  (analyse par règles simples : IA désactivée ou pas de clé API)")
    a_traiter = base.lister(("nouveau",))
    for i, c in enumerate(a_traiter, 1):
        c = analyser_un(c, config, analyseur)
        base.enregistrer(c)
        etat = "à faire" if c.statut == "a_faire" else f"{c.statut} ({c.raison_ignore})"
        journal(f"  [{i}/{len(a_traiter)}] {c.titre[:60]} → {etat}")
    return len(a_traiter)


def ajouter_url(url: str, config: Config, base: Base, titre: str = "",
                analyser: bool = True) -> Concours:
    c = Concours(url=url, titre=titre or url, source="manuel")
    existant = base.obtenir(c.id)
    if existant:
        return existant
    if analyser:
        analyseur = AnalyseurIA(config.ia) if ia_disponible(config) else None
        c = analyser_un(c, config, analyseur)
    base.enregistrer(c)
    return c


def resume_stats(base: Base) -> dict[str, Any]:
    return base.statistiques()
