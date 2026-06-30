# Règles de confidentialité - arXiv Translate

Cette page décrit la politique de confidentialité de l'extension de navigateur **arXiv Translate**.

Dernière mise à jour : 30 juin 2026.

---

## 1. Collecte de données et respect de la vie privée
L'extension **arXiv Translate** est conçue pour respecter pleinement votre vie privée. 
- **Aucune donnée personnelle n'est collectée** : L'extension ne demande, ne collecte et ne stocke aucune information permettant de vous identifier personnellement (nom, adresse e-mail, identifiants, etc.).
- **Aucun serveur intermédiaire** : L'extension communique directement de votre navigateur vers les services de traduction configurés. Aucun serveur tiers géré par l'éditeur de l'extension n'intercepte vos données.

---

## 2. Stockage des paramètres de l'utilisateur
Les paramètres configurés dans la popup de l'extension (choix de la langue cible, moteur de traduction sélectionné, nom du modèle local Ollama et clé API Gemini) sont stockés localement sur votre appareil à l'aide de l'API sécurisée `chrome.storage.local`. 
Ces informations restent confidentielles sur votre navigateur et ne sont jamais transmises à l'éditeur de l'extension ou à des tiers.

---

## 3. Transmission des données de traduction
Pour traduire les paragraphes d'un article scientifique arXiv, l'extension lit le texte de la page HTML active et l'envoie au moteur de traduction que vous avez configuré :
- **Google Translate (Gratuit)** : Les textes sont envoyés à l'API publique de Google Translate pour être traduits.
- **Google Gemini API** : Les textes sont envoyés directement à l'API officielle Google Gemini en utilisant votre clé API personnelle.
- **Ollama (IA Locale)** : Les requêtes sont envoyées en local sur votre machine (`http://localhost:11434`), garantissant une confidentialité absolue et hors ligne.

---

## 4. Analyse et cookies
L'extension n'utilise aucun cookie de suivi, aucun outil d'analyse (analytics) et aucun script publicitaire.

---

## 5. Contact
Pour toute question concernant cette politique de confidentialité, vous pouvez ouvrir une issue sur le dépôt officiel du projet :
[https://github.com/clementdumeril/Traduction_research/issues](https://github.com/clementdumeril/Traduction_research/issues)
