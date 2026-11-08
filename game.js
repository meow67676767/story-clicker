// ============================================================
// Story Clicker — Web Port (Canvas 2D + Web Audio)
// Replicating main.py Pygame Zero behavior 1:1
// ============================================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WIDTH = 800;
const HEIGHT = 600;

// ------------------------------------------------------------
// Audio Manager (Web Audio API + HTML5 Audio fallback)
// ------------------------------------------------------------
let audioCtx = null;
let musicAudio = null;
let isMuted = false;

const soundFiles = {
  click: "sounds/click.wav",
  click1: "sounds/click1.wav",
  hit: "sounds/hit.wav",
  coin: "sounds/coin.wav",
  upgrade: "sounds/upgrade.wav"
};

const audioBuffers = {};

function initAudio() {
  if (audioCtx) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  audioCtx = new AudioContext();

  // Load sound effects as AudioBuffers
  for (const [key, path] of Object.entries(soundFiles)) {
    fetch(path)
      .then(res => res.arrayBuffer())
      .then(buf => audioCtx.decodeAudioData(buf))
      .then(decoded => { audioBuffers[key] = decoded; })
      .catch(err => console.warn(`Sound load failed for ${key}:`, err));
  }

  // Background music
  musicAudio = new Audio("music/fon_music_1.ogg");
  musicAudio.loop = true;
  musicAudio.volume = music_volume / 100;
  
  const playPromise = musicAudio.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      document.getElementById("audioHint").style.display = "block";
    });
  }
}

function unlockAudioOnInteraction() {
  initAudio();
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  if (musicAudio && musicAudio.paused && !isMuted) {
    musicAudio.play().then(() => {
      document.getElementById("audioHint").style.display = "none";
    }).catch(() => {});
  }
}

function playSound(key) {
  if (isMuted || volume <= 0) return;
  if (!audioCtx || !audioBuffers[key]) {
    // Fallback simple Audio
    const snd = new Audio(soundFiles[key]);
    snd.volume = volume / 100;
    snd.play().catch(() => {});
    return;
  }
  try {
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffers[key];
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = volume / 100;
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start(0);
  } catch (e) {
    console.warn(e);
  }
}

// ------------------------------------------------------------
// Asset Loader
// ------------------------------------------------------------
const imageSources = {
  fon: "images/fon.png",
  fon_level2: "images/fon_level2.png",
  fon_menu: "images/fon_menu.png",
  loading_1: "images/loading_1.png",
  loading_2: "images/loading_2.png",
  loading_3: "images/loading_3.png",
  settings_fon: "images/settings_fon.png",
  library_fon: "images/library_fon.png",
  play_button: "images/play_button.png",
  settings_button: "images/settings_button.png",
  library_button: "images/library_button.png",
  shop_tab: "images/shop_tab.png",
  shop_panel: "images/shop_panel.png",
  settings_btn_small: "images/settings_btn_small.png",
  btn_buy: "images/btn_buy.png",
  battle_button: "images/battle_button.png",
  back_button: "images/back_button.png",
  vol_minus: "images/vol_minus.png",
  vol_plus: "images/vol_plus.png",
  diff_easy: "images/diff_easy.png",
  diff_normal: "images/diff_normal.png",
  diff_hard: "images/diff_hard.png",
  enemy_slime: "images/enemy_slime.png",
  enemy_knight: "images/enemy_knight.png"
};

const images = {};
let totalImages = Object.keys(imageSources).length;
let loadedImages = 0;
let allAssetsLoaded = false;

for (const [key, src] of Object.entries(imageSources)) {
  const img = new Image();
  img.src = src;
  img.onload = () => {
    loadedImages++;
    if (loadedImages === totalImages) {
      allAssetsLoaded = true;
    }
  };
  images[key] = img;
}

// ------------------------------------------------------------
// Actor helper (matches Pygame Zero Actor)
// ------------------------------------------------------------
class Actor {
  constructor(imageKey, pos = null) {
    this.imageKey = imageKey;
    this.width = 0;
    this.height = 0;
    this.x = 0;
    this.y = 0;
    this.scale = 1.0;
    if (pos) {
      this.x = pos[0];
      this.y = pos[1];
    }
  }

  get image() {
    return images[this.imageKey];
  }

  set image(key) {
    this.imageKey = key;
  }

  get topleft() {
    const w = this.image && this.image.naturalWidth ? this.image.naturalWidth : this.width;
    const h = this.image && this.image.naturalHeight ? this.image.naturalHeight : this.height;
    return [this.x - w / 2, this.y - h / 2];
  }

  set topleft(pos) {
    const w = this.image && this.image.naturalWidth ? this.image.naturalWidth : this.width;
    const h = this.image && this.image.naturalHeight ? this.image.naturalHeight : this.height;
    this.x = pos[0] + w / 2;
    this.y = pos[1] + h / 2;
  }

  get rect() {
    const w = (this.image && this.image.naturalWidth ? this.image.naturalWidth : this.width) * this.scale;
    const h = (this.image && this.image.naturalHeight ? this.image.naturalHeight : this.height) * this.scale;
    return {
      x: this.x - w / 2,
      y: this.y - h / 2,
      w: w,
      h: h
    };
  }

