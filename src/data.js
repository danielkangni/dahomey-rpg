/* Game data: classes, spirits (trials), items, story text. All names of characters are fictional. */
export const CLASSES = {
  sorcier: { id: "sorcier", label: "Le Bokɔnɔ", short: "Sorcier", icon: "☾", img: "assets/art/sorcerer.png",
    desc: "Il lit les signes et parle aux esprits. Fragile au début, ses pouvoirs viennent des épreuves des Vodun.",
    base: { hp: 80, str: 4, agi: 6, spi: 12 }, grow: { hp: 9, str: 1, agi: 1, spi: 3 }, weapon: "staff", color: 0x2b3a8c, accent: 0xe0a93b,
    atk: { type: "bolt", cd: 0.7, range: 24 } },
  guerrier: { id: "guerrier", label: "Le guerrier", short: "Guerrier", icon: "⚔", img: "assets/art/priest.jpg",
    desc: "Lame au poing, il tient la ligne. Solide, il gagne sa force dans l'épreuve du fer.",
    base: { hp: 130, str: 12, agi: 7, spi: 3 }, grow: { hp: 15, str: 3, agi: 1, spi: 0.5 }, weapon: "sword", color: 0x8a2f1c, accent: 0xe0a93b,
    atk: { type: "melee", cd: 0.5, range: 2.8 } },
  archer: { id: "archer", label: "L'archer", short: "Archer", icon: "➶", img: "",
    desc: "Rapide et précis, il frappe de loin. Il apprend la patience dans l'épreuve de la forêt.",
    base: { hp: 95, str: 6, agi: 12, spi: 5 }, grow: { hp: 10, str: 1, agi: 3, spi: 1 }, weapon: "bow", color: 0x2f6b3a, accent: 0xe0a93b,
    atk: { type: "arrow", cd: 0.65, range: 32 } },
};

/* Spirit trials: you do not fight the spirits, you pass their test. */
export const SPIRITS = {
  legba: { id: "legba", name: "Legba", title: "gardien des carrefours", pos: [-42, 24], classes: ["sorcier"], type: "riddle", color: 0xb02a2a,
    power: { id: "pas", name: "Pas du carrefour", icon: "⇢", key: 1, cd: 5, desc: "Un bond fulgurant vers l'avant. Tu es insaisissable pendant l'élan." },
    intro: "Au carrefour, Legba ne te regarde pas : il écoute ce que tu choisis. Réponds avec ton cœur, et avec prudence.",
    win: "Legba sourit. « Tu sais choisir ton chemin. Prends mon pas : il t'ouvrira les portes. »",
    lose: "Legba secoue la tête. « Réfléchis encore, voyageur. Le carrefour t'attend. »" },
  hevioso: { id: "hevioso", name: "Hévioso", title: "maître du tonnerre", pos: [-30, -46], classes: ["sorcier"], type: "rhythm", color: 0x6a4bd0,
    power: { id: "eclair", name: "Éclair", icon: "ϟ", key: 2, cd: 8, desc: "Le ciel frappe l'ennemi le plus proche, même loin." },
    intro: "Le tonnerre gronde. Répète les rythmes des tambours pour calmer l'orage et mériter sa force.",
    win: "Un éclair traverse le ciel sans te brûler. « Le tonnerre te reconnaît. »",
    lose: "L'orage gronde, plus fort. Écoute mieux, et recommence." },
  gu: { id: "gu", name: "Gu", title: "esprit du fer et de la guerre", pos: [36, -40], classes: ["guerrier"], type: "timing", color: 0x555a66,
    params: { label: "Forge", hits: 5, need: 4, speed: 1.15, zone: 0.2 },
    power: { id: "frappe", name: "Frappe de fer", icon: "✹", key: 1, cd: 7, desc: "Un coup circulaire qui étourdit les ennemis proches." },
    intro: "Frappe le fer quand il est rouge. Trop tôt, trop tard : le métal casse. Il faut le bon moment.",
    win: "Le fer chante. « Ton bras est digne de la lame. »",
    lose: "Le métal s'est brisé. Respire, et reprends le marteau." },
  aziza: { id: "aziza", name: "Aziza", title: "esprit de la forêt et des chasseurs", pos: [-12, 58], classes: ["archer"], type: "timing", color: 0x2f8a52,
    params: { label: "Chasse", hits: 5, need: 3, speed: 1.6, zone: 0.12 },
    power: { id: "tir", name: "Tir du chasseur", icon: "⇉", key: 1, cd: 6, desc: "Trois flèches perçantes en éventail." },
    intro: "Dans la forêt, tout est silence. Tire à l'instant où le souffle s'arrête : ni avant, ni après.",
    win: "Les feuilles s'écartent. « La forêt t'accepte, chasseur. »",
    lose: "Le gibier s'est enfui. Calme ton souffle et réessaie." },
};

export const RIDDLES = [
  { q: "Un étranger affamé frappe à ta porte. Il vient du pays des fusils. Que fais-tu ?",
    o: [["Je le chasse sans un mot.", 0], ["Je le nourris, mais j'écoute ses questions et j'observe ses mains.", 1], ["Je lui donne tout ce que j'ai.", 0], ["Je l'enferme dans ma case.", 0]] },
  { q: "Pour porter un message au village voisin, un chemin est court, un autre passe par les anciens. Lequel prends-tu ?",
    o: [["Le plus court : le temps presse.", 0], ["Celui des anciens : un message se porte avec ceux qui savent.", 1], ["J'envoie un enfant seul.", 0], ["Je laisse le vent le porter.", 0]] },
  { q: "Un ami te propose de s'allier aux étrangers contre ton peuple, en échange d'or. Que fais-tu ?",
    o: [["Je prends l'or et je me tais.", 0], ["Je le frappe devant tout le monde.", 0], ["Je lui parle une dernière fois, puis je préviens les anciens.", 1], ["Je pars loin du village.", 0]] },
];

