import React, { useEffect, useRef, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  SlidersHorizontal,
  RotateCcw,
  Check,
  X,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
} from 'lucide-react';
import { CyberWorld3D, ProjectedHotspot } from './three/CyberWorld3D';
import { cyberAudio, Language } from './audio/cyberAudio';
import {
  ZoneId,
  ZONES,
  HOTSPOTS,
  ItemId,
  INVENTORY_ITEMS,
  MiniGameType,
  DifficultyTier,
  generateMathQuestion,
  MathQuestion,
  LETTER_QUESTIONS,
  LetterQuestion,
  generatePatternQuestion,
  PatternQuestion,
} from './data/worldData';

interface DialogueBanner {
  speaker: string;
  avatar: string;
  text: string;
  clipId?: string;
  accentColor: string;
}

const STORAGE_KEY = 'cyberknatte_save_v1';

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<CyberWorld3D | null>(null);

  // Persistent adventure state
  const [zone, setZone] = useState<ZoneId>('garage');
  const [lang, setLang] = useState<Language>('sv');
  const [tier, setTier] = useState<DifficultyTier>(1); // 1 = 5 år, 2 = 6 år, 3 = 7+ år
  const [inventory, setInventory] = useState<ItemId[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemId | null>(null);
  const [solved, setSolved] = useState<Record<string, boolean>>({});
  const [projections, setProjections] = useState<ProjectedHotspot[]>([]);

  // UI overlays
  const [dialogue, setDialogue] = useState<DialogueBanner | null>(null);
  const [activeMiniGame, setActiveMiniGame] = useState<MiniGameType | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [showFinaleModal, setShowFinaleModal] = useState<boolean>(false);

  // Mini-game states
  const [mgRound, setMgRound] = useState<number>(0);
  const [mathQ, setMathQ] = useState<MathQuestion>(() => generateMathQuestion(1));
  const [letterQ, setLetterQ] = useState<LetterQuestion>(() => LETTER_QUESTIONS[0]);
  const [patternQ, setPatternQ] = useState<PatternQuestion>(() => generatePatternQuestion(1));
  const [highwayStars, setHighwayStars] = useState<number>(0);
  const [mgFeedback, setMgFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Load saved progress
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.inventory)) setInventory(parsed.inventory);
        if (parsed.solved && typeof parsed.solved === 'object') setSolved(parsed.solved);
        if (parsed.tier === 1 || parsed.tier === 2 || parsed.tier === 3) setTier(parsed.tier);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Save progress
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ inventory, solved, tier }));
    } catch {
      // Ignore storage errors
    }
  }, [inventory, solved, tier]);

  const coresCount =
    (solved.core_garage ? 1 : 0) +
    (solved.core_plaza ? 1 : 0) +
    (solved.core_park ? 1 : 0) +
    (solved.core_tower ? 1 : 0);

  const showSpeech = useCallback(
    (speaker: string, avatar: string, textSv: string, textEn: string, clipId?: string, accentColor = '#22d3ee') => {
      const text = lang === 'sv' ? textSv : textEn;
      setDialogue({ speaker, avatar, text, clipId, accentColor });
      cyberAudio.speak(text, lang, lang === 'sv' ? clipId : undefined);
    },
    [lang]
  );

  const grantItem = useCallback((itemId: ItemId) => {
    setInventory((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
    cyberAudio.playItemPickup();
  }, []);

  const markSolved = useCallback((key: string, value: boolean = true) => {
    setSolved((prev) => {
      const next = { ...prev, [key]: value };
      return next;
    });
  }, []);

  // Keep 3D world synced with solved state
  useEffect(() => {
    if (worldRef.current) {
      const allDone =
        !!solved.core_garage && !!solved.core_plaza && !!solved.core_park && !!solved.core_tower;
      worldRef.current.updateWorldState(solved, allDone);
    }
  }, [solved]);

  // Ref for latest state inside 3D callback
  const stateRef = useRef({
    inventory,
    selectedItem,
    solved,
    lang,
    tier,
    zone,
  });
  useEffect(() => {
    stateRef.current = { inventory, selectedItem, solved, lang, tier, zone };
  }, [inventory, selectedItem, solved, lang, tier, zone]);

  // Launch Educational or Highway Mini-Game
  const openMiniGame = useCallback(
    (type: MiniGameType) => {
      const currentTier = stateRef.current.tier;
      setMgRound(0);
      setMgFeedback(null);
      setActiveMiniGame(type);

      if (type === 'math') {
        setMathQ(generateMathQuestion(currentTier));
        cyberAudio.speak(
          'Koppla ihop motor-koden! Räkna kraft-cellerna och tryck på rätt siffra!',
          stateRef.current.lang,
          stateRef.current.lang === 'sv' ? 'sv_mg_math_intro' : undefined
        );
      } else if (type === 'letters') {
        const q = LETTER_QUESTIONS[0];
        setLetterQ(q);
        cyberAudio.speak(
          q.hintSv,
          stateRef.current.lang,
          stateRef.current.lang === 'sv' ? q.clipId : undefined
        );
      } else if (type === 'shapes') {
        setPatternQ(generatePatternQuestion(currentTier));
        cyberAudio.speak(
          'Bygg klart laser-bron! Vilken lysande form kommer härnäst i mönstret?',
          stateRef.current.lang,
          stateRef.current.lang === 'sv' ? 'sv_mg_shapes_intro' : undefined
        );
      } else if (type === 'highway') {
        setHighwayStars(0);
        cyberAudio.playHoverRev();
        cyberAudio.speak(
          'Håll i hatten Bulten! Nu flyger vi på Neon-Motorvägen! Styr och samla tio energi-stjärnor!',
          stateRef.current.lang,
          stateRef.current.lang === 'sv' ? 'sv_mg_highway_intro' : undefined
        );
        worldRef.current?.startHighwayGame({
          onStarCollected: (count) => {
            setHighwayStars(count);
            cyberAudio.playItemPickup();
            cyberAudio.speak(
              `${count}!`,
              stateRef.current.lang,
              stateRef.current.lang === 'sv' ? `sv_count_${count}` : undefined
            );
          },
          onObstacleHit: () => {
            cyberAudio.playSillyBoing();
          },
          onHighwayComplete: () => {
            worldRef.current?.stopHighwayGame();
            setActiveMiniGame(null);
            markSolved('core_tower', true);
            cyberAudio.playCoreUnlocked();
            confetti({ particleCount: 110, spread: 80, origin: { y: 0.5 } });
            showSpeech(
              'DJ Blip & Bulten',
              '🎧',
              'Jippi! Alla kraft-kärnor är på plats! Nu lyser hela Neon-staden! Dags för robo-disco!',
              'Yay! All power cores are active! Now all of Neon City is glowing! Time for robo-disco!',
              'sv_dj_finale',
              '#facc15'
            );
            setShowFinaleModal(true);
          },
        });
      }
    },
    [markSolved, showSpeech]
  );

  // Core LucasArts-style interaction handler when Rex reaches a 3D hotspot
  const handleHotspotInteraction = useCallback(
    (hotspotId: string) => {
      const { selectedItem: heldItem, solved: s } = stateRef.current;

      // Helper for silly/wrong item combinations (classic Full Throttle / Grim Fandango humor!)
      const triggerWrongItemJoke = () => {
        cyberAudio.playSillyBoing();
        const useFirst = Math.random() > 0.5;
        if (useFirst) {
          showSpeech(
            'Bulten',
            '🤖',
            'Haha! Bip-bop! Bulten tror inte att de där prylarna passar ihop! Prova på något annat!',
            'Haha! Beep-boop! Bolt doesn’t think those two things go together! Try something else!',
            'sv_wrong_item_1',
            '#fb923c'
          );
        } else {
          showSpeech(
            'Rex',
            '🧑‍🚀',
            'Hmm, det kittlas bara! Vi testar att använda prylen på ett annat ställe!',
            'Hmm, that just tickles! Let’s try using this gadget somewhere else!',
            'sv_wrong_item_2',
            '#22d3ee'
          );
        }
        setSelectedItem(null);
      };

      // ZONE 1: GARAGE HOTSPOTS
      if (hotspotId === 'toolbox') {
        if (heldItem) return triggerWrongItemJoke();
        if (!s.got_wrench) {
          markSolved('got_wrench', true);
          grantItem('laser_wrench');
          showSpeech(
            'Bulten',
            '🔧',
            'Hurra! Du hittade den lysande Laser-Nyckeln! Klicka på den i väskan och använd den på Sviff-Hojen!',
            'Hooray! You found the glowing Laser Wrench! Tap it in your bag and use it on the Hover-Bike!',
            'sv_bulten_wrench',
            '#22d3ee'
          );
        } else {
          cyberAudio.playDroidChirp(true);
          showSpeech(
            'Bulten',
            '🧰',
            'Verktygs-lådan är redan öppen! Laser-Nyckeln ligger i din väska där nere!',
            'The toolbox is already open! The Laser Wrench is in your bag down below!',
            'sv_bulten_wrench',
            '#fbbf24'
          );
        }
        return;
      }

      if (hotspotId === 'crane') {
        if (heldItem) return triggerWrongItemJoke();
        cyberAudio.playLaserZap();
        if (!s.got_magnet) {
          markSolved('got_magnet', true);
          grantItem('super_magnet');
          showSpeech(
            'Bulten',
            '🧲',
            'Bip-bop! Titta! Magnet-kranen plockade upp en Super-Magnet ur skrot-högen!',
            'Beep-boop! Look! The Magnet Crane picked up a Super Magnet from the scrap pile!',
            'sv_bulten_crane',
            '#f43f5e'
          );
        } else {
          showSpeech(
            'Bulten',
            '🏗️',
            'Magnet-kranen snurrar glatt! Du har redan Super-Magneten i väskan!',
            'The Magnet Crane spins happily! You already have the Super Magnet in your bag!',
            'sv_bulten_crane',
            '#f43f5e'
          );
        }
        return;
      }

      if (hotspotId === 'maja') {
        if (heldItem === 'laser_wrench') {
          showSpeech(
            'Mekaniker-Maja',
            '👩‍🔧',
            'Snygg Laser-Nyckel! Använd den direkt på Sviff-Hojen bredvid mig!',
            'Nice Laser Wrench! Use it right on the Hover-Bike next to me!',
            'sv_maja_hello',
            '#38bdf8'
          );
          return;
        }
        if (heldItem) return triggerWrongItemJoke();
        if (s.core_garage) {
          showSpeech(
            'Mekaniker-Maja',
            '👩‍🔧',
            'Snyggt jobbat! Motorn spinner som en cyber-katt! Här får ni den första kraft-kärnan!',
            'Great job! The engine purrs like a cyber-cat! You unlocked the first power core!',
            'sv_maja_fixed',
            '#38bdf8'
          );
        } else {
          showSpeech(
            'Mekaniker-Maja',
            '👩‍🔧',
            'Hej Rex och Bulten! För att laga sviff-hojen behöver vi först Laser-Nyckeln från verktygs-lådan!',
            'Hi Rex and Bolt! To fix the hover-bike, we first need the Laser Wrench from the red toolbox!',
            'sv_maja_hello',
            '#38bdf8'
          );
        }
        return;
      }

      if (hotspotId === 'hoverbike') {
        if (heldItem && heldItem !== 'laser_wrench') return triggerWrongItemJoke();
        if (heldItem === 'laser_wrench' || s.engine_unlocked || s.got_wrench) {
          setSelectedItem(null);
          markSolved('engine_unlocked', true);
          cyberAudio.playHoverRev();
          openMiniGame('math');
        } else {
          cyberAudio.playSillyBoing();
          showSpeech(
            'Rex',
            '🏍️',
            'Motor-luckan sitter fast! Vi behöver Laser-Nyckeln från den röda verktygs-lådan först.',
            'The engine hatch is stuck! We need the Laser Wrench from the red toolbox first.',
            'sv_locked_engine',
            '#f43f5e'
          );
        }
        return;
      }

      if (hotspotId === 'jukebox') {
        if (heldItem) return triggerWrongItemJoke();
        cyberAudio.cycleJukebox();
        cyberAudio.playDroidChirp(true);
        showSpeech(
          'Bulten',
          '📻',
          'Bip-bop! Vilken svängig cyber-musik! Bulten kan inte sluta dansa!',
          'Beep-boop! What groovy cyber-music! Bolt can’t stop dancing!',
          'sv_discover_jukebox',
          '#c084fc'
        );
        return;
      }

      if (hotspotId === 'scrapbot') {
        if (heldItem) return triggerWrongItemJoke();
        cyberAudio.playDroidChirp(true);
        showSpeech(
          'Bulten',
          '🤖',
          'Atjooo! Haha, den lilla skrot-roboten nös ut en glittrande mutter!',
          'Achoo! Haha, the little scrap-bot sneezed out a shiny bolt!',
          'sv_discover_scrapbot',
          '#fb923c'
        );
        return;
      }

      // ZONE 2: PLAZA HOTSPOTS
      if (hotspotId === 'drain') {
        if (heldItem && heldItem !== 'super_magnet') return triggerWrongItemJoke();
        if (heldItem === 'super_magnet' || s.got_magnet) {
          setSelectedItem(null);
          markSolved('got_token', true);
          grantItem('gold_token');
          showSpeech(
            'Bulten',
            '🪙',
            'Tjoho! Super-Magneten drog upp ett gyllene arkad-mynt ur brunnen! Prova det i Holo-Automaten!',
            'Woohoo! The Super Magnet pulled a Gold Arcade Token out of the drain! Try it in the Holo-Vending machine!',
            'sv_bulten_token',
            '#facc15'
          );
        } else {
          showSpeech(
            'Rex',
            '🕳️',
            'Det ligger ett guld-mynt djupt nere i brunnen! Vi behöver Super-Magneten från Magnet-Kranen i garaget!',
            'There is a gold token deep down in the drain! We need the Super Magnet from the crane in the garage!',
            'sv_hint_plaza',
            '#facc15'
          );
        }
        return;
      }

      if (hotspotId === 'vending') {
        if (heldItem && heldItem !== 'gold_token') return triggerWrongItemJoke();
        if (heldItem === 'gold_token' || s.got_token) {
          setSelectedItem(null);
          markSolved('got_battery', true);
          grantItem('turbo_battery');
          showSpeech(
            'Bulten',
            '🔋',
            'Wow! Holo-automaten gav oss ett Turbo-Batteri! Nu kan vi laga Kocken Glasses Neon-Skylt!',
            'Wow! The Holo-Vending machine gave us a Turbo Battery! Now we can fix Chef Scoops’ Neon Sign!',
            'sv_bulten_battery',
            '#a855f7'
          );
        } else {
          showSpeech(
            'Kocken Glasse',
            '🎰',
            'Automaten behöver ett Guld-Mynt! Har ni kollat nere i gatubrunnen med en magnet?',
            'The vending machine needs a Gold Token! Have you checked down in the street drain with a magnet?',
            'sv_glasse_hello',
            '#a855f7'
          );
        }
        return;
      }

      if (hotspotId === 'glasse') {
        if (heldItem) return triggerWrongItemJoke();
        if (s.core_plaza) {
          showSpeech(
            'Kocken Glasse',
            '🍧',
            'Underbart! Nu lyser hela glass-kiosken igen! Varsågod, ta en lysande Cyber-Glass och en kraft-kärna!',
            'Wonderful! Now the whole ice-cream kiosk is glowing again! Here is a glowing Cyber Ice-Cream and a power core!',
            'sv_glasse_fixed',
            '#f472b6'
          );
        } else {
          showSpeech(
            'Kocken Glasse',
            '🍧',
            'Hallå där! Min stora neon-skylt har slocknat, och automaten behöver ett guld-mynt! Kan ni hjälpa mig?',
            'Hello there! My big neon sign went dark, and the vending machine needs a gold token! Can you help me?',
            'sv_glasse_hello',
            '#f472b6'
          );
        }
        return;
      }

      if (hotspotId === 'neonsign') {
        if (heldItem && heldItem !== 'turbo_battery') return triggerWrongItemJoke();
        if (heldItem === 'turbo_battery' || s.got_battery || s.core_plaza) {
          setSelectedItem(null);
          openMiniGame('letters');
        } else {
          cyberAudio.playSillyBoing();
          showSpeech(
            'Kocken Glasse',
            '🔤',
            'Skylten har ingen ström än! Använd Guld-Myntet i Holo-Automaten för att hämta Turbo-Batteriet först!',
            'The sign has no power yet! Use the Gold Token in the Holo-Vending machine to get the Turbo Battery first!',
            'sv_locked_sign',
            '#22d3ee'
          );
        }
        return;
      }

      if (hotspotId === 'holowhale') {
        if (heldItem) return triggerWrongItemJoke();
        cyberAudio.playItemPickup();
        showSpeech(
          'Rex',
          '🐋',
          'Oooo! Holo-valen sjunger i luften över Neon-torget!',
          'Oooo! The holo-whale is singing in the sky above Neon Plaza!',
          'sv_discover_whale',
          '#38bdf8'
        );
        return;
      }

      // ZONE 3: CYBER-PARK HOTSPOTS
      if (hotspotId === 'flora') {
        if (heldItem) return triggerWrongItemJoke();
        if (s.core_park) {
          showSpeech(
            'Växt-Droiden Flora',
            '🌱',
            'Strålande! Laser-bron lyser i alla regnbågens färger! Ta med er Turbo-Spolen och den tredje kraft-kärnan!',
            'Brilliant! The Laser Bridge shines in all rainbow colors! Take the Turbo Coil and the third power core!',
            'sv_flora_fixed',
            '#34d399'
          );
        } else {
          showSpeech(
            'Växt-Droiden Flora',
            '🌱',
            'Välkomna till Cyber-Parken! Robo-hunden Pixel vaktar bro-nyckeln, men han älskar lysande Cyber-Glass!',
            'Welcome to the Cyber Park! Pixel the Robo-Dog guards the bridge keycard, and he loves glowing Cyber Ice-Cream!',
            'sv_flora_hello',
            '#34d399'
          );
        }
        return;
      }

      if (hotspotId === 'pixel_dog') {
        if (heldItem && heldItem !== 'cyber_icecream') return triggerWrongItemJoke();
        if (heldItem === 'cyber_icecream' || s.core_plaza) {
          setSelectedItem(null);
          markSolved('pixel_fed', true);
          markSolved('got_keycard', true);
          grantItem('bridge_keycard');
          cyberAudio.playDroidChirp(true);
          showSpeech(
            'Bulten & Pixel',
            '🐕',
            'Voff-bip! Pixel älskade Cyber-Glassen! Han gav oss Bro-Nyckelkortet till Laser-Bron!',
            'Woof-beep! Pixel loved the Cyber Ice-Cream! He gave us the Bridge Keycard for the Laser Bridge!',
            'sv_pixel_happy',
            '#f472b6'
          );
        } else {
          cyberAudio.playDroidChirp(false);
          showSpeech(
            'Växt-Droiden Flora',
            '🐕',
            'Pixel är sugen på en lysande Cyber-Glass från Kocken Glasse på Neon-Torget!',
            'Pixel is hungry for a glowing Cyber Ice-Cream from Chef Scoops in Neon Plaza!',
            'sv_flora_hello',
            '#f472b6'
          );
        }
        return;
      }

      if (hotspotId === 'laserbridge') {
        if (heldItem && heldItem !== 'bridge_keycard') return triggerWrongItemJoke();
        if (heldItem === 'bridge_keycard' || s.got_keycard || s.core_park) {
          setSelectedItem(null);
          openMiniGame('shapes');
        } else {
          cyberAudio.playSillyBoing();
          showSpeech(
            'Växt-Droiden Flora',
            '🌈',
            'Bro-datorn är låst! Ge robo-hunden Pixel en Cyber-Glass så får ni nyckel-kortet!',
            'The bridge computer is locked! Give Pixel the Robo-Dog a Cyber Ice-Cream to get the keycard!',
            'sv_locked_bridge',
            '#22d3ee'
          );
        }
        return;
      }

      if (hotspotId === 'cyberowl') {
        if (heldItem) return triggerWrongItemJoke();
        cyberAudio.playDroidChirp(true);
        showSpeech(
          'Växt-Droiden Flora',
          '🦉',
          'Ho-ho! Cyber-ugglan Nova blinkar med sina gyllene kamera-ögon!',
          'Hoot-hoot! Nova the Cyber-Owl blinks her golden camera eyes!',
          'sv_discover_owl',
          '#facc15'
        );
        return;
      }

      // ZONE 4: CLOCKTOWER & NEON HIGHWAY
      if (hotspotId === 'dj_blip') {
        if (heldItem) return triggerWrongItemJoke();
        if (s.core_tower) {
          showSpeech(
            'DJ Blip',
            '🎧',
            'Jippi! Alla fyra kraft-kärnor är på plats! Nu lyser hela Neon-staden! Dags för robo-disco!',
            'Yay! All four power cores are in place! Now all of Neon City is lit up! Time for robo-disco!',
            'sv_dj_finale',
            '#c084fc'
          );
        } else {
          showSpeech(
            'DJ Blip',
            '🎧',
            'Yo! DJ Blip väntar vid Klocktornet! Klicka på Sviff-Hojen vid porten så kör vi längs Neon-Motorvägen!',
            'Yo! DJ Blip is waiting at the Clocktower! Tap the Hover-Bike at the gate to race down the Neon Highway!',
            'sv_dj_hello',
            '#c084fc'
          );
        }
        return;
      }

      if (hotspotId === 'highway_gate') {
        setSelectedItem(null);
        openMiniGame('highway');
        return;
      }

      if (hotspotId === 'clocktower_core') {
        if (heldItem) return triggerWrongItemJoke();
        cyberAudio.playCoreUnlocked();
        showSpeech(
          'Rex',
          '🕰️',
          `Stora Klocktornet har ${
            (s.core_garage ? 1 : 0) + (s.core_plaza ? 1 : 0) + (s.core_park ? 1 : 0) + (s.core_tower ? 1 : 0)
          } av 4 kraft-kärnor! Klicka på Neon-Motorvägen för att flyga med Sviff-Hojen!`,
          'Tap the Neon Highway gate to fly with the Hover-Bike!',
          'sv_dj_hello',
          '#22d3ee'
        );
      }
    },
    [grantItem, markSolved, openMiniGame, showSpeech]
  );

  // Initialize Three.js World
  useEffect(() => {
    if (!mountRef.current) return;
    const world = new CyberWorld3D(
      mountRef.current,
      (hid) => handleHotspotInteraction(hid),
      (projs) => setProjections(projs)
    );
    worldRef.current = world;
    return () => {
      world.dispose();
      worldRef.current = null;
    };
  }, [handleHotspotInteraction]);

  // Keyboard support for Highway Mini-Game
  useEffect(() => {
    if (activeMiniGame !== 'highway') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') worldRef.current?.steerHighway(-1);
      if (e.key === 'ArrowRight' || e.key === 'd') worldRef.current?.steerHighway(1);
      if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w') worldRef.current?.jumpHighway();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeMiniGame]);

  // Switch zone
  const handleSelectZone = (nextZone: ZoneId) => {
    if (activeMiniGame === 'highway') {
      worldRef.current?.stopHighwayGame();
    }
    setActiveMiniGame(null);
    setZone(nextZone);
    worldRef.current?.loadZone(nextZone);
    const zDef = ZONES[nextZone];
    cyberAudio.playTapPing();
    showSpeech(
      'Rex',
      zDef.emoji,
      zDef.introTextSv,
      zDef.introTextEn,
      lang === 'sv' ? zDef.introClipSv : zDef.introClipEn,
      zDef.themeColor
    );
  };

  // Trigger Bulten's Cyber-Scanner hint
  const handleScannerHint = () => {
    cyberAudio.playScannerPulse();
    worldRef.current?.triggerScannerPulse();
    const zDef = ZONES[zone];
    showSpeech(
      'Bultens Cyber-Scanner',
      '🔍',
      zDef.hintTextSv,
      zDef.hintTextEn,
      lang === 'sv' ? zDef.hintClipSv : undefined,
      '#facc15'
    );
  };

  // Toggle Fullscreen
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    cyberAudio.setMuted(next);
  };

  // Handle Math Mini-Game Answer
  const handleMathAnswer = (val: number) => {
    if (val === mathQ.answer) {
      setMgFeedback('correct');
      cyberAudio.playItemPickup();
      if (mgRound + 1 >= 2) {
        // Completed!
        setTimeout(() => {
          setActiveMiniGame(null);
          markSolved('core_garage', true);
          cyberAudio.playCoreUnlocked();
          confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
          showSpeech(
            'Mekaniker-Maja',
            '👩‍🔧',
            'Snyggt jobbat! Motorn spinner som en cyber-katt! Här får ni den första kraft-kärnan!',
            'Great job! The engine purrs like a cyber-cat! Here is the first power core!',
            'sv_maja_fixed',
            '#22d3ee'
          );
        }, 650);
      } else {
        cyberAudio.speak('Snyggt räknat! En kod kvar!', lang, lang === 'sv' ? 'sv_praise_3' : undefined);
        setTimeout(() => {
          setMgRound((r) => r + 1);
          setMgFeedback(null);
          setMathQ(generateMathQuestion(tier));
        }, 700);
      }
    } else {
      setMgFeedback('wrong');
      cyberAudio.playSillyBoing();
      cyberAudio.speak('Nästan! Räkna alla kraft-celler och prova igen!', lang, lang === 'sv' ? 'sv_try_again' : undefined);
      setTimeout(() => setMgFeedback(null), 600);
    }
  };

  // Handle Letters Mini-Game Answer
  const handleLetterAnswer = (letter: string) => {
    if (letter === letterQ.missingLetter) {
      setMgFeedback('correct');
      cyberAudio.playItemPickup();
      if (mgRound + 1 >= 2) {
        setTimeout(() => {
          setActiveMiniGame(null);
          markSolved('core_plaza', true);
          grantItem('cyber_icecream');
          cyberAudio.playCoreUnlocked();
          confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
          showSpeech(
            'Kocken Glasse',
            '🍧',
            'Underbart! Nu lyser hela glass-kiosken igen! Varsågod, ta en lysande Cyber-Glass och en kraft-kärna!',
            'Wonderful! Now the ice-cream kiosk is glowing again! Take a glowing Cyber Ice-Cream and a power core!',
            'sv_glasse_fixed',
            '#f472b6'
          );
        }, 650);
      } else {
        cyberAudio.speak('Helt rätt! Strålande jobbat!', lang, lang === 'sv' ? 'sv_praise_1' : undefined);
        setTimeout(() => {
          const nextQ = LETTER_QUESTIONS[(mgRound + 1 + Math.floor(Math.random() * 3)) % LETTER_QUESTIONS.length];
          setMgRound((r) => r + 1);
          setMgFeedback(null);
          setLetterQ(nextQ);
          cyberAudio.speak(nextQ.hintSv, lang, lang === 'sv' ? nextQ.clipId : undefined);
        }, 750);
      }
    } else {
      setMgFeedback('wrong');
      cyberAudio.playSillyBoing();
      cyberAudio.speak(letterQ.hintSv, lang, lang === 'sv' ? letterQ.clipId : undefined);
      setTimeout(() => setMgFeedback(null), 600);
    }
  };

  // Handle Shapes/Patterns Mini-Game Answer
  const handlePatternAnswer = (shapeId: string) => {
    if (shapeId === patternQ.answer.id) {
      setMgFeedback('correct');
      cyberAudio.playItemPickup();
      if (mgRound + 1 >= 2) {
        setTimeout(() => {
          setActiveMiniGame(null);
          markSolved('core_park', true);
          grantItem('turbo_coil');
          cyberAudio.playCoreUnlocked();
          confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
          showSpeech(
            'Växt-Droiden Flora',
            '🌱',
            'Strålande! Laser-bron lyser i alla regnbågens färger! Ta med er Turbo-Spolen och den tredje kraft-kärnan!',
            'Brilliant! The Laser Bridge shines in all rainbow colors! Take the Turbo Coil and the third power core!',
            'sv_flora_fixed',
            '#34d399'
          );
        }, 650);
      } else {
        cyberAudio.speak('Bip-bop! Du är ett riktigt cyber-proffs!', lang, lang === 'sv' ? 'sv_praise_2' : undefined);
        setTimeout(() => {
          setMgRound((r) => r + 1);
          setMgFeedback(null);
          setPatternQ(generatePatternQuestion(tier));
        }, 700);
      }
    } else {
      setMgFeedback('wrong');
      cyberAudio.playSillyBoing();
      cyberAudio.speak('Nästan! Kolla noga på mönstret och prova igen!', lang, lang === 'sv' ? 'sv_try_again' : undefined);
      setTimeout(() => setMgFeedback(null), 600);
    }
  };

  const handleResetGame = () => {
    localStorage.removeItem(STORAGE_KEY);
    setInventory([]);
    setSelectedItem(null);
    setSolved({});
    setShowSettings(false);
    setShowFinaleModal(false);
    handleSelectZone('garage');
  };

  const currentZoneSpots = HOTSPOTS.filter((h) => h.zone === zone);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#070a18] select-none">
      {/* 3D CYBERPUNK VIEWPORT (85%+ of visual weight) */}
      <div ref={mountRef} className="fixed inset-0 z-0" />

      {/* FLOATING 3D HOTSPOT TACTILE BADGES */}
      {!activeMiniGame && !showWelcome && (
        <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
          {currentZoneSpots.map((spot) => {
            const proj = projections.find((p) => p.id === spot.id);
            if (!proj || !proj.visible) return null;

            const isDone =
              (spot.id === 'toolbox' && solved.got_wrench) ||
              (spot.id === 'crane' && solved.got_magnet) ||
              (spot.id === 'hoverbike' && solved.core_garage) ||
              (spot.id === 'drain' && solved.got_token) ||
              (spot.id === 'vending' && solved.got_battery) ||
              (spot.id === 'neonsign' && solved.core_plaza) ||
              (spot.id === 'pixel_dog' && solved.got_keycard) ||
              (spot.id === 'laserbridge' && solved.core_park) ||
              (spot.id === 'highway_gate' && solved.core_tower);

            return (
              <button
                key={spot.id}
                onClick={() => {
                  cyberAudio.playTapPing();
                  worldRef.current?.walkToHotspot(spot.id);
                }}
                style={{
                  left: `${Math.max(54, Math.min(window.innerWidth - 54, proj.screenX))}px`,
                  top: `${Math.max(76, Math.min(window.innerHeight - 135, proj.screenY))}px`,
                  borderColor: selectedItem ? '#facc15' : spot.accentColor,
                }}
                className={`pointer-events-auto -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border-2 shadow-lg transition-transform active:scale-90 hover:scale-105 ${
                  selectedItem ? 'animate-pulse-glow ring-2 ring-yellow-400/60' : 'animate-float'
                }`}
              >
                <span className="text-xl leading-none">{spot.emoji}</span>
                <span className="text-xs sm:text-sm font-bold tracking-tight text-white whitespace-nowrap">
                  {lang === 'sv' ? spot.labelSv : spot.labelEn}
                </span>
                {isDone && (
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* COMPACT TOP HUD BAR */}
      <header
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
        className="fixed top-0 inset-x-0 z-20 px-2.5 sm:px-4 pointer-events-none flex items-center justify-between gap-2"
      >
        {/* Left: 4 Cyberpunk Zone Tabs */}
        <div className="pointer-events-auto flex items-center gap-1 bg-slate-950/85 backdrop-blur-md border border-cyan-500/35 rounded-2xl p-1 shadow-xl">
          {(['garage', 'plaza', 'park', 'tower'] as ZoneId[]).map((zid) => {
            const zd = ZONES[zid];
            const active = zone === zid;
            const zoneSolved =
              (zid === 'garage' && solved.core_garage) ||
              (zid === 'plaza' && solved.core_plaza) ||
              (zid === 'park' && solved.core_park) ||
              (zid === 'tower' && solved.core_tower);

            return (
              <button
                key={zid}
                onClick={() => handleSelectZone(zid)}
                className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition-all active:scale-95 ${
                  active
                    ? 'bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 shadow-md shadow-cyan-500/30'
                    : 'text-slate-200 hover:bg-slate-800/80'
                }`}
              >
                <span className="text-base sm:text-lg leading-none">{zd.emoji}</span>
                <span className="hidden md:inline">{lang === 'sv' ? zd.nameSv : zd.nameEn}</span>
                {zoneSolved && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
                )}
              </button>
            );
          })}
        </div>

        {/* Center: 4 Power Cores Status */}
        <div
          onClick={() => {
            if (coresCount === 4) setShowFinaleModal(true);
          }}
          className="pointer-events-auto cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-fuchsia-500/40 shadow-xl"
        >
          <span className="text-xs font-extrabold uppercase tracking-wider text-fuchsia-300 hidden sm:inline">
            {lang === 'sv' ? 'Kraft-Kärnor' : 'Power Cores'}
          </span>
          <div className="flex items-center gap-1">
            {(['core_garage', 'core_plaza', 'core_park', 'core_tower'] as const).map((ck) => {
              const lit = !!solved[ck];
              return (
                <span
                  key={ck}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    lit
                      ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_#facc15] scale-105'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}
                >
                  ⚡
                </span>
              );
            })}
          </div>
        </div>

        {/* Right: Scanner Hint + Fullscreen + Audio + Settings */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            onClick={handleScannerHint}
            title={lang === 'sv' ? 'Bultens Cyber-Tips' : 'Bolt’s Cyber Hint'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-amber-400/25 active:scale-95 transition"
          >
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">{lang === 'sv' ? 'Tips' : 'Hint'}</span>
          </button>

          <button
            onClick={handleToggleMute}
            aria-label="Toggle Audio"
            className="p-2 rounded-2xl bg-slate-950/85 border border-slate-700/80 text-cyan-300 hover:bg-slate-900 active:scale-95 transition"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={handleToggleFullscreen}
            aria-label="Toggle Fullscreen"
            className="p-2 rounded-2xl bg-slate-950/85 border border-slate-700/80 text-cyan-300 hover:bg-slate-900 active:scale-95 transition"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowSettings((s) => !s)}
            aria-label="Settings"
            className="p-2 rounded-2xl bg-slate-950/85 border border-slate-700/80 text-slate-200 hover:bg-slate-900 active:scale-95 transition"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* LUCASARTS CHARACTER SPEECH BANNER */}
      {dialogue && !activeMiniGame && !showWelcome && (
        <div className="fixed top-16 sm:top-20 inset-x-0 z-20 flex justify-center px-3 pointer-events-none">
          <div
            style={{ borderColor: dialogue.accentColor }}
            className="pointer-events-auto max-w-xl w-full bg-slate-950/92 backdrop-blur-xl border-2 rounded-3xl px-4 py-2.5 shadow-2xl flex items-center gap-3"
          >
            <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-2xl shrink-0">
              {dialogue.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-extrabold uppercase tracking-wider" style={{ color: dialogue.accentColor }}>
                {dialogue.speaker}
              </div>
              <p className="text-sm sm:text-base font-semibold text-slate-100 leading-snug line-clamp-2">
                {dialogue.text}
              </p>
            </div>
            <button
              onClick={() => cyberAudio.speak(dialogue.text, lang, lang === 'sv' ? dialogue.clipId : undefined)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 shrink-0 active:scale-90"
              title={lang === 'sv' ? 'Lyssna igen' : 'Listen again'}
            >
              🔊
            </button>
            <button
              onClick={() => setDialogue(null)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* TACTILE BOTTOM INVENTORY DOCK ("REX CYBER-VÄSKA") */}
      {!activeMiniGame && !showWelcome && (
        <footer
          style={{ paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom))' }}
          className="fixed bottom-0 inset-x-0 z-20 px-3 pointer-events-none flex flex-col items-center gap-1.5"
        >
          {/* Active Held Item Prompt */}
          {selectedItem && (
            <div className="pointer-events-auto flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg animate-bounce">
              <span>
                {INVENTORY_ITEMS[selectedItem].emoji}{' '}
                {lang === 'sv'
                  ? `Använd ${INVENTORY_ITEMS[selectedItem].nameSv} på något i 3D-världen!`
                  : `Tap an object in the 3D world to use ${INVENTORY_ITEMS[selectedItem].nameEn}!`}
              </span>
              <button
                onClick={() => setSelectedItem(null)}
                className="ml-1 px-2 py-0.5 rounded-full bg-slate-950/20 hover:bg-slate-950/30 text-xs"
              >
                ✕
              </button>
            </div>
          )}

          <div className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-3xl bg-slate-950/90 backdrop-blur-xl border border-cyan-500/35 shadow-2xl max-w-full overflow-x-auto">
            <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800 shrink-0">
              <span className="text-lg">🎒</span>
              <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-300 hidden sm:inline">
                {lang === 'sv' ? 'Väska' : 'Bag'}
              </span>
            </div>

            {inventory.length === 0 ? (
              <span className="text-xs sm:text-sm text-slate-400 font-medium px-2 py-1">
                {lang === 'sv'
                  ? 'Tryck på saker i 3D-staden för att utforska och samla cyber-prylar!'
                  : 'Tap objects in the 3D city to explore and collect cyber gadgets!'}
              </span>
            ) : (
              <div className="flex items-center gap-2">
                {inventory.map((id) => {
                  const item = INVENTORY_ITEMS[id];
                  const isSelected = selectedItem === id;
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        const next = isSelected ? null : id;
                        setSelectedItem(next);
                        cyberAudio.playTapPing();
                        if (next) {
                          cyberAudio.speak(
                            `${item.nameSv}. ${item.descSv}`,
                            lang
                          );
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border-2 font-bold text-xs sm:text-sm transition-all shrink-0 active:scale-95 ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 border-white shadow-[0_0_18px_#facc15] scale-105'
                          : 'bg-slate-900/90 text-white border-slate-700 hover:border-cyan-400'
                      }`}
                    >
                      <span className="text-xl leading-none">{item.emoji}</span>
                      <span>{lang === 'sv' ? item.nameSv : item.nameEn}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </footer>
      )}

      {/* MINI-GAME 1, 2, 3 MODAL OVERLAYS */}
      {activeMiniGame && activeMiniGame !== 'highway' && (
        <div className="fixed inset-0 z-30 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border-2 border-cyan-400/60 p-5 sm:p-6 shadow-[0_0_50px_rgba(34,211,238,0.25)]">
            <button
              onClick={() => setActiveMiniGame(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Progress dots */}
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-extrabold uppercase tracking-wider">
                {activeMiniGame === 'math' && (lang === 'sv' ? '🏍️ Motor-Koden (Matte)' : '🏍️ Engine Code (Math)')}
                {activeMiniGame === 'letters' && (lang === 'sv' ? '🔤 Neon-Skylten (Bokstäver)' : '🔤 Neon Sign (Letters)')}
                {activeMiniGame === 'shapes' && (lang === 'sv' ? '🌈 Laser-Bron (Mönster)' : '🌈 Laser Bridge (Patterns)')}
              </span>
              <div className="flex gap-1.5 ml-auto mr-10">
                {[0, 1].map((step) => (
                  <span
                    key={step}
                    className={`w-3.5 h-3.5 rounded-full ${
                      mgRound > step
                        ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                        : mgRound === step
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* MINI-GAME 1: MATH & COUNTING CIRCUITS */}
            {activeMiniGame === 'math' && (
              <div className="text-center space-y-5">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  {lang === 'sv' ? mathQ.promptSv : mathQ.promptEn}
                </h2>

                {/* Visual Energy Cells */}
                <div className="flex items-center justify-center gap-3 flex-wrap bg-slate-950/90 border border-slate-800 rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    {Array.from({ length: mathQ.leftCount }).map((_, idx) => (
                      <div
                        key={`l-${idx}`}
                        className="w-11 h-14 rounded-xl bg-gradient-to-b from-cyan-400 to-blue-600 border-2 border-white shadow-[0_0_12px_#22d3ee] flex items-center justify-center text-2xl"
                      >
                        🔋
                      </div>
                    ))}
                  </div>
                  <span className="text-3xl font-black text-amber-400 px-1">+</span>
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    {Array.from({ length: mathQ.rightCount }).map((_, idx) => (
                      <div
                        key={`r-${idx}`}
                        className="w-11 h-14 rounded-xl bg-gradient-to-b from-fuchsia-400 to-pink-600 border-2 border-white shadow-[0_0_12px_#f472b6] flex items-center justify-center text-2xl"
                      >
                        🔋
                      </div>
                    ))}
                  </div>
                </div>

                {/* Big Number Buttons */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-1">
                  {mathQ.options.map((num) => (
                    <button
                      key={num}
                      onClick={() => handleMathAnswer(num)}
                      className="py-4 rounded-2xl bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 border-2 border-cyan-400/50 text-3xl font-black text-white shadow-lg active:scale-95 transition"
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* MINI-GAME 2: NEON SIGN LETTERS & PHONICS */}
            {activeMiniGame === 'letters' && (
              <div className="text-center space-y-5">
                <div className="flex items-center justify-center gap-3">
                  <h2 className="text-lg sm:text-xl font-extrabold text-white">
                    {lang === 'sv' ? letterQ.hintSv : letterQ.hintEn}
                  </h2>
                  <button
                    onClick={() =>
                      cyberAudio.speak(letterQ.hintSv, lang, lang === 'sv' ? letterQ.clipId : undefined)
                    }
                    className="p-2.5 rounded-2xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 active:scale-90"
                  >
                    🔊
                  </button>
                </div>

                <div className="bg-slate-950/90 border-2 border-fuchsia-500/50 rounded-3xl p-5 flex flex-col items-center gap-2 shadow-inner">
                  <div className="text-6xl mb-1">{letterQ.emoji}</div>
                  <div className="font-cyber text-3xl sm:text-4xl font-black tracking-widest text-cyan-300">
                    {letterQ.wordDisplay}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {letterQ.options.map((letOpt) => (
                    <button
                      key={letOpt}
                      onClick={() => handleLetterAnswer(letOpt)}
                      className="py-4 rounded-2xl bg-slate-800 hover:bg-fuchsia-500 hover:text-slate-950 border-2 border-fuchsia-400/60 font-cyber text-3xl font-black text-white shadow-lg active:scale-95 transition"
                    >
                      {letOpt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* MINI-GAME 3: LASER BRIDGE SHAPES & LOGIC PATTERNS */}
            {activeMiniGame === 'shapes' && (
              <div className="text-center space-y-5">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  {lang === 'sv'
                    ? 'Vilken lysande symbol ska sitta sist på Laser-Bron?'
                    : 'Which glowing symbol comes next on the Laser Bridge?'}
                </h2>

                <div className="flex items-center justify-center gap-2 sm:gap-3 bg-slate-950/90 border border-emerald-500/40 rounded-2xl p-4 flex-wrap">
                  {patternQ.sequence.map((sym, idx) => (
                    <div
                      key={idx}
                      style={{ borderColor: sym.color }}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-900 border-2 flex items-center justify-center text-2xl sm:text-3xl shadow-md"
                    >
                      {sym.emoji}
                    </div>
                  ))}
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-400/20 border-2 border-dashed border-amber-400 flex items-center justify-center text-2xl font-black text-amber-300 animate-pulse">
                    ?
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {patternQ.options.map((sym) => (
                    <button
                      key={sym.id}
                      onClick={() => handlePatternAnswer(sym.id)}
                      className="py-4 rounded-2xl bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 border-2 border-emerald-400/60 flex flex-col items-center gap-1 shadow-lg active:scale-95 transition"
                    >
                      <span className="text-3xl">{sym.emoji}</span>
                      <span className="text-xs font-bold text-slate-200">{sym.nameSv}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mgFeedback && (
              <div
                className={`mt-4 text-center font-extrabold text-sm py-2 rounded-xl ${
                  mgFeedback === 'correct'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {mgFeedback === 'correct'
                  ? lang === 'sv'
                    ? '✨ Helt rätt! Strålande jobbat!'
                    : '✨ Correct! Great job!'
                  : lang === 'sv'
                  ? '🔍 Nästan! Prova en annan knapp!'
                  : '🔍 Almost! Try another button!'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MINI-GAME 4 HUD: 3D HOVER-BIKE HIGHWAY RACE (FULL THROTTLE ACTION!) */}
      {activeMiniGame === 'highway' && (
        <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4">
          {/* Highway Top Score Bar */}
          <div className="mt-14 mx-auto pointer-events-auto flex items-center gap-4 bg-slate-950/90 backdrop-blur-xl border-2 border-amber-400 rounded-3xl px-5 py-2.5 shadow-2xl">
            <span className="text-2xl">🏍️</span>
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                {lang === 'sv' ? 'Sviff-Jakten på Neon-Motorvägen' : 'Neon Highway Hover-Chase'}
              </div>
              <div className="text-lg sm:text-xl font-black text-white">
                ⭐ {highwayStars} / 10 {lang === 'sv' ? 'Energi-Stjärnor' : 'Energy Stars'}
              </div>
            </div>
            <button
              onClick={() => {
                worldRef.current?.stopHighwayGame();
                setActiveMiniGame(null);
              }}
              className="ml-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
            >
              {lang === 'sv' ? 'Avbryt' : 'Exit'}
            </button>
          </div>

          {/* Highway Thumb Controls at Bottom */}
          <div
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            className="pointer-events-auto flex items-center justify-between max-w-lg w-full mx-auto gap-3"
          >
            <button
              onPointerDown={() => worldRef.current?.steerHighway(-1)}
              className="flex-1 py-5 rounded-3xl bg-slate-950/85 border-2 border-cyan-400 text-cyan-300 flex items-center justify-center gap-2 font-black text-lg shadow-xl active:scale-95"
            >
              <ArrowLeft className="w-7 h-7 stroke-[3]" />
              <span>{lang === 'sv' ? 'Vänster' : 'Left'}</span>
            </button>

            <button
              onPointerDown={() => {
                cyberAudio.playHoverRev();
                worldRef.current?.jumpHighway();
              }}
              className="flex-1 py-5 rounded-3xl bg-gradient-to-b from-amber-400 to-orange-500 border-2 border-white text-slate-950 flex items-center justify-center gap-1.5 font-black text-lg shadow-xl active:scale-95"
            >
              <ArrowUp className="w-7 h-7 stroke-[3]" />
              <span>{lang === 'sv' ? 'HOPPA' : 'JUMP'}</span>
            </button>

            <button
              onPointerDown={() => worldRef.current?.steerHighway(1)}
              className="flex-1 py-5 rounded-3xl bg-slate-950/85 border-2 border-cyan-400 text-cyan-300 flex items-center justify-center gap-2 font-black text-lg shadow-xl active:scale-95"
            >
              <span>{lang === 'sv' ? 'Höger' : 'Right'}</span>
              <ArrowRight className="w-7 h-7 stroke-[3]" />
            </button>
          </div>
        </div>
      )}

      {/* SETTINGS DRAWER (Difficulty Tier 5/6/7+ år, Language, Reset) */}
      {showSettings && (
        <div className="fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border-2 border-cyan-500/40 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-white">
                ⚙️ {lang === 'sv' ? 'Inställningar' : 'Settings'}
              </h3>
              <button onClick={() => setShowSettings(false)} className="p-1.5 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {lang === 'sv' ? 'Ålder & Svårighetsgrad' : 'Age & Learning Level'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { t: 1 as DifficultyTier, label: '5 år (Lätt)' },
                  { t: 2 as DifficultyTier, label: '6 år (Lagom)' },
                  { t: 3 as DifficultyTier, label: '7+ år (Klurig)' },
                ].map((opt) => (
                  <button
                    key={opt.t}
                    onClick={() => setTier(opt.t)}
                    className={`py-2.5 px-2 rounded-xl font-bold text-xs border transition ${
                      tier === opt.t
                        ? 'bg-cyan-400 text-slate-950 border-white shadow-md'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {lang === 'sv' ? 'Språk / Röster' : 'Language / Voice'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLang('sv')}
                  className={`py-2.5 rounded-xl font-bold text-sm border ${
                    lang === 'sv'
                      ? 'bg-cyan-400 text-slate-950 border-white'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  🇸🇪 Svenska
                </button>
                <button
                  onClick={() => setLang('en')}
                  className={`py-2.5 rounded-xl font-bold text-sm border ${
                    lang === 'en'
                      ? 'bg-cyan-400 text-slate-950 border-white'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  🇬🇧 English
                </button>
              </div>
            </div>

            <button
              onClick={handleResetGame}
              className="w-full py-3 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-sm flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{lang === 'sv' ? 'Börja om äventyret från start' : 'Restart Adventure'}</span>
            </button>
          </div>
        </div>
      )}

      {/* WELCOME SPLASH MODAL */}
      {showWelcome && (
        <div className="fixed inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-cyan-400/70 p-6 text-center space-y-4 shadow-[0_0_60px_rgba(34,211,238,0.3)]">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-300 text-xs font-extrabold uppercase tracking-wider">
              ✨ 3D Cyberpunk Äventyr • 5–6 år
            </div>
            <div className="text-5xl">🏍️ 🤖 ⚡</div>
            <h1 className="font-cyber text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-amber-300">
              REX & BULTEN
            </h1>
            <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
              {lang === 'sv'
                ? 'Stora Klocktornet i Neon-staden har tappat sina 4 Kraft-Kärnor! Utforska staden i 3D, samla coola verktyg i din väska, laga din Sviff-Hoj och rädda festivalen!'
                : 'The Grand Clocktower in Neon City lost its 4 Power Cores! Explore the 3D city, collect cool gadgets, fix your Hover-Bike, and save the festival!'}
            </p>
            <button
              onClick={() => {
                setShowWelcome(false);
                cyberAudio.playHoverRev();
                showSpeech(
                  'Rex & Bulten',
                  '🧑‍🚀',
                  'Välkommen till Neon-staden! Jag heter Rex och det här är min robot-kompis Bulten! Kom, vi lagar min sviff-hoj och räddar festivalen!',
                  'Welcome to Neon City! I am Rex and this is my robot buddy Bolt! Let’s fix my hover-bike and save the festival!',
                  'sv_welcome',
                  '#22d3ee'
                );
              }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-400 text-slate-950 font-black text-lg shadow-xl shadow-cyan-500/30 active:scale-95 transition"
            >
              🚀 {lang === 'sv' ? 'STARTA ÄVENTYRET!' : 'START ADVENTURE!'}
            </button>
          </div>
        </div>
      )}

      {/* GRAND NEON FESTIVAL CELEBRATION MODAL */}
      {showFinaleModal && (
        <div className="fixed inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-slate-900 border-2 border-amber-400 p-6 text-center space-y-4 shadow-[0_0_60px_rgba(250,204,21,0.4)]">
            <div className="text-6xl">🏆 🎉 🤖 🏍️</div>
            <h2 className="font-cyber text-2xl sm:text-3xl font-black text-amber-300">
              {lang === 'sv' ? 'NEON-STADEN ÄR RÄDDAD!' : 'NEON CITY IS SAVED!'}
            </h2>
            <p className="text-sm sm:text-base text-slate-200 font-medium">
              {lang === 'sv'
                ? 'Du och Rex & Bulten hittade alla 4 Kraft-Kärnor, lagade Sviff-Hojen, löste alla koder och flög hela vägen upp till Klocktornet!'
                : 'You and Rex & Bolt found all 4 Power Cores, fixed the Hover-Bike, solved every code, and flew all the way to the Clocktower!'}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowFinaleModal(false)}
                className="flex-1 py-3.5 rounded-2xl bg-cyan-400 text-slate-950 font-extrabold text-sm shadow-lg"
              >
                {lang === 'sv' ? 'Fortsätt utforska' : 'Keep Exploring'}
              </button>
              <button
                onClick={handleResetGame}
                className="flex-1 py-3.5 rounded-2xl bg-amber-400 text-slate-950 font-extrabold text-sm shadow-lg"
              >
                {lang === 'sv' ? 'Spela igen' : 'Play Again'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