  collidepoint(pos) {
    const r = this.rect;
    return pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h;
  }

  draw() {
    const img = this.image;
    if (!img || !img.complete || img.naturalWidth === 0) return;
    this.width = img.naturalWidth;
    this.height = img.naturalHeight;
    const w = this.width * this.scale;
    const h = this.height * this.scale;
    ctx.drawImage(img, this.x - w / 2, this.y - h / 2, w, h);
  }
}

class UIRect {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }
  get center() {
    return [this.x + this.w / 2, this.y + this.h / 2];
  }
  collidepoint(pos) {
    return pos.x >= this.x && pos.x <= this.x + this.w && pos.y >= this.y && pos.y <= this.y + this.h;
  }
}

// ------------------------------------------------------------
// Game State & Variables (matches main.py)
// ------------------------------------------------------------
let mode = "menu";
let volume = 80;
let music_volume = 30;
let difficulty = "Средняя";
let diff_mult = 1.0;
let load_progress = 0.0;
let shop_open = false;
let shop_x = -320;

let gold = 0;
let click_damage = 1;
let enemy_max_hp = 100;
let enemy_hp = 100;
let enemy_name = "Slime";
let gold_given_per_click = 0.5;
let current_level = 1;

let upg_dmg_lvl = 0;
let upg_dmg_cost = 20;

let upg_gold_lvl = 0;
let upg_gold_cost = 35;

let upg_poison_lvl = 0;
let upg_poison_cost = 50;
let passive_dps = 0;

let upg_mine_lvl = 0;
let upg_mine_cost = 40;
let passive_gold = 0;

let passive_timer = 0.0;
let story_timer = 0.0;

// Hit particle / effect
let hitAnimTimer = 0;
const floatingTexts = [];

// Actors
const fon = new Actor("fon", [WIDTH / 2, HEIGHT / 2]);
const fon_lvl_2 = new Actor("fon_level2", [WIDTH / 2, HEIGHT / 2]);
const fon_menu = new Actor("fon_menu", [WIDTH / 2, HEIGHT / 2]);
const settings_fon = new Actor("settings_fon", [WIDTH / 2, HEIGHT / 2]);
const library_fon = new Actor("library_fon", [WIDTH / 2, HEIGHT / 2]);

const loading_bgs = [
  new Actor("loading_1", [WIDTH / 2, HEIGHT / 2]),
  new Actor("loading_2", [WIDTH / 2, HEIGHT / 2]),
  new Actor("loading_3", [WIDTH / 2, HEIGHT / 2])
];
let current_bg = loading_bgs[0];

const play_button = new Actor("play_button", [WIDTH / 2, 250]);
const settings_button = new Actor("settings_button", [WIDTH / 2, 370]);
const library_button = new Actor("library_button", [WIDTH / 2, 490]);
const shop_tab = new Actor("shop_tab", [WIDTH / 2, HEIGHT - 50]);
const shop_panel = new Actor("shop_panel", [WIDTH / 2, HEIGHT - 200]);
const settings_btn_small = new Actor("settings_btn_small", [WIDTH - 40, 40]);

const btn_upg_dmg = new Actor("btn_buy", [-150, 145]);
const btn_upg_gold = new Actor("btn_buy", [-150, 255]);
const btn_upg_poison = new Actor("btn_buy", [-150, 365]);
const btn_upg_mine = new Actor("btn_buy", [-150, 475]);

const battle_button = new Actor("battle_button", [WIDTH / 2, 475]);
const sfx_minus = new Actor("vol_minus", [290, 180]);
const sfx_plus = new Actor("vol_plus", [510, 180]);
const mus_minus = new Actor("vol_minus", [290, 260]);
const mus_plus = new Actor("vol_plus", [510, 260]);
const back_button = new Actor("back_button", [WIDTH / 2, 490]);

const diff_easy = new Actor("diff_easy", [240, 395]);
const diff_normal = new Actor("diff_normal", [400, 395]);
const diff_hard = new Actor("diff_hard", [560, 395]);

const enemy = new Actor("enemy_slime", [WIDTH / 2 + 60, HEIGHT / 2 + 10]);

const hints = [
  "Совет: кликай быстрее, чтобы разбудить спящую силу.",
  "Совет: древние порталы хранят секреты павших королей.",
  "Совет: каждый босс требует особого терпения.",
  "Совет: не забывай прокачивать силу удара в лавке."
];
let current_hint = hints[0];

// Bestiary Data
let bestiary_index = 0;
const defeated_bosses = { slime: false, knight: false };

const bestiary_actors = [
  new Actor("enemy_slime", [215, 222]),
  new Actor("enemy_knight", [215, 222])
];

const bestiary_tab_rects = [
  new UIRect(138, 84, 256, 32),
  new UIRect(406, 84, 256, 32)
];
const bestiary_prev_rect = new UIRect(96, 84, 34, 32);
const bestiary_next_rect = new UIRect(670, 84, 34, 32);
const bestiary_back_btn = new Actor("back_button", [WIDTH / 2, 510]);

