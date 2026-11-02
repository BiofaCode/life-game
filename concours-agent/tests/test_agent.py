from __future__ import annotations

import json
import os
import threading
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path
from types import SimpleNamespace

import pytest

from concours.analyse import (
    AnalyseConcours,
    AnalyseurIA,
    analyser_regles,
    trouver_date_fin,
    trouver_pays,
    trouver_valeur_chf,
)
from concours.config import DEFAUTS, Config
from concours.db import Base
from concours.modeles import Concours, identifiant
from concours.sources import collecter

FIXTURES = Path(__file__).parent / "fixtures"
AUJOURDHUI = date(2026, 11, 2)
PREFS = DEFAUTS["preferences"]


# --- Sources -------------------------------------------------------------------
def test_flux_rss():
    trouves = collecter({"nom": "test", "type": "rss", "url": "x"},
                        (FIXTURES / "flux.xml").read_text(encoding="utf-8"))
    assert [c.titre[:12] for c in trouves] == ["Gagne un wee", "Concours : u", "FÉLICITATION"]
    assert "résidant en Suisse" in trouves[0].description
    assert "<p>" not in trouves[0].description


def test_page_liste_html():
    source = {"nom": "liste", "type": "html", "url": "https://site.ch/concours/",
              "selecteur_item": "article.jeu", "selecteur_titre": "h2", "selecteur_lien": "a",
              "selecteur_description": "p"}
    trouves = collecter(source, (FIXTURES / "page_liste.html").read_text(encoding="utf-8"))
    assert [(c.titre, c.url) for c in trouves] == [
        ("Un vélo à gagner", "https://site.ch/concours/velo"),
        ("Bons d'achat 200 CHF", "https://autre.ch/bons"),
    ]


def test_identifiant_ignore_parametres_de_suivi():
    assert identifiant("https://a.ch/x?utm_source=rss") == identifiant("https://a.ch/x/")


# --- Analyse par règles ----------------------------------------------------------
def test_extraction_dates_valeurs_pays():
    assert trouver_date_fin("Participation jusqu'au 15 décembre 2026.") == "2026-12-15"
    assert trouver_date_fin("Inscrivez-vous avant le 30/11/2026") == "2026-11-30"
    assert trouver_date_fin("Rien ici") is None
    assert trouver_valeur_chf("d'une valeur de CHF 1'200", 0.94) == 1200
    assert trouver_valeur_chf("une trottinette (499 €)", 0.94) == pytest.approx(469.06)
    assert trouver_pays("Ouvert aux personnes résidant en Suisse.") == ["CH"]
    assert trouver_pays("Jeu réservé aux résidents de France métropolitaine.") == ["FR"]
    assert trouver_pays("Concours ouvert dans le monde entier") == ["*"]


def _flux():
    return collecter({"nom": "test", "type": "rss", "url": "x"},
                     (FIXTURES / "flux.xml").read_text(encoding="utf-8"))


def test_tri_par_regles():
    suisse, france, arnaque = (analyser_regles(c, PREFS, aujourdhui=AUJOURDHUI) for c in _flux())

    assert suisse.statut == "a_faire"
    assert suisse.eligible is True
    assert suisse.type_participation == "formulaire"
    assert not suisse.achat_obligatoire
    assert suisse.date_fin == "2026-12-15"
    assert suisse.priorite > 0

    assert france.statut == "ignore"
    assert "pas ouvert en CH" in france.raison_ignore

    assert arnaque.statut == "ignore"
    assert len(arnaque.signaux_arnaque) >= 3
    assert "fiabilité trop basse" in arnaque.raison_ignore


def test_concours_termine_et_mot_exclu():
    c = Concours(url="https://a.ch/1", titre="Gagne 100 CHF au casino",
                 description="Ouvert aux résidents en Suisse, jusqu'au 01/10/2026")
    c = analyser_regles(c, {**PREFS, "exclure_mots": ["casino"]}, aujourdhui=AUJOURDHUI)
    assert c.statut == "expire"
    c2 = analyser_regles(Concours(url="https://a.ch/2", titre="Gagne 100 CHF au casino",
                                  description="Ouvert aux résidents en Suisse"),
                         {**PREFS, "exclure_mots": ["casino"]}, aujourdhui=AUJOURDHUI)
    assert c2.statut == "ignore" and "casino" in c2.raison_ignore


# --- Analyse par Claude (client simulé, aucun appel réseau) -------------------------
class FauxMessages:
    def __init__(self, sortie, stop_reason="end_turn"):
        self.sortie, self.stop_reason, self.appels = sortie, stop_reason, []

    def parse(self, **kwargs):
        self.appels.append(kwargs)
        return SimpleNamespace(stop_reason=self.stop_reason, parsed_output=self.sortie)


def _faux_client(sortie, stop_reason="end_turn"):
    messages = FauxMessages(sortie, stop_reason)
    return SimpleNamespace(beta=SimpleNamespace(messages=messages)), messages


