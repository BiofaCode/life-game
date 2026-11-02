"""Ligne de commande : python -m concours <commande>."""
from __future__ import annotations

import argparse
import sys
import webbrowser

from .config import charger_config, charger_sources
from .db import Base
from .pipeline import ajouter_url, analyser_nouveaux, veille
from .sources import collecter


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="python -m concours",
                                description="Agent de veille aux jeux concours (semi-automatique).")
    sous = p.add_subparsers(dest="commande", required=True)

    sous.add_parser("veille", help="Chercher les nouveaux concours dans les sources")
    a = sous.add_parser("analyser", help="Trier les concours pas encore analysés")
    a.add_argument("--sans-ia", action="store_true", help="Règles simples uniquement, sans API")
    q = sous.add_parser("quotidien", help="veille + analyser (à planifier chaque matin)")
    q.add_argument("--sans-ia", action="store_true")
    l = sous.add_parser("liste", help="Afficher les concours à faire")
    l.add_argument("--tous", action="store_true", help="Tous les statuts")
    aj = sous.add_parser("ajouter", help="Ajouter un concours vu ailleurs (Instagram…)")
    aj.add_argument("url")
    aj.add_argument("--titre", default="")
    pa = sous.add_parser("participer", help="Ouvrir le concours avec le formulaire pré-rempli")
    pa.add_argument("id")
    pa.add_argument("--sans-question", action="store_true", help=argparse.SUPPRESS)
    st = sous.add_parser("statut", help="Changer le statut (participe, ignore, gagne…)")
    st.add_argument("id")
    st.add_argument("statut")
    st.add_argument("--note", default="")
    t = sous.add_parser("tableau", help="Ouvrir le tableau de bord dans le navigateur")
    t.add_argument("--port", type=int)
    t.add_argument("--sans-navigateur", action="store_true")
    ts = sous.add_parser("tester-source", help="Tester une source de sources.yaml")
    ts.add_argument("nom")

    args = p.parse_args(argv)
    config = charger_config()
    base = Base(config.chemin_base)

    if args.commande == "veille":
        print(f"{veille(config, base)} nouveau(x) concours.")
    elif args.commande == "analyser":
        analyser_nouveaux(config, base, forcer_regles=args.sans_ia)
    elif args.commande == "quotidien":
        print("Veille…")
        veille(config, base)
        print("Analyse…")
        analyser_nouveaux(config, base, forcer_regles=args.sans_ia)
        expires = base.marquer_expires()
        stats = base.statistiques()
        print(f"\n{stats['a_faire']} concours à faire ({expires} terminé(s) retiré(s)).")
        print("Ouvre le tableau : python -m concours tableau")
    elif args.commande == "liste":
        base.marquer_expires()
        for c in base.lister(None if args.tous else ("a_faire", "nouveau")):
            fin = f"fin {c.date_fin}" if c.date_fin else "fin ?"
            valeur = f"{c.valeur_chf:.0f} CHF" if c.valeur_chf is not None else "valeur ?"
            print(f"{c.id}  [{c.priorite:>3}]  {c.statut:<9} {valeur:>10}  {fin:<14} {c.titre[:60]}")
    elif args.commande == "ajouter":
        c = ajouter_url(args.url, config, base, titre=args.titre)
        print(f"{c.id} → {c.statut} {('(' + c.raison_ignore + ')') if c.raison_ignore else ''}")
    elif args.commande == "participer":
        return participer(args.id, config, base, demander=not args.sans_question)
    elif args.commande == "statut":
        c = base.changer_statut(args.id, args.statut, args.note)
        print(f"{c.id} → {c.statut}")
    elif args.commande == "tableau":
        from .tableau import creer_serveur

        serveur = creer_serveur(config, base, args.port)
        adresse = f"http://127.0.0.1:{serveur.server_address[1]}"
        print(f"Tableau de bord : {adresse}  (Ctrl+C pour arrêter)")
        if not args.sans_navigateur:
            webbrowser.open(adresse)
        try:
            serveur.serve_forever()
        except KeyboardInterrupt:
            pass
    elif args.commande == "tester-source":
        source = next((s for s in charger_sources(config.racine) if s.get("nom") == args.nom), None)
        if not source:
            print(f"Source « {args.nom} » absente de sources.yaml", file=sys.stderr)
            return 1
        trouves = collecter(source)
        print(f"{len(trouves)} concours trouvés :")
        for c in trouves[:10]:
            print(f"  - {c.titre[:70]}\n    {c.url}")
    return 0


def participer(id_: str, config, base: Base, demander: bool = True) -> int:
    from .preremplir import ouvrir_et_preremplir

    c = base.obtenir(id_)
    if not c:
        print(f"Aucun concours {id_}", file=sys.stderr)
        return 1
    profil = config.profil
    if not profil.get("email"):
        print("Remplis d'abord ton profil dans config.yaml (copie config.example.yaml).", file=sys.stderr)
        return 1
    print(f"Ouverture : {c.titre}\n{c.url}")
    for i, etape in enumerate(c.etapes, 1):
        print(f"  {i}. {etape}")
    faits = ouvrir_et_preremplir(c.url, profil, config.chemin(config.navigateur["dossier_profil"]),
                                 config.navigateur.get("chemin_chromium") or "")
    print(f"{len(faits)} champ(s) pré-rempli(s).")
    if demander:
        reponse = input("As-tu envoyé ta participation ? [o/N] ").strip().lower()
        if reponse in ("o", "oui", "y"):
            base.changer_statut(c.id, "participe")
            print("Noté comme participé.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
