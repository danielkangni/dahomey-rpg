# Des personnages vraiment réalistes : comment faire

Les personnages du jeu sont construits par le code (formes lissées, vêtements texturés, squelette articulé). Ils sont corrects pour un prototype, mais pas réalistes : un vrai rendu demande des **modèles 3D créés dans un outil dédié**. Le jeu est prêt à les accueillir.

## Déposer un modèle (aucun code à modifier)
Mets un fichier `.glb` dans `assets/models/characters/` avec l'un de ces noms. Il remplace automatiquement le personnage généré :

| Fichier | Personnage |
|---|---|
| `hero_sorcier_m.glb`, `hero_sorcier_f.glb` | Héros sorcier (homme / femme) |
| `hero_guerrier_m.glb`, `hero_guerrier_f.glb` | Héros guerrier |
| `hero_archer_m.glb`, `hero_archer_f.glb` | Héros archer |
| `doyen.glb`, `enfant.glb`, `marchande.glb`, `forgeron.glb`, `agojie.glb` | Villageois |
| `soldat.glb`, `officier.glb`, `agbo.glb` | Ennemis et capitaine |

- Le modèle est mis à l'échelle automatiquement (1,75 m, enfant 1,1 m, Agbo 2,3 m) et doit regarder vers +Z.
- Les animations sont reconnues par leur nom : `idle`, `walk`, `run`, `attack`, `shoot`, `hit`, `die` (les noms qui *contiennent* ces mots suffisent).

## Les 4 chemins, du plus simple au plus réaliste
1. **Image vers 3D par IA** (le plus rapide). Tu as déjà des images de personnages. Des outils comme Meshy, Tripo ou Hunyuan3D transforment une image en modèle 3D texturé, et certains le rigent et l'animent. Résultat : bon pour le style, souvent à retoucher.
2. **Ready Player Me ou VRoid Studio.** Création d'avatars personnalisables, export `.glb`. Très rapide, style semi-réaliste ou anime. Les options pour la peau, les cheveux et les vêtements africains sont limitées, donc il faut tester.
3. **MakeHuman + Blender (gratuit).** Création de corps réalistes, puis habillage et animation dans Blender. Les modèles se règlent finement (morphologie, visage). Il faut un graphiste ou quelqu'un qui apprend Blender.
4. **Mixamo (Adobe, gratuit avec compte).** On envoie un modèle de personnage, et Mixamo le rig automatiquement et fournit des centaines d'animations (marche, course, attaque, mort). C'est la meilleure source d'animations propres. À combiner avec l'un des chemins ci-dessus.

## Recommandation
Image (vos illustrations) → Tripo ou Meshy pour le corps → Mixamo pour le squelette et les animations → export `.glb` → dépôt dans `assets/models/characters/`.
Pour des tenues fidèles (pagnes, bijoux, scarifications, armes), prévois une relecture par quelqu'un qui connaît la culture : ne laisse pas l'IA inventer des motifs sacrés.

## À vérifier avant de publier
- Les licences : chaque outil a ses règles (usage commercial, crédit, etc.).
- Ne pas utiliser de visages de personnes réelles sans leur accord.
