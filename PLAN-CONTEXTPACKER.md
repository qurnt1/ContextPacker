# Plan ContextPacker

## Objectif

Transformer l'application en un outil local plus simple, plus clair et plus fiable pour preparer du contexte de code a destination d'une IA.

Le coeur conserve est : ouvrir un dossier local, parcourir l'arborescence, rechercher et selectionner des fichiers, suivre les tokens, compacter l'export, puis copier ou telecharger le resultat.

## Etat de reference

- Branche de travail : `codex/contextpacker-simplification`.
- Application React/Vite avec Zustand, Tailwind, Framer Motion et Lucide.
- Scan local base sur la File System Access API.
- Les exclusions techniques sont actuellement melangees avec la detection des secrets.
- Le mode compact transforme actuellement surtout le JSON.
- Les parametres contiennent encore le token GitHub, deux systemes de seuils et une logique devenue trop lourde.
- Les PNG et le fichier de demande non suivis presents avant ce travail ont ete supprimes sur demande.

## Principes de scope

- Supprimer toute integration GitHub.
- Supprimer toute detection et tout blocage automatique de secrets.
- Conserver les exclusions obligatoires de bruit : `.git`, `venv`, `.venv`, `node_modules`, caches, builds, binaires et fichiers trop volumineux.
- Ne jamais permettre a un toggle utilisateur de desactiver les exclusions obligatoires.
- Preserver la source originale lorsqu'une transformation compacte serait incertaine.
- Valider chaque lot avant de poursuivre.
- Ne pas publier ni pousser la branche sans demande explicite.

## Phase 0 - Baseline

### Actions

- Executer `npm test`, `npm run lint`, `npm run build` et `npm run e2e`.
- Mesurer le bundle produit.
- Inventorier les occurrences de l'ancien branding, de GitHub, de la securite des secrets, de `minify` et des classes visuelles historiques.
- Conserver les resultats comme reference de regression.

### Validation

- Les commandes de reference sont documentees avec leur resultat.
- Aucun fichier utilisateur non concerne n'est modifie.

## Phase 1 - Rebranding ContextPacker

### Fichiers concernes

- `package.json`, `package-lock.json`, `index.html`, `README.md`, `THIRD_PARTY_NOTICES.md`.
- `src/components/ContextPackerMark.jsx` a renommer vers un composant de marque ContextPacker.
- `src/index.css`, `tailwind.config.js`, `src/theme.js` et les composants qui portent encore les anciens noms.
- Tests, labels accessibles, titres, descriptions, favicon et captures suivies par Git.

### Actions

- Remplacer les textes visibles, noms de test, titres et metadonnees par ContextPacker.
- Remplacer les classes `cyber-*` par des noms neutres lies au design system ContextPacker.
- Renommer les evenements et identifiants internes qui exposent encore l'ancienne marque.
- Verifier le chemin de deploiement GitHub Pages avant de modifier le `base` Vite.
- Si les preferences existantes doivent etre conservees, isoler l'ancien identifiant dans une migration unique. Sinon, repartir sur un namespace propre.

## Phase 2 - Suppression de GitHub

### Fichiers a supprimer ou simplifier

- Supprimer `src/utils/githubScanner.js` et `src/test/githubScanner.test.js`.
- Supprimer `src/components/BranchSelector.jsx`.
- Simplifier `src/store.js` pour ne garder que le scan local et l'historique local.
- Simplifier `src/components/WelcomeScreen.jsx` pour retirer depot distant, branche, sous-dossier et token.
- Retirer la section GitHub de `src/components/SettingsPanel.jsx`.
- Refaire `e2e/smoke.spec.js` avec un dossier local simule.

### Validation

- Aucun appel reseau applicatif ne reste.
- Aucun texte GitHub ne reste dans le code livre, les tests ou la documentation.
- Le scan local, l'historique local, la relocalisation et le rafraichissement restent fonctionnels.

## Phase 3 - Exclusions techniques sans detection de secrets

### Actions

- Supprimer `src/utils/secretDetector.js`, `src/utils/securityPolicy.js` et les tests exclusivement lies aux secrets.
- Retirer `potentialSecrets` et les messages de blocage de secrets des fichiers, de l'arbre, des exports et des tests.
- Conserver la protection des fichiers trop volumineux et des fichiers binaires.
- Introduire une politique de scan neutre, par exemple `scanPolicy.js`, uniquement si elle reduit vraiment la duplication.
- Faire en sorte que les patterns obligatoires soient toujours appliques.
- L'option `.gitignore` doit uniquement activer ou desactiver le fichier `.gitignore` du projet.

### Exclusions obligatoires

- `.git`, `venv`, `.venv`, `node_modules`.
- `__pycache__`, `dist`, `build`, `coverage`.
- `.cache`, `.pytest_cache`, `.mypy_cache`, `.ruff_cache`, `.parcel-cache`, `.turbo`.
- Fichiers binaires, archives, executables et fichiers au-dessus de la limite existante.

### Validation

- `.git`, `venv` et les caches ne sont jamais lus ni exportes.
- Ce comportement reste vrai quand `.gitignore` est desactive.
- Un fichier contenant une chaine ressemblant a un secret reste selectionnable s'il n'est pas exclu par une regle technique ou le `.gitignore` du projet.
- Les exports, statistiques, apercus et rafraichissements utilisent tous la meme regle de selection.

## Phase 4 - Formatage compact fiable

### Contrat

