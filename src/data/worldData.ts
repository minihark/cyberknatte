export type ZoneId = 'garage' | 'plaza' | 'park' | 'tower';

export type ItemId =
  | 'laser_wrench'
  | 'super_magnet'
  | 'gold_token'
  | 'turbo_battery'
  | 'cyber_icecream'
  | 'bridge_keycard'
  | 'turbo_coil';

export type MiniGameType = 'math' | 'letters' | 'shapes' | 'highway';

export type DifficultyTier = 1 | 2 | 3; // 1 = 5 år, 2 = 6 år, 3 = 7+ år

export interface InventoryItemDef {
  id: ItemId;
  emoji: string;
  color: string;
  nameSv: string;
  nameEn: string;
  descSv: string;
  descEn: string;
}

export interface HotspotDef {
  id: string;
  zone: ZoneId;
  x: number;
  y: number;
  z: number;
  walkX: number;
  walkZ: number;
  emoji: string;
  labelSv: string;
  labelEn: string;
  kind: 'npc' | 'puzzle' | 'pickup' | 'discovery';
  accentColor: string;
}

export interface ZoneDef {
  id: ZoneId;
  index: number;
  nameSv: string;
  nameEn: string;
  subtitleSv: string;
  subtitleEn: string;
  emoji: string;
  themeColor: string;
  skyColor: string;
  fogColor: string;
  introClipSv: string;
  introClipEn: string;
  introTextSv: string;
  introTextEn: string;
  hintClipSv: string;
  hintTextSv: string;
  hintTextEn: string;
}

export const INVENTORY_ITEMS: Record<ItemId, InventoryItemDef> = {
  laser_wrench: {
    id: 'laser_wrench',
    emoji: '🔧',
    color: '#22d3ee',
    nameSv: 'Laser-Nyckel',
    nameEn: 'Laser Wrench',
    descSv: 'Öppnar motorluckan på Rex sviff-hoj!',
    descEn: 'Opens the engine bay on Rex’s hover-bike!',
  },
  super_magnet: {
    id: 'super_magnet',
    emoji: '🧲',
    color: '#f43f5e',
    nameSv: 'Super-Magnet',
    nameEn: 'Super Magnet',
    descSv: 'Fiskar upp metall-saker ur djupa brunnar!',
    descEn: 'Fishes metal objects out of deep drains!',
  },
  gold_token: {
    id: 'gold_token',
    emoji: '🪙',
    color: '#facc15',
    nameSv: 'Guld-Mynt',
    nameEn: 'Gold Arcade Token',
    descSv: 'Passar i Holo-Automaten på Neon-Torget!',
    descEn: 'Fits inside the Holo-Vending machine in Neon Plaza!',
  },
  turbo_battery: {
    id: 'turbo_battery',
    emoji: '🔋',
    color: '#a855f7',
    nameSv: 'Turbo-Batteri',
    nameEn: 'Turbo Battery',
    descSv: 'Ger ström till Kocken Glasses stora neon-skylt!',
    descEn: 'Powers up Chef Scoops’ giant neon sign!',
  },
  cyber_icecream: {
    id: 'cyber_icecream',
    emoji: '🍦',
    color: '#ec4899',
    nameSv: 'Cyber-Glass',
    nameEn: 'Glowing Cyber Ice-Cream',
    descSv: 'Robo-hunden Pixels absoluta favorit-efterrätt!',
    descEn: 'Pixel the Robo-Dog’s favorite glowing treat!',
  },
  bridge_keycard: {
    id: 'bridge_keycard',
    emoji: '💳',
    color: '#10b981',
    nameSv: 'Bro-Nyckelkort',
    nameEn: 'Bridge Keycard',
    descSv: 'Låser upp datorn till Laser-Bron i Cyber-Parken!',
    descEn: 'Unlocks the Laser Bridge computer in the Cyber Park!',
  },
  turbo_coil: {
    id: 'turbo_coil',
    emoji: '⚡',
    color: '#38bdf8',
    nameSv: 'Turbo-Spole',
    nameEn: 'Turbo Hover-Coil',
    descSv: 'Ger sviff-hojen flygkraft för Neon-Motorvägen!',
    descEn: 'Gives the hover-bike flight boost for the Neon Highway!',
  },
};

