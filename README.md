# ContextPacker

ContextPacker transforme un dossier local en contexte de code clair et compact, prêt à être utilisé avec une IA. L'application fonctionne directement dans le navigateur et aide les développeurs, étudiants et équipes à sélectionner uniquement les fichiers utiles, sans envoyer les fichiers vers un serveur.

![Écran d'accueil de ContextPacker](./assets/accueil.png)

## Fonctionnement

1. Ouvrez un dossier local dans un navigateur Chromium compatible avec la File System Access API.
2. Parcourez l'arborescence, recherchez des fichiers et sélectionnez le contexte utile.
3. Suivez le volume de tokens et activez le formatage compact lorsque cela réduit la taille.
4. Copiez le contexte ou téléchargez-le au format TXT ou Markdown.

## Compatibilité

L'ouverture de dossiers utilise la File System Access API. Utilisez Chrome, Edge ou un autre navigateur basé sur Chromium récent pour accéder à cette fonctionnalité.

## Ce que ContextPacker conserve

- Les fichiers sont lus et traités localement dans le navigateur.
- Les dossiers `.git`, `venv`, `.venv`, `node_modules`, les caches, les builds, les binaires et les fichiers trop volumineux sont exclus du scan et de l'export.
- Le fichier `.gitignore` du projet peut être respecté ou ignoré, sans désactiver les exclusions techniques obligatoires.
- Le comptage de tokens utilise un tokenizer chargé à la demande.
- L'historique des dossiers locaux et les préférences sont conservés dans le navigateur.

ContextPacker n'analyse pas le contenu à la recherche de secrets. Les chemins connus comme `.env*`, `.aws`, `.ssh`, `credentials.json` et les fichiers de clés privées sont exclus avant lecture, même si `.gitignore` est désactivé.

## Développement

```bash
git clone https://github.com/qurnt1/ContextPacker.git
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

## Licence

ContextPacker est distribué sous licence MIT. Voir [`LICENSE`](./LICENSE).
