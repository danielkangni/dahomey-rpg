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

## Visuel et son
- Textures réalistes (Poly Haven, CC0), ciel et éclairage par image HDRI, ombres douces, bloom, grain et vignette, végétation animée par le vent.
- Musique originale synthétisée, inspirée de rythmes béninois, qui change selon la situation (village, exploration, combat, boss, sanctuaire).
- Qualité réglable dans les réglages (légère, équilibrée, maximale).
- Modèles de personnages remplaçables : voir `docs/PERSONNAGES.md`.

## Structure
- `src/world.js` : terrain, village, sanctuaires, camp, navire
- `src/buildings.js`, `src/foliage.js` : architecture fon, bas-reliefs, arbres, palmiers, herbe
- `src/characters.js`, `src/presets.js`, `src/glbmodels.js` : personnages articulés et import de modèles .glb
- `src/audio.js`, `src/post.js`, `src/particles.js`, `src/cinematic.js` : musique, effets visuels, scènes
- `src/actors.js` : joueur, ennemis, projectiles, effets
- `src/trials.js` : épreuves (énigme, rythme, timing)
- `src/main.js` : boucle, quêtes, dialogues, menus
- `docs/HISTOIRE.md` : ce qui est historique, à vérifier ou inventé

Les images de chargement et les personnages ont été créés par l'équipe du projet. Les noms et dialogues sont fictifs.
