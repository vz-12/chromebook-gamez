/* ===========================================================================
   Bots, for a queue with nobody in it (PVP-PLAN.md, Phase 8)

   PvP is new and its queues are often empty. A ticket that has waited a while
   with nobody to pair it with is found a bot (objects.js, Matchmaker): never
   in place of a real player. The pairing of real players runs first, every
   time, and a ticket stays in the queue while its player fights the bot, so a
   real opponent arriving takes them out of it the moment the two can be paired.

   A bot is flown on its player's own machine (pvp/site/js/bot.js). Nobody's
   machine but the player's plays it, so nothing referees it. In ranked it is
   rated all the same (user, 9 Oct: "you can rate bot matches too"), on the
   player's word, within what a word can be trusted with (the rating rules,
   below; objects.js, the Matchmaker's `bot` op). In casual nothing about it
   is kept. What it is comes from here:

     id      its mark, for the player to say it is done with it (botOver)
     name    'BOT ' and a callsign: it never passes for a person
     pilot   one of the game's, by the ticket's bracket: in ranked, what the
             player's league flies (base pilots below platinum, never awake);
             in casual, any
     awake   in ranked from platinum up, where everything goes; in casual
             once its skill is high enough to use the kit
     skill   0 to 1, from the player's ranked rating (`curve`): the higher it
             is, the sooner the bot sees, the straighter it aims, the more it
             dodges and the more of its kit it uses. It never gets more
             health, damage or upgrades than a player would
     seed    for its own dice, so its choices are its own and never the run's

   Rated, a bot is an opponent with a rating of its own that is nobody's row:
   the rating its skill stands for (the player's, kept within the curve) and
   `edge` more, at a deviation of `rd`. Only a bot the queue handed out, and
   that the player's page said it started, is rated, once. A result sooner
   than `least` is refused; walking out is a loss, and so is a started match
   that never says how it ended (`expire`). A real opponent found lets it go
   unrated. And a win against a bot never lifts a rating past `ceiling`:
   VOID, and the podium with it, are earned against people.
   ========================================================================= */
import { PILOTS, BASE_PILOTS, LEAGUES } from './rules.js';

export const BOTS = {
  // a ticket waits this long with nobody to pair it before a bot is found for it
  after: { ranked: 30 * 1000, casual: 20 * 1000 },
  // and this long again once its player is done with one
  again: 15 * 1000,
  /* How good a bot is, by the rating of the player it meets: [rating, skill]
     points, a straight line between them, flat past either end. Hard in
     general (user, 9 Oct: "make them more difficult"): a new player's 1500
     meets a capable one, and from 2000 up it is the best there is. */
  curve: [[900, 0.25], [1500, 0.65], [2000, 1]],
  awakeFrom: 0.6,                          // casual: awake from this skill up (ranked: as its league)
  // ranked: a bot as an opponent to be rated against
  edge: 100,                               // rated this far above the rating its skill stands for: it is a notch harder
  rd: 150,                                 // and this unsure, so it moves a rating a little less than a settled player
  ceiling: LEAGUES[LEAGUES.length - 1].from,   // a win against a bot never lifts a rating past VOID's line
  least: 15 * 1000,                        // a result sooner than this after its start is refused: no best of three is over so soon
  expire: 20 * 60 * 1000,                  // a started match that has said nothing of its end by then is a loss
  awakens: ['ember', 'hacker', 'melee'],   // the pilots with an awakened form (the game's RITES with a rite built)
  names: ['KESTREL', 'MAGPIE', 'VESPER', 'RIVET', 'SABLE', 'TALLY', 'NOMAD', 'CINDER', 'WREN', 'ORBIT', 'PIKE', 'HALO']
};

export const BOT_ID = /^[0-9a-f]{8}$/;

// the skill a bot brings against a player of this rating
export function skillOf(rating) {
  const c = BOTS.curve, r = Number.isFinite(rating) ? rating : c[0][0];
  if (r <= c[0][0]) return c[0][1];
  for (let i = 1; i < c.length; i++) {
    const [r1, s1] = c[i], [r0, s0] = c[i - 1];
    if (r <= r1) return s0 + (s1 - s0) * (r - r0) / (r1 - r0);
  }
  return c[c.length - 1][1];
}

/* The rating a bot is rated at, against a player of this rating: the one its
   skill stands for (the curve's own range: past either end its skill is the
   same), and `edge` above that. */
export function botRating(rating) {
  const c = BOTS.curve, r = Number.isFinite(rating) ? rating : c[0][0];
  return Math.min(c[c.length - 1][0], Math.max(c[0][0], r)) + BOTS.edge;
}

const hex = n => Array.from(crypto.getRandomValues(new Uint8Array(n / 2)), b => b.toString(16).padStart(2, '0')).join('');

/* A bot for a ticket (queue.js makes tickets): its bracket says which pilots
   it may fly ('base', 'own+awake' in ranked; 'casual'), its rating how well. */
export function botFor(ticket, rand = Math.random) {
  const skill = Math.round(skillOf(ticket.rating) * 100) / 100;
  const base = ticket.bracket === 'base';
  const pool = base ? BASE_PILOTS : Object.keys(PILOTS);
  const pilot = pool[Math.floor(rand() * pool.length) % pool.length];
  const awake = !base && BOTS.awakens.includes(pilot) && (ticket.bracket !== 'casual' || skill >= BOTS.awakeFrom);
  const name = 'BOT ' + BOTS.names[Math.floor(rand() * BOTS.names.length) % BOTS.names.length];
  return { id: hex(8), name, pilot, awake, skill, seed: Math.floor(rand() * 0x100000000) >>> 0 };
}
