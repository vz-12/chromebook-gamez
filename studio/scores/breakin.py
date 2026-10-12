"""breakin: the three pieces for the rooms under THE MIRROR, played as one (MUSIC-PLAN.md). Not a score of
its own: a list of the other three's sections, end to end, which build.py lays out from their files.

What makes them one piece is in the three scores. They keep one beat, 136 to the minute, through four
beats in a bar, then five, then four again. They are made of one loop and one tune. And each ends, here,
with a way out that its room's own music never plays: its key's fourth chord turned major, which is the
chord that leads into the key a whole step down. G minor leaves by C for F minor; F minor leaves by B flat
for E flat minor. The second piece's way out ends on a clock, and it is the third piece's clock. The third
has no way out: the room is held, and the clock stops.

  leak       "Down the Drain"         136, G minor       intro a b c d, and out
  recursion  "Wheels Within Wheels"   136 in five, F minor   intro a b c d, and out
  halt       "After You"              136, E flat minor  intro a b c d, and the end
"""
TITLE = 'Breaking and Entering'
PARTS = [('leak', ['intro', 'a', 'b', 'c', 'd', 'out']),
         ('recursion', ['intro', 'a', 'b', 'c', 'd', 'out']),
         ('halt', ['intro', 'a', 'b', 'c', 'd', 'end'])]