Le mode compact doit retourner le contenu utilise, le nombre de tokens avant, le nombre de tokens apres, le gain et la raison d'un fallback eventuel.

### Actions

- Renommer `minifyEnabled` en `compactEnabled` si cela simplifie le vocabulaire.
- Remplacer `minifier.js` par un formateur compact centralise.
- JSON valide : parser puis reserialiser de maniere compacte, en gerant le BOM.
- Ajouter uniquement des transformations parser-safe pour les formats qui le justifient.
- Laisser la source intacte pour les langages dont la transformation pourrait modifier le sens ou supprimer des informations utiles a l'IA.
- Utiliser le meme contenu compact dans l'aperçu, les statistiques et les exports TXT/Markdown.
- Afficher le gain reel de tokens apres activation.

### Decision technique

Ne pas utiliser de regex generique pour minifier du JavaScript, du TypeScript, du JSX, du Python ou du HTML.

Prettier est adapte a la lisibilite, pas a la densite en tokens. `esbuild` ou `terser` seront envisages uniquement si un perimetre de langages precis est valide, car ils peuvent supprimer des types ou transformer la source de maniere inadaptee a un contexte IA.

## Phase 5 - Parametres simplifiee

### Proposition

Garder uniquement :

- limite de contexte, avec presets et valeur personnalisee ;
- seuil d'alerte unique ;
- indication claire de la sauvegarde locale.

Supprimer :

- token GitHub ;
- seuil manuel redondant si le seuil en pourcentage suffit ;
- explications techniques devenues inutiles.

Proposition supplementaire : supprimer l'onboarding et les favoris si l'ecran d'accueil et l'historique local suffisent a l'usage reel.

## Phase 6 - Chargement local

### Proposition de rendu

Remplacer la barre actuelle par quatre etats explicites :

1. Preparation.
2. Exploration du dossier.
3. Lecture et analyse des fichiers.
4. Finalisation.

### Actions

- Barre indeterminee tant que le nombre total est inconnu.
- Barre determinee des que le total est disponible.
- Afficher fichier courant, progression, fichiers retenus et estimation de tokens.
- Ne pas afficher de fausse estimation de temps restant.
- Ajouter `aria-valuetext`, une region de statut et le support de la reduction de mouvement.
- Utiliser des transitions CSS simples plutot qu'une dependance d'animation pour cette barre.

## Phase 7 - Theme clair ContextPacker

### Direction

Interface claire de type outil de travail : fond neutre, surfaces blanches, texte graphite, accent cobalt ou turquoise, et couleurs semantiques distinctes pour les etats.

### Actions

- Remplacer les variables sombres dans `src/index.css`.
- Mettre a jour les alias Tailwind et les couleurs codées directement dans les composants.
- Revoir le theme de coloration de `src/theme.js` pour un rendu lisible sur fond clair.
- Mettre a jour scrollbar, bordures, ombres, focus rings, modales et etats desactives.
- Supprimer les halos decoratifs et les animations d'ambiance inutiles.
- Mettre a jour `theme-color`, favicon et capture suivie par Git.
- Verifier le contraste WCAG AA a chaque etat interactif.

## Phase 8 - Bibliotheques

### Decisions recommandees

- Supprimer Framer Motion si les animations restantes sont couvertes par CSS.
- Conserver `js-tiktoken` pour le comptage local des tokens.
- Conserver `ignore` pour la syntaxe `.gitignore`.
- Conserver `diff` si le resume de rafraichissement local est conserve.
- Conserver Lucide, Prism et les icones de fichiers tant qu'une alternative ne reduit pas vraiment la complexite.

### Migrations separees

- React 19 apres la simplification fonctionnelle.
- Vite 8 et son changement de moteur apres verification du build et du deploiement.
- Tailwind 4 dans un lot independant, avec verification de Node et des navigateurs supportes.
- Mettre a jour les dependances mineures avec `npm outdated`, sans `npm audit fix --force`.

## Phase 9 - Validation production et portfolio

### Tests automatises

- Scan local et gestion des permissions.
- Exclusions obligatoires avec `.gitignore` active et desactive.
- Selection, deselection, seuil de tokens et format compact.
- Tokens avant/apres et exports TXT/Markdown.
- Parametres, rafraichissement et etats de chargement.
- Tests E2E sur le parcours local complet.

### Commandes

```bash
npm test
npm run lint
npm run build
npm run e2e
git diff --check
```

### Verification manuelle

- Chrome et Edge avec un vrai dossier local.
- Permission accordee, refusee puis accordee a nouveau.
- Petit projet, projet volumineux, fichier trop lourd, binaires, `.git`, `venv` et caches.
- Verification responsive a 320, 375, 414, 768, 1024, 1440 et 1920 px.
- Verification clavier, lecteurs d'ecran, focus des modales et `prefers-reduced-motion`.
- Verification du chemin de deploiement et de la page de demonstration.

### README portfolio

- A quoi sert ContextPacker et pour qui.
- Limites du scan local et absence de detection automatique des secrets.
- Capture, lien de demonstration, installation et commandes de validation.
- Architecture courte et choix techniques.
- Licence et notices des dependances.

## Ordre d'execution

1. Baseline.
2. Suppression GitHub.
3. Separation des exclusions et retrait des faux positifs.
4. Formatage compact.
5. Parametres et chargement.
6. Rebranding et theme clair.
7. Nettoyage et migrations de dependances.
8. Validation production et documentation.

Chaque lot doit rester compilable et teste avant le suivant. Aucun commit ni push n'est inclus dans ce plan sans instruction explicite.
