// A tiny seeded random source, so a ?seed=N run builds the same islands, the same
// course and the same clouds every time. Mulberry32 is small, fast and good enough
// for placement; nothing here needs cryptographic randomness.

export function createRandom(seed) {
  let a = seed >>> 0;
  if (a === 0) a = 0x9e3779b9;
  function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    /** A float in [0, 1). */
    next,
    /** A float in [min, max). The ends are swapped if they arrive backwards. */
    range(min, max) {
      if (min > max) {
        const tmp = min;
        min = max;
        max = tmp;
      }
      return min + (max - min) * next();
    },
    /** An integer in [min, max] inclusive. */
    int(min, max) {
      return Math.floor(min + (max - min + 1) * next());
    },
    /** One element of the array, uniformly. */
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
  };
}

// Classic value noise over a 2D lattice, smoothed so the terrain reads as rolling
// hills rather than static. The permutation comes from the seeded source, so the
// noise field is different for every seed but stable within one.
export function createNoise(random) {
  const perm = new Uint8Array(512);
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) base[i] = i;
  for (let i = 255; i > 0; i -= 1) {
    const j = Math.floor(random.next() * (i + 1));
    const tmp = base[i];
    base[i] = base[j];
    base[j] = tmp;
  }
  for (let i = 0; i < 512; i += 1) perm[i] = base[i & 255];

  function fade(t) {
    return t * t * (3 - 2 * t);
  }
  function lattice(ix, iy) {
    return perm[(perm[ix & 255] + iy) & 255] / 255;
  }
  function noise2(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const a = lattice(ix, iy);
    const b = lattice(ix + 1, iy);
    const c = lattice(ix, iy + 1);
    const d = lattice(ix + 1, iy + 1);
    const u = fade(fx);
    const v = fade(fy);
    return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
  }
  /** Fractal noise in roughly [-1, 1], from `octaves` layers of noise2. */
  return function fbm(x, y, octaves) {
    let sum = 0;
    let amp = 1;
    let freq = 1;
    let norm = 0;
    for (let o = 0; o < octaves; o += 1) {
      sum += noise2(x * freq, y * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return sum / norm;
  };
}
