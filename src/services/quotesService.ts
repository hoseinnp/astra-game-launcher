import type { GameQuote } from '../types/game';

interface GameQuoteCatalogEntry {
  keywords: string[];
  quotes: GameQuote[];
}

export class QuotesService {
  private static readonly CATALOG: GameQuoteCatalogEntry[] = [
    {
      keywords: ['cyberpunk', 'cyberpunk 2077', 'phantom liberty'],
      quotes: [
        { text: 'Wake the fuck up, Samurai. We have a city to burn.', speaker: 'Johnny Silverhand' },
        { text: 'A thing of beauty will never fade away.', speaker: 'Johnny Silverhand' },
        { text: 'Goodbye, V. And never stop fighting.', speaker: 'Johnny Silverhand' },
        { text: 'To this, V. To never fading away.', speaker: 'Jackie Welles' }
      ]
    },
    {
      keywords: ['elden ring', 'shadow of the erdtree'],
      quotes: [
        { text: 'Foul Tarnished, in search of the Elden Ring. Someone must extinguish thy flame.', speaker: 'Margit, the Fell Omen' },
        { text: 'I am Malenia, Blade of Miquella, and I have never known defeat.', speaker: 'Malenia' },
        { text: 'Put these foolish ambitions to rest.', speaker: 'Margit, the Fell Omen' },
        { text: 'Rise, Tarnished, and be guided by grace to brandish the Elden Ring.', speaker: 'Narrator' }
      ]
    },
    {
      keywords: ['doom', 'doom eternal', 'doom 2016', 'doom the dark ages'],
      quotes: [
        { text: 'Rip and tear, until it is done.', speaker: 'King Novik' },
        { text: 'Against all the evil that Hell can conjure... we send unto them only you.', speaker: 'King Novik' },
        { text: 'The only thing they fear is you.', speaker: 'Elena Richardson' },
        { text: 'You can’t just shoot a hole into the surface of Mars.', speaker: 'Samuel Hayden' }
      ]
    },
    {
      keywords: ['hollow knight', 'silksong'],
      quotes: [
        { text: 'No cost too great. No mind to think. No will to break.', speaker: 'The Pale King' },
        { text: 'Git gud!', speaker: 'Hornet' },
        { text: 'Through its sacrifice Hallownest lasts eternal.', speaker: 'The Pale King' },
        { text: 'Bapanada.', speaker: 'Iselda' }
      ]
    },
    {
      keywords: ['ghost of tsushima', 'tsushima'],
      quotes: [
        { text: 'Honor died on the beach. The Ghost will save our people.', speaker: 'Jin Sakai' },
        { text: 'A samurai sacrifices everything for his people. Even his honor.', speaker: 'Jin Sakai' },
        { text: 'The Sakai family katana. Sharp enough to cut the wind.', speaker: 'Lord Shimura' }
      ]
    },
    {
      keywords: ['witcher', 'witcher 3', 'wild hunt'],
      quotes: [
        { text: "Evil is evil. Lesser, greater, middling, it makes no difference. If I'm to choose, I'd rather not choose at all.", speaker: 'Geralt of Rivia' },
        { text: "Wind's howling.", speaker: 'Geralt of Rivia' },
        { text: "This world doesn't need a hero. It needs a professional.", speaker: 'Geralt of Rivia' }
      ]
    },
    {
      keywords: ['red dead redemption', 'red dead redemption 2', 'rdr2', 'rdr'],
      quotes: [
        { text: "We can't change what's done, we can only move on.", speaker: 'Arthur Morgan' },
        { text: 'I gave you all I had. I did.', speaker: 'Arthur Morgan' },
        { text: 'Be loyal to what matters.', speaker: 'Arthur Morgan' },
        { text: 'People don’t forget. Nothing gets forgiven.', speaker: 'John Marston' }
      ]
    },
    {
      keywords: ['bioshock', 'bioshock remastered'],
      quotes: [
        { text: 'Would you kindly?', speaker: 'Andrew Ryan' },
        { text: 'A man chooses, a slave obeys.', speaker: 'Andrew Ryan' },
        { text: 'No gods or kings. Only man.', speaker: 'Andrew Ryan' }
      ]
    },
    {
      keywords: ['bioshock infinite'],
      quotes: [
        { text: "There's always a lighthouse, there's always a man, there's always a city.", speaker: 'Elizabeth' },
        { text: 'Bring us the girl and wipe away the debt.', speaker: 'Robert Lutece' }
      ]
    },
    {
      keywords: ['portal', 'portal 2'],
      quotes: [
        { text: 'The cake is a lie.', speaker: 'Doug Rattmann' },
        { text: "When life gives you lemons, don't make lemonade. Make life take the lemons back!", speaker: 'Cave Johnson' },
        { text: "Oh, it's you. It's been a long time. How have you been?", speaker: 'GLaDOS' }
      ]
    },
    {
      keywords: ['half-life', 'half life', 'half-life 2', 'black mesa'],
      quotes: [
        { text: 'The right man in the wrong place can make all the difference in the world.', speaker: 'The G-Man' },
        { text: 'Wake up, Mister Freeman. Wake up and smell the ashes.', speaker: 'The G-Man' }
      ]
    },
    {
      keywords: ['mass effect', 'mass effect 2', 'mass effect 3', 'mass effect legendary edition'],
      quotes: [
        { text: 'Had to be me. Someone else might have gotten it wrong.', speaker: 'Mordin Solus' },
        { text: "I'm Commander Shepard, and this is my favorite store on the Citadel.", speaker: 'Commander Shepard' },
        { text: 'Stand in the ashes of a trillion dead souls and ask the ghosts if honor matters. The silence is your answer.', speaker: 'Javik' }
      ]
    },
    {
      keywords: ['dark souls', 'dark souls 2', 'dark souls 3', 'dark souls remastered'],
      quotes: [
        { text: 'Praise the Sun!', speaker: 'Solaire of Astora' },
        { text: "Don't you dare go Hollow.", speaker: 'Laurentius of the Great Swamp' },
        { text: 'Ashen One, hearest thou my voice still?', speaker: 'Fire Keeper' },
        { text: 'If only I could be so grossly incandescent!', speaker: 'Solaire of Astora' }
      ]
    },
    {
      keywords: ['bloodborne'],
      quotes: [
        { text: 'A hunter must hunt.', speaker: 'Eileen the Crow' },
        { text: 'Fear the Old Blood.', speaker: 'Master Willem' },
        { text: 'Tonight, Gehrman joins the hunt...', speaker: 'Gehrman' },
        { text: 'May you find your worth in the waking world.', speaker: 'The Plain Doll' }
      ]
    },
    {
      keywords: ['sekiro', 'sekiro: shadows die twice'],
      quotes: [
        { text: 'Hesitation is defeat.', speaker: 'Isshin, the Sword Saint' },
        { text: 'A shinobi would know the difference between honor and victory.', speaker: 'Genichiro Ashina' }
      ]
    },
    {
      keywords: ['god of war', 'god of war ragnarok'],
      quotes: [
        { text: "Don't be sorry, be better.", speaker: 'Kratos' },
        { text: 'Close your heart to it, boy.', speaker: 'Kratos' },
        { text: 'Death can have me when it earns me.', speaker: 'Kratos' },
        { text: 'Zeus! Your son has returned! I bring the destruction of Olympus!', speaker: 'Kratos' }
      ]
    },
    {
      keywords: ['metal gear solid', 'mgs', 'metal gear solid v', 'the phantom pain', 'snake eater'],
      quotes: [
        { text: 'Kept you waiting, huh?', speaker: 'Solid Snake' },
        { text: 'War has changed.', speaker: 'Old Snake' },
        { text: 'Snake? Snake?! SNAAAAKE!', speaker: 'Colonel Campbell' }
      ]
    },
    {
      keywords: ['metal gear rising', 'revengeance'],
      quotes: [
        { text: 'Memes, the DNA of the soul!', speaker: 'Monsoon' },
        { text: 'Nanomachines, son! They harden in response to physical trauma.', speaker: 'Senator Armstrong' }
      ]
    },
    {
      keywords: ['halo', 'halo infinite', 'halo reach', 'master chief'],
      quotes: [
        { text: 'Sir, permission to leave the station. To give the Covenant back their bomb.', speaker: 'Master Chief' },
        { text: 'I need a weapon.', speaker: 'Master Chief' },
        { text: 'Our duty as soldiers is to protect humanity. Whatever the cost.', speaker: 'Master Chief' }
      ]
    },
    {
      keywords: ['fallout: new vegas', 'fallout new vegas'],
      quotes: [
        { text: 'Truth is... the game was rigged from the start.', speaker: 'Benny' },
        { text: 'War. War never changes.', speaker: 'Narrator' }
      ]
    },
    {
      keywords: ['fallout', 'fallout 4', 'fallout 3', 'fallout 76'],
      quotes: [
        { text: 'War. War never changes.', speaker: 'Narrator' },
        { text: 'Another settlement needs our help.', speaker: 'Preston Garvey' }
      ]
    },
    {
      keywords: ['skyrim', 'the elder scrolls v', 'the elder scrolls'],
      quotes: [
        { text: "Hey, you. You're finally awake.", speaker: 'Ralof' },
        { text: 'I used to be an adventurer like you, then I took an arrow in the knee.', speaker: 'Whiterun Guard' },
        { text: 'Fus Ro Dah!', speaker: 'The Dragonborn' }
      ]
    },
    {
      keywords: ['morrowind', 'the elder scrolls iii'],
      quotes: [
        { text: "Wake up, we're here. Why are you shaking? Are you ok? Wake up.", speaker: 'Jiub' }
      ]
    },
    {
      keywords: ['gta', 'grand theft auto', 'san andreas', 'gta v', 'gta 5', 'gta iv'],
      quotes: [
        { text: 'Ah shit, here we go again.', speaker: "Carl 'CJ' Johnson" },
        { text: 'All we had to do was follow the damn train, CJ!', speaker: 'Big Smoke' },
        { text: "You forget a thousand things every day, pal. Make sure this is one of 'em.", speaker: 'Michael De Santa' }
      ]
    },
    {
      keywords: ['hades', 'hades ii'],
      quotes: [
        { text: 'There is no escape.', speaker: 'Hades' },
        { text: 'In the name of Hades! Olympus, I accept this message!', speaker: 'Zagreus' },
        { text: 'Death to Chronos.', speaker: 'Melinoë' }
      ]
    },
    {
      keywords: ['far cry', 'far cry 3'],
      quotes: [
        { text: 'Did I ever tell you what the definition of insanity is?', speaker: 'Vaas Montenegro' }
      ]
    },
    {
      keywords: ['max payne', 'max payne 2', 'max payne 3'],
      quotes: [
        { text: 'The past is a puzzle, like a broken mirror. As you piece it together, you cut yourself.', speaker: 'Max Payne' }
      ]
    },
    {
      keywords: ['nier', 'nier automata', 'nier: automata'],
      quotes: [
        { text: 'Everything that lives is designed to end. We are perpetually trapped in a never-ending spiral of life and death.', speaker: '2B' }
      ]
    },
    {
      keywords: ['final fantasy vii', 'ff7', 'final fantasy vii remake', 'rebirth'],
      quotes: [
        { text: "All right, everyone, let's mosey.", speaker: 'Cloud Strife' },
        { text: 'I will never be a memory.', speaker: 'Sephiroth' }
      ]
    },
    {
      keywords: ['final fantasy x', 'ffx', 'ff10'],
      quotes: [
        { text: 'Listen to my story. This may be our last chance.', speaker: 'Tidus' }
      ]
    },
    {
      keywords: ['final fantasy xvi', 'ffxvi', 'ff16'],
      quotes: [
        { text: 'The only fantasy here is yours. And we shall be its final witness!', speaker: 'Clive Rosfield' }
      ]
    },
    {
      keywords: ['persona 5', 'persona 5 royal', 'p5r'],
      quotes: [
        { text: 'I am thou, thou art I.', speaker: 'Igor' },
        { text: 'Take your time.', speaker: 'Phantom Thieves' },
        { text: 'Looking cool, Joker!', speaker: 'Morgana' }
      ]
    },
    {
      keywords: ['persona 3', 'persona 3 reload', 'p3r'],
      quotes: [
        { text: 'Memento mori. Remember you will die.', speaker: 'Pharos' },
        { text: 'Burn my dread.', speaker: 'Protagonist' }
      ]
    },
    {
      keywords: ['resident evil 4', 're4', 'resident evil'],
      quotes: [
        { text: "Where's everyone going? Bingo?", speaker: 'Leon S. Kennedy' },
        { text: "What're ya buyin', stranger?", speaker: 'The Merchant' },
        { text: 'You were almost a Jill sandwich!', speaker: 'Barry Burton' }
      ]
    },
    {
      keywords: ['silent hill', 'silent hill 2'],
      quotes: [
        { text: 'In my restless dreams, I see that town. Silent Hill.', speaker: 'Mary Shepherd-Sunderland' }
      ]
    },
    {
      keywords: ['castlevania', 'symphony of the night'],
      quotes: [
        { text: 'What is a man? A miserable little pile of secrets! But enough talk, have at you!', speaker: 'Dracula' }
      ]
    },
    {
      keywords: ['horizon zero dawn', 'horizon forbidden west', 'horizon'],
      quotes: [
        { text: 'The strength to stand alone is the strength to make a stand.', speaker: 'Aloy' },
        { text: 'Survival requires a little more than just surviving.', speaker: 'Aloy' }
      ]
    },
    {
      keywords: ['alan wake', 'alan wake 2'],
      quotes: [
        { text: "It's not a loop, it's a spiral.", speaker: 'Alan Wake' },
        { text: "It's not a lake, it's an ocean.", speaker: 'Alan Wake' }
      ]
    },
    {
      keywords: ['control'],
      quotes: [
        { text: 'You are a worm through time. The thunder song distorts you.', speaker: 'The Board' }
      ]
    },
    {
      keywords: ['baldur’s gate 3', "baldur's gate 3", 'baldurs gate 3', 'bg3'],
      quotes: [
        { text: 'What delicious chaos.', speaker: 'Astarion' },
        { text: 'Authority.', speaker: 'Narrator' },
        { text: 'I have a plan. It involves a very large hammer.', speaker: 'Karlach' }
      ]
    },
    {
      keywords: ['star wars jedi', 'fallen order', 'jedi survivor'],
      quotes: [
        { text: 'Failure is not the end, it is a necessary part of the path.', speaker: 'Eno Cordova' },
        { text: 'Trust only in the Force.', speaker: 'Cal Kestis' }
      ]
    },
    {
      keywords: ['diablo', 'diablo ii', 'diablo iv', 'diablo 4'],
      quotes: [
        { text: 'Stay awhile and listen!', speaker: 'Deckard Cain' },
        { text: 'By three they come, by three thy way opens...', speaker: 'Lilith' }
      ]
    },
    {
      keywords: ['dead space'],
      quotes: [
        { text: 'Make us whole again.', speaker: 'Nicole Brennan' },
        { text: 'Twinkle, twinkle, little star...', speaker: 'Isaac Clarke' }
      ]
    },
    {
      keywords: ['batman', 'arkham city', 'arkham knight', 'arkham asylum'],
      quotes: [
        { text: 'I am vengeance! I am the night! I am Batman!', speaker: 'Batman' },
        { text: 'Protocol 10 will commence in two hours.', speaker: 'Hugo Strange' }
      ]
    },
    {
      keywords: ['deus ex', 'human revolution', 'mankind divided'],
      quotes: [
        { text: 'I never asked for this.', speaker: 'Adam Jensen' }
      ]
    },
    {
      keywords: ['titanfall 2', 'titanfall', 'apex legends'],
      quotes: [
        { text: 'Protocol 3: Protect the Pilot.', speaker: 'BT-7248' },
        { text: 'Trust me.', speaker: 'BT-7248' }
      ]
    },
    {
      keywords: ['undertale', 'deltarune'],
      quotes: [
        { text: "Despite everything, it's still you.", speaker: 'Narrator' },
        { text: "You're gonna have a bad time.", speaker: 'Sans' }
      ]
    },
    {
      keywords: ['celeste'],
      quotes: [
        { text: 'You can do this. Just breathe.', speaker: 'Madeline' }
      ]
    },
    {
      keywords: ['outer wilds'],
      quotes: [
        { text: "It's the kind of thing that makes you glad you stopped to smell the pine trees along the way.", speaker: 'Chert' },
        { text: "There's more to explore here.", speaker: 'Ship Log' }
      ]
    },
    {
      keywords: ['slay the spire'],
      quotes: [
        { text: 'Neow welcomes you back.', speaker: 'Neow' }
      ]
    },
    {
      keywords: ['overwatch', 'overwatch 2'],
      quotes: [
        { text: 'Heroes never die!', speaker: 'Mercy' },
        { text: 'The world could always use more heroes.', speaker: 'Tracer' }
      ]
    },
    {
      keywords: ['minecraft'],
      quotes: [
        { text: 'You may not rest now, there are monsters nearby.', speaker: 'System' }
      ]
    },
    {
      keywords: ['terraria'],
      quotes: [
        { text: 'You feel an evil presence watching you...', speaker: 'System' }
      ]
    },
    {
      keywords: ['stardew valley'],
      quotes: [
        { text: "If you're reading this, you must be in dire need of a change.", speaker: 'Grandpa' }
      ]
    },
    {
      keywords: ['mortal kombat', 'mk1', 'mk11'],
      quotes: [
        { text: 'Get over here!', speaker: 'Scorpion' },
        { text: 'Finish Him!', speaker: 'Announcer' }
      ]
    },
    {
      keywords: ['street fighter', 'street fighter 6'],
      quotes: [
        { text: 'You must defeat Sheng Long to stand a chance.', speaker: 'Ryu' }
      ]
    },
    {
      keywords: ['assassin’s creed', "assassin's creed", 'assassins creed'],
      quotes: [
        { text: 'Nothing is true, everything is permitted.', speaker: 'Ezio Auditore' }
      ]
    },
    {
      keywords: ['death stranding'],
      quotes: [
        { text: "I'm Sam Porter Bridges. I make deliveries. That's what I do.", speaker: 'Sam Porter Bridges' },
        { text: 'Keep on keeping on!', speaker: 'Heartman' }
      ]
    },
    {
      keywords: ['disco elysium'],
      quotes: [
        { text: 'Sunrise, Parabellum.', speaker: 'Ancient Reptilian Brain' },
        { text: 'No, this is somewhere to be.', speaker: 'Kim Kitsuragi' }
      ]
    },
    {
      keywords: ['chrono trigger'],
      quotes: [
        { text: 'If you have the courage to leap into darkness, your destiny awaits.', speaker: 'Gaspar' }
      ]
    },
    {
      keywords: ['nfs', 'need for speed', 'heat', 'unbound'],
      quotes: [
        { text: "Don't let them take your ride.", speaker: 'Lucas Rivera' },
        { text: 'Palm City never sleeps.', speaker: 'Radio' }
      ]
    },
    {
      keywords: ['league of legends', 'lol', 'teamfight tactics', 'tft'],
      quotes: [
        { text: 'The heart is the strongest muscle.', speaker: 'Braum' },
        { text: "Welcome to Summoner's Rift.", speaker: 'Announcer' }
      ]
    }
  ];