const bestiary_data = [
  {
    id: "slime",
    name: "Мастер Илларион",
    title: "Падший Алхимик",
    level: "УРОВЕНЬ 1 • ЛЕС",
    element: "Кислота / Тёмная Аркана",
    hp_easy: 50,
    hp_normal: 100,
    hp_hard: 200,
    reward_click: "+0.5G",
    reward_kill: "+50G",
    drop: "Осколок алхимической колбы",
    lore: [
      "Главный королевский алхимик Арканума.",
      "Искал вечную жизнь в сиянии Сапфира.",
      "В ночь Катастрофы едкие зелья лаборатории",
      "сплавились с телом, обратив учёного в сгусток",
      "эктоплазмы. Рассудок угас, но рефлексы живы."
    ],
    quote_title: "Запись из лабораторного дневника:",
    quote_l1: "«Сапфировая пыль не вступает в реакцию...",
    quote_l2: "она поглощает воду. Я слышу шепот из колбы...»"
  },
  {
    id: "knight",
    name: "Сир Мордред",
    title: "Падший Страж Катакомб",
    level: "УРОВЕНЬ 2 • КАТАКОМБЫ",
    element: "Изумрудная чума / Проклятая сталь",
    hp_easy: 150,
    hp_normal: 300,
    hp_hard: 600,
    reward_click: "+0.5G",
    reward_kill: "+150G",
    drop: "Рунический двуручный меч",
    lore: [
      "Командующий Королевской Гвардии Арканума.",
      "При прорыве скверны запечатал гермоворота",
      "катакомб изнутри ценой собственной жизни.",
      "Кристаллическая чума проросла сквозь латы,",
      "обратив воина в несокрушимую статую с мечом."
    ],
    quote_title: "Эпитафия на гербовом монументе:",
    quote_l1: "«Здесь пал Орден Железной Розы. Мы заперли врата.",
    quote_l2: "Да простит нас свет за то, что останется внутри...»"
  }
];

// ------------------------------------------------------------
// Drawing Utilities (mimicking Pygame Zero screen.draw.text)
// ------------------------------------------------------------
function drawText(text, options) {
  const fontsize = options.fontsize || 20;
  const fontFace = options.font || "Marcellus, sans-serif";
  ctx.font = `bold ${fontsize}px ${fontFace}`;

  let x = 0;
  let y = 0;

  if (options.center) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    x = options.center[0];
    y = options.center[1];
  } else if (options.topleft) {
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    x = options.topleft[0];
    y = options.topleft[1];
  } else if (options.topright) {
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    x = options.topright[0];
    y = options.topright[1];
  }

  // Shadow
  if (options.shadow) {
    ctx.fillStyle = options.scolor || "black";
    ctx.fillText(text, x + options.shadow[0], y + options.shadow[1]);
  }

  // Outline
  if (options.owidth) {
    ctx.lineWidth = options.owidth * 2;
    ctx.strokeStyle = options.ocolor || "black";
    ctx.lineJoin = "round";
    ctx.strokeText(text, x, y);
  }

  // Gradient or solid color
  if (options.gcolor && options.center) {
    const grad = ctx.createLinearGradient(x, y - fontsize / 2, x, y + fontsize / 2);
    grad.addColorStop(0, colorToString(options.color));
    grad.addColorStop(1, colorToString(options.gcolor));
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = colorToString(options.color || "white");
  }

  ctx.fillText(text, x, y);
}

function colorToString(c) {
  if (Array.isArray(c)) {
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  }
  return c;
}

function drawRect(rect, color, lineWidth = 1) {
  ctx.strokeStyle = colorToString(color);
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
}

