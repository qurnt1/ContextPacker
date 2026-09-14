<!-- HEADER DE LA PAGE -->
<p align="center">
  <img src="./assets/accueil.png" alt="Écran d'accueil de ContextPacker" width="100%" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); margin-bottom: 20px;">
</p>

<h1 align="center">📦 ContextPacker</h1>

<p align="center">
  <strong>Transformez vos dossiers locaux en contextes LLM optimisés, directement depuis votre navigateur.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Security-100%25%20Local-success?style=for-the-badge&logo=shield" alt="100% Local">
  <img src="https://img.shields.io/badge/Platform-Chromium-blue?style=for-the-badge&logo=google-chrome" alt="Chromium Friendly">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License MIT">
</p>

---

### 💡 Qu'est-ce que c'est ?

**ContextPacker** transforme un dossier local en un contexte de code clair, structuré et compact, prêt à être envoyé à votre IA préférée (ChatGPT, Claude, Gemini...). 

L'application fonctionne **100% côté client**, garantissant la confidentialité absolue de votre code : **aucun fichier n'est envoyé vers un serveur externe.**

---

## 🚀 Comment ça marche ?

<table width="100%">
  <tr>
    <td width="50%" style="vertical-align: top; border: none;">
      <h4>1. Ouvrez un dossier 📁</h4>
      <p>Sélectionnez votre dossier de projet via la <em>File System Access API</em>.</p>
    </td>
    <td width="50%" style="vertical-align: top; border: none;">
      <h4>2. Filtrez l'utile 🎯</h4>
      <p>Parcourez l'arborescence et sélectionnez uniquement les fichiers nécessaires.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" style="vertical-align: top; border: none;">
      <h4>3. Optimisez les tokens 📉</h4>
      <p>Suivez le volume de tokens en temps réel et activez le formatage compact pour gagner de la place.</p>
    </td>
    <td width="50%" style="vertical-align: top; border: none;">
      <h4>4. Copiez & Exportez 📋</h4>
      <p>Copiez instantanément le contexte ou exportez-le au format TXT ou Markdown.</p>
    </td>
  </tr>
</table>

---

## ⚡ Fonctionnalités clés

* 💻 **Exécution locale :** Vos données restent sur votre machine.
* 🛡️ **Exclusions automatiques :** Ignore les dossiers lourds et inutiles (`node_modules`, `.git`, `.venv`, builds, caches, binaires...).
* 🕶️ **Respect du `.gitignore` :** Respectez votre fichier de configuration de manière intelligente.
* 🔢 **Tokenisation précise :** Calcule le nombre exact de tokens grâce à un tokenizer chargé localement.
* 💾 **Persistance :** L'historique des dossiers et vos préférences sont stockés dans votre navigateur.

> [!WARNING]
> ### 🛡️ Sécurité & Confidentialité par défaut
> Les chemins sensibles comme les fichiers d'environnement (`.env*`, `.aws`, `.ssh`, `credentials.json`) et les clés privées sont **systématiquement exclus**, même si vous choisissez de désactiver le `.gitignore`. ContextPacker ne lit jamais vos secrets.

---

## 🌐 Compatibilité

L'application s'appuie sur la **File System Access API**. Elle est compatible avec tous les navigateurs récents basés sur **Chromium** :

| <img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/chrome/chrome_48x48.png" width="24" /> Google Chrome | <img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/edge/edge_48x48.png" width="24" /> Microsoft Edge | <img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/brave/brave_48x48.png" width="24" /> Brave | <img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/opera/opera_48x48.png" width="24" /> Opera |
| :-: | :-: | :-: | :-: |
| ✅ Oui | ✅ Oui | ✅ Oui | ✅ Oui |

---

## 🛠️ Développement local

Prêt à contribuer ou à faire tourner le projet chez vous ? Suivez ces étapes simples :

### 1. Installation

```bash
# Cloner le dépôt
git clone https://github.com/qurnt1/ContextPacker.git

# Accéder au dossier
cd ContextPacker

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
