from __future__ import annotations

import json
import sqlite3
from dataclasses import fields
from datetime import date, datetime
from pathlib import Path

from .modeles import STATUTS, Concours



class Base:
    """Stockage SQLite : un concours par URL, jamais en double."""

    def __init__(self, chemin: Path | str) -> None:
        chemin = Path(chemin)
        if str(chemin) != ":memory:":
            chemin.parent.mkdir(parents=True, exist_ok=True)
        self.cnx = sqlite3.connect(str(chemin), check_same_thread=False)
        self.cnx.row_factory = sqlite3.Row
        self.cnx.execute(
            "CREATE TABLE IF NOT EXISTS concours (id TEXT PRIMARY KEY, donnees TEXT NOT NULL,"
            " statut TEXT NOT NULL, priorite INTEGER NOT NULL DEFAULT 0, trouve_le TEXT NOT NULL)"
        )
        self.cnx.commit()

    # --- lecture -----------------------------------------------------------
    @staticmethod
    def _depuis_ligne(ligne: sqlite3.Row) -> Concours:
        brut = json.loads(ligne["donnees"])
        connus = {f.name for f in fields(Concours)}
        return Concours(**{k: v for k, v in brut.items() if k in connus})

    def obtenir(self, id_: str) -> Concours | None:
        ligne = self.cnx.execute("SELECT * FROM concours WHERE id = ?", (id_,)).fetchone()
        return self._depuis_ligne(ligne) if ligne else None

    def lister(self, statuts: tuple[str, ...] | None = None) -> list[Concours]:
        if statuts:
            marques = ",".join("?" * len(statuts))
            lignes = self.cnx.execute(
                f"SELECT * FROM concours WHERE statut IN ({marques})"
                " ORDER BY priorite DESC, trouve_le DESC",
                statuts,
            ).fetchall()
        else:
            lignes = self.cnx.execute(
                "SELECT * FROM concours ORDER BY priorite DESC, trouve_le DESC"
            ).fetchall()
        return [self._depuis_ligne(l) for l in lignes]

    # --- écriture ----------------------------------------------------------
    def ajouter(self, c: Concours) -> bool:
        """Ajoute un concours. Renvoie False s'il était déjà connu."""
        if self.obtenir(c.id):
            return False
        self.enregistrer(c)
        return True

    def enregistrer(self, c: Concours) -> None:
        self.cnx.execute(
            "INSERT INTO concours (id, donnees, statut, priorite, trouve_le) VALUES (?,?,?,?,?)"
            " ON CONFLICT(id) DO UPDATE SET donnees=excluded.donnees, statut=excluded.statut,"
            " priorite=excluded.priorite",
            (c.id, json.dumps(c.en_dict(), ensure_ascii=False), c.statut, c.priorite, c.trouve_le),
        )
        self.cnx.commit()

    def changer_statut(self, id_: str, statut: str, note: str = "") -> Concours:
        if statut not in STATUTS:
            raise ValueError(f"Statut inconnu : {statut}. Choix : {', '.join(STATUTS)}")
        c = self.obtenir(id_)
        if not c:
            raise KeyError(f"Aucun concours avec l'identifiant {id_}")
        c.statut = statut
        if statut == "participe":
            c.participe_le = datetime.now().isoformat(timespec="seconds")
        if note:
            c.note = note
        self.enregistrer(c)
        return c

    def marquer_expires(self, aujourdhui: date | None = None) -> int:
        aujourdhui = aujourdhui or date.today()
        n = 0
        for c in self.lister(("nouveau", "a_faire")):
            if c.date_fin and c.date_fin < aujourdhui.isoformat():
                c.statut = "expire"
                self.enregistrer(c)
                n += 1
        return n

    def statistiques(self) -> dict[str, int]:
        lignes = self.cnx.execute("SELECT statut, COUNT(*) n FROM concours GROUP BY statut")
        stats = {s: 0 for s in STATUTS}
        stats.update({l["statut"]: l["n"] for l in lignes})
        return stats
