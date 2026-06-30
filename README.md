# arXiv Translate - Extension de Traduction Scientifique

Une extension de navigateur moderne (Chrome Extension Manifest V3) conçue pour traduire automatiquement les articles de recherche d'**arXiv** tout en préservant l'intégrité absolue de la mise en page (balises HTML) et des formules mathématiques (LaTeX/MathJax). Elle permet également d'exporter le document traduit au format PDF académique type LaTeX.

---

## Fonctionnalités

- 🔄 **Traduction Bilingue & Unilingue** : Les paragraphes traduits s'insèrent directement sous les originaux. Vous pouvez choisir de **masquer le texte original anglais** à tout moment pour lire ou imprimer uniquement la version traduite.
- 📐 **Protection Strict du Latex & du HTML (Mise en Forme)** : Notre moteur isole à la fois les équations complexes (KaTeX/MathJax) et les balises HTML de structure (liens de citations, gras, italique, etc.) avant de les envoyer au traducteur. Le texte original est ainsi reconstitué à l'identique après traduction.
- 📄 **Export PDF Style LaTeX** : Un bouton d'exportation configure la page en masquant les menus web et en appliquant une feuille de style d'impression académique (`@media print` avec police Serif de type Times, marges standardisées et gestion intelligente des sauts de page pour les équations/figures) afin d'enregistrer l'article traduit en un PDF parfait.
- 🔌 **3 Moteurs de Traduction Disponibles** :
  1. **Google Translate (Gratuit)** : Sélectionné par défaut. Ne nécessite **aucune clé API** et traduit instantanément.
  2. **Ollama (IA Locale)** : Utilise une intelligence artificielle qui tourne directement en local sur votre machine. 100% privé, gratuit et hors ligne.
  3. **Google Gemini API** : Traduction cloud via `gemini-1.5-flash` en utilisant votre clé API gratuite.
- ⚡ **Redirection PDF automatique** : Intercepte les pages PDF d'arXiv pour vous proposer ou forcer la redirection vers la version HTML native d'arXiv, propice à la traduction directe.

---

## Structure du Projet

- `manifest.json` : Déclare la configuration de l'extension (MV3) et les autorisations réseaux nécessaires (API Google Gemini, Ollama sur localhost, arXiv).
- `popup.html` & `popup.js` : Interface de configuration sombre permettant de choisir la langue de destination, le moteur de traduction, de basculer l'affichage (bilingue/unilingue) et d'exporter en PDF.
- `background.js` : Centralise les appels vers les API de traduction (pour éviter les blocages de CORS) et gère la redirection des URLs PDF.
- `content.js` : Effectue la double tokenisation (protection des balises et du LaTeX), orchestre la file d'attente de traduction concurrente (4 paragraphes à la fois), gère l'affichage dynamique et déclenche l'impression.
- `styles.css` : Feuille de style injectée pour formater le texte traduit, masquer le texte d'origine sur demande et configurer la feuille d'impression PDF de type LaTeX.

---

## Installation Locale (Mode Développeur)

Pour installer l'extension sur Google Chrome, Brave, Edge ou Opera :

1. Téléchargez ou clonez ce dossier sur votre ordinateur.
2. Ouvrez votre navigateur et accédez à `chrome://extensions/`.
3. Activez le **Mode développeur** (en haut à droite).
4. Cliquez sur **Charger l'extension non empaquetée** (Load unpacked) en haut à gauche.
5. Sélectionnez le dossier du projet.
6. L'extension est prête ! Vous pouvez l'épingler dans votre barre d'outils.

---

## Utilisation des Options d'Export PDF

1. Saisissez votre mode de traduction ou laissez par défaut **Google Translate**.
2. Sur la page d'un article HTML, lancez la traduction.
3. Une fois la traduction terminée, ouvrez la popup de l'extension et cochez **Masquer le texte d'origine** (le document réorganise instantanément l'affichage pour masquer l'anglais et adapter le style).
4. Cliquez sur **Exporter en PDF (LaTeX)**.
5. La boîte de dialogue d'impression de votre navigateur s'ouvre. Sélectionnez **Enregistrer au format PDF** comme destination.
6. Le PDF généré respecte les polices Serif, les marges standardisées et applique des sauts de page intelligents pour éviter de tronquer les formules et figures !

---

## Publication sur le Chrome Web Store

1. Compressez tout le dossier de l'extension dans un fichier `.zip`.
2. Connectez-vous sur la [Chrome Developer Console](https://chrome.google.com/webstore/devconsole).
3. Créez un compte développeur (frais uniques de $5 USD payés à Google).
4. Cliquez sur **Ajouter un nouvel article** (Add new item) et importez votre fichier `.zip`.
5. Remplissez la fiche produit (titre, description, icônes 128x128 px, captures d'écran).
6. Dans l'onglet **Pratiques de confidentialité** (Privacy practices), indiquez que l'extension ne collecte aucune donnée utilisateur sur des serveurs distants puisque les appels se font en direct.
7. Soumettez pour examen. La validation MV3 est généralement validée en 24h à 72h.
