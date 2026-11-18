/* ================== THE PLANETARIUM — the sky itself (art, 18 Nov) ==================
   What every other part of the planetarium's art draws with: the twelve real
   constellations, the twelve glyphs, the element triangles, the magnitude pips,
   a sign's medallion and the eclipse a shadow wears.
     the skies     each constellation from its real stars: right ascension,
                   declination, magnitude and spectral class (Yale Bright Star
                   Catalogue, public domain), projected about its own centre the
                   way it looks overhead (east to the left) and normalised, with
                   the usual stick figures. Stars are sized by brightness and
                   coloured by class, so Antares is red, Aldebaran orange, and
                   Regulus and Spica blue-white. The Pleiades and the Beehive are
                   drawn as the clusters they are.
     the glyphs    ♈ to ♓ as canvas paths, never typed: ChromeOS turns those
                   characters into emoji and some fonts don't have them. The same
                   paths are sampled, so a constellation can fold into its glyph.
   Art state is ZA (the projected skies, the sampled glyphs). It reads uiTime and
   changes nothing of the logic's. Everything here is za* / ZA_*.
=================================================================================== */
const ZA_FD = "'Chakra Petch', Barlow, system-ui, sans-serif";
const ZA_FB = "Barlow, 'Segoe UI', system-ui, sans-serif";
const ZA_FM = "'JetBrains Mono', ui-monospace, monospace";
const ZA_GOLD = '#fbbf24', ZA_GOLD_HI = '#fde68a', ZA_GOLD_PALE = '#fef3c7';
const ZA_SHADE = '#a855f7', ZA_SHADE_HI = '#d8b4fe', ZA_SHADE_DEEP = '#3b0764';
const zaQ = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const zaE = t => (t = clamp(t, 0, 1), t * t * (3 - 2 * t));
const zaO = t => (t = clamp(t, 0, 1), 1 - (1 - t) * (1 - t) * (1 - t));
const zaIn = t => (t = clamp(t, 0, 1), t * t * t);
const zaBack = t => { t = clamp(t, 0, 1); const c = 1.7; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
// a hash in [0, 1) for anything the art wants scattered the same way every frame
const zaH = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// the ruling planet of each sign, and the star the plan names for it
const ZA_RULER = { aries: 'MARS', taurus: 'VENUS', gemini: 'MERCURY', cancer: 'THE MOON', leo: 'THE SUN', virgo: 'MERCURY',
                   libra: 'VENUS', scorpio: 'PLUTO', sagittarius: 'JUPITER', capricorn: 'SATURN', aquarius: 'URANUS', pisces: 'NEPTUNE' };
// the wheel's order, from the first point of Aries
const ZA_ORDER = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const ZA_ELCOL = { fire: '#fb923c', earth: '#34d399', air: '#cbd5e1', water: '#38bdf8' };
const zaEl = id => { for (const el in ZA_EL_OF) if (ZA_EL_OF[el].includes(id)) return el; return 'fire'; };
const ZA_EL_OF = { fire: ['aries', 'leo', 'sagittarius'], earth: ['taurus', 'virgo', 'capricorn'],
                   air: ['gemini', 'libra', 'aquarius'], water: ['cancer', 'scorpio', 'pisces'] };

/* ------------------------------------ the skies ------------------------------------
   [right ascension (h), declination (°), magnitude, class]; l: the figure; star: the
   one the plate names (its index in s); cl: a cluster drawn as one (centre, count,
   radius in degrees). */
const ZA_SCOL = { B: '#a9c4ff', A: '#d9e4ff', F: '#f6f3ff', G: '#ffedcc', K: '#ffc07a', M: '#ff8a5c', R: '#ff5b3a', O: '#ff9a52' };
const ZA_SKY = {
  aries: { star: 'HAMAL', si: 1,
    s: [[2.8331, 27.26, 3.6, 'B'], [2.1194, 23.4625, 2.0, 'K'], [1.9106, 20.808, 2.64, 'A'], [1.8920, 19.29, 3.9, 'A']],
    l: [[0, 1], [1, 2], [2, 3]] },
  taurus: { star: 'ALDEBARAN', si: 0,
    s: [[4.5986, 16.509, 0.85, 'O'], [5.4383, 28.607, 1.65, 'B'], [5.6275, 21.143, 3.0, 'B'], [4.33, 15.627, 3.65, 'K'],
        [4.3822, 17.542, 3.76, 'K'], [4.4769, 19.18, 3.53, 'K'], [4.4778, 15.871, 3.4, 'A'], [4.0114, 12.49, 3.4, 'B'],
        [3.4136, 9.029, 3.6, 'G'], [3.7914, 24.105, 2.87, 'B'], [3.8194, 24.053, 3.6, 'B'], [3.7481, 24.113, 3.7, 'B'],
        [3.7639, 24.368, 3.9, 'B'], [3.7722, 23.948, 4.1, 'B'], [3.7533, 24.467, 4.3, 'B']],
    l: [[8, 7], [7, 3], [3, 4], [4, 5], [5, 1], [3, 6], [6, 0], [0, 2]], pleiades: [9, 10, 11, 12, 13, 14] },
  gemini: { star: 'CASTOR · POLLUX', si: 1,
    s: [[7.5767, 31.888, 1.58, 'A'], [7.7553, 28.026, 1.14, 'K'], [6.6286, 16.399, 1.9, 'A'], [6.7322, 25.131, 3.0, 'G'],
        [6.3828, 22.514, 2.9, 'M'], [6.2481, 22.507, 3.3, 'M'], [7.3353, 21.982, 3.5, 'F'], [7.0686, 20.57, 3.9, 'G'],
        [6.7547, 12.896, 3.35, 'F'], [7.1856, 30.245, 4.4, 'K'], [7.4289, 27.798, 3.8, 'G'], [7.5986, 26.896, 4.06, 'M'],
        [7.7408, 24.398, 3.6, 'G'], [6.8797, 33.961, 3.6, 'A'], [6.4828, 20.212, 4.15, 'B'], [7.3017, 16.54, 3.6, 'A']],
    l: [[0, 1], [0, 9], [9, 13], [9, 3], [3, 4], [4, 5], [3, 14], [9, 10], [10, 11], [1, 11], [1, 12], [11, 6], [6, 7],
        [7, 2], [6, 15], [15, 8]] },
  cancer: { star: 'ACUBENS · THE BEEHIVE', si: 0,
    s: [[8.9747, 11.858, 4.25, 'A'], [8.2753, 9.186, 3.5, 'K'], [8.7447, 18.154, 3.94, 'K'], [8.7214, 21.469, 4.66, 'A'],
        [8.7783, 28.76, 4.0, 'G']],
    l: [[1, 2], [2, 0], [2, 3], [3, 4]], cl: { ra: 8.667, dec: 19.98, n: 18, r: 0.75 } },
  leo: { star: 'REGULUS', si: 0,
    s: [[10.1394, 11.967, 1.35, 'B'], [11.8178, 14.572, 2.1, 'A'], [10.3328, 19.842, 2.0, 'K'], [11.235, 20.524, 2.55, 'A'],
        [11.2372, 15.43, 3.3, 'A'], [9.7642, 23.774, 2.97, 'G'], [9.8794, 26.007, 3.9, 'K'], [10.2781, 23.417, 3.4, 'F'],
        [10.1222, 16.763, 3.5, 'A']],
    l: [[0, 8], [8, 2], [2, 7], [7, 6], [6, 5], [2, 3], [3, 1], [1, 4], [4, 0], [3, 4]] },
  virgo: { star: 'SPICA', si: 0,
    s: [[13.4199, -11.161, 0.97, 'B'], [12.6944, -1.449, 2.74, 'F'], [13.0364, 10.959, 2.8, 'G'], [12.9267, 3.397, 3.4, 'M'],
        [11.845, 1.765, 3.6, 'F'], [12.3317, -0.667, 3.9, 'A'], [13.5783, -0.596, 3.4, 'A'], [14.2669, -6.0, 4.1, 'F'],
        [14.7178, -5.658, 3.9, 'F'], [11.7644, 6.529, 4.0, 'M'], [12.0869, 8.733, 4.1, 'G'], [13.1658, -5.539, 4.4, 'A'],
        [14.0275, 1.544, 4.3, 'A']],
    l: [[10, 9], [9, 4], [4, 5], [5, 1], [1, 3], [3, 2], [1, 11], [11, 0], [3, 6], [6, 7], [7, 8], [6, 12]] },
  libra: { star: 'ZUBENELGENUBI', si: 0,
    s: [[14.8481, -16.042, 2.75, 'A'], [15.2833, -9.383, 2.6, 'B'], [15.0678, -25.282, 3.3, 'M'], [15.5922, -14.789, 3.9, 'G'],
        [15.6169, -28.135, 3.6, 'K'], [15.6444, -29.778, 3.66, 'B'], [15.8972, -16.729, 4.15, 'K']],
    l: [[0, 1], [1, 3], [3, 0], [0, 2], [3, 4], [4, 5], [3, 6]] },
  scorpio: { star: 'ANTARES', si: 0,
    s: [[16.49, -26.432, 1.06, 'R'], [16.0906, -19.806, 2.6, 'B'], [16.0056, -22.622, 2.3, 'B'], [15.9808, -26.114, 2.9, 'B'],
        [15.9481, -29.214, 3.9, 'B'], [16.3531, -25.593, 2.9, 'B'], [16.5981, -28.216, 2.8, 'B'], [16.8361, -34.293, 2.3, 'K'],
        [16.8644, -38.048, 3.0, 'B'], [16.9097, -42.362, 3.6, 'K'], [17.2025, -43.239, 3.3, 'F'], [17.6219, -42.998, 1.86, 'F'],
        [17.7931, -40.127, 3.0, 'F'], [17.7081, -39.03, 2.4, 'B'], [17.56, -37.104, 1.63, 'B'], [17.5128, -37.296, 2.7, 'B'],
        [16.1997, -19.461, 4.0, 'B']],
    l: [[16, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 0], [0, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12],
        [12, 13], [13, 14], [14, 15]] },
  sagittarius: { star: 'KAUS AUSTRALIS', si: 0,
    s: [[18.4029, -34.385, 1.85, 'B'], [18.9211, -26.297, 2.05, 'B'], [19.0436, -29.88, 2.6, 'A'], [18.3497, -29.828, 2.7, 'K'],
        [18.4661, -25.422, 2.8, 'K'], [18.0967, -30.424, 2.98, 'K'], [18.7608, -26.991, 3.17, 'B'], [19.1156, -27.671, 3.3, 'K'],
        [18.2939, -36.761, 3.1, 'M']],
    l: [[5, 3], [3, 0], [0, 5], [3, 4], [4, 6], [6, 3], [6, 1], [1, 7], [7, 2], [2, 6], [2, 0], [0, 8]] },
  capricorn: { star: 'DENEB ALGEDI', si: 0,
    s: [[21.7839, -16.127, 2.85, 'A'], [20.3503, -14.781, 3.05, 'G'], [20.3008, -12.545, 3.6, 'G'], [21.6681, -16.662, 3.7, 'F'],
        [20.8636, -26.919, 4.1, 'M'], [20.7683, -25.271, 4.1, 'F'], [21.0992, -17.233, 4.1, 'A'], [21.4444, -22.411, 3.7, 'G'],
        [21.3708, -16.834, 4.3, 'G']],
    l: [[2, 1], [1, 5], [5, 4], [4, 7], [7, 0], [1, 6], [6, 8], [8, 3], [3, 0]] },
  aquarius: { star: 'SADALSUUD', si: 0,
    s: [[21.5258, -5.571, 2.9, 'G'], [22.0964, -0.32, 2.95, 'G'], [22.9108, -15.821, 3.27, 'A'], [22.4806, -0.02, 3.65, 'F'],
        [22.5892, -0.117, 4.0, 'B'], [22.3608, -1.387, 3.85, 'A'], [22.4214, 1.377, 4.6, 'B'], [20.7944, -9.496, 3.8, 'A'],
        [22.2806, -7.783, 4.2, 'G'], [22.8769, -7.58, 3.7, 'M'], [22.8267, -13.592, 4.0, 'M'], [23.2386, -6.049, 4.2, 'M'],
        [23.2650, -9.088, 4.2, 'K'], [23.1575, -21.172, 3.7, 'K'], [23.3828, -20.1, 3.97, 'K']],
    l: [[7, 0], [0, 1], [1, 5], [5, 3], [3, 4], [3, 6], [6, 1], [1, 8], [8, 9], [9, 10], [10, 2], [2, 13], [9, 11],
        [11, 12], [12, 14]] },
  pisces: { star: 'ALRESCHA', si: 0,
    s: [[2.0342, 2.764, 3.8, 'A'], [1.5247, 15.346, 3.6, 'G'], [23.2861, 3.282, 3.7, 'G'], [23.9886, 6.863, 4.0, 'F'],
        [23.6658, 5.626, 4.1, 'F'], [23.4661, 6.379, 4.3, 'K'], [23.7008, 1.78, 4.5, 'A'], [23.4489, 1.256, 4.9, 'A'],
        [23.3378, 5.381, 5.05, 'K'], [0.8114, 7.585, 4.4, 'K'], [1.0492, 7.89, 4.3, 'K'], [1.2289, 7.575, 5.2, 'F'],
        [1.5031, 6.144, 4.8, 'K'], [1.6906, 5.488, 4.4, 'K'], [1.8925, 3.187, 4.6, 'K'], [1.7567, 9.158, 4.3, 'G'],
        [1.1908, 21.035, 4.7, 'K'], [1.2292, 24.583, 4.65, 'K'], [1.3244, 27.264, 4.75, 'A'], [1.1942, 30.09, 4.5, 'K']],
    l: [[2, 8], [8, 5], [5, 4], [4, 6], [6, 7], [7, 2], [4, 3], [3, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14],
        [14, 0], [0, 15], [15, 1], [1, 16], [16, 17], [17, 18], [18, 19]] }
};

// each sky projected about its own centre and normalised: the longer side spans [-1, 1]
const ZA = { sky: {}, glyph: {}, pts: {} };
(function zaProjectAll() {
  const d2r = Math.PI / 180;
  for (const id of ZA_ORDER) {
    const c = ZA_SKY[id];
    let sx = 0, sy = 0, sd = 0;
    for (const s of c.s) { const a = s[0] * 15 * d2r; sx += Math.cos(a); sy += Math.sin(a); sd += s[1]; }
    const ra0 = Math.atan2(sy, sx) / d2r, dec0 = sd / c.s.length;
    const proj = (ra, dec) => {
      let dra = ra * 15 - ra0;
      dra = ((dra + 540) % 360) - 180;
      return [-dra * Math.cos(dec * d2r), -(dec - dec0)];
    };
    const pts = c.s.map(s => proj(s[0], s[1]));
    const clu = [];
    if (c.cl) {
      for (let k = 0; k < c.cl.n; k++) {
        const a = zaH(k * 3.1 + 7) * TAU, r = Math.sqrt(zaH(k * 5.7 + 2)) * c.cl.r;
        clu.push([...proj(c.cl.ra + Math.cos(a) * r / 15, c.cl.dec + Math.sin(a) * r), 5.6 + zaH(k + 9) * 1.4]);
      }
    }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of pts.concat(clu)) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, k = 2 / Math.max(x1 - x0, y1 - y0, 1e-6);
    ZA.sky[id] = {
      star: c.star, si: c.si, l: c.l, pl: c.pleiades || [],
      p: pts.map((p, i) => ({ x: (p[0] - cx) * k, y: (p[1] - cy) * k, m: c.s[i][2], col: ZA_SCOL[c.s[i][3]] })),
      cl: clu.map(p => ({ x: (p[0] - cx) * k, y: (p[1] - cy) * k, m: p[2] })),
      w: (x1 - x0) * k, h: (y1 - y0) * k
    };
  }
})();