def test_analyse_ia_remplit_le_concours():
    sortie = AnalyseConcours(
        est_un_concours=True, lot="Week-end à Zermatt", valeur_chf=1200, date_fin="2026-12-15",
        pays_eligibles=["ch"], type_participation="formulaire", achat_obligatoire=False,
        sms_payant=False, etapes=["Remplir le formulaire", "Cocher le règlement"],
        signaux_arnaque=[], score_fiabilite=85, resume="Un week-end pour deux, jusqu'au 15 décembre.")
    client, messages = _faux_client(sortie)
    c = AnalyseurIA(DEFAUTS["ia"], client=client).analyser(
        Concours(url="https://exemple.ch/zermatt", titre="Zermatt"), PREFS, "texte", AUJOURDHUI)

    assert c.statut == "a_faire" and c.analyse_par == "ia"
    assert c.pays_eligibles == ["CH"] and c.lot == "Week-end à Zermatt"
    appel = messages.appels[0]
    assert appel["model"] == "claude-opus-5-5"
    assert appel["output_format"] is AnalyseConcours
    assert appel["fallbacks"] == "default"
    assert "<page>\ntexte\n</page>" in appel["messages"][0]["content"]


def test_analyse_ia_refus_retombe_sur_les_regles():
    client, _ = _faux_client(None, stop_reason="refusal")
    c = AnalyseurIA(DEFAUTS["ia"], client=client).analyser(
        Concours(url="https://a.ch/r", titre="Test", description="Ouvert aux résidents en Suisse"),
        PREFS, "", AUJOURDHUI)
    assert c.analyse_par == "regles"


# --- Base et tableau de bord -------------------------------------------------------
@pytest.fixture
def base(tmp_path):
    b = Base(tmp_path / "c.db")
    for c in _flux():
        b.enregistrer(analyser_regles(c, PREFS, aujourdhui=AUJOURDHUI))
    return b


def test_base_sans_doublon_et_statuts(base):
    assert base.ajouter(_flux()[0]) is False
    suisse = base.lister(("a_faire",))[0]
    base.changer_statut(suisse.id, "participe")
    assert base.obtenir(suisse.id).participe_le
    with pytest.raises(ValueError):
        base.changer_statut(suisse.id, "nimporte")
    assert base.statistiques()["participe"] == 1


def test_tableau_api(base, tmp_path):
    from concours.tableau import creer_serveur

    serveur = creer_serveur(Config(DEFAUTS, tmp_path), base, port=0)
    threading.Thread(target=serveur.serve_forever, daemon=True).start()
    adresse = f"http://127.0.0.1:{serveur.server_address[1]}"
    try:
        page = urllib.request.urlopen(adresse + "/").read().decode()
        assert "Mes concours" in page
        donnees = json.load(urllib.request.urlopen(adresse + "/api/concours?statut=a_faire"))
        assert len(donnees["concours"]) == 1
        id_ = donnees["concours"][0]["id"]

        sans_entete = urllib.request.Request(f"{adresse}/api/concours/{id_}/statut",
                                             data=b'{"statut":"ignore"}', method="POST")
        with pytest.raises(urllib.error.HTTPError) as erreur:
            urllib.request.urlopen(sans_entete)
        assert erreur.value.code == 403

        ok = urllib.request.Request(f"{adresse}/api/concours/{id_}/statut", data=b'{"statut":"gagne"}',
                                    method="POST", headers={"X-Concours-Agent": "1"})
        assert json.load(urllib.request.urlopen(ok))["statut"] == "gagne"
    finally:
        serveur.shutdown()


# --- Pré-remplissage dans un vrai navigateur ------------------------------------------
PROFIL = {"civilite": "Mme", "prenom": "Léa", "nom": "Dubois", "email": "lea.concours@exemple.ch",
          "telephone": "+41 79 123 45 67", "date_naissance": "05/03/1992", "adresse": "Rue du Lac 4",
          "npa": "2000", "ville": "Neuchâtel", "pays": "Suisse"}


def test_preremplissage_formulaire():
    playwright = pytest.importorskip("playwright.sync_api")
    from concours.preremplir import remplir_page

    options = {}
    if os.environ.get("CHROMIUM_PATH"):
        options["executable_path"] = os.environ["CHROMIUM_PATH"]
    with playwright.sync_playwright() as p:
        navigateur = p.chromium.launch(**options)
        page = navigateur.new_page()
        page.goto((FIXTURES / "formulaire.html").as_uri())
        faits = remplir_page(page, PROFIL)
        valeur = lambda sel: page.locator(sel).input_value()

        assert valeur("#p") == "Léa"
        assert valeur("#n") == "Dubois"
        assert valeur("[name=champ_3]") == "lea.concours@exemple.ch"
        assert valeur("[name=tel]") == "+41 79 123 45 67"
        assert valeur("#dn") == "1992-03-05"
        assert valeur("#rue") == "Rue du Lac 4"
        assert valeur("#cp") == "2000"
        assert valeur("#v") == "Neuchâtel"
        assert valeur("#civ") == "mme"
        assert page.locator("#pays").evaluate("el => el.options[el.selectedIndex].text") == "Suisse"
        # Jamais touchés : cases à cocher, champs cachés, question libre, envoi.
        assert not page.locator("[name=reglement]").is_checked()
        assert not page.locator("[name=newsletter]").is_checked()
        assert valeur("[name=token]") == "abc"
        assert valeur("[name=cache]") == ""
        assert valeur("#q") == ""
        assert page.evaluate("window.__envoye === undefined")
        assert len(faits) == 10
        navigateur.close()
