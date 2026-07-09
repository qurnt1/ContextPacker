# ContextPacker v4.0

Transformez un projet complet en un prompt unique, structuré et prêt à coller dans votre LLM.

![Accueil](./assets/accueil.png)

## Demo

[Live Demo](https://qurnt1.github.io/ContextPacker/)

Note: pour l'import local, utilisez un navigateur Chromium (Chrome, Edge, Brave...) car l'app utilise la File System Access API.

## Nouveautés v4.0

- **Drag & drop** : glissez un dossier directement sur l'écran d'accueil, le scan démarre sans picker.
- **Projets récents persistants** : historique des projets locaux et GitHub avec réouverture rapide (permission persistante Chrome 122+).
- **Sélection à la plage (Shift+Click)** : maintenez Shift et cliquez pour sélectionner une plage de fichiers.
- **Panneau latéral redimensionnable et escamotable** : ajustez la largeur ou repliez complètement la sidebar.
- **Barre de recherche** : filtrez les fichiers par nom dans l'arborescence.
- **Tri des extensions par fréquence** avec badges de sélection.
- **Squelettes de chargement** : animation placeholder pendant le scan.
- **Dashboard temps réel** : tokens, lignes, volume, jauge de progression.
- **Raccourcis clavier** : `Ctrl+A` tout sélectionner, `Ctrl+Shift+A` désélectionner, `Ctrl+F` rechercher, `?` aide.

## Fonctionnalités

- Stitcher intelligent : assemble les fichiers sélectionnés dans un seul contexte.
- Lazy selection : aucun fichier présélectionné par défaut.
- Support `.gitignore` + patterns ignorés courants.
- Exclusion automatique des fichiers binaires.
- Minification optionnelle (commentaires + lignes vides).
- Comptage de tokens avec `js-tiktoken` (`o200k_base`, fallback `cl100k_base`).
- Export en `clipboard` ou en `.txt`.
- Thèmes clair / sombre / système.
- 100% client-side, aucun fichier envoyé à un serveur.

## Exemple de sortie

```text
[CONTEXTPACKER · MON-PROJET] · 12 450 tokens · minification: OFF

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
- Zustand
- Framer Motion
- js-tiktoken
- prism-react-renderer
- lucide-react

## Installation

```bash
git clone https://github.com/qurnt1/ContextPacker.git
cd ContextPacker
npm install
npm run dev
```

Build production :

```bash
npm run build
```

## Configuration utilisateur

Dans les paramètres :

- Limite de tokens cible (32k → 1M)
- Seuil d'alerte en pourcentage
- Seuil manuel absolu
- Token GitHub (optionnel, améliore le rate limit API)
- Minification et usage de `.gitignore` persistants

## Raccourcis clavier

| Raccourci | Action |
|---|---|
| `Ctrl+A` | Tout sélectionner |
| `Ctrl+Shift+A` | Tout désélectionner |
| `Ctrl+F` | Rechercher un fichier |
| `Shift+Click` | Sélectionner une plage de fichiers |
| `?` | Afficher l'aide des raccourcis |

## Confidentialité

ContextPacker est 100% client-side.

- Aucun fichier n'est envoyé à un serveur applicatif.
- Le traitement (scan, tokenisation, minification, formatage) se fait dans le navigateur.
- Les projets récents sont stockés localement (localStorage + IndexedDB).

## Licence

MIT