function drawFilledRect(rect, color) {
  ctx.fillStyle = colorToString(color);
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

function drawLine(p1, p2, color, lineWidth = 1) {
  ctx.beginPath();
  ctx.moveTo(p1[0], p1[1]);
  ctx.lineTo(p2[0], p2[1]);
  ctx.strokeStyle = colorToString(color);
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function addFloatingText(text, x, y, color = "#ffea79") {
  floatingTexts.push({
    text: text,
    x: x + (Math.random() * 30 - 15),
    y: y - 10,
    color: color,
    alpha: 1.0,
    life: 0.8
  });
}

// ------------------------------------------------------------
// Draw Loop (matches draw() in main.py)
// ------------------------------------------------------------
function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  if (mode === "menu") {
    fon_menu.draw();
    drawText("STORY CLICKER", {
      center: [WIDTH / 2, 130],
      fontsize: 56,
      font: "Cinzel, serif",
      color: [255, 230, 120],
      gcolor: [180, 110, 20],
      owidth: 2.5,
      ocolor: [20, 10, 5],
      shadow: [3, 3],
      scolor: "black"
    });
    play_button.draw();
    settings_button.draw();
    library_button.draw();
  } else if (mode === "loading") {
    current_bg.draw();
    drawText("ЗАГРУЗКА...", {
      center: [WIDTH / 2, HEIGHT - 75],
      fontsize: 32,
      font: "Cinzel, serif",
      color: "gold",
      owidth: 1.8,
      ocolor: "black"
    });
    drawText(current_hint, {
      center: [WIDTH / 2, HEIGHT - 35],
      fontsize: 20,
      color: "white",
      owidth: 1.2,
      ocolor: "black"
    });

    // Loading progress bar
    drawRect(new UIRect(200, 480, 400, 16), "gold", 2);
    drawFilledRect(new UIRect(202, 482, 396 * load_progress, 12), [80, 200, 255]);
  } else if (mode === "prologue") {
    settings_fon.draw();
    drawText("ПАДЕНИЕ АРКАНУМА", {
      center: [WIDTH / 2, 110],
      fontsize: 36,
      font: "Cinzel, serif",
      color: "gold",
      owidth: 2,
      ocolor: "black"
    });

    const story_lines = [
      "Великое королевство Арканум пало жертвой «Изумрудной Чумы» —",
      "алхимического паразита, обратившего всех жителей в мутантов.",
      "",
      "Ты — последний Странник из древнего Ордена Очищения.",
      "В твоих руках зачарованный клинок, способный рассекать скверну.",
      "",
      "Твоя цель — пробиться через катакомбы к Главному Реактору.",
      "На опушке леса дорогу преграждает первое порождение чумы..."
    ];

    const visible_lines = Math.min(story_lines.length, Math.floor(story_timer / 0.6) + 1);
    let y_text = 175;
    for (let i = 0; i < visible_lines; i++) {
      drawText(story_lines[i], {
        center: [WIDTH / 2, y_text],
        fontsize: 18,
        color: [240, 230, 210],
        owidth: 1.2,
        ocolor: "black"
      });
      y_text += 30;
    }

    if (visible_lines >= story_lines.length) {
      battle_button.draw();
    }
  } else if (mode === "game") {
    if (current_level === 1) {
      fon.draw();
    } else {
      fon_lvl_2.draw();
    }

    drawText(`ЗОЛОТО: ${Math.floor(gold)}`, {
      topright: [WIDTH - 70, 20],
      fontsize: 26,
      color: "gold",
      owidth: 1.4,
      ocolor: "black"
    });
    drawText(`УРОН: ${click_damage}`, {
      topleft: [30, 20],
      fontsize: 24,
      color: "white",
      owidth: 1.4,
      ocolor: "black"
    });

    // Enemy hit animation / squish
    if (hitAnimTimer > 0) {
      enemy.scale = 0.94;
    } else {
      enemy.scale = 1.0;
    }
    enemy.draw();

    drawText(enemy_name, {
      center: [enemy.x, enemy.y - 125],
      fontsize: 22,
      font: "Cinzel, serif",
      color: "gold",
      owidth: 1.4,
      ocolor: "black"
    });
    drawText(`HP: ${enemy_hp} / ${enemy_max_hp}`, {
      center: [enemy.x, enemy.y - 100],
      fontsize: 24,
      color: "#e63946",
      owidth: 1.5,
      ocolor: "black"
    });

    shop_tab.draw();
    shop_panel.draw();
    settings_btn_small.draw();

    // Upgrades in sliding shop panel
    if (shop_x > -300) {
      drawText("УЛУЧШЕНИЯ", {
        center: [shop_x + 150, 40],
        fontsize: 26,
        font: "Cinzel, serif",
        color: "gold",
        owidth: 1.4,
        ocolor: "black"
      });

      // 1. Урон
      drawText(`Острота клинка (Ур. ${upg_dmg_lvl})`, {
        center: [shop_x + 150, 85],
        fontsize: 17,
        color: "white",
        owidth: 1,
        ocolor: "black"
      });
      drawText("+1 к урону от клика", {
        center: [shop_x + 150, 108],
        fontsize: 13,
        color: "#aaa",
        owidth: 1,
        ocolor: "black"
      });
      btn_upg_dmg.draw();
      drawText(`Купить: ${upg_dmg_cost}G`, {
        center: [btn_upg_dmg.x, btn_upg_dmg.y],
        fontsize: 16,
        color: "gold",
        owidth: 1,
        ocolor: "black"
      });

      // 2. Золото за клик
      drawText(`Золотые пальцы (${upg_gold_lvl}/2)`, {
        center: [shop_x + 150, 195],
        fontsize: 17,
        color: "white",
        owidth: 1,
        ocolor: "black"
      });
      drawText("+0.5G за клик", {
        center: [shop_x + 150, 218],
        fontsize: 13,
        color: "#aaa",
        owidth: 1,
        ocolor: "black"
      });
      btn_upg_gold.draw();
      if (upg_gold_lvl < 2) {
        drawText(`Купить: ${upg_gold_cost}G`, {
          center: [btn_upg_gold.x, btn_upg_gold.y],
          fontsize: 16,
          color: "gold",
          owidth: 1,
          ocolor: "black"
        });
      } else {
        drawText("[МАКСИМУМ]", {
          center: [btn_upg_gold.x, btn_upg_gold.y],
          fontsize: 15,
          color: "gray",
          owidth: 1,
          ocolor: "black"
        });
      }

      // 3. Пассивный яд
      drawText(`Скверный яд (Ур. ${upg_poison_lvl})`, {
        center: [shop_x + 150, 305],
        fontsize: 17,
        color: "white",
        owidth: 1,
        ocolor: "black"
      });
      drawText(`+2 урона/сек (сейчас: ${passive_dps})`, {
        center: [shop_x + 150, 328],
        fontsize: 13,
        color: "#aaa",
        owidth: 1,
        ocolor: "black"
      });
      btn_upg_poison.draw();
      drawText(`Купить: ${upg_poison_cost}G`, {
        center: [btn_upg_poison.x, btn_upg_poison.y],
        fontsize: 16,
        color: "gold",
        owidth: 1,
        ocolor: "black"
      });

      // 4. Монетница
      drawText(`Монетница (Ур. ${upg_mine_lvl})`, {
        center: [shop_x + 150, 415],
        fontsize: 17,
        color: "white",
        owidth: 1,
        ocolor: "black"
      });
      drawText(`+1G/сек (сейчас: ${passive_gold})`, {
        center: [shop_x + 150, 438],
        fontsize: 13,
        color: "#aaa",
        owidth: 1,
        ocolor: "black"
      });
      btn_upg_mine.draw();
      drawText(`Купить: ${upg_mine_cost}G`, {
        center: [btn_upg_mine.x, btn_upg_mine.y],
        fontsize: 16,
        color: "gold",
        owidth: 1,
        ocolor: "black"
      });
    }

    // Floating text particles
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ctx.globalAlpha = Math.max(0, ft.alpha);
      drawText(ft.text, {
        center: [ft.x, ft.y],
        fontsize: 20,
        font: "Cinzel, serif",
        color: ft.color,
        owidth: 1.5,
        ocolor: "black"
      });
      ctx.globalAlpha = 1.0;
    }
  } else if (mode === "settings" || mode === "settings1") {
    settings_fon.draw();
    drawText("НАСТРОЙКИ", {
      center: [WIDTH / 2, 105],
      fontsize: 46,
      font: "Cinzel, serif",
      color: "gold",
      owidth: 2,
      ocolor: "black"
    });

    sfx_minus.draw();
    drawText(`ЗВУКИ: ${volume}%`, {
      center: [400, 180],
      fontsize: 24,
      color: "white",
      owidth: 1.4,
      ocolor: "black"
    });
    sfx_plus.draw();

    mus_minus.draw();
    drawText(`МУЗЫКА: ${music_volume}%`, {
      center: [400, 260],
      fontsize: 24,
      color: "white",
      owidth: 1.4,
      ocolor: "black"
    });
    mus_plus.draw();

    drawText(`СЛОЖНОСТЬ: ${difficulty.toUpperCase()}`, {
      center: [WIDTH / 2, 335],
      fontsize: 22,
      color: "gold",
      owidth: 1.2,
      ocolor: "black"
    });
    diff_easy.draw();
    diff_normal.draw();
    diff_hard.draw();

    back_button.draw();
  } else if (mode === "library") {
    library_fon.draw();
    const m = bestiary_data[bestiary_index];

    // Header
    drawText("БЕСТИАРИЙ", {
      center: [WIDTH / 2, 38],
      fontsize: 42,
      font: "Cinzel, serif",
      color: "gold",
      gcolor: [180, 120, 20],
      owidth: 2,
      ocolor: "black"
    });
    drawText("Хроники проклятого королевства Арканум", {
      center: [WIDTH / 2, 64],
      fontsize: 15,
      color: [210, 195, 170],
      owidth: 1,
      ocolor: "black"
    });

    // Arrow buttons
    drawFilledRect(bestiary_prev_rect, [25, 30, 42]);
    drawRect(bestiary_prev_rect, [180, 140, 50], 1.5);
    drawText("<", { center: bestiary_prev_rect.center, fontsize: 22, color: "gold", owidth: 1, ocolor: "black" });

    drawFilledRect(bestiary_next_rect, [25, 30, 42]);
    drawRect(bestiary_next_rect, [180, 140, 50], 1.5);
    drawText(">", { center: bestiary_next_rect.center, fontsize: 22, color: "gold", owidth: 1, ocolor: "black" });

    // Tabs
    bestiary_tab_rects.forEach((tab_rect, i) => {
      const isActive = (i === bestiary_index);
      const bg_col = isActive ? [55, 42, 18] : [20, 24, 34];
      const bd_col = isActive ? "gold" : [75, 80, 95];
      const txt_col = isActive ? "gold" : [150, 150, 155];
      const tab_name = bestiary_data[i].name;

      drawFilledRect(tab_rect, bg_col);
      drawRect(tab_rect, bd_col, 1.5);
      drawText(`${i + 1}. ${tab_name}`, {
        center: tab_rect.center,
        fontsize: 16,
        color: txt_col,
        owidth: 1,
        ocolor: "black"
      });
    });

    // Left Column
    const left_rect = new UIRect(96, 126, 238, 334);
    ctx.fillStyle = "rgba(12, 16, 26, 0.7)";
    ctx.fillRect(left_rect.x, left_rect.y, left_rect.w, left_rect.h);
    drawRect(left_rect, [70, 60, 42], 1.5);

    bestiary_actors[bestiary_index].draw();

    drawText(m.name, { center: [215, 346], fontsize: 19, font: "Cinzel, serif", color: "gold", owidth: 1.4, ocolor: "black" });
    drawText(m.title, { center: [215, 368], fontsize: 13, color: [220, 210, 190], owidth: 1, ocolor: "black" });
    drawText(m.element, { center: [215, 388], fontsize: 12, color: [140, 225, 170], owidth: 1, ocolor: "black" });

    // Defeated badge
    const badge_rect = new UIRect(110, 412, 210, 24);
    if (defeated_bosses[m.id]) {
      drawFilledRect(badge_rect, [20, 50, 28]);
      drawRect(badge_rect, [80, 200, 100], 1.5);
      drawText("[ ПОБЕЖДЁН В БОЮ ]", { center: badge_rect.center, fontsize: 12, color: [140, 255, 160], owidth: 1, ocolor: "black" });
    } else {
      drawFilledRect(badge_rect, [50, 25, 20]);
      drawRect(badge_rect, [200, 80, 50], 1.5);
      drawText("[ ЦЕЛЬ НЕ ПОВЕРЖЕНА ]", { center: badge_rect.center, fontsize: 12, color: [255, 180, 100], owidth: 1, ocolor: "black" });
    }

    // Right Column
    const right_rect = new UIRect(350, 126, 354, 334);
    ctx.fillStyle = "rgba(12, 16, 26, 0.7)";
    ctx.fillRect(right_rect.x, right_rect.y, right_rect.w, right_rect.h);
    drawRect(right_rect, [70, 60, 42], 1.5);

    drawText("ХАРАКТЕРИСТИКИ", { topleft: [362, 136], fontsize: 15, font: "Cinzel, serif", color: "gold", owidth: 1.2, ocolor: "black" });
    drawText(m.level, { topright: [694, 137], fontsize: 12, color: [220, 200, 140], owidth: 1, ocolor: "black" });
    drawLine([362, 156], [694, 156], [100, 80, 35]);

    drawText("Здоровье (HP):", { topleft: [362, 164], fontsize: 13, color: [170, 180, 195], owidth: 1, ocolor: "black" });
    const hp_text = `${m.hp_easy} / ${m.hp_normal} / ${m.hp_hard}  (Лёгк / Сред / Слож)`;
    drawText(hp_text, { topleft: [458, 164], fontsize: 12, color: "#e63946", owidth: 1, ocolor: "black" });

    drawText("Награда:", { topleft: [362, 182], fontsize: 13, color: [170, 180, 195], owidth: 1, ocolor: "black" });
    drawText(`Клик ${m.reward_click}   |   Победа ${m.reward_kill}`, { topleft: [428, 182], fontsize: 13, color: "gold", owidth: 1, ocolor: "black" });

    drawText("Трофей:", { topleft: [362, 200], fontsize: 13, color: [170, 180, 195], owidth: 1, ocolor: "black" });
    drawText(m.drop, { topleft: [423, 200], fontsize: 13, color: [255, 220, 120], owidth: 1, ocolor: "black" });

    drawLine([362, 220], [694, 220], [100, 80, 35]);
    drawText("ХРОНИКИ ПАДЕНИЯ", { topleft: [362, 226], fontsize: 15, font: "Cinzel, serif", color: "gold", owidth: 1.2, ocolor: "black" });

    let y_l = 248;
    for (const line of m.lore) {
      drawText(line, { topleft: [362, y_l], fontsize: 13, color: [230, 220, 205], owidth: 1, ocolor: "black" });
      y_l += 19;
    }

    drawLine([362, 354], [694, 354], [85, 70, 30]);
    drawText(m.quote_title, { topleft: [362, 360], fontsize: 11, color: [175, 165, 145], owidth: 1, ocolor: "black" });
    drawText(m.quote_l1, { center: [528, 382], fontsize: 12, color: [255, 225, 140], owidth: 1, ocolor: "black" });
    drawText(m.quote_l2, { center: [528, 398], fontsize: 12, color: [255, 225, 140], owidth: 1, ocolor: "black" });

    bestiary_back_btn.draw();
  } else if (mode === "victory") {
    settings_fon.draw();
    drawText("ДЕМО ПРОЙДЕНО!", {
      center: [WIDTH / 2, 140],
      fontsize: 42,
      font: "Cinzel, serif",
      color: "gold",
      owidth: 2,
      ocolor: "black"
    });
    drawText("Сир Мордред пал. Врата Катакомб распахнуты!", {
      center: [WIDTH / 2, 220],
      fontsize: 20,
      color: "white",
      owidth: 1.2,
      ocolor: "black"
    });
    drawText(`Собрано золота: ${Math.floor(gold)}`, {
      center: [WIDTH / 2, 290],
      fontsize: 24,
      color: "gold",
      owidth: 1.4,
      ocolor: "black"
    });
    drawText("Продолжение следует...", {
      center: [WIDTH / 2, 350],
      fontsize: 20,
      color: "gray",
      owidth: 1,
      ocolor: "black"
    });
    back_button.draw();
  }
}