/* ------------------------------------ the glyphs ------------------------------------
   In a [-1, 1] box, y down. M L Q C as the canvas has them; O is a whole circle. */
const zaZig = y => [['M', -0.86, y + 0.12], ['L', -0.43, y - 0.16], ['L', 0, y + 0.12], ['L', 0.43, y - 0.16], ['L', 0.86, y + 0.12]];
const ZA_GLYPH = {
  aries: [['M', 0, 0.9], ['L', 0, -0.05], ['C', 0, -0.62, -0.22, -0.88, -0.48, -0.86], ['C', -0.78, -0.84, -0.86, -0.5, -0.7, -0.32],
          ['M', 0, -0.05], ['C', 0, -0.62, 0.22, -0.88, 0.48, -0.86], ['C', 0.78, -0.84, 0.86, -0.5, 0.7, -0.32]],
  taurus: [['O', 0, 0.36, 0.44], ['M', -0.86, -0.82], ['C', -0.66, 0.12, 0.66, 0.12, 0.86, -0.82]],
  gemini: [['M', -0.78, -0.82], ['Q', 0, -0.56, 0.78, -0.82], ['M', -0.78, 0.82], ['Q', 0, 0.56, 0.78, 0.82],
           ['M', -0.36, -0.7], ['L', -0.36, 0.7], ['M', 0.36, -0.7], ['L', 0.36, 0.7]],
  cancer: [['O', -0.42, -0.26, 0.22], ['M', -0.42, -0.48], ['C', 0.0, -0.78, 0.6, -0.72, 0.88, -0.36],
           ['O', 0.42, 0.26, 0.22], ['M', 0.42, 0.48], ['C', 0.0, 0.78, -0.6, 0.72, -0.88, 0.36]],
  leo: [['O', -0.5, 0.38, 0.24], ['M', -0.27, 0.32], ['C', -0.48, -0.32, -0.18, -0.86, 0.2, -0.86],
        ['C', 0.66, -0.86, 0.72, -0.34, 0.46, 0.04], ['C', 0.24, 0.36, 0.3, 0.86, 0.78, 0.74]],
  virgo: [['M', -0.84, -0.6], ['L', -0.72, -0.5], ['L', -0.72, 0.72], ['M', -0.72, -0.26], ['C', -0.66, -0.78, -0.24, -0.78, -0.24, -0.3],
          ['L', -0.24, 0.72], ['M', -0.24, -0.3], ['C', -0.18, -0.78, 0.24, -0.78, 0.24, -0.3], ['L', 0.24, 0.46],
          ['C', 0.24, 0.92, 0.72, 0.92, 0.74, 0.48], ['C', 0.76, 0.08, 0.42, 0.02, 0.18, 0.3], ['L', -0.02, 0.58]],
  libra: [['M', -0.86, 0.62], ['L', 0.86, 0.62], ['M', -0.86, 0.22], ['L', -0.34, 0.22], ['C', -0.62, -0.12, -0.4, -0.66, 0, -0.66],
          ['C', 0.4, -0.66, 0.62, -0.12, 0.34, 0.22], ['L', 0.86, 0.22]],
  scorpio: [['M', -0.84, -0.6], ['L', -0.72, -0.5], ['L', -0.72, 0.66], ['M', -0.72, -0.26], ['C', -0.66, -0.78, -0.24, -0.78, -0.24, -0.3],
            ['L', -0.24, 0.66], ['M', -0.24, -0.3], ['C', -0.18, -0.78, 0.24, -0.78, 0.24, -0.3], ['L', 0.24, 0.5],
            ['Q', 0.26, 0.74, 0.52, 0.74], ['L', 0.84, 0.44], ['M', 0.56, 0.42], ['L', 0.86, 0.42], ['L', 0.86, 0.72]],
  sagittarius: [['M', -0.78, 0.78], ['L', 0.78, -0.78], ['M', 0.22, -0.8], ['L', 0.8, -0.8], ['L', 0.8, -0.22],
                ['M', -0.5, -0.08], ['L', 0.08, 0.5]],
  capricorn: [['M', -0.92, -0.56], ['Q', -0.7, -0.78, -0.58, -0.44], ['L', -0.36, 0.5], ['L', -0.12, -0.46], ['Q', 0, -0.78, 0.14, -0.46],
              ['L', 0.14, 0.38], ['C', 0.12, -0.02, 0.76, -0.06, 0.76, 0.3], ['C', 0.76, 0.66, 0.3, 0.72, 0.14, 0.38],
              ['C', 0.04, 0.78, -0.22, 0.92, -0.46, 0.84]],
  aquarius: zaZig(-0.3).concat(zaZig(0.3)),
  pisces: [['M', -0.66, -0.84], ['C', -0.18, -0.42, -0.18, 0.42, -0.66, 0.84], ['M', 0.66, -0.84], ['C', 0.18, -0.42, 0.18, 0.42, 0.66, 0.84],
           ['M', -0.42, 0], ['L', 0.42, 0]]
};
// the glyph as a canvas path, centred on (x, y), s its half-size
function zaGlyphPath(id, x, y, s) {
  const g = ZA_GLYPH[id];
  ctx.beginPath();
  if (!g) return;
  for (const c of g) {
    const X = v => x + v * s, Y = v => y + v * s;
    if (c[0] === 'M') ctx.moveTo(X(c[1]), Y(c[2]));
    else if (c[0] === 'L') ctx.lineTo(X(c[1]), Y(c[2]));
    else if (c[0] === 'Q') ctx.quadraticCurveTo(X(c[1]), Y(c[2]), X(c[3]), Y(c[4]));
    else if (c[0] === 'C') ctx.bezierCurveTo(X(c[1]), Y(c[2]), X(c[3]), Y(c[4]), X(c[5]), Y(c[6]));
    else if (c[0] === 'O') { ctx.moveTo(X(c[1]) + c[3] * s, Y(c[2])); ctx.arc(X(c[1]), Y(c[2]), c[3] * s, 0, TAU); }
  }
}
// n points along the glyph, evenly by length: where a constellation's stars land when it folds
function zaGlyphPts(id, n) {
  const key = id + ':' + n;
  if (ZA.pts[key]) return ZA.pts[key];
  const g = ZA_GLYPH[id], poly = [];
  let px = 0, py = 0, run = null;
  const add = (x, y) => { run.push([x, y]); px = x; py = y; };
  for (const c of g) {
    if (c[0] === 'M') { run = [[c[1], c[2]]]; poly.push(run); px = c[1]; py = c[2]; }
    else if (c[0] === 'L') add(c[1], c[2]);
    else if (c[0] === 'Q') { const x0 = px, y0 = py; for (let i = 1; i <= 10; i++) { const t = i / 10, u = 1 - t;
      add(u * u * x0 + 2 * u * t * c[1] + t * t * c[3], u * u * y0 + 2 * u * t * c[2] + t * t * c[4]); } }
    else if (c[0] === 'C') { const x0 = px, y0 = py; for (let i = 1; i <= 14; i++) { const t = i / 14, u = 1 - t;
      add(u * u * u * x0 + 3 * u * u * t * c[1] + 3 * u * t * t * c[3] + t * t * t * c[5],
          u * u * u * y0 + 3 * u * u * t * c[2] + 3 * u * t * t * c[4] + t * t * t * c[6]); } }
    else if (c[0] === 'O') { run = []; poly.push(run); for (let i = 0; i <= 20; i++) { const a = i / 20 * TAU; run.push([c[1] + Math.cos(a) * c[3], c[2] + Math.sin(a) * c[3]]); } }
  }
  let total = 0;
  for (const r of poly) for (let i = 1; i < r.length; i++) total += Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]);
  const out = [];
  for (let k = 0; k < n; k++) {
    let want = (k + 0.5) / n * total;
    find: for (const r of poly) for (let i = 1; i < r.length; i++) {
      const L = Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]);
      if (want <= L) { const t = L ? want / L : 0; out.push([lerp(r[i - 1][0], r[i][0], t), lerp(r[i - 1][1], r[i][1], t)]); break find; }
      want -= L;
    }
    if (out.length <= k) out.push(poly[poly.length - 1][poly[poly.length - 1].length - 1]);
  }
  return (ZA.pts[key] = out);
}
// a glyph stroked: o.lw its weight (of s), o.glow a soft bloom under it, o.retro the retrograde tail
function zaGlyph(id, x, y, s, col, o = {}) {
  const a = o.a === undefined ? 1 : o.a;
  if (a <= 0.01 || s <= 0.5) return;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (o.glow) {
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(x, y, s * 2.4, col, 0.32 * a * o.glow);
    zaGlyphPath(id, x, y, s);
    ctx.strokeStyle = rgba(col, 0.28 * a * o.glow); ctx.lineWidth = Math.max(2, s * 0.42);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }
  zaGlyphPath(id, x, y, s);
  ctx.strokeStyle = rgba(col, a); ctx.lineWidth = Math.max(1, s * (o.lw || 0.17));
  ctx.stroke();
  if (o.core) {
    ctx.strokeStyle = rgba('#ffffff', 0.55 * a * o.core); ctx.lineWidth = Math.max(0.6, s * 0.06);
    ctx.stroke();
  }
  if (o.retro) zaRetroTail(x + s * 0.92, y + s * 0.82, s * 0.36, o.retroCol || ZA_SHADE_HI, a * o.retro);
  ctx.restore();
}
// the retrograde mark: a hook turning back on itself, with its head
function zaRetroTail(x, y, r, col, a) {
  if (a <= 0.01) return;
  const a0 = 0.4, a1 = -Math.PI * 1.25 * clamp(a * 1.2, 0, 1);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(col, clamp(a, 0, 1)); ctx.lineWidth = Math.max(1, r * 0.36);
  ctx.beginPath(); ctx.arc(x, y, r, a0, a0 + a1, true); ctx.stroke();
  const e = a0 + a1, ex = x + Math.cos(e) * r, ey = y + Math.sin(e) * r, tx = Math.sin(e), ty = -Math.cos(e);
  ctx.fillStyle = rgba(col, clamp(a, 0, 1));
  ctx.beginPath();
  ctx.moveTo(ex + tx * r * 0.75, ey + ty * r * 0.75);
  ctx.lineTo(ex - ty * r * 0.5, ey + tx * r * 0.5);
  ctx.lineTo(ex + ty * r * 0.5, ey - tx * r * 0.5);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* ------------------------------------ the parts ------------------------------------ */
// the element's alchemical triangle: fire and air point up, water and earth down; air and earth carry a bar
function zaElem(el, x, y, s, col, a = 1, lw = 1.4) {
  const up = el === 'fire' || el === 'air', d = up ? 1 : -1;
  ctx.save();
  ctx.strokeStyle = rgba(col, a); ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y - d * s); ctx.lineTo(x + s * 0.9, y + d * s * 0.62); ctx.lineTo(x - s * 0.9, y + d * s * 0.62); ctx.closePath();
  if (el === 'air' || el === 'earth') { ctx.moveTo(x - s * 0.62, y + d * s * 0.1); ctx.lineTo(x + s * 0.62, y + d * s * 0.1); }
  ctx.stroke();
  ctx.restore();
}
// a four-point star: a pip, a glint
function zaStar4(x, y, s, rot = 0, inner = 0.34) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = rot + i * Math.PI / 4 - Math.PI / 2, r = i % 2 ? s * inner : s;
    i ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}