export const ZONES: Record<ZoneId, ZoneDef> = {
  garage: {
    id: 'garage',
    index: 1,
    nameSv: '1. Sviff-Garaget',
    nameEn: '1. Hover-Garage',
    subtitleSv: 'Skrot-Gränden & Mekaniker-Maja',
    subtitleEn: 'Scrap Alley & Mechanic Maja',
    emoji: '🏍️',
    themeColor: '#22d3ee',
    skyColor: '#090d24',
    fogColor: '#111938',
    introClipSv: 'sv_zone_garage',
    introClipEn: 'en_zone_garage',
    introTextSv: 'Skrot-Gränden & Sviff-Garaget! Här står min sviff-hoj! Mekaniker-Maja behöver hjälp att öppna motorn.',
    introTextEn: 'Scrap Alley & Hover-Garage! Here is my hover-bike! Mechanic Maja needs help opening the engine.',
    hintClipSv: 'sv_hint_garage',
    hintTextSv: 'Bultens tips: Öppna den röda verktygs-lådan för att ta Laser-Nyckeln, och tryck på Magnet-Kranen!',
    hintTextEn: 'Bolt’s tip: Open the red toolbox to grab the Laser Wrench, and tap the Magnet Crane!',
  },
  plaza: {
    id: 'plaza',
    index: 2,
    nameSv: '2. Neon-Torget',
    nameEn: '2. Neon Plaza',
    subtitleSv: 'Kocken Glasses Cyber-Kiosk',
    subtitleEn: 'Chef Scoops’ Cyber Kiosk',
    emoji: '🍦',
    themeColor: '#f472b6',
    skyColor: '#140826',
    fogColor: '#1f0d3d',
    introClipSv: 'sv_zone_plaza',
    introClipEn: 'en_zone_plaza',
    introTextSv: 'Neon-Torget! Titta på den lysande holo-valen! Kocken Glasse har tappat bokstäverna till sin glass-skylt.',
    introTextEn: 'Neon Plaza! Look at the glowing holo-whale! Chef Scoops lost the letters on his neon ice-cream sign.',
    hintClipSv: 'sv_hint_plaza',
    hintTextSv: 'Bultens tips: Använd Super-Magneten på gatubrunnen för att fiska upp Guld-Myntet till automaten!',
    hintTextEn: 'Bolt’s tip: Use the Super Magnet on the street drain to fish up the Gold Token for the vending machine!',
  },
  park: {
    id: 'park',
    index: 3,
    nameSv: '3. Cyber-Parken',
    nameEn: '3. Cyber Park',
    subtitleSv: 'Laser-Bron & Robo-Hunden Pixel',
    subtitleEn: 'Laser Bridge & Pixel the Robo-Dog',
    emoji: '🌳',
    themeColor: '#34d399',
    skyColor: '#051c24',
    fogColor: '#092c38',
    introClipSv: 'sv_zone_park',
    introClipEn: 'en_zone_park',
    introTextSv: 'Cyber-Parken! Här växer lysande neon-träd, men laser-bron är avstängd och robo-hunden Pixel är hungrig!',
    introTextEn: 'The Cyber Park! Glowing neon trees grow here, but the laser bridge is off and Pixel the Robo-Dog is hungry!',
    hintClipSv: 'sv_hint_park',
    hintTextSv: 'Bultens tips: Ge den lysande Cyber-Glassen från Kocken Glasse till robo-hunden Pixel!',
    hintTextEn: 'Bolt’s tip: Give the glowing Cyber Ice-Cream from Chef Scoops to Pixel the Robo-Dog!',
  },
  tower: {
    id: 'tower',
    index: 4,
    nameSv: '4. Klocktornet',
    nameEn: '4. Clocktower',
    subtitleSv: 'Neon-Motorvägen & Stora Finalen',
    subtitleEn: 'Neon Highway & Grand Finale',
    emoji: '⚡',
    themeColor: '#facc15',
    skyColor: '#1a0b2e',
    fogColor: '#2a1248',
    introClipSv: 'sv_zone_tower',
    introClipEn: 'en_zone_tower',
    introTextSv: 'Klocktornet och Neon-Motorvägen! Nu kan vi köra sviff-hojen hela vägen upp till toppen!',
    introTextEn: 'The Clocktower and Neon Highway! Now we can ride the hover-bike all the way to the top!',
    hintClipSv: 'sv_hint_tower',
    hintTextSv: 'Bultens tips: Klicka på Sviff-Hojen vid start-porten för att köra längs Neon-Motorvägen!',
    hintTextEn: 'Bolt’s tip: Tap the Hover-Bike at the highway gate to race up the Neon Highway!',
  },
};

