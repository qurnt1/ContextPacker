# ContextPacker v3.0

Transformez un projet complet en un prompt unique, structuré et prêt à coller dans votre LLM.

![Accueil](./assets/accueil.png)

## Demo

[Live Demo](https://qurnt1.github.io/ContextPacker/)

Note: pour l’import local, utilisez un navigateur Chromium (Chrome, Edge, Brave...) car l’app utilise la File System Access API.

## Nouveautés v3.0

- Choix de la source dès l’arrivée: `Dossier local` ou `Repository GitHub`.
- Import GitHub public via URL (`https://github.com/owner/repo`) ou format court (`owner/repo`).
- Option de sous-dossier pour ne scanner qu’une partie du repo GitHub.
- Historique des repos récents (mémoire locale).
- Token GitHub optionnel dans les paramètres pour améliorer la limite API.
- Retour rapide à l’écran principal depuis le header.

## Fonctionnalités

- Stitcher intelligent: assemble les fichiers sélectionnés dans un seul contexte.
- Lazy selection: aucun fichier présélectionné par défaut.
- Tri des extensions par fréquence.
- Support `.gitignore` + patterns ignorés courants.
- Exclusion automatique des fichiers binaires.
- Minification optionnelle (commentaires + lignes vides).
- Comptage de tokens avec `js-tiktoken` (`o200k_base`, fallback `cl100k_base`).
- Dashboard temps réel: tokens, lignes, volume, progression.
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

Dans les paramètres:

- Limite de tokens cible (32k -> 1M)
- Seuil d’alerte en pourcentage
- Seuil manuel absolu
- Token GitHub optionnel
- Minification et usage de `.gitignore` persistants en localStorage

## Confidentialité

ContextPacker est 100% client-side.

- Aucun fichier n’est envoyé à un serveur applicatif.
- Le traitement (scan, tokenisation, minification, formatage) se fait dans le navigateur.

## Licence

MIT
