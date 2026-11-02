"""Pré-remplissage des formulaires de concours.

Règles de sécurité, volontairement non configurables :
- le bouton d'envoi n'est JAMAIS cliqué : c'est toi qui valides ;
- aucune case n'est cochée (règlement, newsletter, partenaires) : ton consentement
  doit rester un geste de ta part ;
- les mots de passe et fichiers ne sont jamais touchés.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any

# Ordre important : la première règle qui correspond gagne.
REGLES: list[tuple[str, str]] = [
    ("email", r"e-?mail|courriel|mail\b"),
    ("telephone", r"telephone|phone|mobile|portable|natel|\btel\b|handy"),
    ("date_naissance", r"naissance|birth|bday|geburt|\bdob\b"),
    ("civilite", r"civilite|salutation|anrede|\btitre\b|\btitle\b"),
    ("nom_complet", r"full.?name|nom complet|nom et prenom|prenom et nom|^name$|votre nom$"),
    ("prenom", r"prenom|first.?name|given.?name|vorname|\bfname\b"),
    ("nom", r"\bnom\b|last.?name|family.?name|surname|nachname|\blname\b"),
    ("npa", r"\bnpa\b|code.?postal|postal|\bzip\b|\bplz\b|postcode"),
    ("ville", r"ville|city|localite|\bort\b|town|wohnort"),
    ("pays", r"\bpays\b|country|\bland\b"),
    ("adresse", r"adresse|address|\brue\b|street|strasse"),
]
TYPES_IGNORES = {"submit", "button", "reset", "checkbox", "radio", "file", "password",
                 "hidden", "image", "range", "color", "search"}

_JS_CHAMPS = """
() => {
  const norm = s => (s || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
                     .toLowerCase().replace(/[_\\-]+/g, ' ').trim();
  const out = [];
  document.querySelectorAll('input, select, textarea').forEach((el, i) => {
    const style = window.getComputedStyle(el);
    const visible = el.offsetParent !== null && style.visibility !== 'hidden' && style.display !== 'none';
    let label = '';
    if (el.id) {
      const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l) label = l.innerText;
    }
    if (!label && el.closest('label')) label = el.closest('label').innerText;
    el.setAttribute('data-ca-idx', String(i));
    out.push({
      idx: i,
      balise: el.tagName.toLowerCase(),
      type: (el.getAttribute('type') || '').toLowerCase(),
      visible, desactive: el.disabled || el.readOnly,
      deja_rempli: el.tagName !== 'SELECT' && !!el.value,
      nom: norm(el.name), ident: norm(el.id), autocomplete: norm(el.autocomplete),
      descripteur: norm([el.name, el.id, el.placeholder, el.getAttribute('aria-label'),
                         el.autocomplete, label].join(' | ')),
      options: el.tagName === 'SELECT' ? Array.from(el.options).map(o => norm(o.text)) : [],
    });
  });
  return out;
}
"""

_AUTOCOMPLETE = {
    "email": "email", "tel": "telephone", "given name": "prenom", "family name": "nom",
    "name": "nom_complet", "postal code": "npa", "address level2": "ville",
    "country name": "pays", "country": "pays", "street address": "adresse",
    "address line1": "adresse", "bday": "date_naissance", "honorific prefix": "civilite",
}


def _normaliser(s: str) -> str:
    import unicodedata

    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower().strip()


def cle_pour_champ(champ: dict[str, Any]) -> str | None:
    """Devine quelle donnée du profil va dans ce champ."""
    if champ["type"] in TYPES_IGNORES or not champ["visible"] or champ["desactive"]:
        return None
    if champ["autocomplete"] in _AUTOCOMPLETE:
        return _AUTOCOMPLETE[champ["autocomplete"]]
    if champ["type"] == "email":
        return "email"
    if champ["type"] == "tel":
        return "telephone"
    # Le nom technique (name / id) est plus fiable que le texte autour.
    for source in (f"{champ['nom']} {champ['ident']}".strip(), champ["descripteur"]):
        for cle, motif in REGLES:
            if re.search(motif, source):
                return cle
    return None


def valeur_pour(cle: str, profil: dict[str, str], type_champ: str) -> str:
    if cle == "nom_complet":
        return f"{profil.get('prenom', '')} {profil.get('nom', '')}".strip()
    valeur = profil.get(cle, "")
    if cle == "date_naissance" and type_champ == "date" and valeur:
        m = re.match(r"(\d{1,2})[./-](\d{1,2})[./-](\d{4})", valeur)
        if m:
            j, mo, a = m.groups()
            return f"{a}-{int(mo):02d}-{int(j):02d}"
    return valeur


def remplir_page(page: Any, profil: dict[str, str]) -> list[dict[str, str]]:
    """Remplit les champs reconnus dans la page et ses iframes. Renvoie ce qui a été fait."""
    faits: list[dict[str, str]] = []
    for cadre in page.frames:
        try:
            champs = cadre.evaluate(_JS_CHAMPS)
        except Exception:  # iframe d'un autre domaine qui refuse le script, ou en chargement
            continue
        for champ in champs:
            if champ["deja_rempli"]:
                continue
            cle = cle_pour_champ(champ)
            if not cle:
                continue
            valeur = valeur_pour(cle, profil, champ["type"])
            if not valeur:
                continue
            cible = cadre.locator(f'[data-ca-idx="{champ["idx"]}"]')
            try:
                if champ["balise"] == "select":
                    voulu = _normaliser(valeur)
                    choix = next((i for i, o in enumerate(champ["options"])
                                  if o and (o == voulu or voulu in o or o in voulu)), None)
                    if choix is None:
                        continue
                    cible.select_option(index=choix)
                else:
                    cible.fill(valeur)
                cible.evaluate("el => { el.style.outline = '3px solid #f5b400';"
                               " el.style.outlineOffset = '1px'; }")
                faits.append({"champ": champ["nom"] or champ["ident"] or champ["descripteur"][:40],
                              "donnee": cle})
            except Exception:
                continue
    return faits


_BANDEAU = """
(nb) => {
  const d = document.createElement('div');
  d.setAttribute('data-concours-agent', '');
  d.style.cssText = 'position:fixed;z-index:2147483647;left:12px;right:12px;bottom:12px;'
    + 'padding:12px 16px;border-radius:10px;background:#1f2a24;color:#fff;'
    + 'font:15px/1.4 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.35)';
  d.textContent = `Agent concours : ${nb} champ(s) pré-rempli(s), encadrés en jaune. `
    + `Vérifie-les, coche toi-même le règlement, puis clique sur Envoyer. `
    + `Ferme cette fenêtre quand c'est fait.`;
  d.onclick = () => d.remove();
  document.body.appendChild(d);
}
"""


def ouvrir_et_preremplir(url: str, profil: dict[str, str], dossier_profil: Path,
                         chemin_chromium: str = "", headless: bool = False,
                         attendre_fermeture: bool = True) -> list[dict[str, str]]:
    """Ouvre la page dans un vrai navigateur, pré-remplit, puis laisse la main."""
    from playwright.sync_api import sync_playwright

    dossier_profil.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        options: dict[str, Any] = {"headless": headless, "viewport": None if not headless else {"width": 1280, "height": 900},
                                   "locale": "fr-CH"}
        if chemin_chromium:
            options["executable_path"] = chemin_chromium
        contexte = p.chromium.launch_persistent_context(str(dossier_profil), **options)
        page = contexte.pages[0] if contexte.pages else contexte.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=45000)
        try:
            page.wait_for_load_state("networkidle", timeout=8000)
        except Exception:
            pass  # pages avec trafic continu (pubs, chat) : on n'attend pas plus
        faits = remplir_page(page, profil)
        if not faits:  # formulaires chargés en retard (iframes, widgets)
            page.wait_for_timeout(3000)
            faits = remplir_page(page, profil)
        try:
            page.evaluate(_BANDEAU, len(faits))
        except Exception:
            pass
        if attendre_fermeture and not headless:
            page.wait_for_event("close", timeout=0)
        contexte.close()
    return faits
