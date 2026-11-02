from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

RACINE = Path(__file__).resolve().parent.parent

DEFAUTS: dict[str, Any] = {
    "profil": {},
    "preferences": {
        "pays_residence": "CH",
        "valeur_min": 0,
        "taux_eur_chf": 0.94,
        "accepter_achat_obligatoire": False,
        "accepter_sms_payant": False,
        "exclure_mots": [],
    },
    "ia": {
        "activer": True,
        "modele": "claude-opus-5-5",
        "effort": "low",
        "max_caracteres_page": 40000,
    },
    "navigateur": {"dossier_profil": "donnees/navigateur", "chemin_chromium": ""},
    "tableau": {"port": 8765},
}


def _fusion(base: dict, ajout: dict) -> dict:
    resultat = dict(base)
    for cle, valeur in (ajout or {}).items():
        if isinstance(valeur, dict) and isinstance(resultat.get(cle), dict):
            resultat[cle] = _fusion(resultat[cle], valeur)
        else:
            resultat[cle] = valeur
    return resultat


@dataclass
class Config:
    donnees: dict[str, Any]
    racine: Path

    @property
    def profil(self) -> dict[str, str]:
        return {k: str(v or "") for k, v in self.donnees["profil"].items()}

    @property
    def preferences(self) -> dict[str, Any]:
        return self.donnees["preferences"]

    @property
    def ia(self) -> dict[str, Any]:
        return self.donnees["ia"]

    @property
    def navigateur(self) -> dict[str, Any]:
        return self.donnees["navigateur"]

    @property
    def tableau(self) -> dict[str, Any]:
        return self.donnees["tableau"]

    def chemin(self, relatif: str) -> Path:
        p = Path(relatif)
        return p if p.is_absolute() else self.racine / p

    @property
    def chemin_base(self) -> Path:
        return self.racine / "donnees" / "concours.db"


def charger_config(racine: Path | None = None) -> Config:
    racine = racine or RACINE
    fichier = racine / "config.yaml"
    contenu: dict = {}
    if fichier.exists():
        contenu = yaml.safe_load(fichier.read_text(encoding="utf-8")) or {}
    return Config(_fusion(DEFAUTS, contenu), racine)


def charger_sources(racine: Path | None = None) -> list[dict[str, Any]]:
    fichier = (racine or RACINE) / "sources.yaml"
    if not fichier.exists():
        return []
    contenu = yaml.safe_load(fichier.read_text(encoding="utf-8")) or {}
    return list(contenu.get("sources") or [])
