# ContextPacker

ContextPacker prépare le contexte utile de votre projet pour travailler plus efficacement avec une IA. Ouvrez un dossier local ou un dépôt GitHub public, choisissez les fichiers qui comptent, puis obtenez un export clair à coller dans votre outil préféré.

![Écran d’accueil de ContextPacker pour ouvrir un projet local ou GitHub](./assets/accueil.png)

## Pourquoi ContextPacker ?

Donner un projet entier à une IA est rarement pertinent : le contexte devient trop lourd, du bruit s’ajoute et les fichiers sensibles ne doivent pas quitter votre machine. ContextPacker vous aide à composer un contexte ciblé, lisible et adapté à la limite de tokens de votre modèle.

Il s’adresse aux développeurs, étudiants et équipes qui utilisent ChatGPT, Claude, Gemini, Perplexity ou un autre assistant IA pour comprendre, corriger, documenter ou faire évoluer un projet.

## En trois étapes

1. **Ouvrez votre source** : sélectionnez un dossier local, glissez-déposez-le, ou indiquez un dépôt GitHub public.
2. **Choisissez le bon contexte** : parcourez l’arborescence, recherchez des fichiers, sélectionnez par dossier ou extension, et suivez l’estimation de tokens.
3. **Exportez et travaillez** : copiez le contexte, téléchargez-le en TXT ou Markdown, ou ouvrez votre assistant IA après la copie.

## Ce que l’application permet

- Analyser un dossier local ou un dépôt GitHub public, y compris une branche et un sous-dossier.
- Retrouver rapidement les fichiers utiles avec la recherche, les sélections par dossier, extension, plage ou raccourci clavier.
- Respecter `.gitignore` lors du chargement et choisir si l’arborescence complète accompagne l’export.
- Estimer le volume de contexte et régler une limite de tokens ainsi que des alertes.
- Générer des exports TXT ou Markdown, avec un formatage compact optionnel.
- Retrouver les projets récents et les favoris dans le navigateur.

## Confidentialité et sécurité

ContextPacker fonctionne côté client : vos dossiers locaux sont lus et traités dans votre navigateur, sans serveur applicatif ContextPacker. Les appels externes servent uniquement à lire le dépôt GitHub demandé ou à ouvrir explicitement un service IA après la copie.

Les fichiers sensibles et les répertoires protégés, par exemple les fichiers `.env`, les clés privées et les dossiers de configuration d’identifiants, restent exclus de la lecture et de l’export. Les modèles tels que `.env.example` restent utilisables. Les fichiers trop volumineux restent visibles, mais ne sont pas sélectionnables.

Un token GitHub est facultatif pour améliorer la limite d’appels GitHub. Il reste uniquement en mémoire pendant la session et n’est jamais enregistré dans les réglages du navigateur.

## Utiliser ContextPacker

[Ouvrir ContextPacker](https://qurnt1.github.io/ContextPacker/)

Pour ouvrir un dossier local, utilisez Chrome, Edge, Brave ou un autre navigateur Chromium compatible avec la File System Access API. Le chargement d’un dépôt GitHub public peut se faire directement depuis l’écran d’accueil.

## Développement et contribution

```bash
git clone https://github.com/qurnt1/ContextPacker.git
cd ContextPacker
npm install
npm run dev
```

Avant une contribution, exécutez `npm test`, `npm run lint` et `npm run build`. Les tests end-to-end sont disponibles avec `npm run e2e`.

## Licence

ContextPacker est distribué sous licence MIT. Voir le fichier [`LICENSE`](./LICENSE).
