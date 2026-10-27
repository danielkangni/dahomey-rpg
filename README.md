# Contre le colonisateur : le royaume du Dahomey

RPG d'aventure en 3D, jouable dans le navigateur (three.js, sans étape de compilation).

## Lancer
```
python3 -m http.server 8300
```
puis ouvrir http://localhost:8300

## Le jeu
- Choisis ta voie : **sorcier**, **guerrier** (épée) ou **archer**.
- On ne combat pas les esprits : on **passe leur épreuve** pour obtenir un pouvoir (énigme de Legba, rythme d'Hévioso, forge de Gu, chasse d'Aziza).
- Les ennemis sont des soldats étrangers et Agbo, un sorcier allié des colons.
- Chapitre 1 : parler au doyen, passer l'épreuve, observer le navire, repousser la patrouille, vaincre Agbo.
- Niveaux, inventaire (12 emplacements), plantes de soin, sauvegarde automatique (stockage du navigateur).

## Commandes
ZQSD/WASD ou flèches : se déplacer · glisser la souris : caméra · molette : zoom · Espace ou clic : attaquer · 1 et 2 : pouvoirs · E : interagir · H : se soigner · Échap : menu · Maj : courir.
Sur téléphone : joystick gauche, glisser à droite pour la caméra, boutons à l'écran.

## Structure
- `src/world.js` : terrain, village, sanctuaires, camp, navire
- `src/actors.js` : joueur, ennemis, projectiles, effets
- `src/trials.js` : épreuves (énigme, rythme, timing)
- `src/main.js` : boucle, quêtes, dialogues, menus
- `docs/HISTOIRE.md` : ce qui est historique, à vérifier ou inventé

Les images de chargement et les personnages ont été créés par l'équipe du projet. Les noms et dialogues sont fictifs.
