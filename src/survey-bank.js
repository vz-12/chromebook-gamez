/* ===========================================================================
   THE SURVEYS' QUESTIONS — what the menu's QUICK SURVEY asks (src/survey.js;
   SURVEYS in index.html; the results at /surveys/)

   The one place the questions are written. The game fetches this bank from
   GET /api/survey, the Worker checks every answer against it, and the
   results page and `npm run survey` label their counts from it. Change it
   here and the game asks the new questions on its next load.

   RULES. When the menu offers a survey, and what it pays:
     every    finished runs between one survey and the next
     gapMin   and at least this many minutes since the last one was answered
              or turned down
     perDay   the most surveys one save is offered in a day
     minRuns  a save's first runs are never asked about
     minSecs  a run must last this long, or reach wave 3, to be asked about
     ask      questions in one survey
     pay      challenge passes a finished survey pays (1 to 5). A pass clears
              any challenge on the ladder and pays its upgrade (CHALLENGES,
              [P] twice), so this is the dial for how generous surveys are.

   A QUESTION:
     id       its name in the database. Answers are counted by id, so a
              question whose meaning changes gets a new id; a typo fixed
              keeps its old one.
     t        what is asked. {pilot}, {boss}, {chal} and {sector} are the
              run's own (the pilot flown, the boss that was up when it
              ended, the challenge, the sector reached); the results keep
              the words as written here and split by them instead.
     c        the answers, 2 to 6, short enough for one button each. Only
              ever add to the end: an answer is stored as its place here.
     scale    the answers run in order from low to high, so the results
              give an average and the answer nearest it, and draw them as
              one bar from one end (blue) through the middle (gray) to the
              other (orange). Up to two answers either side of the middle.
     mid      on a scale, the place of the neutral answer ("just right"),
              when it is not the centre one; an even scale with no neutral
              answer needs none
     lead     asked first, in every survey it fits
     w        how often it is picked, against 1 for the rest
     when     only for runs that match all of:
                mode    ['run', 'daily', 'rush', 'chal', 'event']
                died    the run ended in a death, not a quit
                boss    a boss was up when it ended
                shop    the run got as far as a shop
                coop    a co-op run
                minWave the wave the run reached, at least
   Multiple choice only, on purpose: nothing a player types is ever kept.
   ========================================================================= */
export const SURVEY = {
  v: 1,
  rules: { every: 3, gapMin: 20, perDay: 3, minRuns: 3, minSecs: 60, ask: 3, pay: 1 },
  questions: [
    { id: 'difficulty', lead: true, scale: true, t: 'How hard was that run?',
      c: ['Way too easy', 'A bit easy', 'Just right', 'A bit hard', 'Way too hard'] },
    { id: 'fun', scale: true, w: 1.5, t: 'How fun was that run?',
      c: ['Not fun', 'Meh', 'Okay', 'Fun', 'Awesome'] },
    { id: 'ended', w: 2, when: { died: true, mode: ['run', 'daily', 'chal', 'event'] }, t: 'What ended your run?',
      c: ['Too many enemies', 'A boss', 'Something I could not see', 'My build was too weak', 'My own mistake', 'Not sure'] },
    { id: 'boss_fair', scale: true, w: 3, when: { died: true, boss: true }, t: 'Was {boss} a fair fight?',
      c: ['Totally fair', 'Mostly fair', 'A bit cheap', 'Really unfair'] },
    { id: 'pilot_power', scale: true, t: 'How strong did {pilot} feel?',
      c: ['Too weak', 'A bit weak', 'Just right', 'A bit strong', 'Too strong'] },
    { id: 'cards', when: { mode: ['run', 'daily'] }, t: 'How were your upgrade choices?',
      c: ['Lots of good picks', 'A few good ones', 'Mostly bad picks', 'Always the same ones'] },
    { id: 'shop', when: { shop: true, mode: ['run'] }, t: 'How were the shop prices?',
      c: ['Too cheap', 'About right', 'Too pricey', 'I did not shop'] },
    { id: 'pace', scale: true, when: { mode: ['run', 'daily', 'event'] }, t: 'How was the pace?',
      c: ['Too slow', 'A bit slow', 'Just right', 'A bit fast', 'Too fast'] },
    { id: 'readable', scale: true, t: 'Could you tell what was going on?',
      c: ['Always', 'Mostly', 'Sometimes', 'Hardly ever'] },
    { id: 'again', t: 'Up for another run right now?',
      c: ['Yes!', 'Maybe', 'Not really'] },
    { id: 'daily', w: 3, when: { mode: ['daily'] }, t: 'How was today\'s daily run?',
      c: ['Great', 'Okay', 'Too hard', 'Too random'] },
    { id: 'rush', scale: true, w: 3, when: { mode: ['rush'] }, t: 'How hard was the boss rush?',
      c: ['Too easy', 'Just right', 'Too hard'] },
    { id: 'chal', scale: true, mid: 1, w: 3, when: { mode: ['chal'] }, t: 'How hard was {chal}?',
      c: ['Too easy', 'Just right', 'Too hard', 'Impossible'] },
    { id: 'coop', w: 3, when: { coop: true }, t: 'How did co-op play?',
      c: ['Smooth', 'A bit laggy', 'Very laggy', 'Hard to connect'] },
    { id: 'controls', w: 0.5, t: 'How do the controls feel on this device?',
      c: ['Great', 'Okay', 'Clunky'] }
  ]
};
