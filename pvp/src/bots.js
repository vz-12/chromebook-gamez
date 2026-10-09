/* ===========================================================================
   Bots, for a queue with nobody in it (PVP-PLAN.md, Phase 8)

   PvP is new and its queues are often empty. A ticket that has waited a while
   with nobody to pair it with is found a bot (objects.js, Matchmaker): never
   in place of a real player. The pairing of real players runs first, every
   time, and a ticket stays in the queue while its player fights the bot, so a
   real opponent arriving takes them out of it the moment the two can be paired.

   A bot is flown on its player's own machine (pvp/site/js/bot.js), never
   against anybody's rating: nothing about it is refereed, rated or recorded.
   What it is comes from here:

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
   ========================================================================= */
import { PILOTS, BASE_PILOTS } from './rules.js';

export const BOTS = {
  // a ticket waits this long with nobody to pair it before a bot is found for it
  after: { ranked: 30 * 1000, casual: 20 * 1000 },
  // and this long again once its player is done with one
  again: 15 * 1000,
  /* How good a bot is, by the rating of the player it meets: [rating, skill]
     points, a straight line between them, flat past either end. A new
     player's 1500 meets a middling one; VOID meets the best there is. */
  curve: [[1000, 0.1], [1500, 0.45], [2100, 1]],
  awakeFrom: 0.5,                          // casual: awake from this skill up (ranked: as its league)
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
