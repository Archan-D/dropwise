/* Dropwise QR encoder: byte mode, error-correction level M, versions 1–40, automatic mask choice.
   Self-contained so the printed QR code works even when clinic networks block CDNs.
   Follows the ISO/IEC 18004 construction (finder/timing/alignment patterns, Reed–Solomon ECC, masking). */
const QR = (() => {
  // Level M tables, index = version
  const ECC_PER_BLOCK = [-1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28];
  const NUM_BLOCKS    = [-1,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49];
  const FORMAT_ECL_M = 0;

  const rawModules = v => { let r = (16*v + 128)*v + 64;
    if (v >= 2){ const n = Math.floor(v/7) + 2; r -= (25*n - 10)*n - 55; if (v >= 7) r -= 36; } return r; };
  const dataCodewords = v => Math.floor(rawModules(v)/8) - ECC_PER_BLOCK[v]*NUM_BLOCKS[v];
  const alignPositions = v => { if (v === 1) return [];
    const n = Math.floor(v/7) + 2, size = v*4 + 17;
    const step = v === 32 ? 26 : Math.ceil((v*4 + 4)/(n*2 - 2))*2;
    const out = [6]; for (let pos = size - 7; out.length < n; pos -= step) out.splice(1, 0, pos); return out; };

  // Reed–Solomon over GF(256), polynomial 0x11D
  const gfMul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--){ z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 0xFF; };
  const rsDivisor = d => { const r = new Array(d).fill(0); r[d-1] = 1; let root = 1;
    for (let i = 0; i < d; i++){ for (let j = 0; j < d; j++){ r[j] = gfMul(r[j], root); if (j + 1 < d) r[j] ^= r[j+1]; } root = gfMul(root, 2); } return r; };
  const rsRemainder = (data, div) => { const r = div.map(() => 0);
    for (const b of data){ const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => r[i] ^= gfMul(c, f)); } return r; };

  function encodeBytes(bytes){
    let v = 1;
    for (; v <= 40; v++){ const cc = v <= 9 ? 8 : 16; if (4 + cc + bytes.length*8 <= dataCodewords(v)*8) break; }
    if (v > 40) throw new Error("Data too long for a QR code");
    const bits = [], push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    push(4, 4); push(bytes.length, v <= 9 ? 8 : 16); bytes.forEach(b => push(b, 8));
    const cap = dataCodewords(v)*8;
    push(0, Math.min(4, cap - bits.length)); push(0, (8 - bits.length % 8) % 8);
    for (let pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) push(pad, 8);
    const data = []; for (let i = 0; i < bits.length; i += 8){ let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bits[i+j]; data.push(b); }

    // Split into blocks, add ECC, interleave
    const nb = NUM_BLOCKS[v], ecl = ECC_PER_BLOCK[v], raw = Math.floor(rawModules(v)/8);
    const nShort = nb - raw % nb, shortLen = Math.floor(raw/nb), div = rsDivisor(ecl), blocks = [];
    for (let i = 0, k = 0; i < nb; i++){
      const dat = data.slice(k, k + shortLen - ecl + (i < nShort ? 0 : 1)); k += dat.length;
      const ecc = rsRemainder(dat, div); if (i < nShort) dat.push(0); blocks.push(dat.concat(ecc));
    }
    const all = [];
    for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - ecl || j >= nShort) all.push(b[i]); });

    // Build the grid
    const size = v*4 + 17;
    const mod = Array.from({length:size}, () => new Array(size).fill(false));
    const fn = Array.from({length:size}, () => new Array(size).fill(false));
    const set = (x, y, dark) => { mod[y][x] = dark; fn[y][x] = true; };
    for (let i = 0; i < size; i++){ set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const finder = (cx, cy) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++){
      const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= size || y >= size) continue;
      const d = Math.max(Math.abs(dx), Math.abs(dy)); set(x, y, d !== 2 && d !== 4); } };
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    const ap = alignPositions(v), n = ap.length;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++){
      if ((i === 0 && j === 0) || (i === 0 && j === n-1) || (i === n-1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ap[i] + dx, ap[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    const drawFormat = mask => {
      const d = (FORMAT_ECL_M << 3) | mask; let r = d;
      for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = ((d << 10) | r) ^ 0x5412, bit = i => ((b >>> i) & 1) !== 0;
      for (let i = 0; i <= 5; i++) set(8, i, bit(i));
      set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
      for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
      for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
      set(8, size - 8, true);
    };
    drawFormat(0);
    if (v >= 7){ let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
      const b = (v << 12) | r;
      for (let i = 0; i < 18; i++){ const bit = ((b >>> i) & 1) !== 0, a = size - 11 + i % 3, c = Math.floor(i/3); set(a, c, bit); set(c, a, bit); } }

    // Place data in the zig-zag order
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2){
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++){
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
        if (!fn[y][x] && i < all.length*8){ mod[y][x] = ((all[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0; i++; }
      }
    }

    // Masks: try all eight, keep the one with the lowest penalty
    const maskFn = [(x,y)=>(x+y)%2===0,(x,y)=>y%2===0,(x,y)=>x%3===0,(x,y)=>(x+y)%3===0,
      (x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2===0,(x,y)=>x*y%2+x*y%3===0,(x,y)=>(x*y%2+x*y%3)%2===0,(x,y)=>((x+y)%2+x*y%3)%2===0];
    const applyMask = m => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && maskFn[m](x,y)) mod[y][x] = !mod[y][x]; };
    const penalty = () => {
      let p = 0;
      const line = get => { for (let a = 0; a < size; a++){ let run = 1;
        for (let b = 1; b <= size; b++){ if (b < size && get(a,b) === get(a,b-1)) run++; else { if (run >= 5) p += run - 2; run = 1; } }
        for (let b = 0; b + 10 < size; b++){ const s = Array.from({length:11}, (_,k) => get(a, b+k) ? 1 : 0).join("");
          if (s === "10111010000" || s === "00001011101") p += 40; } } };
      line((a,b) => mod[a][b]); line((a,b) => mod[b][a]);
      for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++){ const c = mod[y][x];
        if (c === mod[y][x+1] && c === mod[y+1][x] && c === mod[y+1][x+1]) p += 3; }
      let dark = 0; mod.forEach(r => r.forEach(c => dark += c ? 1 : 0));
      const total = size*size; p += (Math.ceil(Math.abs(dark*20 - total*10)/total) - 1) * 10;
      return p;
    };
    let best = 0, bestP = Infinity;
    for (let m = 0; m < 8; m++){ applyMask(m); drawFormat(m); const p = penalty(); if (p < bestP){ bestP = p; best = m; } applyMask(m); }
    applyMask(best); drawFormat(best);
    return mod;
  }

  const matrix = text => encodeBytes([...new TextEncoder().encode(text)]);
  function svg(text, border = 2){
    const m = matrix(text), size = m.length, dim = size + border*2; let d = "";
    m.forEach((row, y) => row.forEach((dark, x) => { if (dark) d += `M${x+border} ${y+border}h1v1h-1z`; }));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges"><rect width="${dim}" height="${dim}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  }
  return {matrix, svg};
})();
if (typeof module !== "undefined") module.exports = QR;
