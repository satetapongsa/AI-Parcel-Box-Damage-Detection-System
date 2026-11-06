'use client';

/**
 * Photo-realistic "camera feed" of the line, rendered live with three.js (WebGL).
 * It reads the same simulation object as the schematic view, so every box, decision,
 * pusher stroke and bin is identical in both views.
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CLASSES, ZONE, lightOf, formatSimTime } from '@/lib/sim/engine';

// ---------------------------------------------------------------- world layout (metres)
const BELT_X0 = -6.2;
const BELT_LEN = 12.4;
const BELT_Y = 0.86; // top of the belt
const BELT_W = 1.25;
const BOX = { w: 0.82, h: 0.56, d: 0.62 }; // standard carton, scaled per box by dims
const BIN = { w: 1.55, h: 0.62, d: 1.1, z: 2.05, off: 1.05 };
const ASPECT = 2.2; // wide CCTV frame: the line is long and low
const wx = (xn) => BELT_X0 + xn * BELT_LEN;

const CARTON = {
  kraft: '#c49660',
  light: '#dcb889',
  dark: '#8d6237',
  white: '#e7e4de',
};

const rnd = (seed) => {
  let s = Math.floor(seed * 2 ** 31) || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
};

function shade(hex, f) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return `#${c.getHexString()}`;
}

// ---------------------------------------------------------------- procedural textures
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function cardboardBase(g, w, h, color, rand) {
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  // fibres / speckle
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '60,40,20' : '255,240,210'},${0.03 + rand() * 0.06})`;
    g.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1);
  }
  // faint corrugation flutes
  g.strokeStyle = 'rgba(80,55,25,0.06)';
  for (let x = 0; x < w; x += 6) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, h);
    g.stroke();
  }
  // darker edges (ambient occlusion feel)
  const grd = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(40,25,10,0.28)');
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
}

function frontTexture({ color, truth, no, reworked, seed }) {
  return canvasTex(512, 384, (g, w, h) => {
    const r = rnd(seed + 0.1);
    cardboardBase(g, w, h, color, r);
    // tape running down from the top seam
    g.fillStyle = 'rgba(236,214,170,0.92)';
    g.fillRect(w * 0.43, 0, w * 0.14, h * 0.3);
    // shipping label with barcode
    const lx = w * 0.07;
    const ly = h * 0.5;
    g.fillStyle = '#f7f5ef';
    g.fillRect(lx, ly, w * 0.34, h * 0.36);
    g.fillStyle = '#111';
    for (let i = 0; i < 34; i++) {
      const bw = r() < 0.5 ? 2 : 4;
      g.fillRect(lx + 12 + i * 5, ly + 14, bw, h * 0.12);
    }
    g.fillStyle = '#333';
    g.font = 'bold 18px Arial';
    g.fillText('TH-EXPRESS', lx + 12, ly + h * 0.24);
    g.font = '14px Arial';
    g.fillText('BKK  ▸  CNX', lx + 12, ly + h * 0.31);
    // handling marks
    g.strokeStyle = 'rgba(40,25,10,0.75)';
    g.lineWidth = 4;
    for (const ax of [w * 0.74, w * 0.84]) {
      g.beginPath();
      g.moveTo(ax, h * 0.84);
      g.lineTo(ax, h * 0.66);
      g.moveTo(ax - 10, h * 0.71);
      g.lineTo(ax, h * 0.64);
      g.lineTo(ax + 10, h * 0.71);
      g.stroke();
    }
    // unit number sticker
    g.fillStyle = reworked ? '#bfdbfe' : '#ffffff';
    g.fillRect(w * 0.6, h * 0.38, w * 0.3, h * 0.17);
    g.strokeStyle = '#1f2937';
    g.lineWidth = 2;
    g.strokeRect(w * 0.6, h * 0.38, w * 0.3, h * 0.17);
    g.fillStyle = '#111827';
    g.font = 'bold 44px Consolas, monospace';
    g.textAlign = 'center';
    g.fillText(`#${no}`, w * 0.75, h * 0.51);
    g.textAlign = 'left';
    if (reworked) {
      g.fillStyle = 'rgba(37,99,235,0.92)';
      g.fillRect(0, h * 0.12, w, h * 0.08);
    }
    if (truth === 'dent') {
      // crushed: dark shading where the face caves in + creases
      const cx = w * (0.4 + r() * 0.2);
      const grd = g.createRadialGradient(cx, h * 0.15, 10, cx, h * 0.25, w * 0.42);
      grd.addColorStop(0, 'rgba(35,20,8,0.75)');
      grd.addColorStop(1, 'rgba(35,20,8,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h * 0.75);
      g.strokeStyle = 'rgba(40,22,8,0.85)';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(cx, h * 0.12);
      g.lineTo(cx - w * 0.2, h * 0.72);
      g.moveTo(cx, h * 0.12);
      g.lineTo(cx + w * 0.22, h * 0.62);
      g.moveTo(cx, h * 0.12);
      g.lineTo(cx + w * 0.03, h * 0.85);
      g.stroke();
      g.strokeStyle = 'rgba(255,235,200,0.35)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(cx + 6, h * 0.14);
      g.lineTo(cx - w * 0.18, h * 0.72);
      g.stroke();
    }
    if (truth === 'tear') {
      // ripped hole: light corrugated rim + dark inside
      const cx = w * (0.48 + (r() - 0.5) * 0.12);
      const cy = h * 0.38;
      const pts = [];
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2;
        const k = i % 2 ? 0.7 + r() * 0.15 : 1;
        pts.push([cx + Math.cos(a) * w * 0.17 * k, cy + Math.sin(a) * h * 0.2 * k]);
      }
      const poly = (scale) => {
        g.beginPath();
        pts.forEach(([x, y], i) => {
          const px = cx + (x - cx) * scale;
          const py = cy + (y - cy) * scale;
          if (i) g.lineTo(px, py);
          else g.moveTo(px, py);
        });
        g.closePath();
      };
      poly(1.13);
      g.fillStyle = '#efd5aa';
      g.fill();
      poly(1);
      const hole = g.createRadialGradient(cx, cy, 4, cx, cy, w * 0.17);
      hole.addColorStop(0, '#030201');
      hole.addColorStop(1, '#2d1a0b');
      g.fillStyle = hole;
      g.fill();
      g.strokeStyle = 'rgba(30,18,6,0.9)';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(cx - w * 0.17, cy - 10);
      g.lineTo(cx - w * 0.28, cy - h * 0.12);
      g.moveTo(cx + w * 0.16, cy - h * 0.1);
      g.lineTo(cx + w * 0.25, cy - h * 0.26);
      g.stroke();
    }
  });
}

function topTexture({ color, seed, truth }) {
  return canvasTex(512, 384, (g, w, h) => {
    const r = rnd(seed + 0.2);
    cardboardBase(g, w, h, shade(color, 1.07), r);
    g.strokeStyle = 'rgba(90,60,30,0.45)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, h / 2);
    g.lineTo(w, h / 2);
    g.stroke();
    // tape along the flap seam (split when torn)
    g.fillStyle = 'rgba(236,214,170,0.95)';
    if (truth === 'tear') {
      g.fillRect(0, h * 0.42, w * 0.42, h * 0.16);
      g.fillRect(w * 0.58, h * 0.42, w * 0.42, h * 0.16);
    } else {
      g.fillRect(0, h * 0.42, w, h * 0.16);
    }
  });
}

function sideTexture({ color, seed }) {
  return canvasTex(256, 256, (g, w, h) => cardboardBase(g, w, h, shade(color, 0.86), rnd(seed + 0.3)));
}

function concreteTexture() {
  const t = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#5b6068';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26000; i++) {
      const v = 70 + Math.random() * 60;
      g.fillStyle = `rgba(${v},${v + 3},${v + 8},${0.08 + Math.random() * 0.12})`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    for (let i = 0; i < 14; i++) {
      const grd = g.createRadialGradient(Math.random() * w, Math.random() * h, 5, Math.random() * w, Math.random() * h, 160);
      grd.addColorStop(0, 'rgba(30,32,36,0.12)');
      grd.addColorStop(1, 'rgba(30,32,36,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
    }
    g.strokeStyle = 'rgba(25,27,30,0.5)';
    g.lineWidth = 2;
    g.strokeRect(0, 0, w, h);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 3);
  return t;
}

function beltTexture() {
  const t = canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#1b1e22';
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      g.fillStyle = 'rgba(255,255,255,0.05)';
      g.fillRect(x, 0, 3, h);
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(x + 3, 0, 2, h);
    }
    for (let i = 0; i < 1500; i++) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
      g.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(BELT_LEN / 2, 1);
  return t;
}

// ---------------------------------------------------------------- carton mesh
function makeCarton(b, scale = 1) {
  const dims = b.dims || { w: 1, h: 1, d: 1 };
  const W = BOX.w * dims.w * scale;
  const H = BOX.h * dims.h * scale;
  const D = BOX.d * dims.d * scale;
  const color = CARTON[b.color] || CARTON.kraft;
  const opts = { color, truth: b.truth, no: b.no, reworked: b.reworked > 0, seed: b.seed ?? 0.5 };

  const geo = new THREE.BoxGeometry(W, H, D, 10, 8, 8);
  if (b.truth === 'dent') {
    // cave in the top and buckle the front around a point
    const pos = geo.attributes.position;
    const r = rnd(opts.seed + 0.7);
    const px = (r() - 0.5) * W * 0.3;
    const pz = (r() - 0.2) * D * 0.3;
    const sag = H * 0.33;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (y > H / 2 - 1e-4) {
        const d = Math.hypot((x - px) / (W * 0.5), (z - pz) / (D * 0.6));
        pos.setY(i, y - sag * Math.max(0, 1 - d * d));
      }
      if (z > D / 2 - 1e-4) {
        const k = Math.max(0, (y + H / 2) / H - 0.35) * Math.max(0, 1 - Math.abs(x - px) / (W * 0.55));
        pos.setZ(i, z - D * 0.16 * k);
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }
  const mat = (map, rough = 0.92) => new THREE.MeshStandardMaterial({ map, roughness: rough, metalness: 0 });
  const side = sideTexture(opts);
  const mats = [
    mat(side), // +x
    mat(side), // -x
    mat(topTexture(opts)), // +y
    mat(side), // -y
    mat(frontTexture(opts)), // +z (faces the camera)
    mat(side), // -z
  ];
  const mesh = new THREE.Mesh(geo, mats);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.add(mesh);
  if (b.truth === 'tear') {
    // torn flap hanging out of the hole
    const flap = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 0.26, H * 0.32),
      new THREE.MeshStandardMaterial({ color: shade(color, 1.05), roughness: 0.95, side: THREE.DoubleSide })
    );
    flap.position.set(-W * 0.02, -H * 0.12, D / 2 + 0.03);
    flap.rotation.x = -0.65;
    flap.rotation.z = 0.25;
    flap.castShadow = true;
    group.add(flap);
  }
  group.userData = { W, H, D, mats, geo };
  return group;
}

function disposeCarton(g) {
  g.traverse((o) => {
    if (o.isMesh) {
      o.geometry.dispose();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    }
  });
}

// ---------------------------------------------------------------- static scene
function buildLine(scene) {
  const steel = new THREE.MeshStandardMaterial({ color: '#9aa3ad', metalness: 0.85, roughness: 0.32 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: '#4b5563', metalness: 0.7, roughness: 0.45 });
  const yellow = new THREE.MeshStandardMaterial({ color: '#e0a40e', roughness: 0.6 });
  const add = (geo, mat, x, y, z, cast = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };

  // floor + wall
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshStandardMaterial({ map: concreteTexture(), roughness: 0.88 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 14), new THREE.MeshStandardMaterial({ color: '#2a3038', roughness: 0.95 }));
  wall.position.set(0, 7, -8.5);
  scene.add(wall);
  for (let i = -7; i <= 7; i++) add(new THREE.BoxGeometry(0.12, 14, 0.12), darkSteel, i * 4, 7, -8.4, false);
  // safety walkway lines
  for (const z of [1.25, 3.3]) add(new THREE.BoxGeometry(22, 0.01, 0.1), yellow, 0, 0.006, z, false);

  // background racking with stretch-wrapped pallets (clearly not line cartons)
  const rackMat = new THREE.MeshStandardMaterial({ color: '#7c2d12', roughness: 0.7, metalness: 0.3 });
  const wrapMat = new THREE.MeshStandardMaterial({ color: '#6b7a8c', roughness: 0.35, metalness: 0.1, transparent: true, opacity: 0.85 });
  const palletMat = new THREE.MeshStandardMaterial({ color: '#7a5a3a', roughness: 0.9 });
  for (let r = -2; r <= 2; r++) {
    const x = r * 4.6;
    for (const px of [-2, 2]) add(new THREE.BoxGeometry(0.1, 3.4, 0.1), rackMat, x + px, 1.7, -6.6, false);
    for (const y of [0.12, 1.65]) {
      add(new THREE.BoxGeometry(4.1, 0.08, 1.1), rackMat, x, y, -6.6, false);
      for (let k = 0; k < 3; k++) {
        if ((k + r + (y > 1 ? 1 : 0)) % 4 === 3) continue; // a few empty slots
        add(new THREE.BoxGeometry(1.1, 0.12, 0.95), palletMat, x - 1.3 + k * 1.3, y + 0.1, -6.6, false);
        const hh = 0.8 + ((k + r + 5) % 3) * 0.15;
        add(new THREE.BoxGeometry(1.05, hh, 0.9), wrapMat, x - 1.3 + k * 1.3, y + 0.16 + hh / 2, -6.6, false);
      }
    }
  }

  // belt: frame, rubber surface, rollers, legs
  const frameL = BELT_LEN + 0.4;
  add(new THREE.BoxGeometry(frameL, 0.22, 0.08), steel, 0, BELT_Y - 0.12, BELT_W / 2 + 0.04);
  add(new THREE.BoxGeometry(frameL, 0.22, 0.08), steel, 0, BELT_Y - 0.12, -BELT_W / 2 - 0.04);
  const beltTex = beltTexture();
  const belt = add(
    new THREE.BoxGeometry(BELT_LEN, 0.04, BELT_W),
    new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.75, metalness: 0.05 }),
    0,
    BELT_Y - 0.02,
    0,
    false
  );
  belt.receiveShadow = true;
  for (const ex of [-BELT_LEN / 2, BELT_LEN / 2]) {
    const roller = add(new THREE.CylinderGeometry(0.14, 0.14, BELT_W + 0.06, 32), darkSteel, ex, BELT_Y - 0.14, 0);
    roller.rotation.x = Math.PI / 2;
  }
  for (let i = 0; i <= 8; i++) {
    const x = -BELT_LEN / 2 + 0.3 + (i * (BELT_LEN - 0.6)) / 8;
    for (const z of [BELT_W / 2 - 0.05, -BELT_W / 2 + 0.05]) add(new THREE.BoxGeometry(0.09, BELT_Y - 0.2, 0.09), darkSteel, x, (BELT_Y - 0.2) / 2, z);
    add(new THREE.BoxGeometry(0.06, 0.06, BELT_W - 0.1), darkSteel, x, 0.25, 0);
  }
  // in-feed / out-feed roller tables so boxes enter and leave the frame on rollers
  const rollers = [];
  for (const [from, to] of [
    [-9.5, -BELT_LEN / 2 - 0.15],
    [BELT_LEN / 2 + 0.15, 9.5],
  ]) {
    add(new THREE.BoxGeometry(to - from, 0.12, 0.06), steel, (from + to) / 2, BELT_Y - 0.1, BELT_W / 2);
    add(new THREE.BoxGeometry(to - from, 0.12, 0.06), steel, (from + to) / 2, BELT_Y - 0.1, -BELT_W / 2);
    for (let x = from + 0.1; x < to; x += 0.22) {
      const r = add(new THREE.CylinderGeometry(0.045, 0.045, BELT_W - 0.04, 16), steel, x, BELT_Y - 0.05, 0);
      r.rotation.x = Math.PI / 2;
      rollers.push(r);
    }
    for (let x = from + 0.4; x < to; x += 1.4) add(new THREE.BoxGeometry(0.08, BELT_Y - 0.15, 0.08), darkSteel, x, (BELT_Y - 0.15) / 2, 0);
  }

  // CiRA camera gantry over the inspection zone
  const camL = wx(ZONE.camStart);
  const camR = wx(ZONE.camEnd);
  const camC = (camL + camR) / 2;
  for (const x of [camL - 0.3, camR + 0.3]) {
    add(new THREE.BoxGeometry(0.1, 3.1, 0.1), steel, x, 1.55, -BELT_W / 2 - 0.25);
  }
  add(new THREE.BoxGeometry(camR - camL + 0.8, 0.1, 0.1), steel, camC, 3.1, -BELT_W / 2 - 0.25);
  add(new THREE.BoxGeometry(0.08, 0.08, BELT_W / 2 + 0.3), steel, camC, 3.1, -0.3);
  const camBody = add(new THREE.BoxGeometry(0.34, 0.2, 0.22), new THREE.MeshStandardMaterial({ color: '#1f2937', metalness: 0.4, roughness: 0.4 }), camC, 2.92, 0);
  camBody.rotation.x = -0.25;
  const lens = add(new THREE.CylinderGeometry(0.06, 0.07, 0.08, 24), new THREE.MeshStandardMaterial({ color: '#0b0f14', metalness: 0.9, roughness: 0.1, emissive: '#1d4ed8', emissiveIntensity: 0.6 }), camC, 2.8, 0.02);
  lens.rotation.x = 0.1;
  // field-of-view light cone + zone marking on the belt
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry((camR - camL) / 2, 2.0, 4, 1, true),
    new THREE.MeshBasicMaterial({ color: '#60a5fa', transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide })
  );
  cone.position.set(camC, BELT_Y + 1.0, 0);
  cone.rotation.y = Math.PI / 4;
  scene.add(cone);
  const zone = new THREE.Mesh(
    new THREE.PlaneGeometry(camR - camL, BELT_W),
    new THREE.MeshBasicMaterial({ color: '#3b82f6', transparent: true, opacity: 0.1, depthWrite: false })
  );
  zone.rotation.x = -Math.PI / 2;
  zone.position.set(camC, BELT_Y + 0.003, 0);
  scene.add(zone);
  const decision = new THREE.Mesh(new THREE.PlaneGeometry(0.03, BELT_W), new THREE.MeshBasicMaterial({ color: '#f8fafc', transparent: true, opacity: 0.7 }));
  decision.rotation.x = -Math.PI / 2;
  decision.position.set(camR, BELT_Y + 0.004, 0);
  scene.add(decision);

  // IR breakbeam posts
  const irX = wx(ZONE.ir);
  for (const z of [BELT_W / 2 + 0.12, -BELT_W / 2 - 0.12]) add(new THREE.BoxGeometry(0.07, 0.45, 0.07), darkSteel, irX, BELT_Y + 0.12, z);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, BELT_W + 0.24, 6), new THREE.MeshBasicMaterial({ color: '#ef4444', transparent: true, opacity: 0.5 }));
  beam.rotation.x = Math.PI / 2;
  beam.position.set(irX, BELT_Y + 0.22, 0);
  scene.add(beam);

  // pneumatic pusher behind the belt
  const armX = wx(ZONE.arm);
  add(new THREE.BoxGeometry(0.5, 0.5, 0.3), darkSteel, armX, BELT_Y + 0.25, -BELT_W / 2 - 0.55);
  const cyl = add(new THREE.CylinderGeometry(0.09, 0.09, 0.7, 24), steel, armX, BELT_Y + 0.3, -BELT_W / 2 - 0.25);
  cyl.rotation.x = Math.PI / 2;
  const rod = add(new THREE.CylinderGeometry(0.025, 0.025, 1, 12), new THREE.MeshStandardMaterial({ color: '#e5e7eb', metalness: 1, roughness: 0.15 }), armX, BELT_Y + 0.3, 0);
  rod.rotation.x = Math.PI / 2;
  const plateMat = new THREE.MeshStandardMaterial({ color: '#9ca3af', metalness: 0.6, roughness: 0.35, emissive: '#000000' });
  const plate = add(new THREE.BoxGeometry(0.9, 0.42, 0.05), plateMat, armX, BELT_Y + 0.3, -BELT_W / 2 + 0.05);

  // ESP32 control box + tower light
  add(new THREE.BoxGeometry(0.5, 0.36, 0.16), new THREE.MeshStandardMaterial({ color: '#14532d', roughness: 0.5 }), armX + 0.85, BELT_Y + 0.7, -BELT_W / 2 - 0.45);
  const tower = new THREE.Group();
  tower.position.set(BELT_LEN / 2 + 0.9, 0, -BELT_W / 2 - 0.4);
  scene.add(tower);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.1, 12), steel);
  pole.position.y = 1.05;
  tower.add(pole);
  const lamps = {};
  [
    ['red', '#ef4444', 2.55],
    ['yellow', '#f59e0b', 2.35],
    ['green', '#22c55e', 2.15],
  ].forEach(([k, c, y]) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.18, 24), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.05, roughness: 0.3 }));
    m.position.y = y;
    tower.add(m);
    lamps[k] = m;
  });

  // chute + two reject bins in front of the belt
  const chute = add(new THREE.BoxGeometry(1.2, 0.04, 1.3), new THREE.MeshStandardMaterial({ color: '#6b7280', metalness: 0.7, roughness: 0.35 }), armX, BELT_Y * 0.62, BELT_W / 2 + 0.6);
  chute.rotation.x = 0.55;
  const bins = {};
  for (const [kind, dx, col] of [
    ['tear', -BIN.off, '#b91c1c'],
    ['dent', BIN.off, '#d97706'],
  ]) {
    const g = new THREE.Group();
    g.position.set(armX + dx, 0, BIN.z);
    const m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.55, metalness: 0.15 });
    const wall = (w, h, d, x, y, z) => {
      const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mm.position.set(x, y, z);
      mm.castShadow = true;
      mm.receiveShadow = true;
      g.add(mm);
    };
    wall(BIN.w, 0.05, BIN.d, 0, 0.03, 0);
    wall(BIN.w, BIN.h, 0.05, 0, BIN.h / 2, -BIN.d / 2);
    wall(BIN.w, BIN.h * 0.7, 0.05, 0, (BIN.h * 0.7) / 2, BIN.d / 2);
    wall(0.05, BIN.h, BIN.d, -BIN.w / 2, BIN.h / 2, 0);
    wall(0.05, BIN.h, BIN.d, BIN.w / 2, BIN.h / 2, 0);
    const content = new THREE.Group();
    g.add(content);
    scene.add(g);
    bins[kind] = { group: g, content, sig: '' };
  }

  return { beltTex, rollers, plate, plateMat, lamps, bins, armX };
}

// ---------------------------------------------------------------- component
export default function CameraView3D({ sim }) {
  const wrapRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const overlay = overlayRef.current;
    if (!wrap || !overlay) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      wrap.innerHTML = '<div style="padding:24px;color:#fca5a5">WebGL is not available in this browser — use the Schematic view.</div>';
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    wrap.prepend(renderer.domElement);
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1a1f26');
    scene.fog = new THREE.Fog('#1a1f26', 12, 26);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.35;

    // lighting: sky fill + key light with soft shadows + cool spot over the camera zone
    scene.add(new THREE.HemisphereLight('#dbeafe', '#3f3a33', 0.55));
    const sun = new THREE.DirectionalLight('#fff4e0', 2.2);
    sun.position.set(-4, 9, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -11;
    sun.shadow.camera.right = 11;
    sun.shadow.camera.top = 7;
    sun.shadow.camera.bottom = -7;
    sun.shadow.bias = -0.0004;
    sun.shadow.radius = 4;
    scene.add(sun);
    const spot = new THREE.SpotLight('#cfe3ff', 30, 9, 0.55, 0.6, 1.4);
    spot.position.set((wx(ZONE.camStart) + wx(ZONE.camEnd)) / 2, 3.4, 0.4);
    spot.target.position.set(spot.position.x, BELT_Y, 0);
    scene.add(spot, spot.target);

    const line = buildLine(scene);

    // CCTV viewpoint
    const camera = new THREE.PerspectiveCamera(35, ASPECT, 0.1, 80);
    camera.position.set(0.3, 3.5, 9.4);
    const look = new THREE.Vector3(0.3, 0.68, 0.95);

    const resize = () => {
      const w = wrap.clientWidth;
      const h = Math.round(w / ASPECT);
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${w}px`;
      renderer.domElement.style.height = `${h}px`;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      overlay.width = Math.round(w * dpr);
      overlay.height = Math.round(h * dpr);
      overlay.style.width = `${w}px`;
      overlay.style.height = `${h}px`;
      camera.aspect = w / h;
      // keep ~15.5 m of line visible horizontally whatever the aspect ratio
      const hfov = 2 * Math.atan(7.75 / camera.position.distanceTo(look));
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hfov / 2) / camera.aspect));
      camera.lookAt(look);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const cartons = new Map(); // box id -> group
    const tmp = new THREE.Vector3();

    const syncBins = () => {
      for (const kind of ['tear', 'dent']) {
        const items = sim.bins[kind];
        const sig = items.map((i) => i.no).join(',');
        const bin = line.bins[kind];
        if (sig === bin.sig) continue;
        bin.sig = sig;
        bin.content.children.slice().forEach((c) => {
          bin.content.remove(c);
          disposeCarton(c);
        });
        items.slice(-8).forEach((it, i) => {
          const g = makeCarton(it, 0.62);
          const { H } = g.userData;
          const col = i % 3;
          const row = Math.floor(i / 3);
          g.position.set(-0.45 + col * 0.45 + (row % 2) * 0.1, 0.06 + H / 2 + row * 0.16, -0.2 + (i % 2) * 0.32);
          g.rotation.set(0.15 * ((i % 3) - 1), 0.5 * (i % 4), 0.25 * ((i % 2) - 0.5));
          bin.content.add(g);
        });
      }
    };

    const drawOverlay = () => {
      const g = overlay.getContext('2d');
      const dpr = overlay.width / overlay.clientWidth || 1;
      const W = overlay.clientWidth;
      const H = overlay.clientHeight;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      const f = Math.max(0.65, Math.min(1.2, W / 900)); // text scale

      for (const b of sim.boxes) {
        const grp = cartons.get(b.id);
        if (!grp) continue;
        const inCam = b.seen && b.state === 'belt' && b.x >= ZONE.camStart && b.x <= ZONE.camEnd;
        const decided = b.decision && b.state === 'belt' && b.x > ZONE.camEnd;
        if (!inCam && !decided) continue;
        // project the carton's 8 corners to screen space
        const { W: bw, H: bh, D: bd } = grp.userData;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const sx of [-0.5, 0.5]) {
          for (const sy of [-0.5, 0.5]) {
            for (const sz of [-0.5, 0.5]) {
              tmp.set(sx * bw, sy * bh, sz * bd).applyMatrix4(grp.matrixWorld).project(camera);
              const x = ((tmp.x + 1) / 2) * W;
              const y = ((1 - tmp.y) / 2) * H;
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
              minY = Math.min(minY, y);
              maxY = Math.max(maxY, y);
            }
          }
        }
        if (inCam) {
          const cls = CLASSES[b.seen.cls];
          g.strokeStyle = cls.color;
          g.lineWidth = 2.5;
          g.strokeRect(minX - 3, minY - 3, maxX - minX + 6, maxY - minY + 6);
          const label = `${b.seen.cls} ${b.seen.conf.toFixed(2)}`;
          g.font = `bold ${Math.round(13 * f)}px Consolas, monospace`;
          const tw = g.measureText(label).width + 10;
          g.fillStyle = cls.color;
          g.fillRect(minX - 3, minY - 3 - 18 * f, tw, 18 * f);
          g.fillStyle = '#0b0f14';
          g.fillText(label, minX + 2, minY - 3 - 5 * f);
        } else {
          const rej = b.decision === 'REJECT';
          const text = rej ? '✖ REJECT' : '✔ PASS';
          g.font = `800 ${Math.round(12 * f)}px Segoe UI, sans-serif`;
          const tw = g.measureText(text).width + 16;
          const cx = (minX + maxX) / 2;
          g.fillStyle = rej ? 'rgba(127,29,29,0.92)' : 'rgba(20,83,45,0.92)';
          g.beginPath();
          g.roundRect(cx - tw / 2, minY - 26 * f, tw, 20 * f, 10 * f);
          g.fill();
          g.fillStyle = rej ? '#fecaca' : '#bbf7d0';
          g.textAlign = 'center';
          g.fillText(text, cx, minY - 12 * f);
          g.textAlign = 'left';
        }
      }

      // CCTV HUD
      g.font = `600 ${Math.round(13 * f)}px Consolas, monospace`;
      g.fillStyle = 'rgba(0,0,0,0.45)';
      g.fillRect(10, 10, 330 * f, 44 * f);
      g.fillStyle = '#e5e7eb';
      g.fillText('CAM-01 · CiRA CORE · 1920×1080 · 15 fps', 18, 10 + 18 * f);
      g.fillStyle = '#9ca3af';
      g.fillText(`LINE 1 · sim ${formatSimTime(sim.simTime)} · ${sim.speed}x`, 18, 10 + 36 * f);
      const rec = Math.floor(performance.now() / 600) % 2 === 0;
      g.fillStyle = rec ? '#ef4444' : 'rgba(239,68,68,0.3)';
      g.beginPath();
      g.arc(W - 70 * f, 26 * f, 6 * f, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#f3f4f6';
      g.fillText('REC', W - 58 * f, 31 * f);
      // shipped counter + bin labels
      g.fillStyle = 'rgba(0,0,0,0.45)';
      g.fillRect(W - 220 * f, H - 58 * f, 210 * f, 48 * f);
      g.fillStyle = '#86efac';
      g.font = `700 ${Math.round(12 * f)}px Segoe UI, sans-serif`;
      g.fillText('SHIPPED', W - 212 * f, H - 40 * f);
      g.font = `800 ${Math.round(20 * f)}px Consolas, monospace`;
      g.fillText(String(sim.stats.accepted), W - 212 * f, H - 18 * f);
      g.font = `600 ${Math.round(11 * f)}px Consolas, monospace`;
      g.fillStyle = '#d1d5db';
      g.fillText(sim.shipped.slice(0, 4).map((u) => `#${u.no}${u.reworked ? 'R' : ''}`).join(' ') || '—', W - 140 * f, H - 18 * f);
      for (const [kind, label, color] of [
        ['tear', 'TORN · scrap', '#fecaca'],
        ['dent', 'DENTED · fix', '#fde68a'],
      ]) {
        tmp.set(line.armX + (kind === 'tear' ? -BIN.off : BIN.off), BIN.h + 0.25, BIN.z + BIN.d / 2).project(camera);
        const x = ((tmp.x + 1) / 2) * W;
        const y = ((1 - tmp.y) / 2) * H;
        const text = `${label}  ${sim.bins[kind].length}`;
        g.font = `800 ${Math.round(12 * f)}px Segoe UI, sans-serif`;
        const tw = g.measureText(text).width + 14;
        g.fillStyle = 'rgba(0,0,0,0.6)';
        g.fillRect(x - tw / 2, y - 16 * f, tw, 20 * f);
        g.fillStyle = color;
        g.textAlign = 'center';
        g.fillText(text, x, y - 2 * f);
        g.textAlign = 'left';
      }
      // subtle scanline / vignette look
      const vg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.35)');
      g.fillStyle = vg;
      g.fillRect(0, 0, W, H);
    };

    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;

      // belt + rollers move with the simulation
      const travel = sim.beltOffset * BELT_LEN;
      line.beltTex.offset.x = -(travel / 2) % 1;
      const ang = -(travel / 0.045) % (Math.PI * 2);
      for (const r of line.rollers) r.rotation.y = ang;

      // pusher stroke
      const ext = sim.arm.active ? Math.sin(Math.PI * Math.min(sim.arm.t * 1.6, 1)) : 0;
      line.plate.position.z = -BELT_W / 2 + 0.05 + ext * (BELT_W - 0.05);
      line.plateMat.emissive.set(ext > 0.05 ? '#7f1d1d' : '#000000');

      // tower light
      const lit = lightOf(sim);
      for (const [k, m] of Object.entries(line.lamps)) m.material.emissiveIntensity = k === lit ? 2.6 : 0.05;

      // cartons: create / update / remove
      const alive = new Set();
      for (const b of sim.boxes) {
        alive.add(b.id);
        let grp = cartons.get(b.id);
        if (!grp) {
          grp = makeCarton(b);
          cartons.set(b.id, grp);
          scene.add(grp);
        }
        const { W: bw, H: bh, D: bd } = grp.userData;
        const x = wx(b.x);
        const zLane = (b.lane / 6) * 0.12;
        if (b.state === 'rejecting') {
          const t = Math.min(b.rejectT, 1);
          const binX = line.armX + (b.predicted === 'tear' ? -BIN.off : BIN.off);
          if (t < 0.35) {
            // pushed across the belt
            const k = t / 0.35;
            grp.position.set(x, BELT_Y + bh / 2, zLane + k * (BELT_W / 2 + bd / 2 - zLane));
            grp.rotation.set(0, 0, 0);
          } else {
            // falls down the chute into the bin
            const k = (t - 0.35) / 0.65;
            grp.position.set(
              x + (binX - x) * k,
              BELT_Y + bh / 2 + (0.35 + bh / 2 - (BELT_Y + bh / 2)) * k - Math.sin(k * Math.PI) * -0.25,
              BELT_W / 2 + bd / 2 + (BIN.z - BELT_W / 2 - bd / 2) * k
            );
            grp.rotation.set(k * 1.1, k * 0.6, 0);
          }
        } else {
          grp.position.set(x, BELT_Y + bh / 2, zLane);
          grp.rotation.set(0, (b.seed - 0.5) * 0.12, 0);
        }
      }
      for (const [id, grp] of cartons) {
        if (!alive.has(id)) {
          scene.remove(grp);
          disposeCarton(grp);
          cartons.delete(id);
        }
      }
      syncBins();

      renderer.render(scene, camera);
      drawOverlay();
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      for (const grp of cartons.values()) disposeCarton(grp);
      scene.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [sim]);

  return (
    <div ref={wrapRef} className="relative w-full bg-[#1a1f26]" style={{ aspectRatio: `${ASPECT}` }}>
      <canvas ref={overlayRef} className="pointer-events-none absolute left-0 top-0" aria-hidden="true" />
    </div>
  );
}
