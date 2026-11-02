"""Tableau de bord local : http://127.0.0.1:8765 (accessible seulement depuis ton ordinateur)."""
from __future__ import annotations

import json
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from .config import Config
from .db import Base
from .modeles import STATUTS
from .pipeline import ajouter_url

PAGE = (Path(__file__).parent / "tableau.html").read_text(encoding="utf-8")
ENTETE_SECURITE = "X-Concours-Agent"  # bloque les requêtes envoyées par d'autres sites


def creer_serveur(config: Config, base: Base, port: int | None = None) -> ThreadingHTTPServer:
    verrou = threading.Lock()

    class Gestionnaire(BaseHTTPRequestHandler):
        def log_message(self, *args):  # silence dans le terminal
            pass

        def _json(self, code: int, donnees) -> None:
            corps = json.dumps(donnees, ensure_ascii=False).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(corps)))
            self.end_headers()
            self.wfile.write(corps)

        def do_GET(self):
            url = urlparse(self.path)
            if url.path == "/":
                corps = PAGE.encode()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Security-Policy",
                                 "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'")
                self.send_header("Content-Length", str(len(corps)))
                self.end_headers()
                self.wfile.write(corps)
            elif url.path == "/api/concours":
                statut = parse_qs(url.query).get("statut", [""])[0]
                statuts = tuple(s for s in statut.split(",") if s in STATUTS) or None
                with verrou:
                    base.marquer_expires()
                    liste = [c.en_dict() for c in base.lister(statuts)]
                    stats = base.statistiques()
                self._json(200, {"concours": liste, "stats": stats})
            else:
                self._json(404, {"erreur": "introuvable"})

        def do_POST(self):
            if self.headers.get(ENTETE_SECURITE) != "1":
                return self._json(403, {"erreur": "requête refusée"})
            longueur = int(self.headers.get("Content-Length") or 0)
            try:
                donnees = json.loads(self.rfile.read(longueur) or b"{}")
            except json.JSONDecodeError:
                return self._json(400, {"erreur": "JSON invalide"})
            morceaux = urlparse(self.path).path.strip("/").split("/")
            try:
                if morceaux == ["api", "ajouter"]:
                    url = str(donnees.get("url", "")).strip()
                    if not url.startswith(("http://", "https://")):
                        return self._json(400, {"erreur": "Colle une adresse qui commence par https://"})
                    with verrou:
                        c = ajouter_url(url, config, base, titre=str(donnees.get("titre", "")))
                    return self._json(200, c.en_dict())
                if len(morceaux) == 4 and morceaux[:2] == ["api", "concours"]:
                    id_, action = morceaux[2], morceaux[3]
                    if action == "statut":
                        with verrou:
                            c = base.changer_statut(id_, str(donnees.get("statut")), str(donnees.get("note", "")))
                        return self._json(200, c.en_dict())
                    if action == "preremplir":
                        if not base.obtenir(id_):
                            return self._json(404, {"erreur": "concours inconnu"})
                        subprocess.Popen([sys.executable, "-m", "concours", "participer", id_, "--sans-question"],
                                         cwd=str(config.racine))
                        return self._json(200, {"ok": True})
            except (KeyError, ValueError) as e:
                return self._json(400, {"erreur": str(e)})
            self._json(404, {"erreur": "introuvable"})

    return ThreadingHTTPServer(("127.0.0.1", port or int(config.tableau.get("port", 8765))), Gestionnaire)
