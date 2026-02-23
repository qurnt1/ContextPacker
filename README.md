# ContextPacker v3.0

Compilez un projet complet en un prompt unique, optimise pour les fenetres de contexte IA.

![Accueil](./assets/accueil.png)

## Live demo

[ContextPacker en ligne](https://qurnt1.github.io/ContextPacker/)  
Navigateur Chromium recommande (File System Access API pour la source locale).

## Nouveautes v3

- Choix de la source des l accueil: `Dossier local` ou `Repository GitHub`.
- Import GitHub public via URL (`https://github.com/owner/repo` ou `owner/repo`).
- Option sous-dossier GitHub pour scanner uniquement une zone du repo.
- Historique des repos GitHub recents (memorise en local).
- Cache de scan GitHub en session (re-open plus rapide du meme repo/ref).
- Token GitHub optionnel dans les parametres pour limiter les erreurs de rate-limit.

## Fonctionnalites cle

- Stitcher intelligent: fusion des fichiers selectionnes en un seul contexte.
- Tiktoken `o200k_base` (fallback `cl100k_base`).
- Minification (JS/TS/CSS/HTML/JSON/Python/...).
- Filtres `.gitignore` et patterns communs.
- Exclusion automatique des fichiers binaires.
- Dashboard temps reel: tokens, lignes, volume, progression.
- Export: copier clipboard ou telecharger `.txt`.

## Format de sortie

```text
[CONTEXTPACKER - PROJET: mon-projet] | TOKENS: 12450 | MINIFICATION: NON

[STRUCTURE]
├── src/
│   ├── App.jsx
│   └── main.jsx
└── package.json

------------------------------------------------------------
[FILE: src/App.jsx] | [LINES: 120] | [TOKENS: 950]
... contenu ...
```

## Stack

- React 18
- Vite
- Tailwind CSS 3.4
- Framer Motion
- js-tiktoken
- Prism React Renderer
- Lucide React
- ignore

## Installation

```bash
git clone https://github.com/qurnt1/ContextPacker.git
cd ContextPacker
npm install
npm run dev
```

Build production:

```bash
npm run build
```

## Confidentialite

100% cote client.  
Aucun fichier n est envoye a un serveur.

## Licence

MIT (2026)
