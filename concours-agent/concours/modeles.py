from __future__ import annotations

import hashlib
from dataclasses import asdict, dataclass, field
from datetime import datetime

STATUTS = ("nouveau", "a_faire", "participe", "ignore", "expire", "gagne")
TYPES_PARTICIPATION = (
    "formulaire",
    "reseau_social",
    "email",
    "sms",
    "achat",
    "autre",
)


def identifiant(url: str) -> str:
    """Identifiant court et stable dérivé de l'URL (sans paramètres de suivi)."""
    propre = url.split("#")[0]
    for marqueur in ("?utm_", "&utm_"):
        if marqueur in propre:
            propre = propre.split(marqueur)[0]
    return hashlib.sha1(propre.strip().rstrip("/").lower().encode()).hexdigest()[:10]


@dataclass
class Concours:
    url: str
    titre: str
    source: str = "manuel"
    description: str = ""
    id: str = ""
    trouve_le: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))

    # Rempli par l'analyse
    date_fin: str | None = None          # AAAA-MM-JJ
    lot: str = ""
    valeur_chf: float | None = None
    pays_eligibles: list[str] = field(default_factory=list)  # codes, ou ["*"] = monde
    eligible: bool | None = None         # None = à vérifier
    type_participation: str = "autre"
    achat_obligatoire: bool = False
    sms_payant: bool = False
    signaux_arnaque: list[str] = field(default_factory=list)
    score_fiabilite: int = 50            # 0 à 100
    priorite: int = 0                    # 0 à 100, ordre du tableau
    resume: str = ""
    etapes: list[str] = field(default_factory=list)
    analyse_par: str = ""                # "regles" ou "ia"
    raison_ignore: str = ""

    # Suivi
    statut: str = "nouveau"
    participe_le: str | None = None
    note: str = ""

    def __post_init__(self) -> None:
        if not self.id:
            self.id = identifiant(self.url)

    def en_dict(self) -> dict:
        return asdict(self)