// a lens glint on a bright star: two long rays and two short, additive
function zaGlint(x, y, r, col, a, rot = 0) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const an = rot + i * Math.PI / 2, L = r * (i % 2 ? 0.55 : 1);
    const g = ctx.createLinearGradient(x, y, x + Math.cos(an) * L, y + Math.sin(an) * L);
    g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
    ctx.strokeStyle = g; ctx.lineWidth = Math.max(0.8, r * 0.05);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(an) * L, y + Math.sin(an) * L); ctx.stroke();
  }
  ctx.restore();
}
// three magnitude pips: those already held (dim gold), those this brings (bright), a retrograde one (violet)
function zaPips(x, y, s, held, to, retroFrom, a = 1, gap) {
  gap = gap || s * 3.1;
  for (let i = 0; i < 3; i++) {
    const px = x + (i - 1) * gap, m = i + 1;
    const lit = m <= to, old = m <= held, retro = retroFrom && m >= retroFrom && m <= to;
    const col = retro ? ZA_SHADE : old ? '#b45309' : ZA_GOLD;
    ctx.save();
    if (lit) {
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(px, y, s * 3.2, retro ? ZA_SHADE : ZA_GOLD, (old ? 0.18 : 0.42) * a);
      ctx.globalCompositeOperation = 'source-over';
      zaStar4(px, y, s, 0, 0.36);
      ctx.fillStyle = rgba(col, a); ctx.fill();
      if (!old) { zaStar4(px, y, s * 0.45, 0, 0.4); ctx.fillStyle = rgba('#fffbeb', 0.85 * a); ctx.fill(); }
    } else {
      zaStar4(px, y, s * 0.8, 0, 0.36);
      ctx.strokeStyle = rgba('#64748b', 0.7 * a); ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();
  }
}

/* A constellation, its longer side `size` px, centred on (x, y).
   o: a (alpha), line (how many of its lines are drawn, a fraction for the one
   drawing), lineA, lineCol, mono (stars all one tint), tw (twinkle), fold (0..1,
   its stars gone to its glyph's points, the glyph glyphS px), spark (glints on
   the bright stars), seed, lw. */
function zaConst(id, x, y, size, o = {}) {
  const c = ZA.sky[id];
  if (!c) return;
  const a = o.a === undefined ? 1 : o.a;
  if (a <= 0.01) return;
  const k = size / 2, fold = o.fold || 0, seed = o.seed || 0;
  const gp = fold > 0 ? zaGlyphPts(id, c.p.length) : null, gs = o.glyphS || k * 0.6;
  const P2 = c.p.map((p, i) => {
    let px = x + p.x * k, py = y + p.y * k;
    if (gp) { const f = zaE(fold * 1.15 - (i % 5) * 0.03); px = lerp(px, x + gp[i][0] * gs, f); py = lerp(py, y + gp[i][1] * gs, f); }
    return [px, py];
  });
  const base = Math.max(0.55, size * 0.0155);
  const rOf = m => base * (1 + Math.max(0, 4.7 - m) * 0.42);
  ctx.save();
  // the figure
  const nl = c.l.length, prog = o.line === undefined ? nl : o.line;
  const lineA = (o.lineA === undefined ? 0.5 : o.lineA) * a * (1 - fold);
  if (prog > 0 && lineA > 0.01) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(o.lineCol || '#cbd5e1', lineA);
    ctx.lineWidth = o.lw || Math.max(0.7, size * 0.008);
    ctx.beginPath();
    for (let i = 0; i < nl && i < prog; i++) {
      const [ia, ib] = c.l[i], A = P2[ia], B = P2[ib];
      const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
      const ga = Math.min(L * 0.3, rOf(c.p[ia].m) + 2), gb = Math.min(L * 0.3, rOf(c.p[ib].m) + 2);
      const f = clamp(prog - i, 0, 1);
      const x0 = A[0] + dx / L * ga, y0 = A[1] + dy / L * ga;
      const x1 = lerp(x0, B[0] - dx / L * gb, f), y1 = lerp(y0, B[1] - dy / L * gb, f);
      ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
    }
    ctx.stroke();
  }
  // the clusters: the Beehive's haze, the Pleiades' knot
  ctx.globalCompositeOperation = 'lighter';
  if (c.cl.length) {
    let mx = 0, my = 0;
    for (const p of c.cl) { mx += p.x; my += p.y; }
    mx = x + mx / c.cl.length * k; my = y + my / c.cl.length * k;
    drawGlow(mx, my, size * 0.2, o.mono || '#bfdbfe', 0.22 * a * (1 - fold));
    for (let i = 0; i < c.cl.length; i++) {
      const p = c.cl[i], tw = 0.6 + 0.4 * Math.sin(uiTime * 2.3 + i * 2.1 + seed);
      ctx.fillStyle = rgba(o.mono || '#e0e7ff', 0.7 * a * tw * (1 - fold));
      ctx.beginPath(); ctx.arc(x + p.x * k, y + p.y * k, Math.max(0.5, base * 0.55), 0, TAU); ctx.fill();
    }
  }
  if (c.pl.length) {
    let mx = 0, my = 0;
    for (const i of c.pl) { mx += P2[i][0]; my += P2[i][1]; }
    drawGlow(mx / c.pl.length, my / c.pl.length, size * 0.09, o.mono || '#93c5fd', 0.3 * a);
  }
  // the stars
  for (let i = 0; i < c.p.length; i++) {
    const p = c.p[i], r = rOf(p.m) * (c.pl.includes(i) ? 0.62 : 1), col = o.mono || p.col;
    const tw = o.tw === 0 ? 1 : 0.8 + 0.2 * Math.sin(uiTime * (1.7 + (i % 4) * 0.6) + i * 1.9 + seed);
    const [px, py] = P2[i];
    drawGlow(px, py, r * (3.4 + (p.m < 2 ? 2 : 0)), col, 0.42 * a * tw);
    ctx.fillStyle = rgba('#ffffff', 0.92 * a * tw);
    ctx.beginPath(); ctx.arc(px, py, r * 0.62, 0, TAU); ctx.fill();
    if (p.m < 2.1 && o.spark !== 0) zaGlint(px, py, r * 5.5 * (o.spark || 1), col, 0.55 * a * tw, 0.1);
  }
  ctx.restore();
}
// where a constellation's star i sits (for drawing to it)
function zaStarAt(id, i, x, y, size) {
  const p = ZA.sky[id].p[i];
  return { x: x + p.x * size / 2, y: y + p.y * size / 2 };
}

