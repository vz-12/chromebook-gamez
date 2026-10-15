# VOIDRUNNER — the soundtrack and sound plan

Branch: `music` (worktree `C:\chromebook-music`). Work reaches `main` (and
so voidrunner.online) only when you say ship. **Disk one shipped on 12 Oct
as 1.6** (the engine, MUSIC and EFFECTS, four effects, act one's ten
tracks), **and 1.6.1 the same day** (main = 72b8d0d): THE AMALGAM's theme,
disk two's first four with the corrupted OTHER's, and THE SOUNDTRACK.
**1.6.2, also 12 Oct:** ALL HALLOWS' first four tracks and their covers.
**1.6.3, also 12 Oct:** the rest of disk two (the three rooms under THE
MIRROR, the three as one piece, ROOT) and their five covers, with main's
newer work merged in under it. This file is `.md`, so `.assetsignore` keeps it off
the public site; the repository is public, though, so it names nothing that
is not released.

## Where the sound is today (11 Oct, main = 47507b4)

- **Every sound is synthesized in code.** `Audio_` in `index.html` (~line 870)
  is a small WebAudio synth: 16 named blips (`shoot`, `hit`, `boom`,
  `boss`, …) plus about 290 hand-written `Audio_.tone` / `Audio_.noise`
  calls scattered through the bosses, rites, codex and menus. No audio
  file exists anywhere in the repo.
- **One piece of music for the whole game.** A 16-step generative bed (A
  minor pentatonic, bass line A–A–G–C, 96→130 BPM as the room heats up).
  It runs only inside the play step, so the menus, codex, shop, hub and
  every cutscene are silent, and every area and boss sounds the same.
- **One volume slider**, no music/effects split.
- **The 8 Oct memory fix stays.** `SFX_VOICES` (40) and `SFX_GAP` cap how
  many effects sound at once. Everything new goes through the same cap.
- **Sound is cosmetic.** It draws `rnd` (Math.random), never the run's
  seeded `simRnd`, so lockstep, replays and PvP don't care what it does.
  Everything new keeps to that.

## What we are building

1. **A score: every area and every boss gets its own track**, plus menus,
   modes and stingers (the list below: 38 tracks and about 10 stingers).
2. **New sound effects for everything you hear in a fight.** Each pilot's
   weapon, lasers and beams, hits and kills, abilities and awakenings,
   boss tells, the codex, shop and menus.
3. **A sound engine that can play them** in a page built for school
   Chromebooks.

### The reference: what the Calamity tracks tell us

(Measured with the music-analysis skill plus an arrangement profile of my
own. Full numbers are in the analysis section at the end.)

- **Long loops that breathe.** Every track runs 2–3 big cycles with a
  breakdown between them: a near-silent drop, a drum break or a short
  reset. The breakdowns are what keep a 4–6 minute track from wearing you
  out, and in the game they are where a boss changes phase.
- **Three tiers of weight.** The calm piece sits at about −15 dBFS, wide,
  with almost no drums. The biome piece is about −12, mostly sub and bass.
  The fights are −10 to −8.5, wall-to-wall, and start at full force with
  no intro. That becomes the mastering target: rooms and menus quiet and
  wide, sectors full, bosses loudest.
- **The low end is huge.** In the electronic tracks 80–90% of the power is
  under 250 Hz, with rising sub sweeps. The highs stay dark: little energy
  above 8 kHz, even at the loudest.
- **Tempos:** about 129 for the moving tracks, 152 and a ~190 double-time
  feel for the fights.
- **Keys:** minor, or major made bittersweet. Every track is restless
  harmonically: it moves rather than vamping on one chord.

**The rule for inspiration:** every melody, riff and progression is
original. From Calamity we take the DNA (the tempo and energy arcs, the
genre fusion, the instrumentation, how dense the mix is and how it
breathes), never a recognisable hook.

### The musical identity

- **Neon cyber-metal.** Synthwave and industrial electronics carry the
  sectors. Distorted guitars, live drums, choir and orchestra arrive for
  the bosses. Glitch, tape-stop and bitcrush belong to the fracture,
  where the game itself is being edited.
- **One main theme, from the first build.** The motif is grown from the
  original 7 Aug synth bed's bass line (A minor, i–i–VII–III), so the
  whole score descends from the game's first sound. Bosses get motifs of
  their own. THE OTHER plays the main theme inverted (the mirror).
- **ONE POINT OH's version war is literal.** His fight is the old 16-step
  synth and the new score playing the same progression and trading the
  floor, just as the arena splits between the first build's look and
  today's. When the record restores, the new score wins.
  (`onepointoh/first.html` keeps its original sound byte for byte; it is
  never touched.)

## The cue list

BPM and key are starting points, tuned when each track is written.
"Phases" means the boss track has sections the engine can move between on
a bar line when the boss changes phase.

### Sectors (looping area tracks: a calmer and a busier section, moved between by how hot the room is)