// ------------------------------------------------------------
// Update Loop (matches update(dt) in main.py)
// ------------------------------------------------------------
let lastTime = performance.now();

function update(dt) {
  if (mode === "loading") {
    load_progress = Math.min(1.0, load_progress + dt * 0.4);
    if (load_progress >= 1.0) {
      mode = "prologue";
      story_timer = 0.0;
    }
  }

  // Sliding shop animation
  const target_x = shop_open ? 0 : -320;
  shop_x += (target_x - shop_x) * 12 * dt;
  shop_panel.topleft = [shop_x, 0];
  shop_tab.topleft = [shop_x + 316, 260];

  btn_upg_dmg.x = shop_x + 150;
  btn_upg_gold.x = shop_x + 150;
  btn_upg_poison.x = shop_x + 150;
  btn_upg_mine.x = shop_x + 150;

  if (mode === "prologue") {
    story_timer += dt;
  }

  if (mode === "game") {
    passive_timer += dt;
    if (passive_timer >= 1.0) {
      passive_timer = 0.0;
      gold += passive_gold;
      if (enemy_hp > 0 && passive_dps > 0) {
        enemy_hp = Math.max(0, enemy_hp - passive_dps);
      }
    }
  }

  // Hit animation timer
  if (hitAnimTimer > 0) {
    hitAnimTimer -= dt;
  }

  // Update floating text particles
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y -= 25 * dt;
    ft.life -= dt;
    ft.alpha = ft.life / 0.8;
    if (ft.life <= 0) {
      floatingTexts.splice(i, 1);
    }
  }
}

