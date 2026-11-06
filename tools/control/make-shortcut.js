'use strict';
/**
 * Create an "SPDI" shortcut on the Windows desktop that starts runall.bat,
 * with its own icon (drawn here, no image files needed).
 *   node tools/control/make-shortcut.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const ICON = path.join(__dirname, 'spdi.ico');
const TARGET = path.join(ROOT, 'runall.bat');

// ---------------------------------------------------------------- icon
function hex(c) {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}
const C = {
  bg: hex('#161b22'), edge: hex('#2a323d'), front: hex('#c08445'), top: hex('#e0ae73'),
  side: hex('#9a6631'), tape: hex('#f3dcaa'), ok: hex('#2ea043'), white: [255, 255, 255],
};

function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// colour at a point (u, v in 0..1, v down) or null = transparent
function shade(u, v) {
  // rounded square background
  const r = 0.2, m = 0.02;
  const cx = Math.max(m + r, Math.min(1 - m - r, u)), cy = Math.max(m + r, Math.min(1 - m - r, v));
  const d = Math.hypot(u - cx, v - cy);
  if (d > r) return null;
  let col = d > r - 0.035 ? C.edge : C.bg;

  // parcel box: top face (parallelogram) + front + right side
  const inTop = v >= 0.22 && v <= 0.36 && u >= 0.2 + (0.36 - v) * 0.6 && u <= 0.72 + (0.36 - v) * 0.6;
  const inFront = u >= 0.2 && u <= 0.72 && v >= 0.36 && v <= 0.8;
  const inSide = u > 0.72 && u <= 0.8 && v >= 0.22 + (u - 0.72) * 0 && v <= 0.8 - (u - 0.72) * 1.75 && v >= 0.36 - (u - 0.72) * 1.75;
  if (inTop) col = C.top;
  if (inSide) col = C.side;
  if (inFront) col = C.front;
  if ((inFront && u >= 0.425 && u <= 0.495) || (inTop && Math.abs(u - (0.46 + (0.36 - v) * 0.6)) < 0.035)) col = C.tape;

  // green check badge
  const bd = Math.hypot(u - 0.72, v - 0.72);
  if (bd < 0.2) col = bd > 0.17 ? C.bg : C.ok;
  if (bd < 0.17) {
    const th = 0.035;
    if (distToSeg(u, v, 0.63, 0.72, 0.69, 0.79) < th || distToSeg(u, v, 0.69, 0.79, 0.81, 0.65) < th) col = C.white;
  }
  return col;
}

function bitmap(size) {
  const SS = 4; // 4x4 supersampling for smooth edges
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = shade((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size);
          if (!c) continue;
          r += c[0]; g += c[1]; b += c[2]; a += 1;
        }
      }
      // BMP rows are stored bottom-up, pixels as BGRA
      const o = ((size - 1 - y) * size + x) * 4;
      if (a) {
        px[o] = Math.round(b / a); px[o + 1] = Math.round(g / a); px[o + 2] = Math.round(r / a);
      }
      px[o + 3] = Math.round((a / (SS * SS)) * 255);
    }
  }
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(size, 4);
  header.writeInt32LE(size * 2, 8); // colour + mask
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(32, 14);
  header.writeUInt32LE(0, 16);
  header.writeUInt32LE(px.length, 20);
  const maskRow = Math.ceil(size / 32) * 4;
  return Buffer.concat([header, px, Buffer.alloc(maskRow * size)]);
}

function makeIco(sizes) {
  const images = sizes.map(bitmap);
  const dir = Buffer.alloc(6 + 16 * sizes.length);
  dir.writeUInt16LE(0, 0);
  dir.writeUInt16LE(1, 2);
  dir.writeUInt16LE(sizes.length, 4);
  let offset = dir.length;
  sizes.forEach((s, i) => {
    const e = 6 + i * 16;
    dir.writeUInt8(s >= 256 ? 0 : s, e);
    dir.writeUInt8(s >= 256 ? 0 : s, e + 1);
    dir.writeUInt16LE(1, e + 4);
    dir.writeUInt16LE(32, e + 6);
    dir.writeUInt32LE(images[i].length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += images[i].length;
  });
  return Buffer.concat([dir, ...images]);
}

fs.writeFileSync(ICON, makeIco([16, 24, 32, 48, 64, 128]));
console.log(`🎨 icon: ${ICON}`);

// ---------------------------------------------------------------- shortcut
if (process.platform !== 'win32') {
  console.log('ℹ️  desktop shortcuts are made on Windows only');
  process.exit(0);
}
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const ps = [
  '$desk = [Environment]::GetFolderPath("Desktop")',
  '$lnk = Join-Path $desk "SPDI.lnk"',
  '$s = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk)',
  `$s.TargetPath = ${q(TARGET)}`,
  `$s.WorkingDirectory = ${q(ROOT)}`,
  `$s.IconLocation = ${q(ICON + ',0')}`,
  '$s.Description = "SPDI - start everything and open the Control Center"',
  '$s.Save()',
  'Write-Output $lnk',
].join('; ');
try {
  const out = execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8' }).trim();
  console.log(`✅ shortcut created: ${out}`);
  console.log('   Double-click "SPDI" on the desktop. Right-click it -> "Pin to taskbar" if you like.');
} catch (err) {
  console.error('❌ could not create the shortcut:', err.message);
  process.exitCode = 1;
}
