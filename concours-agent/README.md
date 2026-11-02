# Agent concours (semi-automatique)

L'agent trouve les jeux concours, lit leur règlement, écarte les arnaques et ceux
auxquels tu n'as pas droit, puis te prépare une liste triée. Tu participes en un
clic : il ouvre le formulaire déjà rempli, tu vérifies, tu coches le règlement et
tu cliques sur **Envoyer**.

Ce qu'il ne fait **jamais** :

- cliquer sur « Envoyer » à ta place ;
- cocher une case (règlement, newsletter, partenaires) ;
- liker, commenter ou s'abonner sur les réseaux sociaux.

Ces règles protègent tes comptes (les réseaux bannissent les bots) et tes gains
(beaucoup de règlements excluent les participations automatisées).

## Installation (une seule fois)

Il faut Python 3.10 ou plus récent.

```bash
cd concours-agent
python3 -m venv .venv
source .venv/bin/activate          # Windows : .venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium

cp config.example.yaml config.yaml # puis remplis ton profil dedans
```

Pour l'analyse par l'IA, il faut une clé API Anthropic
(https://console.anthropic.com) :

```bash
export ANTHROPIC_API_KEY="sk-ant-..."   # Windows : setx ANTHROPIC_API_KEY "sk-ant-..."
```

Sans clé, l'agent trie quand même avec des règles simples (mots-clés), mais il est
moins précis.

## Utilisation au quotidien

```bash
python -m concours quotidien   # cherche les nouveaux concours et les trie
python -m concours tableau     # ouvre ton tableau de bord dans le navigateur
```

Dans le tableau :

| Bouton | Ce qui se passe |
|---|---|
| **Ouvrir et pré-remplir** | Un navigateur s'ouvre sur le concours. Les champs remplis sont encadrés en jaune. Tu vérifies, tu coches le règlement, tu envoies. |
| **Ouvrir le concours** | Pour les concours sur les réseaux sociaux : tu participes toi-même (like, commentaire…). |
| **J'ai participé** | Le concours passe dans « Participé ». |
| **J'ai gagné !** | Pour suivre tes gains. |
| **Ajouter** (en haut) | Colle le lien d'un concours vu sur Instagram ou ailleurs : l'agent l'analyse et l'ajoute. |

Le navigateur garde tes connexions (dossier `donnees/navigateur`). Tu ne te connectes
donc qu'une fois aux sites qui le demandent.

### Autres commandes

```bash
python -m concours liste                 # concours à faire, dans le terminal
python -m concours ajouter <lien>        # ajouter un concours à la main
python -m concours participer <id>       # pré-remplir depuis le terminal
python -m concours statut <id> gagne     # changer un statut
python -m concours tester-source <nom>   # vérifier qu'une source fonctionne
python -m concours analyser --sans-ia    # trier sans utiliser l'API
```

## Ajouter des sources

Les sources sont dans `sources.yaml`. Deux types :

- **rss** : le plus simple et le plus fiable. Beaucoup de sites de concours ont un
  flux à l'adresse `https://site/feed/`.
- **html** : une page qui liste des concours. Tu indiques quel bloc HTML correspond
  à un concours (`selecteur_item`), son titre et son lien.

Teste chaque nouvelle source avec `python -m concours tester-source <nom>`, puis
mets `actif: true`.

## Lancer la veille automatiquement chaque matin

**Mac / Linux** : `crontab -e` puis ajoute cette ligne (tous les jours à 7 h 15) :

```
15 7 * * * cd /chemin/vers/concours-agent && .venv/bin/python -m concours quotidien >> donnees/journal.txt 2>&1
```

**Windows** : Planificateur de tâches → Créer une tâche de base → Quotidienne →
Programme : `C:\chemin\concours-agent\.venv\Scripts\python.exe`, arguments :
`-m concours quotidien`, dossier de départ : `C:\chemin\concours-agent`.

## Réglages utiles (`config.yaml`)

- `preferences.pays_residence` : ton pays (les concours réservés à un autre pays sont écartés).
- `preferences.valeur_min` : ignorer les petits lots.
- `preferences.exclure_mots` : thèmes dont tu ne veux pas.
- `ia.modele` : `claude-opus-5-5` par défaut. Pour un coût plus bas sur de gros
  volumes, tu peux essayer `claude-haiku-5-5`.

## Conseils

- Utilise une **adresse e-mail dédiée** aux concours : tu recevras beaucoup de publicité.
- Un vrai gagnant n'a **jamais** à payer de frais ni à donner sa carte bancaire.
- Méfie-toi des messages « tu as gagné » envoyés par des comptes qui imitent une marque.

## Tests

```bash
pytest
```

## Comment c'est construit

```
concours/
  sources.py      lecture des flux RSS et des pages HTML
  analyse.py      tri par règles + analyse par Claude (sortie structurée)
  pipeline.py     enchaînement veille → analyse
  db.py           base SQLite (donnees/concours.db)
  preremplir.py   pré-remplissage du formulaire avec Playwright
  tableau.py      tableau de bord local (127.0.0.1 seulement)
  __main__.py     ligne de commande
```
