"""Lecture des sources de concours : flux RSS/Atom et pages HTML."""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from typing import Any, Iterable
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from .modeles import Concours

ENTETES = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/126.0 Safari/537.36 concours-agent/0.1"
    ),
    "Accept-Language": "fr-CH,fr;q=0.9,de;q=0.6,en;q=0.5",
}
DELAI = 20


def telecharger(url: str) -> str:
    reponse = requests.get(url, headers=ENTETES, timeout=DELAI)
    reponse.raise_for_status()
    reponse.encoding = reponse.encoding or reponse.apparent_encoding
    return reponse.text


def texte_propre(html: str) -> str:
    """Texte lisible d'une page HTML (sans scripts, menus ni pieds de page)."""
    soupe = BeautifulSoup(html, "lxml")
    for balise in soupe(["script", "style", "noscript", "svg", "nav", "footer", "header", "form"]):
        balise.decompose()
    texte = soupe.get_text("\n")
    return re.sub(r"\n\s*\n+", "\n\n", texte).strip()


# --- RSS / Atom -------------------------------------------------------------
def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def lire_flux(xml: str, nom_source: str) -> list[Concours]:
    racine = ET.fromstring(xml.encode() if isinstance(xml, str) else xml)
    resultats: list[Concours] = []
    for element in racine.iter():
        if _local(element.tag) not in ("item", "entry"):
            continue
        titre = lien = description = ""
        for enfant in element:
            nom = _local(enfant.tag)
            if nom == "title":
                titre = (enfant.text or "").strip()
            elif nom == "link":
                lien = (enfant.get("href") or enfant.text or "").strip() or lien
            elif nom in ("description", "summary", "content", "encoded") and not description:
                description = texte_propre(enfant.text or "")
        if titre and lien:
            resultats.append(
                Concours(url=lien, titre=titre, source=nom_source, description=description[:2000])
            )
    return resultats


# --- Page HTML --------------------------------------------------------------
def lire_page_liste(html: str, source: dict[str, Any]) -> list[Concours]:
    soupe = BeautifulSoup(html, "lxml")
    resultats: list[Concours] = []
    for bloc in soupe.select(source.get("selecteur_item", "article")):
        lien_el = bloc.select_one(source.get("selecteur_lien", "a"))
        if lien_el is None and bloc.name == "a":
            lien_el = bloc
        if lien_el is None or not lien_el.get("href"):
            continue
        titre_el = bloc.select_one(source["selecteur_titre"]) if source.get("selecteur_titre") else None
        titre = (titre_el or lien_el).get_text(" ", strip=True)
        description = ""
        if source.get("selecteur_description"):
            desc_el = bloc.select_one(source["selecteur_description"])
            description = desc_el.get_text(" ", strip=True) if desc_el else ""
        if titre:
            resultats.append(
                Concours(
                    url=urljoin(source["url"], lien_el["href"]),
                    titre=titre,
                    source=source["nom"],
                    description=description[:2000],
                )
            )
    return resultats


# --- Point d'entrée ---------------------------------------------------------
def collecter(source: dict[str, Any], contenu: str | None = None) -> list[Concours]:
    """Lit une source. `contenu` permet de fournir le texte déjà téléchargé (tests)."""
    contenu = contenu if contenu is not None else telecharger(source["url"])
    if source.get("type") == "rss":
        return lire_flux(contenu, source["nom"])
    if source.get("type") == "html":
        return lire_page_liste(contenu, source)
    raise ValueError(f"Type de source inconnu : {source.get('type')!r} ({source.get('nom')})")


def sources_actives(sources: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    return [s for s in sources if s.get("actif", True)]