| cue | where | brief | start |
|---|---|---|---|
| `grid` "Entry Vector" | THE GRID, sector 01 | the opening statement: driving synthwave with the main theme, clean and fast | 140, A minor |
| `foundry` "The Line Never Stops" | THE FOUNDRY, sector 02 | industrial: anvil and metal percussion, distorted bass, steam | 132, D minor |
| `hive` "The Walls Are Moving" | THE HIVE, sector 03 | infested: scuttling and legs for percussion, insect chatter, a tune that crawls by semitones, swung | 126, F♯ minor |
| `vault` "Time Lock" | THE VAULT, sector 04 | cold and crystalline: sung bowls, a plucked zither's arpeggios, glass bells, a timer's ticks and a lock's clicks for the time lock | 118, B minor |
| `void` "Falling Upward" | THE VOID, sector 05 | vast, and pulling: a bass and chords that slide into each other, a tune that falls while every phrase starts higher, a piano, a far choir, strings, stars | 140 (half-time when calm), C minor |
| `archive` "Struck From the Record" | THE ARCHIVE, fracture i | redacted: a tune that is the same shape on every shelf (three knocks, then the piece taken down) over a ground that steps down and never arrives; notes struck out that come back once as ghosts, tape-stops, deleted beats; an old upright, paper for percussion | 124, E minor |
| `mirror` "Once From Each Side" | THE MIRROR, fracture ii | one tune seen in a mirror three ways, all in key: upside down, backwards, and its struck glass notes played backwards; broken glass for percussion; its second fight section is its first played backwards, note for note | 128, A minor |
| `leak` "Down the Drain" | THE LEAK, fracture iii | BREAKING AND ENTERING, i. You carry charge that dies in your hands, so the loop leaks: an acid line runs up its five notes, then four, three, two, one, the filter closing as it goes, and is filled again at the bar line; every long note of the tune sags before it ends. Four on the floor, drips | 136, G minor |
| `recursion` "Wheels Within Wheels" | THE RECURSION, fracture iv | BREAKING AND ENTERING, ii. A packet goes round a ring of five and a wrong turn loops it back, so the piece is in five and the loop is inside itself: its five notes in sixteenths, the bass walking the same five a beat each, the chords the same five a bar each; a second copy of the fast ring slips a sixteenth later every bar. One section is wrong turns (a bar and back, then two, three, four); the last takes the one turn that leads out | 136 in five-four, F minor |
| `halt` "After You" | THE HALT, fracture v | BREAKING AND ENTERING, iii. You may move or act, never both, so it is in threes of bars: two where the band moves and there is no tune, then everything stops where it stood (a held chord, a clock) and the tune acts, one bar, alone. The band and the tune are never heard together | 136, E flat minor |
| `rootroom` | ROOT'S ROOM | a terminal: chiptune over industrial | 150, C♯ minor |
| `library` | THE LIBRARIES | quiet: celesta, music box, dust | 80, F major / D minor |
| `hub` | THE HUB | home: the main theme on piano and pads | 90, A minor |
| `stands` | THE STANDS | before the tribunal: a hall waiting for one man, koto and low drums | 70, D minor |
| `shop` | shop and portal rooms | the shopkeeper's lounge: jazzy chiptune | 100, E♭ major |
| `planetarium` | planetarium | celestial pads, a slow arpeggio | 72, B♭ lydian |
| `patch` "Left to Ripen" | ALL HALLOWS i, THE PATCH | a jig in a minor key, four beats of three: harpsichord over a tuba and plucked strings, a xylophone for ribs, a theremin for what is standing in the field; insects, wind, a bell. Its fight is the jig as metal with an organ on the off-beats, then half time over a bass that walks down by semitones | 150, D minor (an E flat where the vine catches) |
| `house` "Lights on a Timer" | ALL HALLOWS ii, THE HOUSE | a waltz on a music box, with a timer ticking on every beat: `deadgame`'s tune heard from another room. Two calm sections take turns, and at the end of the second the music box runs down and a latch drops; the fight is the same waltz danced (harpsichord, tuba, organ), then a half-time breakdown under the theremin | 144 in three-four, G minor |
| `yard` | ALL HALLOWS iii, THE YARD | graveyard: bells, choir, doom | 76, C minor |
| `vigil` | the vigil | candlelit, waiting | 60, A minor |

### Bosses (one track each, with phases)

| cue | boss | brief | start |
|---|---|---|---|
| `warden` "The First Wall" | THE WARDEN | the first wall: metal riff on the main theme, live drums | 160, A minor |
| `forgeheart` "Struck While Hot" | FORGEHEART | furnace metal: brass hits, hammered percussion | 165, D minor |
| `broodmother` "Mother of Thousands" | BROODMOTHER | nu-metal bounce on the hive's tune, a creeping choir, skittering hi-hats, her brood scuttling through it | 145, F♯ minor |
| `archivist` "Filed Under Lost" | THE ARCHIVIST | baroque and breaking: a harpsichord subject down the circle of fifths, staccato strings, a typewriter for hats, a record that skips | 170, B minor |
| `null` "The Schedule Says It Is Time" | NULL | the act-one finale: a statement with no drums, the main theme at half speed and then full, each sector's tune for four bars on its own instrument, THE VOID's tune sung under the theme's answer | 150, C minor |
| `curator` "A Piece Short" | THE CURATOR | stately: THE ARCHIVE's tune set out as a waltz, a string quartet over iron; the ground goes down by semitones in the last phase, and its last bar is not there | 150 in three-four, E minor |
| `other` "Your Reflection" (your title) | THE OTHER | the first song, Entry Vector, in the glass and gone wrong, and less of it yours the further it goes: its opening with every other bar backwards; its fight with the theme's reflection against it; the reflection alone; then a tune of its own, a palindrome | 160, A minor |
| `corrupt` "Your Reflection (Corrupted)" | the corrupted OTHER | the same song with something else in it: faster, every B a B flat, the leads crushed, a low voice under them that was never there, notes sticking | 176, A minor with a B flat |
| `keeper` | THE BOOKKEEPER | baroque metal: harpsichord and guitars, ledger ticking | 168, F minor |
| `shopkeeper` | THE SHOPKEEPER | jazz-metal: walking bass, ka-ching percussion | 180 swung, E♭ minor |
| `unwritten` | THE UNWRITTEN | a blank page: sparse piano that writes itself into a full orchestra. Since its rewrite (15 Oct) the fight asks for `p1` to `p5`, one a sequence, A BLANK PAGE to THE LAST LINE, so the five steps of the writing can be its moods | 120→180, C minor |
| `amalgam` "Made of Favourites" | THE AMALGAM (EMBER's rite) | a suite bolted together in the order he builds the body: its own walk, then one motif from each act-one boss (THE WARDEN's riff, FORGEHEART's hammer, BROODMOTHER's long line, THE ARCHIVIST's chorale, NULL's rising statement), a quiet middle of its own, and the main theme to finish | 140 (half-time until the finale), D minor |
| `root` "Child's Play" (your title) | ROOT (and THE HACKER's rite, the race) | techno and metal, and one tune: the one every playground sings at whoever is losing, five notes. He sings it, louder, higher, and then changes the rules (the whole song a semitone up, half-way through the last phase). A kick on every beat with the bass between, an acid line, a wall of saws, guitars on the taunt's rhythm; a square wave for his voice that slides up into every note; a music box; typewriter keys for hi-hats and its bell when a line is entered. The race is two typists, one a side | 170, C sharp minor |
| `tribunal` | THE TRIBUNAL | he does not fight: a court of drums, tension that never releases | 90, D minor |
| `founder` | THE FOUNDER (THE VAGRANT's rite, the duel) | the samurai: taiko, shakuhachi, koto, metal | 150, D minor |
| `onepointoh` | ONE POINT OH | the version war: the first build's synth against the full score | 140, A minor |
| `backlog` "I'll Get to It" | THE BACKLOG (ALL HALLOWS i) | THE PATCH's jig as metal, and never finished: each bar of the tune is put down one note short, then the phrases are handed from one instrument to the next half-way through. Only the last phase plays it whole, and only its last bar comes home | 165, four beats of three, D minor |
| `deadgame` "One Player Online" | DEAD GAME (ALL HALLOWS ii) | a dead game's title music, still playing: written for two square waves, a triangle and noise, and its voices leave it one at a time; then a band under the square-wave lead; then slow and low on an organ, with a crushed echo of the lead behind it | 155, G minor |
| `ragequit` | RAGEQUIT (ALL HALLOWS iii, when built) | furious, glitching, about to unplug | 180, C minor |

### Menus, modes, stingers

| cue | where | brief |
|---|---|---|
| `title` | the main menu | the main theme, slow and wide |
| `codex` | codex and FORGOTTEN TALES | quiet ambient, a page-turn texture |
| `rush` | boss rush | a medley: each boss's motif in one driving track |
| `pvp` | PvP matches | competitive and tight, two sections |
| sting `boss-in` | a boss arrives | an impact and a riser in the boss's key (per boss: its motif's first notes) |
| sting `boss-down` | a boss dies | a victory hit, then into the reward room |
| sting `wave` | a wave starts | a short rise |
| sting `levelup` | level up | a bright figure |
| sting `over` | game over | a falling piano phrase |
| sting `win` | a run is won | the main theme's cadence |
| sting `intrusion` | THE INTRUSION | `room.clear()`: a tape-stop into silence |

Tutorial, dailies and challenges reuse the sector tracks.

### Sound effects

**Combat (SFX I)**
- Each pilot's weapon: VOIDRUNNER's shot, EMBER's laser (start, sustain,
  end), THE HACKER's shot, THE VAGRANT's blade (swing, parry, perfect
  parry, chain). 3–5 variations each, with a small pitch drift.
