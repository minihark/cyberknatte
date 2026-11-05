import asyncio
import os
import edge_tts

OUT_DIR = "/Users/minihark/src/cyberknatte/public/audio/voices"
os.makedirs(OUT_DIR, exist_ok=True)

# Character voice profiles
REX_SV = ("sv-SE-SofieNeural", "+6Hz", "+5%")
BULTEN_SV = ("sv-SE-MattiasNeural", "+18Hz", "+10%")
MAJA_SV = ("sv-SE-SofieNeural", "-8Hz", "+0%")
GLASSE_SV = ("sv-SE-MattiasNeural", "-10Hz", "+2%")
FLORA_SV = ("sv-SE-SofieNeural", "+12Hz", "-2%")

REX_EN = ("en-US-AnaNeural", "+0Hz", "+5%")
BULTEN_EN = ("en-US-BrianNeural", "+15Hz", "+8%")

LINES = [
    # Intros & Story
    ("sv_welcome", REX_SV, "Välkommen till Neon-staden! Jag heter Rex och det här är min robot-kompis Bulten! Klocktornet har tappat sina fyra kraft-kärnor. Kom, vi lagar min sviff-hoj och räddar festivalen!"),
    ("en_welcome", REX_EN, "Welcome to Neon City! I am Rex and this is my robot buddy Bolt! The Clocktower lost its four power cores. Come on, let's fix my hover-bike and save the festival!"),

    # Zone Intros
    ("sv_zone_garage", REX_SV, "Skrot-Gränden och Sviff-Garaget! Här står min sviff-hoj! Mekaniker-Maja behöver hjälp att öppna motorn."),
    ("sv_zone_plaza", REX_SV, "Neon-Torget! Titta på den lysande holo-valen! Kocken Glasse har tappat bokstäverna till sin glass-skylt."),
    ("sv_zone_park", REX_SV, "Cyber-Parken! Här växer lysande neon-träd, men laser-bron är avstängd och robo-hunden Pixel är hungrig!"),
    ("sv_zone_tower", REX_SV, "Klocktornet och Neon-Motorvägen! Nu kan vi köra sviff-hojen hela vägen upp till toppen!"),

    ("en_zone_garage", REX_EN, "Scrap Alley and the Hover-Garage! Here is my hover-bike! Mechanic Maja needs help opening the engine."),
    ("en_zone_plaza", REX_EN, "Neon Plaza! Look at the glowing holo-whale! Chef Scoops lost the letters on his neon ice-cream sign."),
    ("en_zone_park", REX_EN, "The Cyber Park! Glowing neon trees grow here, but the laser bridge is off and Pixel the Robo-Dog is hungry!"),
    ("en_zone_tower", REX_EN, "The Clocktower and Neon Highway! Now we can ride the hover-bike all the way to the top!"),

    # Characters & Hotspots
    ("sv_maja_hello", MAJA_SV, "Hej Rex och Bulten! För att laga sviff-hojen behöver vi först laser-nyckeln från verktygs-lådan!"),
    ("sv_maja_fixed", MAJA_SV, "Snyggt jobbat! Motorn spinner som en cyber-katt! Här får ni den första kraft-kärnan!"),
    ("sv_bulten_crane", BULTEN_SV, "Bip-bop! Titta! Magnet-kranen plockade upp en super-magnet ur skrot-högen!"),
    ("sv_bulten_wrench", BULTEN_SV, "Hurra! Du hittade den lysande laser-nyckeln! Klicka på den i väskan och använd den på sviff-hojen!"),
    ("sv_bulten_token", BULTEN_SV, "Tjoho! Super-magneten drog upp ett gyllene arkad-mynt ur brunnen!"),
    ("sv_bulten_battery", BULTEN_SV, "Wow! Holo-automaten gav oss ett turbo-batteri!"),
    ("sv_glasse_hello", GLASSE_SV, "Hallå där! Min stora neon-skylt har slocknat, och automaten behöver ett guld-mynt! Kan ni hjälpa mig?"),
    ("sv_glasse_fixed", GLASSE_SV, "Underbart! Nu lyser hela glass-kiosken igen! Varsågod, ta en lysande cyber-glass och en kraft-kärna!"),
    ("sv_flora_hello", FLORA_SV, "Välkomna till Cyber-Parken! Robo-hunden Pixel vaktar bro-nyckeln, men han älskar lysande cyber-glass!"),
    ("sv_pixel_happy", BULTEN_SV, "Voff-bip! Pixel älskade cyber-glassen! Han gav oss nyckel-kortet till laser-bron!"),
    ("sv_flora_fixed", FLORA_SV, "Strålande! Laser-bron lyser i alla regnbågens färger! Ta med er turbo-spolen och den tredje kraft-kärnan!"),
    ("sv_dj_hello", BULTEN_SV, "Yo! DJ Blip väntar vid Klocktornet! Sätt in turbo-spolen i sviff-hojen så kör vi längs neon-motorvägen!"),
    ("sv_dj_finale", BULTEN_SV, "Jippi! Alla fyra kraft-kärnor är på plats! Nu lyser hela Neon-staden! Dags för robo-disco!"),

    # Fun LucasArts Discovery & Silly Item Combinations
    ("sv_discover_jukebox", BULTEN_SV, "Bip-bop! Vilken svängig cyber-musik! Bulten kan inte sluta dansa!"),
    ("sv_discover_whale", REX_SV, "Oooo! Holo-valen sjunger i luften över Neon-torget!"),
    ("sv_discover_scrapbot", BULTEN_SV, "Atjooo! Haha, den lilla skrot-roboten nös ut en glittrande mutter!"),
    ("sv_discover_owl", FLORA_SV, "Ho-ho! Cyber-ugglan Nova blinkar med sina gyllene kamera-ögon!"),
    ("sv_wrong_item_1", BULTEN_SV, "Haha! Bip-bop! Bulten tror inte att de där prylarna passar ihop! Prova på något annat!"),
    ("sv_wrong_item_2", REX_SV, "Hmm, det kittlas bara! Vi testar att använda prylen på ett annat ställe!"),
    ("sv_locked_engine", REX_SV, "Motor-luckan sitter fast! Vi behöver laser-nyckeln från verktygs-lådan först."),
    ("sv_locked_sign", GLASSE_SV, "Skylten har ingen ström än! Använd guld-myntet i holo-automaten för att hämta turbo-batteriet först!"),
    ("sv_locked_bridge", FLORA_SV, "Bro-datorn är låst! Ge robo-hunden Pixel en cyber-glass så får ni nyckel-kortet!"),
    ("sv_locked_highway", REX_SV, "Vi måste laga motorn i garaget och hämta turbo-spolen i Cyber-Parken innan vi kan flyga på motorvägen!"),

    # Scanner / Hints
    ("sv_hint_garage", BULTEN_SV, "Bultens cyber-scanner tipsar: Öppna den röda verktygs-lådan och tryck på magnet-kranen!"),
    ("sv_hint_plaza", BULTEN_SV, "Bultens cyber-scanner tipsar: Använd super-magneten på gatubrunnen för att fiska upp guld-myntet!"),
    ("sv_hint_park", BULTEN_SV, "Bultens cyber-scanner tipsar: Ge den lysande cyber-glassen till robo-hunden Pixel!"),
    ("sv_hint_tower", BULTEN_SV, "Bultens cyber-scanner tipsar: Klicka på sviff-hojen eller motorvägen för att starta det stora racet!"),

    # Mini-Game Intros & Praise
    ("sv_mg_math_intro", MAJA_SV, "Koppla ihop motor-koden! Räkna kraft-cellerna och tryck på rätt siffra!"),
    ("sv_mg_letters_intro", GLASSE_SV, "Laga neon-skylten! Lyssna på ordet och välj rätt bokstav som fattas!"),
    ("sv_mg_shapes_intro", FLORA_SV, "Bygg klart laser-bron! Vilken lysande form kommer härnäst i mönstret?"),
    ("sv_mg_highway_intro", REX_SV, "Håll i hatten Bulten! Nu flyger vi på Neon-Motorvägen! Styr och samla tio energi-stjärnor!"),

    ("sv_praise_1", REX_SV, "Helt rätt! Strålande jobbat!"),
    ("sv_praise_2", BULTEN_SV, "Bip-bop! Du är ett riktigt cyber-proffs!"),
    ("sv_praise_3", MAJA_SV, "Snyggt räknat! Vilken super-hjärna!"),
    ("sv_try_again", REX_SV, "Nästan! Kolla noga och prova en gång till!"),

    # Phonics / Letter Words
    ("sv_word_bil", GLASSE_SV, "Vilken bokstav börjar Sviff-Bil på? B... som i Bil!"),
    ("sv_word_sol", GLASSE_SV, "Vilken bokstav börjar Cyber-Sol på? S... som i Sol!"),
    ("sv_word_katt", GLASSE_SV, "Vilken bokstav börjar Neon-Katt på? K... som i Katt!"),
    ("sv_word_glass", GLASSE_SV, "Vilken bokstav börjar Turbo-Glass på? G... som i Glass!"),
    ("sv_word_robot", GLASSE_SV, "Vilken bokstav börjar Robot på? R... som i Robot!"),
    ("sv_word_hund", GLASSE_SV, "Vilken bokstav börjar Robo-Hund på? H... som i Hund!"),

    # Counting 1-10 for Highway & Math
    ("sv_count_1", REX_SV, "Ett!"),
    ("sv_count_2", REX_SV, "Två!"),
    ("sv_count_3", REX_SV, "Tre!"),
    ("sv_count_4", REX_SV, "Fyra!"),
    ("sv_count_5", REX_SV, "Fem! Halvvägs!"),
    ("sv_count_6", REX_SV, "Sex!"),
    ("sv_count_7", REX_SV, "Sju!"),
    ("sv_count_8", REX_SV, "Åtta!"),
    ("sv_count_9", REX_SV, "Nio!"),
    ("sv_count_10", REX_SV, "Tio! Hurra! Vi är framme vid Klocktornet!"),
]

async def gen_one(sem, clip_id, profile, text):
    voice, pitch, rate = profile
    out_path = os.path.join(OUT_DIR, f"{clip_id}.mp3")
    async with sem:
        communicate = edge_tts.Communicate(text, voice, pitch=pitch, rate=rate)
        await communicate.save(out_path)
        print(f"Generated {clip_id}.mp3")

async def main():
    sem = asyncio.Semaphore(6)
    await asyncio.gather(*(gen_one(sem, cid, prof, txt) for cid, prof, txt in LINES))
    print(f"All {len(LINES)} neural voice clips generated!")

if __name__ == "__main__":
    asyncio.run(main())