/* The eclipse a shadow wears: a dark disc, its violet corona, and a bead of
   light at the edge (the diamond ring). k: how far the dark is across (0..1). */
function zaEclipse(x, y, r, a = 1, k = 1) {
  if (a <= 0.01 || r <= 0.5) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(x, y, r * 3.4, ZA_SHADE, 0.5 * a);
  drawGlow(x, y, r * 1.9, '#e9d5ff', 0.32 * a);
  // the streamers
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const an = i * TAU / 9 + uiTime * 0.25 + Math.sin(uiTime * 0.9 + i) * 0.12;
    const L = r * (1.35 + 0.5 * (0.5 + 0.5 * Math.sin(uiTime * 1.7 + i * 2.3)));
    ctx.strokeStyle = rgba(ZA_SHADE_HI, 0.3 * a); ctx.lineWidth = Math.max(0.6, r * 0.12);
    ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * r, y + Math.sin(an) * r);
    ctx.quadraticCurveTo(x + Math.cos(an + 0.2) * L * 0.9, y + Math.sin(an + 0.2) * L * 0.9, x + Math.cos(an + 0.08) * L, y + Math.sin(an + 0.08) * L);
    ctx.stroke();
  }
  ctx.strokeStyle = rgba('#f5f3ff', 0.75 * a); ctx.lineWidth = Math.max(0.8, r * 0.09);
  ctx.beginPath(); ctx.arc(x, y, r * 1.02, 0, TAU); ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
  // the dark, coming across
  const off = (1 - k) * r * 2.1;
  ctx.fillStyle = rgba('#05020a', 0.97 * a);
  ctx.beginPath(); ctx.arc(x + off, y - off * 0.3, r, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  const bead = -2.3 + Math.sin(uiTime * 0.6) * 0.2;
  drawGlow(x + Math.cos(bead) * r, y + Math.sin(bead) * r, r * 0.9, '#ffffff', 0.55 * a * k);
  ctx.restore();
}