- Hits, crits, kills, elite kills, explosions (small, big), the dash, being
  hurt, shields, healing, gems, drops.
- Enemy fire: spitter, turret, artillery, sentinel, prism beams, phaser.
- Lasers and beams: AMALGAM's beam, the lance, sweeps.

**Abilities and set pieces (SFX II)**
- Awakenings: SUPERUSER (Z/X/C/V, the cut-in), OVERDRIVE (SCORCHED EARTH,
  PYROTECHNICS, BRAND, FUSION CORE), RONIN (LUNAR CLEAVE, CLEAR SKY, STILL
  WATER), LAST VOW.
- Boss tells and signatures: each boss's attack warnings, phase changes,
  deaths.
- The codex: open, page turn, close, a tale unlocked.
- UI: select, confirm, back, buy, reroll, can't afford, level-up card.
- Portals, the shop's arrival, the planetarium's reading, the rites'
  cut-ins, the vigil's count.

## How it works

### The engine (Step 2)

- **A music director** runs every frame, outside the sim step, and picks a
  cue and section from what is on screen: the stage, whether a boss is up
  and in which phase, the room (library, hub, shop, stands), the screen
  (menu, codex, game over). Replays and spectators run the same director,
  so they hear the same music.
- **Tracks stream in bar-aligned pieces.** Each track is cut into short Ogg
  Opus pieces (two or four bars) that the engine starts one after another,
  each exactly on its bar line. A piece holds only the notes that begin in
  its own bars and keeps going for as long as they ring (a reverb, a crash),
  under whichever piece comes next. So any piece can follow any other,
  loops have no gap, sections change on a bar line, and nothing is ever cut
  off. Only about four pieces are decoded at once (about 15 MB, where a
  whole decoded track would hold 50). A manifest (`music/manifest.json`)
  lists each track's BPM, pieces, sections and moods.
- **Changes are musical.** A boss arriving cuts to its `boss-in` sting and
  the boss track on the next beat. Phases move on a bar line. Leaving a
  room crossfades.