function gameLoop(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  update(dt);
  draw();

  requestAnimationFrame(gameLoop);
}

// ------------------------------------------------------------
// Input Handling (matches on_mouse_down & on_key_down in main.py)
// ------------------------------------------------------------
function getCanvasMousePos(evt) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (evt.clientX - rect.left) * scaleX,
    y: (evt.clientY - rect.top) * scaleY
  };
}

canvas.addEventListener("mousedown", (evt) => {
  unlockAudioOnInteraction();
  const pos = getCanvasMousePos(evt);

  if (mode === "menu") {
    if (play_button.collidepoint(pos)) {
      playSound("click1");
      current_bg = loading_bgs[Math.floor(Math.random() * loading_bgs.length)];
      current_hint = hints[Math.floor(Math.random() * hints.length)];
      load_progress = 0.0;
      mode = "loading";
    } else if (settings_button.collidepoint(pos)) {
      playSound("click1");
      mode = "settings";
    } else if (library_button.collidepoint(pos)) {
      playSound("click1");
      mode = "library";
    }
  } else if (mode === "settings") {
    if (sfx_minus.collidepoint(pos)) {
      playSound("click1");
      volume = Math.max(0, volume - 5);
    } else if (sfx_plus.collidepoint(pos)) {
      playSound("click1");
      volume = Math.min(100, volume + 5);
    } else if (mus_minus.collidepoint(pos)) {
      playSound("click1");
      music_volume = Math.max(0, music_volume - 5);
      if (musicAudio) musicAudio.volume = music_volume / 100;
    } else if (mus_plus.collidepoint(pos)) {
      playSound("click1");
      music_volume = Math.min(100, music_volume + 5);
      if (musicAudio) musicAudio.volume = music_volume / 100;
    } else if (diff_easy.collidepoint(pos)) {
      playSound("click1");
      difficulty = "Лёгкая";
      diff_mult = 0.5;
    } else if (diff_normal.collidepoint(pos)) {
      playSound("click1");
      difficulty = "Средняя";
      diff_mult = 1.0;
    } else if (diff_hard.collidepoint(pos)) {
      playSound("click1");
      difficulty = "Сложная";
      diff_mult = 2.0;
    } else if (back_button.collidepoint(pos)) {
      playSound("click1");
      mode = "menu";
    }
  } else if (mode === "settings1") {
    if (sfx_minus.collidepoint(pos)) {
      playSound("click1");
      volume = Math.max(0, volume - 5);
    } else if (sfx_plus.collidepoint(pos)) {
      playSound("click1");
      volume = Math.min(100, volume + 5);
    } else if (mus_minus.collidepoint(pos)) {
      playSound("click1");
      music_volume = Math.max(0, music_volume - 5);
      if (musicAudio) musicAudio.volume = music_volume / 100;
    } else if (mus_plus.collidepoint(pos)) {
      playSound("click1");
      music_volume = Math.min(100, music_volume + 5);
      if (musicAudio) musicAudio.volume = music_volume / 100;
    } else if (diff_easy.collidepoint(pos)) {
      playSound("click1");
      difficulty = "Лёгкая";
      diff_mult = 0.5;
    } else if (diff_normal.collidepoint(pos)) {
      playSound("click1");
      difficulty = "Средняя";
      diff_mult = 1.0;
    } else if (diff_hard.collidepoint(pos)) {
      playSound("click1");
      difficulty = "Сложная";
      diff_mult = 2.0;
    } else if (back_button.collidepoint(pos)) {
      playSound("click1");
      mode = "game";
    }
  } else if (mode === "library") {
    if (bestiary_back_btn.collidepoint(pos) || back_button.collidepoint(pos)) {
      playSound("click1");
      mode = "menu";
    } else if (bestiary_prev_rect.collidepoint(pos)) {
      playSound("click1");
      bestiary_index = (bestiary_index - 1 + bestiary_data.length) % bestiary_data.length;
    } else if (bestiary_next_rect.collidepoint(pos)) {
      playSound("click1");
      bestiary_index = (bestiary_index + 1) % bestiary_data.length;
    } else {
      bestiary_tab_rects.forEach((rect, i) => {
        if (rect.collidepoint(pos)) {
          playSound("click1");
          bestiary_index = i;
        }
      });
    }
  } else if (mode === "game") {
    if (shop_tab.collidepoint(pos)) {
      shop_open = !shop_open;
      playSound("click");
    } else if (settings_btn_small.collidepoint(pos)) {
      playSound("click1");
      mode = "settings1";
    } else if (enemy.collidepoint(pos)) {
      if (enemy_hp > 0) {
        playSound("hit");
        hitAnimTimer = 0.08;
        enemy_hp = Math.max(0, enemy_hp - click_damage);
        gold += gold_given_per_click;
        addFloatingText(`-${click_damage}`, pos.x, pos.y - 15, "#ff4d4d");
        addFloatingText(`+${gold_given_per_click}G`, pos.x + 20, pos.y, "#ffd700");
      }

      if (enemy_hp <= 0) {
        playSound("coin");
        if (current_level === 1) {
          defeated_bosses["slime"] = true;
          gold += 50;
          current_level = 2;
          enemy.image = "enemy_knight";
          enemy_name = "Sir Mordred";
          enemy.x = 405;
          enemy.y = 360;
          enemy_max_hp = Math.floor(300 * diff_mult);
          enemy_hp = enemy_max_hp;
          addFloatingText("+50G ПОБЕДА!", WIDTH / 2, HEIGHT / 2, "#ffd700");
        } else if (current_level === 2) {
          defeated_bosses["knight"] = true;
          gold += 150;
          mode = "victory";
        }
      }
    }

    // Upgrades
    if (shop_open && btn_upg_dmg.collidepoint(pos)) {
      if (gold >= upg_dmg_cost) {
        playSound("upgrade");
        gold -= upg_dmg_cost;
        upg_dmg_lvl += 1;
        click_damage += 1;
        upg_dmg_cost = Math.floor(upg_dmg_cost * 1.5);
      }
    } else if (shop_open && btn_upg_gold.collidepoint(pos)) {
      if (upg_gold_lvl < 2 && gold >= upg_gold_cost) {
        playSound("upgrade");
        gold -= upg_gold_cost;
        upg_gold_lvl += 1;
        gold_given_per_click += 0.5;
        upg_gold_cost = Math.floor(upg_gold_cost * 2.0);
      }
    } else if (shop_open && btn_upg_poison.collidepoint(pos)) {
      if (gold >= upg_poison_cost) {
        playSound("upgrade");
        gold -= upg_poison_cost;
        upg_poison_lvl += 1;
        passive_dps += 2;
        upg_poison_cost = Math.floor(upg_poison_cost * 1.6);
      }
    } else if (shop_open && btn_upg_mine.collidepoint(pos)) {
      if (gold >= upg_mine_cost) {
        playSound("upgrade");
        gold -= upg_mine_cost;
        upg_mine_lvl += 1;
        passive_gold += 1;
        upg_mine_cost = Math.floor(upg_mine_cost * 1.6);
      }
    }
  } else if (mode === "prologue") {
    if (story_timer < 5.0) {
      story_timer = 5.0;
    } else if (battle_button.collidepoint(pos)) {
      playSound("click1");
      mode = "game";
      current_level = 1;
      enemy.image = "enemy_slime";
      enemy_name = "Slime";
      enemy.x = WIDTH / 2 + 60;
      enemy.y = HEIGHT / 2 + 10;
      enemy_max_hp = Math.floor(100 * diff_mult);
      enemy_hp = enemy_max_hp;
    }
  } else if (mode === "victory") {
    if (back_button.collidepoint(pos)) {
      playSound("click1");
      mode = "menu";
    }
  }
});

