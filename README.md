# ContextPacker

ContextPacker transforme un dossier local en contexte de code clair et compact, pret a etre utilise avec une IA. L'application fonctionne directement dans le navigateur et aide les developpeurs, etudiants et equipes a selectionner uniquement les fichiers utiles.

![Ecran d'accueil de ContextPacker](./assets/accueil.png)

## Fonctionnement

1. Ouvrez un dossier local dans un navigateur Chromium compatible avec la File System Access API.
2. Parcourez l'arborescence, recherchez des fichiers et selectionnez le contexte utile.
3. Suivez le volume de tokens et activez le formatage compact lorsque cela reduit la taille.
4. Copiez le contexte ou telechargez-le au format TXT ou Markdown.

## Ce que ContextPacker conserve

- Les fichiers sont lus et traites localement dans le navigateur.
- Les dossiers `.git`, `venv`, `.venv`, `node_modules`, les caches, les builds, les binaires et les fichiers trop volumineux sont exclus du scan et de l'export.
- Le fichier `.gitignore` du projet peut etre respecte ou ignore, sans desactiver les exclusions techniques obligatoires.
- Le comptage de tokens utilise un tokenizer charge a la demande.
- L'historique des dossiers locaux et les preferences sont conserves dans le navigateur.

ContextPacker ne detecte pas automatiquement les secrets dans le contenu. La selection et l'export restent sous le controle de l'utilisateur.

## Developpement

```bash
git clone <repository-url>
cd ContextPacker
npm install
npm run dev
```

Validation locale :

```bash
npm test
npm run lint
npm run build
npm run e2e
```

## Deploiement

Le projet est une application statique Vite. Le chemin de base actuel est `/ContextPacker/`. Adaptez-le au chemin public de votre hebergement avant la mise en ligne.

## Licence

ContextPacker est distribue sous licence MIT. Voir [`LICENSE`](./LICENSE).