- **A sector's calm and fight each play their section out.** The game's
  fight-or-calm turns with every wave (it is "six or more enemies, in a
  wave"), so when either could cut in on any piece the music kept jumping
  between the two and starting each one over (your report, 12 Oct). Now a
  section, once begun, is heard to its last bar (sixteen bars, about half a
  minute), and the mood is only asked there. `studio/build.py` marks every
  section of a calm-and-fight track `lock` in the manifest; the engine
  already knew the word, so the game's own code did not change.
- **Effects are small decoded files** with variations and a little random
  pitch. They go through the existing voice cap and gap.
- **Anything without a file falls back to today's synth.** Each step can
  ship on its own, and sounds arrive one by one. No network, an old
  browser, or no Opus support means the game sounds exactly as it does
  today.
- **Settings get MUSIC and EFFECTS sliders.** Today's VOLUME stays as the
  master.
- **The sim never notices.** Cosmetic RNG only, inert in the Node test VM;
  `npm test` and `npm run test:lockstep` pass unchanged.

### The studio (Step 3)

- **Composing in code.** Each track is a score file (`studio/scores/`:
  notes, drum patterns, sections, the mix) and a renderer in Python
  (`studio/daw.py`, `studio/inst.py`) turns it into audio. The renderer is
  a small DAW: oscillators and filters, a sampler for the raw one-shots,
  guitars double-tracked from separate takes, reverb, delay, sidechain, a
  clipper and a limiter. `studio/build.py <cue>` cuts the result into its
  pieces, encodes Opus at about 96 kbit/s, and writes the manifest;
  `studio/sfx.py` builds the effects.
- **Nobody here can hear it.** I check a mix by numbers: `studio/look.py`
  prints every instrument's level per section, the spectrum, how much is
  left for a laptop speaker (nothing under 200 Hz), and what tempo and key
  an analysis hears in the result. The files are also decoded again and
  laid out as the game lays them, and have to match the mix. You are the
  ears: `studio/listen.html` (through the worktree's static server) plays
  the real files, with the moods, the sting and the effects on buttons.
- **Splice supplies the real instruments.** A shared kit of one-shots
  (drums, guitar chugs and power chords, choir, strings, brass, piano,
  harpsichord, bells, impacts, risers), plus a few signature loops per
  track (a guitar riff, a taiko ensemble, a choir phrase), conformed to
  the track's tempo and key.
- **Licensing.** Splice samples may be used inside finished work but not
  passed on as samples, and this repo is public. Raw downloads live in
  `music-src/`, which is gitignored and never served. Only finished mixes
  and processed effects are committed, under `music/` and `sfx/`.
  (That is my reading of Splice's license; worth a glance at your plan's
  terms.)
- **Credits.** Every Splice download spends one credit the first time.
  (11 Oct: you moved to a Creator plan and said to use the whole library, so
  I no longer ask per batch; each step's report says how many were spent.
  Splice also caps downloads at 100 a day.) Splice gives no previews through
  the connector, so samples are chosen by their descriptions and measured
  after download (`studio/probe.py`); a few will turn out unusable.

### Levels (to settle at the mix, step 11)

- The game's effects are quiet: a shot peaks about 30 dB under full scale, a
  boom about 16. A mastered track at full level would bury them, so the
  music bus sits at `MUSIC_LEVEL` 0.16 (a sector plays near −28 dBFS, a boss
  near −26) and the recorded effects are set a little hotter than the blips
  they replace. The synth effects not yet replaced sit under the music more
  than they did under the old bed; the MUSIC slider is the remedy until
  steps 9–10.
- An open question for step 11: the whole game uses under half of the
  loudness it could. Raising everything together (with a limiter on the
  output) would help on a Chromebook's speakers, and would be a change every
  player hears on the day it ships.
- Chromebook speakers play nothing under about 200 Hz. Every mix is checked
  for what is left without it (the kick's click, the bass's harmonics, the
  guitars), and the references' "90% under 250 Hz" is not copied.

### Size and performance (school Chromebooks)

- About 1.5–2 MB per track at 96 kbps Opus, about 65 MB for the whole
  score. A player downloads only what they reach, a segment at a time,
  and the browser caches it. Static files don't count against the
  Worker's request budget.
- Effects total about 3 MB, loaded when a run starts.
- Memory stays bounded: about 3 music segments plus the effect buffers
  (about 25 MB, against the hundreds the 8 Oct leak reached).

## The steps

Each step: build, test, commit to `music`, then stop and report. Nothing
is pushed until you say; `main` only when you say ship.

1. **Listen and plan.** Analyze the references, inventory every area,
   boss and sound in the game, and write this file. *(done)*
2. **The engine.** Music director, segment streaming, sample effects with
   fallback, MUSIC/EFFECTS sliders, tests. Nothing sounds different yet.
   *(done 11 Oct: `Music` and `Sfx` in index.html after `Audio_`;
   `npm run test:music` runs the director against a fake Web Audio clock;
   `npm test` and `npm run test:lockstep` unchanged.)*
3. **The studio and the first slice.** The renderer, the shared kit, and
   `grid` + `warden`, the `boss-in` sting, and four effects (VOIDRUNNER's
   shot, EMBER's lance, a hit, the codex opening). *(done 11 Oct, 32 credits.
   `grid` is "Entry Vector", `warden` "The First Wall". You asked for the
   lance to be more of a laser and less of a wave: rebuilt. The player's
   pieces changed from crossfaded cuts to pieces that ring out, see above.)*

   **From here (your call, 11 Oct): the sectors first, one at a time, each
   track named; the full determinism, lockstep and live passes run once at
   the end, not per step.** ALL HALLOWS (below) waits for your word; its
   chapter II opens 14 Oct.
4. **ALL HALLOWS.** `patch`, `backlog`, `house`, `deadgame`, `vigil`, and
   `yard` + `ragequit` once chapter III is built. It's early on purpose:
   chapter II opens 14 Oct and chapter III 23 Oct.
   *(12 Oct, on your word: the first two chapters, four tracks. `patch`
   "Left to Ripen", `backlog` "I'll Get to It", `house` "Lights on a
   Timer", `deadgame` "One Player Online". Built first with nothing new
   from the library, then with the seven recordings you picked for them.
   Shipped 12 Oct as 1.6.2, with their four covers.*

   - *One opening for the whole event:* every track's tune begins on the
     same four notes, the keynote, the fifth, the note above it and the
     fifth again (D A B♭ A, G D E♭ D). `vigil` and chapter III should too.
   - *Each chapter is one tune twice:* the area's tune is its boss's. THE
     PATCH's jig is THE BACKLOG's, unfinished; DEAD GAME's title music is
     what THE HOUSE's music box plays, in three.
   - *Your seven recordings, and where each went:* the door (THE PATCH's
     gate, and in THE HOUSE twice: as it is for a stair, slowed for a
     heavier door), the thunder and the storm wind (all but `deadgame`),
     the crow (THE PATCH, calm only). The other three are loops, so the
     sound wanted had to be lifted out of them:
     - *the music box* plays one note at a time, so five of its notes
       could be cut out whole; they are THE HOUSE's music box now, with a
       ring made here under each, since a lifted note stops where the next
       began. A sixth was dropped: the note before it was still ringing in
       it, and moved to another pitch that ring was a wrong note.
     - *the cathedral organ* is chords. Its first is an open fifth, with no
       third in it, so it can stand on any root under any chord; a little
       later it holds a minor chord. Those two are the organ under every
       big moment of the four tracks (`pipes()`), held as long as needed
       by letting the steady middle go round. The organ added up from
       sines stays under it, quieter, for the chords' thirds and for tunes.
     - *the harpsichord* is a full arrangement in running sixteenths, every
       note ringing into the next: only its lowest notes are ever alone.
       One, an F, is kept for a left hand in the two fights. The tunes are
       still the old recording's one clean note over a body made here; a
       harpsichord playing single notes would do more than this loop could.
   - *Still made in the studio:* the theremin, the xylophone, the chip
     band, the music box's ring and the harpsichord's body.
   - *A bass under a chord's third is kept dull.* Where the bass has C
     sharp under an A chord, or B under a G, its own overtones spell
     another chord (an F, a D sharp). The tuba plays the chord's root
     there instead, and the bass synth's filter is closed down.
   - *Two of the kit's harpsichord notes were chords* (an E with its major
     third and seventh, a C sharp with a sixth), found when a D minor tune
     came out with F sharps in it. `harpsichord()` uses the two clean
     notes over a body made here. THE ARCHIVIST still plays the old four.
   - *The bell tolls where its overtone fits:* the bowl's loudest overtone
     is a major third two octaves up, so it is struck on F in D minor and
     on B flat in G minor, where both are notes of the home chord.
   - *A kick that rings on E* was moved a semitone down for the two G
     minor tracks, onto E flat.
   - *Two calm sections:* THE HOUSE is the first sector whose calm has two
     sections that take turns (`calm: ['a', 'a2']`), as fights have had.
   - *THE SOUNDTRACK lists them* under ALL HALLOWS: a chapter's two songs
     once the chapter has opened, kept (and listed for good) once its boss
     is down. Their covers are in (`python studio/covers.py`, from the
     `d3-` masters).)*
5. **The sectors.** `foundry`, `hive`, `vault`, `void` and their bosses.
   *(11 Oct: `foundry` "The Line Never Stops" and `forgeheart` "Struck While
   Hot" done, 13 more credits: anvils, hammer strikes, clangs, low brass.
   THE FOUNDRY has its own tune, a machine's 3 + 3 + 2; its struck metal is
   retuned to ring in D minor.)*
   *(11 Oct: `hive` "The Walls Are Moving" and `broodmother` "Mother of
   Thousands" done, 22 more credits. You asked for it more infested, with
   scuttling: a spider's steps and a scuttle replayed lower and slower, a
   "legs" instrument that taps in bursts, guiro and cabasa where hats would
   be, insect chatter under everything, a ghost choir. Swing came with it
   (`Song(swing=...)`).)*
   *(11 Oct: `vault` "Time Lock" and `archivist` "Filed Under Lost" done, 29
   more credits: sung bowls, a zither, harpsichord, string stabs, pizzicato,
   kettledrums, a typewriter, a timer, a lock, crystal. Splice's daily cap
   is nearly spent (4 left until about 19:40Z on 12 Oct).)*
   *(11 Oct: `void` "Falling Upward" and `null` "The Schedule Says It Is
   Time" done, the last 4 credits of the day: an octave string section and
   three notes of an upright piano. You added a 24th reference, Galactic
   Destruction, and asked for these two to take after it: see "The 24th
   reference" below. Both moved off the tempos first planned (100 and
   175). Act one is complete. Next: THE FRACTURE.)*
   *(12 Oct, after you listened: NULL's second phase had two passages
   that did not fit, THE HIVE's crawl by semitones and THE ARCHIVIST's
   baroque run. Both now use the slow form of the same tunes (the brood's
   long line; the subject at two notes a bar), sung by NULL's own lead and
   strings over its pulse. THE ARCHIVIST gained a four-bar intro, since it
   was too chaotic to start on. A boss track may open with one.)*
   *(12 Oct: shipped as 1.6, "the soundtrack, disk one", at your word and
   without the long test passes: the determinism and lockstep suites have
   not run since step 2 and are still owed before the last ship. Checked
   for this one: the engine test, a boot in a browser with both new boss
   intros playing through, and the live files on both addresses.)*
   *(12 Oct: a bonus for disk one, at your request: `amalgam` "Made of
   Favourites". Your brief: one well-made song out of the other boss
   themes, with sections of its own between them; epic, not cluttered;
   motifs, not passages. So every motif is in D minor and on this track's
   own band (one lead, strings under it, guitars, a choir), one idea at a
   time, and the fast forms of the tunes are left out. The fight is held to
   a hundred seconds at least and the song takes 117 to come round, so it
   plays through once in a fight; the game asks only for `p1`, and the
   sections follow each other by `next`. No new samples. Shipped in 1.6.1.)*