export const HOTSPOTS: HotspotDef[] = [
  // ZONE 1: GARAGE
  {
    id: 'maja',
    zone: 'garage',
    x: -4.2,
    y: 1.6,
    z: -1.8,
    walkX: -2.6,
    walkZ: -0.6,
    emoji: '👩‍🔧',
    labelSv: 'Mekaniker-Maja',
    labelEn: 'Mechanic Maja',
    kind: 'npc',
    accentColor: '#38bdf8',
  },
  {
    id: 'hoverbike',
    zone: 'garage',
    x: 0.2,
    y: 1.4,
    z: -1.5,
    walkX: 0.2,
    walkZ: 0.4,
    emoji: '🏍️',
    labelSv: 'Sviff-Hojen',
    labelEn: 'Hover-Bike',
    kind: 'puzzle',
    accentColor: '#f43f5e',
  },
  {
    id: 'toolbox',
    zone: 'garage',
    x: -6.2,
    y: 1.2,
    z: 1.4,
    walkX: -4.5,
    walkZ: 1.5,
    emoji: '🧰',
    labelSv: 'Verktygs-Låda',
    labelEn: 'Toolbox',
    kind: 'pickup',
    accentColor: '#fbbf24',
  },
  {
    id: 'crane',
    zone: 'garage',
    x: 5.2,
    y: 2.2,
    z: -1.4,
    walkX: 3.6,
    walkZ: 0.2,
    emoji: '🏗️',
    labelSv: 'Magnet-Kran',
    labelEn: 'Magnet Crane',
    kind: 'pickup',
    accentColor: '#fb7185',
  },
  {
    id: 'jukebox',
    zone: 'garage',
    x: 6.2,
    y: 1.7,
    z: 2.0,
    walkX: 4.5,
    walkZ: 2.0,
    emoji: '📻',
    labelSv: 'Cyber-Jukebox',
    labelEn: 'Cyber Jukebox',
    kind: 'discovery',
    accentColor: '#c084fc',
  },
  {
    id: 'scrapbot',
    zone: 'garage',
    x: -2.5,
    y: 1.0,
    z: 2.8,
    walkX: -1.5,
    walkZ: 2.5,
    emoji: '🤖',
    labelSv: 'Skrot-Robot',
    labelEn: 'Scrap Bot',
    kind: 'discovery',
    accentColor: '#fb923c',
  },

  // ZONE 2: PLAZA
  {
    id: 'glasse',
    zone: 'plaza',
    x: -3.8,
    y: 1.8,
    z: -1.8,
    walkX: -2.4,
    walkZ: 0.0,
    emoji: '🍧',
    labelSv: 'Kocken Glasse',
    labelEn: 'Chef Scoops',
    kind: 'npc',
    accentColor: '#f472b6',
  },
  {
    id: 'neonsign',
    zone: 'plaza',
    x: 0.2,
    y: 2.5,
    z: -2.4,
    walkX: 0.2,
    walkZ: 0.2,
    emoji: '🔤',
    labelSv: 'Neon-Skylt',
    labelEn: 'Neon Sign',
    kind: 'puzzle',
    accentColor: '#22d3ee',
  },
  {
    id: 'drain',
    zone: 'plaza',
    x: -5.4,
    y: 0.6,
    z: 2.2,
    walkX: -3.8,
    walkZ: 2.0,
    emoji: '🕳️',
    labelSv: 'Gatubrunn',
    labelEn: 'Street Drain',
    kind: 'pickup',
    accentColor: '#facc15',
  },
  {
    id: 'vending',
    zone: 'plaza',
    x: 5.2,
    y: 1.8,
    z: -1.4,
    walkX: 3.6,
    walkZ: 0.2,
    emoji: '🎰',
    labelSv: 'Holo-Automat',
    labelEn: 'Holo Vending',
    kind: 'pickup',
    accentColor: '#a855f7',
  },
  {
    id: 'holowhale',
    zone: 'plaza',
    x: 3.5,
    y: 3.4,
    z: 1.8,
    walkX: 2.4,
    walkZ: 1.8,
    emoji: '🐋',
    labelSv: 'Holo-Valen',
    labelEn: 'Holo-Whale',
    kind: 'discovery',
    accentColor: '#38bdf8',
  },

  // ZONE 3: PARK
  {
    id: 'flora',
    zone: 'park',
    x: -4.2,
    y: 1.7,
    z: -1.6,
    walkX: -2.6,
    walkZ: 0.0,
    emoji: '🌱',
    labelSv: 'Växt-Droiden Flora',
    labelEn: 'Botanist Flora',
    kind: 'npc',
    accentColor: '#34d399',
  },
  {
    id: 'pixel_dog',
    zone: 'park',
    x: -1.2,
    y: 1.1,
    z: 1.8,
    walkX: -0.2,
    walkZ: 1.8,
    emoji: '🐕',
    labelSv: 'Robo-Hunden Pixel',
    labelEn: 'Pixel the Robo-Dog',
    kind: 'pickup',
    accentColor: '#f472b6',
  },
  {
    id: 'laserbridge',
    zone: 'park',
    x: 3.4,
    y: 1.6,
    z: -1.2,
    walkX: 1.8,
    walkZ: 0.2,
    emoji: '🌈',
    labelSv: 'Laser-Bron',
    labelEn: 'Laser Bridge',
    kind: 'puzzle',
    accentColor: '#22d3ee',
  },
  {
    id: 'cyberowl',
    zone: 'park',
    x: 5.5,
    y: 2.6,
    z: 1.8,
    walkX: 4.0,
    walkZ: 1.8,
    emoji: '🦉',
    labelSv: 'Cyber-Ugglan Nova',
    labelEn: 'Nova the Cyber-Owl',
    kind: 'discovery',
    accentColor: '#facc15',
  },

  // ZONE 4: TOWER & HIGHWAY
  {
    id: 'dj_blip',
    zone: 'tower',
    x: -3.8,
    y: 1.8,
    z: -1.6,
    walkX: -2.2,
    walkZ: 0.2,
    emoji: '🎧',
    labelSv: 'DJ Blip',
    labelEn: 'DJ Blip',
    kind: 'npc',
    accentColor: '#c084fc',
  },
  {
    id: 'highway_gate',
    zone: 'tower',
    x: 1.2,
    y: 1.8,
    z: -1.5,
    walkX: 0.8,
    walkZ: 0.5,
    emoji: '🚀',
    labelSv: 'Neon-Motorvägen',
    labelEn: 'Neon Highway',
    kind: 'puzzle',
    accentColor: '#facc15',
  },
  {
    id: 'clocktower_core',
    zone: 'tower',
    x: 5.2,
    y: 2.4,
    z: 1.4,
    walkX: 3.6,
    walkZ: 1.4,
    emoji: '🕰️',
    labelSv: 'Kraft-Terminalen',
    labelEn: 'Power Core Terminal',
    kind: 'discovery',
    accentColor: '#22d3ee',
  },
];