  private static normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[™®©:_\-–—]/g, ' ')
      .replace(/\b(game of the year|goty|enhanced|remastered|director'?s cut|deluxe edition|standard edition|anniversary edition|v[\d.]+)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Find matching quotes for a game title, or returns an empty array.
   */
  public static getQuotesForGame(title: string): GameQuote[] {
    if (!title) return [];
    const normalized = QuotesService.normalizeTitle(title);

    // 1. Direct or keyword match
    for (const entry of QuotesService.CATALOG) {
      for (const kw of entry.keywords) {
        const normKw = QuotesService.normalizeTitle(kw);
        if (
          normalized === normKw ||
          normalized.includes(normKw) ||
          normKw.includes(normalized)
        ) {
          return entry.quotes;
        }
      }
    }

    return [];
  }

  /**
   * Get the primary or best quote for a game title.
   */
  public static getQuoteForGame(title: string): GameQuote | null {
    const quotes = QuotesService.getQuotesForGame(title);
    return quotes.length > 0 ? quotes[0] : null;
  }

  /**
   * Get a random iconic quote from the entire gaming catalog.
   */
  public static getRandomQuote(): GameQuote {
    const allQuotes: GameQuote[] = [];
    for (const entry of QuotesService.CATALOG) {
      allQuotes.push(...entry.quotes);
    }
    const idx = Math.floor(Math.random() * allQuotes.length);
    return allQuotes[idx] || { text: 'Rip and tear, until it is done.', speaker: 'King Novik' };
  }
}