export const ITEMS = {
  herbe: { name: "Plante médicinale", icon: "🌿", heal: 35, desc: "Soigne 35 PV." },
  potion: { name: "Tisane des anciens", icon: "🍶", heal: 80, desc: "Soigne 80 PV." },
  amulette: { name: "Amulette de Legba", icon: "🔮", desc: "Un porte-bonheur offert par le doyen. +5 PV max.", maxhp: 5 },
  fer: { name: "Fer d'acier", icon: "🔩", desc: "Un morceau de métal étranger. Utile pour les forgerons." },
  carte: { name: "Carte d'Agbo", icon: "🗺", desc: "Une carte dessinée à la main : trois routes vers Abomey, marquées de croix rouges." },
  talisman: { name: "Talisman de fer", icon: "✦", desc: "Forgé par Hounsou. +10 PV max.", maxhp: 10 },
};

/* Chapter 1 flow. stage: 0 talk elder, 1 trials, 2 ridge, 3 patrol, 4 boss, 5 report, 6 done */
export const STAGES = [
  { t: "Le doyen t'appelle", d: "Va parler au doyen Adjovi, près de l'arbre du village." },
  { t: "L'épreuve des esprits", d: "Passe l'épreuve de l'esprit pour recevoir son pouvoir." },
  { t: "Éclaireur de la côte", d: "Monte sur la colline à l'est et observe le navire." },
  { t: "La patrouille", d: "Repousse 4 soldats près du camp de la côte." },
  { t: "Le sorcier traître", d: "Rejoins la case d'Agbo, au sud du camp, et affronte-le." },
  { t: "Rapport au doyen", d: "Reviens au village et raconte ce que tu as vu." },
  { t: "Chapitre 1 terminé", d: "L'ombre grandit. À suivre…" },
];

export const PROLOGUE = [
  "Royaume du Dahomey, sur la côte. Les saisons passent comme les tambours : régulières, fières.",
  "Les anciens racontent que les rois ont toujours su lire le vent. Cette année, le vent a changé.",
  "Ce matin, caché dans les feuillages, tu as vu ce que personne ne voulait croire : un grand navire aux voiles blanches. Et des hommes qui regardent la terre comme s'ils pouvaient la prendre.",
  "Tu n'es qu'un jeune du village d'Adjahoué. Mais on t'a vu courir. Le doyen Adjovi te fait demander.",
];
export const BACKSTORY = {
  sorcier: "Tu as grandi auprès du doyen Adjovi, qui t'a enseigné à lire les signes. Tu sais écouter les esprits, mais jamais encore tu n'as été mis à l'épreuve.",
  guerrier: "Depuis l'enfance, tu t'entraînes avec Nanou, qui sert le roi. Tu rêves de rejoindre l'armée. Aujourd'hui, ton village a besoin de toi avant le roi.",
  archer: "Fils ou fille de chasseurs, tu connais la forêt mieux que les routes. Tu as vu le navire le premier, et tu sais combien de temps il faut pour traverser les bois.",
};
/* In-game journal: short facts, flagged for verification in docs/HISTOIRE.md */
export const CODEX = {
  dahomey: { t: "Le royaume du Dahomey", d: "Royaume ouest-africain dont la capitale était Abomey, et dont la côte comptait un grand port, Ouidah. Il est l'un des États les plus organisés de la région, avec une armée, une administration et des artistes de cour.", at: 0 },
  agojie: { t: "Les Agojie", d: "Corps de guerrières au service du roi du Dahomey. Les Européens les ont appelées « amazones ». Elles s'entraînaient dès le plus jeune âge.", at: "nanou" },
  vodun: { t: "Le Vodun", d: "Religion et ensemble de croyances très répandues dans la région. Les esprits (Legba, Hévioso, Gu, Aziza...) y ont chacun un domaine. Dans le jeu, leurs épreuves sont une invention de gameplay, pas un vrai rituel.", at: "shrine" },
  reliefs: { t: "Les bas-reliefs d'Abomey", d: "Les palais d'Abomey étaient ornés de bas-reliefs en argile polychrome racontant l'histoire des rois à travers des symboles : le lion, le buffle, le requin...", at: "wall" },
  navire: { t: "L'arrivée des navires", d: "Dans les années 1890, la France cherche à étendre son contrôle sur la côte du Dahomey. Les guerres franco-dahoméennes (1890, puis 1892-1894) opposent les deux armées.", at: "ridge" },
  agbo: { t: "Agbo, le traître", d: "Personnage fictif. Dans l'histoire réelle, des alliances entre chefs locaux et puissances étrangères ont existé, pour des raisons très diverses : peur, ambition, rivalités anciennes.", at: "boss" },
  fer: { t: "Le fer et la forge", d: "Le travail du fer a une grande place dans la culture de la région. Gu est l'esprit associé au fer et à la guerre.", at: "gu" },
};
export const SIDE = {
  herbes: { t: "Les herbes de Mère Akossiba", d: "Rapporte 3 plantes médicinales à Mère Akossiba.", need: 3 },
  fer: { t: "Le fer de Hounsou", d: "Rapporte 2 morceaux de fer d'acier pris aux soldats pour le forgeron Hounsou.", need: 2 },
};

export const FOREWORD = "Les lieux, les dates et les noms des personnages sont romancés. Voir docs/HISTOIRE.md pour ce qui est vérifié ou à vérifier.";