// Educational Mini-Game 1: Math & Counting Circuits
export interface MathQuestion {
  leftCount: number;
  rightCount: number; // 0 if simple counting
  answer: number;
  options: number[];
  promptSv: string;
  promptEn: string;
}

export function generateMathQuestion(tier: DifficultyTier): MathQuestion {
  if (tier === 1) {
    // 5 år: Count 2 to 6 glowing energy cells (or simple +1)
    const left = Math.floor(Math.random() * 3) + 1; // 1..3
    const right = Math.floor(Math.random() * 2) + 1; // 1..2
    const ans = left + right;
    const opts = Array.from(new Set([ans, Math.max(1, ans - 1), ans + 1, ans + 2])).slice(0, 3).sort((a, b) => a - b);
    return {
      leftCount: left,
      rightCount: right,
      answer: ans,
      options: opts,
      promptSv: `Räkna alla kraft-celler! Vad är ${left} plus ${right}?`,
      promptEn: `Count all power cells! What is ${left} plus ${right}?`,
    };
  } else if (tier === 2) {
    // 6 år: Addition up to 8
    const left = Math.floor(Math.random() * 4) + 2; // 2..5
    const right = Math.floor(Math.random() * 3) + 1; // 1..3
    const ans = left + right;
    const opts = Array.from(new Set([ans, ans - 1, ans + 1, ans + 2])).slice(0, 4).sort((a, b) => a - b);
    return {
      leftCount: left,
      rightCount: right,
      answer: ans,
      options: opts,
      promptSv: `Koppla kretsen! Vad blir ${left} + ${right}?`,
      promptEn: `Wire the circuit! What is ${left} + ${right}?`,
    };
  } else {
    // 7+ år: Addition up to 12
    const left = Math.floor(Math.random() * 5) + 3; // 3..7
    const right = Math.floor(Math.random() * 5) + 2; // 2..6
    const ans = left + right;
    const opts = Array.from(new Set([ans, ans - 2, ans - 1, ans + 1, ans + 2])).slice(0, 4).sort((a, b) => a - b);
    return {
      leftCount: left,
      rightCount: right,
      answer: ans,
      options: opts,
      promptSv: `Super-Krets! Räkna ut ${left} + ${right}!`,
      promptEn: `Super Circuit! Calculate ${left} + ${right}!`,
    };
  }
}