window.addEventListener("keydown", (evt) => {
  unlockAudioOnInteraction();
  if (mode === "library") {
    if (evt.key === "ArrowLeft") {
      playSound("click1");
      bestiary_index = (bestiary_index - 1 + bestiary_data.length) % bestiary_data.length;
    } else if (evt.key === "ArrowRight") {
      playSound("click1");
      bestiary_index = (bestiary_index + 1) % bestiary_data.length;
    } else if (evt.key === "Escape") {
      playSound("click1");
      mode = "menu";
    }
  } else if (mode === "settings" || mode === "settings1") {
    if (evt.key === "Escape") {
      playSound("click1");
      mode = (mode === "settings") ? "menu" : "game";
    }
  }
});

// Fullscreen & Sound buttons
document.getElementById("fullscreenBtn").addEventListener("click", () => {
  unlockAudioOnInteraction();
  if (!document.fullscreenElement) {
    document.querySelector(".canvas-frame").requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});

const soundBtn = document.getElementById("soundToggleBtn");
soundBtn.addEventListener("click", () => {
  unlockAudioOnInteraction();
  isMuted = !isMuted;
  if (isMuted) {
    soundBtn.innerHTML = "<span>🔇</span> Без звука";
    if (musicAudio) musicAudio.pause();
  } else {
    soundBtn.innerHTML = "<span>🔊</span> Звук";
    if (musicAudio) musicAudio.play().catch(() => {});
  }
});

// Start loop
requestAnimationFrame(gameLoop);
