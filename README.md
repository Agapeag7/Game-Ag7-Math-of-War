```markdown
# AG7 Mind Clash - Jeu de tir à la corde mathématique

**AG7 Mind Clash** est un jeu éducatif interactif qui combine mathématiques et mécanique de tir à la corde. Deux équipes s'affrontent en résolvant des opérations mathématiques pour tirer la corde de leur côté. Le jeu propose plusieurs niveaux de difficulté, des modes de jeu (Joueur vs Joueur, Joueur vs IA), un système de bonus/power‑ups et des effets visuels dynamiques.

---

## Fonctionnalités

- **Modes de jeu** :
  - *Joueur vs Joueur* : deux joueurs s'affrontent sur le même appareil.
  - *Joueur vs IA* : affrontez une intelligence artificielle dont la difficulté s'adapte au niveau choisi.
- **6 niveaux de difficulté** : du niveau débutant (additions simples) au niveau expert (opérations mélangées et mode chronométré).
- **Système de tentatives** : chaque équipe dispose de 3 tentatives pour répondre correctement. En cas d'échec, la corde se déplace vers l'adversaire.
- **Power‑ups aléatoires** : des bonus spéciaux peuvent apparaître en début de manche (double points, gel du temps, bouclier, réponse auto, turbo, vie extra).
- **Bonus d'inventaire** : après chaque bonne réponse, vous pouvez obtenir un bonus utilisable plus tard (double points, tentative supplémentaire, bouclier, vol de temps, temps bonus, confusion).
- **Corde dynamique** : la position de la corde évolue en temps réel avec des effets de tension et des indicateurs d'équipe.
- **Interface utilisateur riche** : icônes, animations, messages contextuels, confettis de victoire, barre de progression du temps.
- **Sauvegarde des meilleurs scores** dans le navigateur (localStorage).

---

## Comment jouer

1. Sur l'écran d'accueil, sélectionnez un **niveau de difficulté** et un **mode de jeu**.
2. Cliquez sur **"Commencer la partie"**.
3. Le jeu alterne les tours entre les équipes. L'équipe active voit sa zone de jeu mise en évidence.
4. Saisissez votre réponse à l'opération affichée à l'aide du **pavé numérique**.
5. Validez avec le bouton **✔** ou la touche **Entrée**.
6. Si la réponse est correcte, la corde se déplace vers votre camp. Vous pouvez obtenir un bonus aléatoire.
7. Si la réponse est incorrecte, vous perdez une tentative. Après trois mauvaises réponses, la corde avance vers l'adversaire.
8. La première équipe qui remporte **3 manches** gagne la partie.

### Utilisation des bonus

- Les bonus collectés apparaissent dans des **panneaux latéraux** (gauche pour l'équipe rouge, droite pour l'équipe bleue).
- Cliquez sur un bonus pour l'activer **pendant votre tour** (sauf pour "Confusion" et "Vol de temps" qui ne peuvent être utilisés que pendant le tour adverse).
- Certains bonus ont un effet immédiat (double points, tentative supplémentaire), d'autres durent plusieurs secondes (gel du temps, turbo).

---

## Installation

1. Téléchargez ou clonez ce dépôt.
2. Assurez-vous que les trois fichiers (`index.html`, `style.css`, `script.js`) sont dans le même dossier.
3. Ouvrez `index.html` dans un navigateur moderne (Chrome, Firefox, Edge, etc.).

Aucune installation supplémentaire ni connexion internet n'est requise (les polices et icônes sont chargées depuis des CDN publics).

---

## Technologies utilisées

- **HTML5** : structure de la page.
- **CSS3** : styles, animations, mise en page responsive.
- **JavaScript (ES6)** : logique du jeu, classes, gestion des événements, localStorage.
- **Bibliothèques externes** (via CDN) :
  - [Google Fonts](https://fonts.google.com/) (Poppins, Comic Neue)
  - [Font Awesome 6](https://fontawesome.com/) (icônes)
  - [Animate.css](https://animate.style/) (animations)
  - [Hover.css](http://ianlunn.github.io/Hover/) (effets de survol)

---

## Mécaniques détaillées

### Corde et victoire
- La corde est représentée par une barre avec un nœud central mobile.
- Chaque bonne réponse déplace le nœud d'un pas vers le camp qui a répondu.
- La corde peut aussi bouger en cas de pénalité (plus de tentatives).
- Une équipe gagne la manche lorsque le nœud atteint l'extrémité de son côté.

### Système de power‑ups (apparaissent en début de manche)
| Power‑up       | Effet |
|----------------|-------|
| Double points  | La prochaine bonne réponse rapporte 2 points. |
| Gel du temps   | Le chrono s'arrête pour l'adversaire (5 secondes). |
| Bouclier       | Protège contre une mauvaise réponse. |
| Réponse auto   | La bonne réponse s'affiche automatiquement. |
| Turbo          | L'adversaire a 50% de temps en moins pendant 10 secondes. |
| Vie extra      | Une erreur est ignorée (une fois). |

### Bonus d'inventaire (obtenus après une bonne réponse)
| Bonus            | Effet (utilisable pendant son tour sauf mention) |
|------------------|--------------------------------------------------|
| 💪 Double points | Prochaine bonne réponse = 2 points. |
| ➕ Tentative sup | Gagne une tentative supplémentaire. |
| 🛡️ Bouclier     | Protège contre une erreur. |
| ⏱️ Vol de temps  | Retire 5 secondes au chrono de l'adversaire. (utilisable pendant le tour adverse) |
| ⏱️ Temps bonus   | Ajoute 5 secondes à son propre chrono. |
| 🌀 Confusion      | Change la question de l'adversaire (même résultat). (utilisable pendant le tour adverse) |

### Intelligence Artificielle (mode Joueur vs IA)
- L'IA répond après un délai dépendant du niveau de difficulté.
- Elle peut commettre des erreurs (taux d'erreur configurable).
- **L'IA utilise ses propres bonus** :
  - Pendant son tour : double points, tentative supplémentaire, bouclier, temps bonus.
  - Pendant le tour du joueur : confusion et vol de temps (avec une probabilité).

---

## Structure du code

- **`index.html`** : contient la structure des écrans (accueil, jeu, pause, scores, victoire) et le pavé numérique.
- **`style.css`** : styles principaux, animations, mise en page responsive.
- **`script.js`** :
  - Constantes de configuration (`CONFIG`)
  - Classes `Team`, `PowerUp`, `Game` (logique métier)
  - Classe `UI` (gestion de l'interface, événements, affichage)
  - Initialisation au chargement du DOM.

---

## Personnalisation

Vous pouvez facilement modifier :
- Les paramètres de difficulté (`CONFIG.DIFFICULTY_SETTINGS`).
- La durée des animations (`CONFIG.ANIMATION_DURATION`).
- Les types de bonus / power‑ups (dans les classes `PowerUp` et `Game`).
- Les couleurs des équipes (variables CSS `--team1-color`, `--team2-color`).

---

## Auteur

Projet développé dans le cadre d'un exercice de programmation ludique.  
N'hésitez pas à contribuer ou à signaler des bugs.

---

## Licence

Ce projet est libre d'utilisation pour un usage personnel et éducatif. Toute commercialisation nécessite l'accord des auteurs.
```