/* A sign's medallion: its glyph in a ring of its element, three pips round the
   foot, and at III a gold ring that breathes. o.shadow lays the eclipse over it. */
function zaMedal(x, y, r, id, mag, o = {}) {
  const a = o.a === undefined ? 1 : o.a, el = zaEl(id), ec = ZA_ELCOL[el], asc = mag >= 3;
  ctx.save();
  if (asc || o.flash) {
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(x, y, r * 2.6, ZA_GOLD, (asc ? 0.22 + 0.1 * Math.sin(uiTime * 2.6) : 0) * a + (o.flash || 0) * 0.7);
    ctx.globalCompositeOperation = 'source-over';
  }
  const g = ctx.createRadialGradient(x, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, rgba(asc ? '#2a1d06' : '#16203a', 0.96 * a)); g.addColorStop(1, rgba('#060912', 0.96 * a));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(asc ? ZA_GOLD : ec, (asc ? 0.95 : 0.75) * a); ctx.lineWidth = Math.max(1, r * 0.11);
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba(ec, 0.25 * a); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y, r * 0.78, 0, TAU); ctx.stroke();
  if (asc) {   // the crown's ticks
    ctx.strokeStyle = rgba(ZA_GOLD_HI, 0.55 * a);
    for (let i = 0; i < 12; i++) {
      const an = i * TAU / 12 + uiTime * 0.4;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * r * 1.08, y + Math.sin(an) * r * 1.08);
      ctx.lineTo(x + Math.cos(an) * r * 1.24, y + Math.sin(an) * r * 1.24); ctx.stroke();
    }
  }
  zaGlyph(id, x, y - r * 0.06, r * 0.5, asc ? ZA_GOLD_PALE : ZA_GOLD_HI, { a, lw: 0.2, glow: asc ? 0.8 : 0.35 });
  // the pips, round the foot of the ring
  for (let i = 0; i < 3; i++) {
    const an = Math.PI / 2 + (i - 1) * 0.62, px = x + Math.cos(an) * r, py = y + Math.sin(an) * r, lit = i < mag;
    zaStar4(px, py, Math.max(1.6, r * 0.24), 0, 0.38);
    ctx.fillStyle = lit ? rgba(ZA_GOLD, a) : rgba('#1e293b', a); ctx.fill();
    ctx.strokeStyle = rgba(lit ? ZA_GOLD_PALE : '#475569', 0.8 * a); ctx.lineWidth = 0.8; ctx.stroke();
  }
  if (o.shadow) zaEclipse(x + r * 0.42, y - r * 0.42, r * 0.6, a * o.shadow, o.shadowK === undefined ? 1 : o.shadowK);
  ctx.restore();
}

// text, its letters spaced out, centred on x
function zaSpaced(t, x, y, sp) {
  const w = ctx.measureText(t).width + sp * (t.length - 1);
  let cx = x - w / 2;
  const al = ctx.textAlign;
  ctx.textAlign = 'left';
  for (const ch of t) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + sp; }
  ctx.textAlign = al;
}
/* ============================ end of the sky (za) ============================ */