// Educational Mini-Game 2: Neon Sign Letters & Phonics
export interface LetterQuestion {
  wordSv: string;
  wordDisplay: string; // e.g. "_ I L"
  missingLetter: string;
  emoji: string;
  clipId: string;
  options: string[];
  hintSv: string;
  hintEn: string;
}

export const LETTER_QUESTIONS: LetterQuestion[] = [
  {
    wordSv: 'BIL',
    wordDisplay: '_ I L',
    missingLetter: 'B',
    emoji: '🚓',
    clipId: 'sv_word_bil',
    options: ['B', 'S', 'K', 'T'],
    hintSv: 'Sviff-BIL börjar på B... som i Bil!',
    hintEn: 'BIL starts with the letter B!',
  },
  {
    wordSv: 'SOL',
    wordDisplay: '_ O L',
    missingLetter: 'S',
    emoji: '☀️',
    clipId: 'sv_word_sol',
    options: ['S', 'M', 'R', 'B'],
    hintSv: 'Cyber-SOL börjar på S... som i Sol!',
    hintEn: 'SOL starts with the letter S!',
  },
  {
    wordSv: 'KATT',
    wordDisplay: '_ A T T',
    missingLetter: 'K',
    emoji: '🐱',
    clipId: 'sv_word_katt',
    options: ['K', 'G', 'H', 'P'],
    hintSv: 'Neon-KATT börjar på K... som i Katt!',
    hintEn: 'KATT starts with the letter K!',
  },
  {
    wordSv: 'GLASS',
    wordDisplay: '_ L A S S',
    missingLetter: 'G',
    emoji: '🍦',
    clipId: 'sv_word_glass',
    options: ['G', 'B', 'S', 'L'],
    hintSv: 'Turbo-GLASS börjar på G... som i Glass!',
    hintEn: 'GLASS starts with the letter G!',
  },
  {
    wordSv: 'ROBOT',
    wordDisplay: '_ O B O T',
    missingLetter: 'R',
    emoji: '🤖',
    clipId: 'sv_word_robot',
    options: ['R', 'K', 'N', 'D'],
    hintSv: 'ROBOT börjar på R... som i Robot!',
    hintEn: 'ROBOT starts with the letter R!',
  },
  {
    wordSv: 'HUND',
    wordDisplay: '_ U N D',
    missingLetter: 'H',
    emoji: '🐕',
    clipId: 'sv_word_hund',
    options: ['H', 'F', 'B', 'V'],
    hintSv: 'Robo-HUND börjar på H... som i Hund!',
    hintEn: 'HUND starts with the letter H!',
  },
];

// Educational Mini-Game 3: Laser Bridge Shapes & Logic Patterns
export interface ShapeSymbol {
  id: string;
  emoji: string;
  nameSv: string;
  color: string;
}

export const CYBER_SHAPES: Record<string, ShapeSymbol> = {
  star: { id: 'star', emoji: '⭐', nameSv: 'Stjärna', color: '#facc15' },
  diamond: { id: 'diamond', emoji: '💎', nameSv: 'Diamant', color: '#22d3ee' },
  heart: { id: 'heart', emoji: '🩷', nameSv: 'Hjärta', color: '#f472b6' },
  bolt: { id: 'bolt', emoji: '⚡', nameSv: 'Blixt', color: '#a855f7' },
  circle: { id: 'circle', emoji: '🟢', nameSv: 'Cirkel', color: '#34d399' },
};

export interface PatternQuestion {
  sequence: ShapeSymbol[];
  answer: ShapeSymbol;
  options: ShapeSymbol[];
}

export function generatePatternQuestion(tier: DifficultyTier): PatternQuestion {
  const keys = Object.keys(CYBER_SHAPES);
  const shuffled = [...keys].sort(() => Math.random() - 0.5);
  const a = CYBER_SHAPES[shuffled[0]];
  const b = CYBER_SHAPES[shuffled[1]];
  const c = CYBER_SHAPES[shuffled[2]];

  if (tier === 1) {
    // A B A B -> ? (A)
    return {
      sequence: [a, b, a, b],
      answer: a,
      options: [a, b, c].sort(() => Math.random() - 0.5),
    };
  } else if (tier === 2) {
    // A A B A A -> ? (B)
    return {
      sequence: [a, a, b, a, a],
      answer: b,
      options: [a, b, c].sort(() => Math.random() - 0.5),
    };
  } else {
    // A B C A B -> ? (C)
    return {
      sequence: [a, b, c, a, b],
      answer: c,
      options: [a, b, c, CYBER_SHAPES[shuffled[3]]].sort(() => Math.random() - 0.5),
    };
  }
}
