# TestUnit - Extension Chrome de test utilisateur

## Présentation

TestUnit est une extension Chrome permettant d'enregistrer, de rejouer et d'exporter des scénarios de tests utilisateurs (clics, scrolls, saisies) sur une page web. Elle facilite la création de tests reproductibles pour valider des parcours ou détecter des régressions.

## Architecture du code

- **src/background.js** :
  - Gère l'état global de l'enregistrement (démarrage, arrêt, ajout d'événements).
  - Stocke les événements et rapports de tests dans le stockage local Chrome.
  - Reçoit les messages des autres scripts (content, popup) et orchestre la sauvegarde et l'export des rapports.

- **src/content.js** :
  - Injecté dans la page web.
  - Écoute et enregistre les interactions utilisateur (clics, scrolls, saisies).
  - Envoie chaque événement au background script via `chrome.runtime.sendMessage`.
  - Peut rejouer les scénarios en simulant les actions utilisateur.

- **src/popup.js** :
  - Contrôle l'UI du popup de l'extension (démarrer/arrêter/sauvegarder un enregistrement, lister, rejouer, supprimer, exporter).
  - Permet de renseigner des métadonnées (nom du test, testeur, environnement, etc.).
  - Lance la relecture d'un scénario sur l'onglet courant.

- **src/manifest.json** :
  - Déclare les permissions, scripts et ressources de l'extension.

- **src/popup.html** :
  - Interface utilisateur du popup.

## Installation & développement

### Prérequis
- Node.js >= 14
- npm

### Installation des dépendances

```bash
npm install
```

### Lancer le mode développement (watch)

```bash
npm run dev
```

Cela génère les fichiers dans `dist/` (selon la config webpack) et les met à jour à chaque modification.

### Build de production

```bash
npm run build
```

### Charger l'extension dans Chrome
1. Ouvrir `chrome://extensions/`
2. Activer le mode développeur
3. Cliquer sur "Charger l'extension non empaquetée"
4. Sélectionner le dossier `src/` (ou le dossier de build si configuré)

## Utilisation

1. Ouvrir le popup de l'extension
2. Cliquer sur "Démarrer" pour commencer l'enregistrement
3. Réaliser les actions à tester sur la page
4. Cliquer sur "Arrêter" puis "Sauvegarder" (remplir les infos demandées)
5. Les scénarios sauvegardés sont listés dans le popup (lecture, édition, suppression)
6. Exporter les rapports de tests en CSV via le bouton dédié

## Commandes principales

- `npm run dev` : mode développement (watch)
- `npm run build` : build de production

## Notes
- Les événements enregistrés : clics, scrolls, saisies sur inputs/selects.
- Les scénarios sont stockés localement (pas de cloud).
- L'export CSV vide les rapports après téléchargement.