6. **THE FRACTURE**, which you named disk two, "Cracks in the Plane".
   `archive`, `curator`, `mirror`, `other`, `leak`, `recursion`, `halt`,
   the `intrusion` sting, `rootroom`, `root`.
   *(12 Oct, "a big 3 piece score for the rest, since it's the same sort of
   loop but different execution": **BREAKING AND ENTERING**, one score in
   three pieces, for the three rooms under THE MIRROR. `leak` "Down the
   Drain", `recursion` "Wheels Within Wheels", `halt` "After You" (the
   first names, which you called terrible, were "Dies in Your Hands", "It
   Does Not Wait" and "Never Both"). No new recordings. Shipped 12 Oct in
   1.6.3. `rootroom` is not begun; `root` follows below.*

   - *They join as one piece* (your second note: "make sure they can fit
     into one big piece perfectly"). `breakin` "Breaking and Entering" is
     the three end to end, five minutes, made of the same files:
     `python studio/build.py breakin` lays it out, and it is laid out
     again whenever one of the three is built. What makes the joins:
     - *one beat:* all three are at 136 now (they were 136, 130 and 140),
       through four beats in a bar, then five, then four;
     - *a way out of each:* a last section its own room never plays
       (`out`), where the key's fourth chord turns major. That chord leads
       into the key a whole step down: G minor leaves by C for F minor, F
       minor leaves by B flat for E flat minor. Nothing swells into the
       next piece; each is let down into it;
     - *a shared sound across the second join:* the second piece's way out
       ends on a clock, and it is the third piece's clock;
     - *an ending:* the third has no way out (`end`): the room is held,
       the clock slows and stops. (When ROOT is written, a way out to C
       sharp minor by A flat could replace it.)
     Checked from the files: the notes either side of each join are the
     chord that leads and the chord it leads to, and the level drops by
     about six decibels into each new piece's quiet opening, as it does
     inside each piece between a fight and a calm.

   - *One loop:* five notes, a minor key's first, third, fourth, fifth and
     seventh (`ring()` in `_common.py`). Each room plays it the way its
     rule works: it leaks away, it goes round inside itself, it winds up
     and is switched off.
   - *One tune* (`BREACH`, and its second strain `SINK`, in `leak.py`):
     it picks its way up the loop and holds what it reaches. THE LEAK has
     it sagging on every long note, THE HALT a bar at a time into the
     stillness; THE RECURSION's tune is the loop itself, a bar a note.
   - *Each a whole step lower than the last:* G minor, F minor, E flat
     minor. One more step is C sharp minor, which is where this plan
     already had ROOT.
   - *Each is bigger than a sector's track has been:* a short opening and a
     short calm (the room starts sending bodies at once, and a section
     plays out before the next may begin), then three fight sections in a
     chain, b to c to d and round, so a long break-in does not hear the
     same sixteen bars twice running.
   - *THE RECURSION is in five-four* (`Song(beats=5, steps=20)`), the
     first track that is; its sections are five and ten bars. With five
     chords in a ring and none of them the last, a first render was heard
     as C minor: the tune now holds each bar's own note of the five, and
     the keynote is held under every chord.
   - *THE SOUNDTRACK lists them* after the corrupted OTHER's, and the three
     as one piece after them, kept once all three are. No boss waits in
     these rooms, so a song there is kept once the room's defences have
     been taken down (the tales' count of it). Their covers came with 1.6.3.
   - *The listening room* plays a joined piece whole, or on from any of
     its sections, so a join can be heard without the minutes before it.)*

   *(12 Oct: `root` "Child's Play", your title, "reflecting his
   personality", "full techno metal". No new recordings. Shipped 12 Oct in 1.6.3, with
   its cover.*

   - *Who he is, in the game's own lines:* a child with the admin
     password. "this is MY room." "it is not cheating if I wrote the
     rules." "that does not count!" "I was still typing!" So the song is
     one tune, the playground's taunt (five notes: down a third, up a
     fourth, down a step, down a third), and nothing else: `CHILD` in
     `root.py` is the taunt eight times, where it is, a step up, higher,
     and a run up the dominant where he loses his temper.
   - *The phases are his moods:* `p1` the taunt over the machine; `p2`
     half time, the taunt said slowly, and at the end of each half he
     mashes the keys and the power is cut; `p3` the tantrum, and half-way
     through he changes the rules: everything goes up a semitone, to D
     minor, and comes back for the loop as if it had not. His health is
     his phase, and one of his cheats puts it back to full, so the song
     goes back to `p1` with it, which is the joke.
   - *The race* (`race`, THE HACKER's rite) is two typists, one a side:
     runs up the key traded half a bar each, his first on every other
     line, the bell at the end of every line.
   - *Techno:* the kick is made here and tuned to the keynote; the bass
     plays only between the beats. *His typing* is THE ARCHIVIST's
     typewriter, and *the music box* is THE HOUSE's.
   - *The key* is the next whole step down from the three rooms above
     him: G, F, E flat, C sharp.
   - *One drum was in the wrong key:* the snare rings on G, a tritone from
     home here, and is moved up to G sharp.
   - *Not done, and not asked for yet:* `rootroom` (nothing in the game
     asks for it today: he turns up in THE HALT's own room) and the
     `intrusion` sting.)*
   *(12 Oct: `archive` "Struck From the Record" and `curator` "A Piece
   Short" done, with no new samples: Splice's day was spent. The studio
   learned three-four (`Song(beats=3, steps=12)`) for THE CURATOR's waltz,
   and a tape-stop. You heard a guitar clashing with the tune in the calm
   section: it was two recordings that are not what their names say, a
   "cello" that is a major-sixth chord and a zither "open fifth" that
   strums a major chord a tone low before it lands. Both are out of these
   two tracks, and `look.py --notes` now lists the notes sounding in each
   bar and flags any outside the key, so the next one is caught before you
   hear it. Shipped in 1.6.1.)*
   *(12 Oct: `mirror` "Once From Each Side", `other` "Your Reflection" and
   `corrupt` "Your Reflection (Corrupted)" done. Your brief: glass shard
   effects, and play with reversing the music while keeping it pleasing;
   then, for THE OTHER, your title, "a more chaotic version of the first
   song that gets more unique the further it goes", and a corrupted
   counterpart. The glass is four recordings you added to your library
   (Splice's cap was on my side): a bottle, a vase whose pieces are cut
   into single shards, and two of debris. Reversing is done three ways that
   stay in key: `flip()` turns a line upside down within the scale,
   `retro()` and `backward()` play a line or a whole section backwards, and
   `inst.backwards()` plays an instrument's notes backwards. I took "the
   first song" to be Entry Vector. The corrupted OTHER is the one change to
   the game's own code: `musicWant` picks `corrupt` when the boss on the
   floor has the virus. Shipped in 1.6.1.)*
7. **The secret rooms and the story.** `library`, `keeper`, `shop`,
   `shopkeeper`, `planetarium`, `unwritten`, `amalgam`, `hub`, `stands`,
   `tribunal`, `founder`, `onepointoh`.
8. **Menus, modes and stingers.** `title`, `codex`, `rush`, `pvp`, and the
   rest of the stings.
9. **SFX I: combat.**
10. **SFX II: abilities, set pieces, codex and UI.**
11. **Mix and ship.** A loudness and balance pass across the whole score, a
    size and memory check on a Chromebook-class budget, the changelog, and
    ship when you say.

**Also built, at your request (12 Oct): THE SOUNDTRACK**, a music selector in
the game. A door on the menu, under PVP, and the M key.

- **What it lists:** every song there are files for, in disk order, each
  beside its cover and its name. A song is kept by going through its part of
  the game, not by hearing it: a sector's once the sector is passed (its boss
  down), a boss's once the boss is down, the corrupted OTHER's once that is
  down. It reads the tales' kill counts and, for a record older than those,
  how deep the profile has been. A song not kept is listed with a lock and no
  name, and says what will keep it.
- **How it plays:** a song picked is played through, by its own running
  order (the listening copy's: `order` and `loop` in the manifest, written by
  `build.py`), every section whole, with no boss sting. It stays on over the
  menu after the panel is shut and lets go when a run begins.
- **The covers** are the masters in `music-src/covers/` (never published),
  brought down to 512 px WebP by `python studio/covers.py` into
  `music/covers/`, about 30 KB each, and named in the manifest. Run it again
  whenever covers are added: a master is matched to its track by its title.
  They are fetched only for songs that are kept; a song with no picture yet
  shows its colour and its number.
- **When it ships** it wants a line in the CHANGELOG. Shipped in 1.6.1.

## Reference analysis

All 23 first reference tracks (the four from Downloads and the 19 in
`C:\ref. music`) were listened to with the music-analysis skill's full
listen and an arrangement profile of my own, 11 Oct. Loudness is a gated RMS
in dBFS (close enough to compare the tracks with each other); "low" is the
share of the power under 250 Hz; "air" is the share above 4 kHz; "perc" is
the drum share (HPSS); "quiet" is the seconds spent below a quarter of the
track's own peak energy, which is how much of it is breakdown.

| # | track | length | tempo | key | loud | low | air | perc | quiet |
|---|---|---|---|---|---|---|---|---|---|
| 1-01 | The Tale of a Cruel World | 4:21 | 129 | C minor | −15.0 | .27 | .00 | .04 | 52 s |
| 1-02 | wasteland | 6:21 | 129 | D major | −12.1 | .90 | .00 | .10 | 132 s |
| 1-03 | Guardian of The Former Seas | 4:34 | 96 (×2) | F minor | −10.3 | .76 | .02 | .14 | 20 s |
| 1-04 | 1NF3$+@+!0N | 4:34 | 152 | F♯ minor | −8.5 | .86 | .03 | .18 | 8 s |
| 1-05 | The Filthy Mind | 4:17 | 112 | D minor | −10.9 | .64 | .03 | .27 | 28 s |
| 1-06 | Blood Coagulant | 5:04 | 123 | G♯ minor | −10.8 | .70 | .04 | .33 | 8 s |
| 1-07 | Hadopelagic Pressure | 4:27 | 117 | E minor | −9.4 | .75 | .01 | .13 | 44 s |
| 2-03 | Left Alone | 5:14 | 112 | D♯ minor | −10.2 | .63 | .01 | .14 | 4 s |
| 2-05 | Silence before the storms | 3:36 | 117 | A minor | −14.6 | .77 | .00 | .04 | 164 s |
| 2-11 | Open Frenzy | 5:00 | 112 | F minor | −8.9 | .71 | .03 | .14 | 8 s |
| 3-02 | Murderswarm | 3:23 | 103 | A minor | −11.5 | .65 | .07 | .15 | 20 s |
| 3-03 | Unholy Insurgency | 5:18 | 117 | G minor | −8.8 | .59 | .08 | .20 | 12 s |
| 3-04 | Servants of The Scourge | 5:50 | 96 (×2) | G♯ minor | −9.8 | .70 | .04 | .17 | 24 s |
| 3-05 | Feral Amalgamation | 5:18 | 89 | D major | −9.5 | .65 | .04 | .18 | 8 s |
| 3-06 | void | 6:48 | 123 | B major | −15.2 | .40 | .00 | .05 | 176 s |
| 3-07 | Scourge of The Universe | 7:38 | 96 (×2) | C♯ minor | −11.2 | .49 | .05 | .17 | 52 s |
| 3-08 | UNIVERSAL COLLAPSE | 4:16 | 99 | D♯ minor | −9.5 | .52 | .05 | .14 | 8 s |
| 3-09 | Infernal Catharsis (Rebirth) | 8:00 | 103 | E minor | −11.3 | .66 | .05 | .15 | 12 s |
| 3-10 | Roar of The Jungle Dragon | 8:24 | 123 | C♯ minor | −12.0 | .58 | .04 | .14 | 24 s |
| 3-11 | Stained, Brutal Calamity | 12:14 | 117 | F minor | −11.3 | .61 | .03 | .09 | 180 s |
| 3-12 | Pest of The Cosmos | 4:07 | 129 | C♯ minor | −8.6 | .80 | .02 | .19 | 8 s |
| 4-01 | Cosmic Disgust | 3:55 | 129 | C♯ minor | −8.9 | .73 | .02 | .17 | 32 s |
| 4-02 | Threats of The Ocean Floor | 4:00 | 162 | E minor | −11.0 | .77 | .02 | .10 | 28 s |
| + | Galactic Destruction | 4:41 | 140 | B minor | −10.2 | .71 | .02 | .13 | 4 s |

### What 23 tracks say that 4 did not

- **Three weights, now confirmed.** Three tracks sit at −15 (the calm
  ones: 1-01, 2-05, 3-06), and two of them are the only really wide ones
  (stereo width 0.83 and 0.88; everything else is 0.25–0.57, narrow and
  heavy). Five are −8.9 or louder and are walls from the first bar. The
  rest sit between −12 and −9.4.
- **Four tracks are mostly waiting.** Over 130 s below quarter energy:
  wasteland, Silence before the storms, void, Stained Brutal Calamity.
  Nine are walls with 12 s of rest or less. The score should have both, and
  the sectors are where the long breaths go.
- **The highs stay dark everywhere.** No track has more than 8% of its
  power above 4 kHz (the brightest, Unholy Insurgency, has 8%). Dark mixes
  with the top rolled off are the signature, not a limitation.
- **Low end rules.** 27% under 250 Hz in the calm piece; 40–90% in the rest.
- **Keys:** 20 of 23 are minor, and the sharp keys (C♯, D♯, F♯, G♯) are
  nine of them. Three are major but bittersweet (wasteland, void, Feral
  Amalgamation). Several measure at 96, 99 or 103 BPM and may be a
  double-time feel (about 190 to 206), so a fight's "tempo" is a half-time
  grid with fast hats.
- **Dynamics:** crest factors run 9.3 dB (heavily limited) to 15 dB. The
  master limiter in the studio targets about 10 dB crest for fights and
  12–15 for sectors and calm.

### The 24th reference: Galactic Destruction

Added on 11 Oct for THE VOID and NULL, and looked at more closely than the
others (bar by bar: chords, bass, drums, and close-up pictures of five
passages). What it does, and so what those two tracks take from it:

- **It states itself before any drums.** Six bars at full power: thick
  chords over a bass that climbs a step a bar (B, C♯, D, E), then the drums.
  NULL opens the same way, on its own notes; THE VOID's tune climbs.
- **Everything slides.** The bass and the chords bend from each note into
  the next. THE VOID's hazard is gravity wells, so this became the
  sector's sound: the synth has a `slide` on every chord change.
- **Long notes over a busy middle.** The lead holds whole bars while a
  syncopated figure runs under it in the middle register.
- **A stretch with no drums in the middle** (ten bars: held, sliding chords
  and something twinkling above them), still loud. NULL's second phase
  starts with four such bars: the lore says it "stops the room".
- **A peak that walks down four chords** (i, VII, VI, v) under fast runs,
  then a climb, then ten thin bars on one note before the loop. NULL's
  last phase ends with a run down four chords and four bars held on C.
- **The form is a 72-bar loop** after an 8-bar opening, with phrases of 14
  and 10 bars. Wide in the middle (side/mid 0.7 to 0.8), narrow in the sub.

Nothing of its melody, bass line or drum patterns is used: the notes are
the game's own (THE VOID's tune; the main theme, moved to C minor).

### The nearest reference for each cue

A starting point for the studio, chosen by the measurements and the feel
(tempo, key, weight, how much of it breathes); never copied. The title and
the sound of a track are not why it was picked, with one exception: where a
track's name is the cue's name, it was the obvious first listen.

| cue(s) | nearest | what to take |
|---|---|---|
| `title`, `hub`, `codex`, `library`, `stands` | 1-01 Tale of a Cruel World | sparse keys, then the ensemble, three swells, almost no drums |
| `planetarium` | 3-06 void | the widest and softest piece; 40% low end, no air at all; long drift |
| `void`, `null` | Galactic Destruction | see above; `void`'s calm section still takes its room from 3-06 void |
| `vigil`, `halt` | 2-05 Silence before the storms | three quarters of it is waiting; an ascending arc |
| `grid` | 1-02 wasteland | grid-locked, 90% low end, two real breakdowns, the opener's template |
| `foundry` | 1-05 The Filthy Mind | the most percussive of the area tracks; D minor, 112 |
| `hive` | 1-06 Blood Coagulant | drum-forward and skittering; 123 against 126 |
| `vault` | 1-07 Hadopelagic Pressure | sub-heavy and cold; 117 against 118; 44 s of rest |
| `archive`, `recursion` | 3-10 Roar of The Jungle Dragon, 2-03 Left Alone | long restless cycles that return; a loop that never resolves |
| `mirror`, `pvp` | 4-01 Cosmic Disgust | tight and narrow at 129; a mountain shape |
| `leak` | 3-12 Pest of The Cosmos | the lowest energy variance of any track: relentless |
| `rootroom`, `root` | 1-04 1NF3$+@+!0N | 152 against 150; sub sweeps, drum-break breakdowns |
| `warden` | 1-03 Guardian of The Former Seas | full force from bar one, short resets as phase changes |
| `forgeheart` | 3-03 Unholy Insurgency | the brightest and most percussive of the walls: brass and hammer |
| `broodmother` | 3-02 Murderswarm | short, narrow and bright; a groove that creeps |
| `archivist`, `other` | 4-02 Threats of The Ocean Floor | the fastest track at 162; E minor, with a double-time feel |
| `unwritten` | 3-09 Infernal Catharsis, 1-01 Tale of a Cruel World | a mountain: it builds for minutes; the sparse start into the ensemble |
| `curator`, `tribunal` | 3-04 Servants of The Scourge, 3-08 UNIVERSAL COLLAPSE | a slow-burning full ensemble; the steadiest of the fights (energy variance .17) |
| `keeper` | 2-11 Open Frenzy | F minor at 112, which is 168 in the cue's feel |
| `shopkeeper` | 1-06 Blood Coagulant | the swung, drum-forward one |
| `amalgam` | 3-05 Feral Amalgamation | D major at 89 and 117: the slow-then-fast cue |
| `founder` | 3-07 Scourge of The Universe | 96 in half-time, a long arc with a breakdown |
| `onepointoh`, `rush` | 3-11 Stained, Brutal Calamity | 12 minutes and several distinct movements: a suite |
| `ragequit` | 3-12 Pest of The Cosmos | the loudest wall |
| ALL HALLOWS (`patch`, `house`, `yard`, `backlog`, `deadgame`) | 3-02, 3-04, 3-06, 3-09, 2-03 | in that order: swarm, slow doom, vast, finale, a loop that is left alone |

Tools: the music-analysis skill's full listen (run under a venv, since
numba crashes against numpy 2.4 on this machine), plus an arrangement
profile (spectrogram, energy and percussive share per 4 s, band balance,
loudness, stereo width).
