# ContextPacker v3.0

Transformez un projet complet en un prompt unique, structure et pret a coller dans votre LLM.

![Accueil](./assets/accueil.png)

## Demo

[Live Demo](https://qurnt1.github.io/ContextPacker/)

Note: pour l import local, utilisez un navigateur Chromium (Chrome, Edge, Brave...) car l app utilise la File System Access API.

## Nouveautes v3.0

- Choix de la source des l arrivee: `Dossier local` ou `Repository GitHub`.
- Import GitHub public via URL (`https://github.com/owner/repo`) ou format court (`owner/repo`).
- Option de sous-dossier pour ne scanner qu une partie du repo GitHub.
- Historique des repos recents (memoire locale).
- Token GitHub optionnel dans les parametres pour ameliorer la limite API.
- Retour rapide a l ecran principal depuis le header.

## Fonctionnalites

- Stitcher intelligent: assemble les fichiers selectionnes dans un seul contexte.
- Lazy selection: aucun fichier preselectionne par defaut.
- Tri des extensions par frequence.
- Support `.gitignore` + patterns ignores courants.
- Exclusion automatique des fichiers binaires.
- Minification optionnelle (commentaires + lignes vides).
- Comptage de tokens avec `js-tiktoken` (`o200k_base`, fallback `cl100k_base`).
- Dashboard temps reel: tokens, lignes, volume, progression.
- Export en `clipboard` ou en `.txt`.

## Exemple de sortie

```text
[CONTEXTPACKER - PROJET: mon-projet] | TOKENS: 12 450 | MINIFICATION: NON

[STRUCTURE]
├── src/
│   ├── App.jsx
│   └── main.jsx
└── package.json

------------------------------------------------------------
[FILE: src/App.jsx] | [LINES: 120] | [TOKENS: 950]
... contenu ...
```

## Stack technique

- React 18
- Vite
- Tailwind CSS 3.4
- Framer Motion
- js-tiktoken
- prism-react-renderer
- lucide-react
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

## Configuration utilisateur

Dans les parametres:

- Limite de tokens cible (32k -> 1M)
- Seuil d alerte en pourcentage
- Seuil manuel absolu
- Token GitHub optionnel
- Minification et usage de `.gitignore` persistants en localStorage

## Confidentialite

ContextPacker est 100% client-side.

- Aucun fichier n est envoye a un serveur applicatif.
- Le traitement (scan, tokenisation, minification, formatage) se fait dans le navigateur.

## Licence

MIT
