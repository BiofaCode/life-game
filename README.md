# Life Game

Dashboard RPG (Next.js App Router + Tailwind) branché sur Notion, installable en PWA.

## Démarrer
1. `cp .env.example .env.local` puis renseigne `NOTION_API_KEY`.
2. Partage les 4 bases avec ton intégration Notion (… > Connexions).
3. `npm install && npm run dev`

La formule de niveau et les IDs des bases sont dans `lib/config.ts`.
Icônes PWA : `npm run icons`.

## Vercel
Ajoute `NOTION_API_KEY` et `APP_PASSWORD` dans les variables d'environnement.
L'app demandera ce mot de passe une fois par appareil (cookie valable 1 an).
