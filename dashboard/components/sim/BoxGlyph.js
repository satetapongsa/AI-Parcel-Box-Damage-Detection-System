'use client';

/**
 * 3D cardboard box (SVG <g>). Origin = top-left corner of the FRONT face.
 * Top face goes up-right by depth, side face on the right.
 * Extent: x 0..w+depth*0.55, y -depth*0.45..h
 * truth: 'box_good' | 'dent' (crushed / caved in) | 'tear' (ripped open).
 */
export function BoxDefs() {
  return (
    <defs>
      <linearGradient id="spdi-front" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#d4a46b" />
        <stop offset="1" stopColor="#b8864f" />
      </linearGradient>
      <linearGradient id="spdi-top" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#e6bd86" />
        <stop offset="1" stopColor="#f0cf9e" />
      </linearGradient>
      <linearGradient id="spdi-side" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#a57745" />
        <stop offset="1" stopColor="#8d6337" />
      </linearGradient>
      <linearGradient id="spdi-sag" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3d2610" stopOpacity="0.85" />
        <stop offset="1" stopColor="#6b4824" stopOpacity="0" />
      </linearGradient>
      <radialGradient id="spdi-hole" cx="0.45" cy="0.4" r="0.7">
        <stop offset="0" stopColor="#050302" />
        <stop offset="0.7" stopColor="#1f1309" />
        <stop offset="1" stopColor="#3b2410" />
      </radialGradient>
      <radialGradient id="spdi-shadow">
        <stop offset="0" stopColor="#000" stopOpacity="0.55" />
        <stop offset="1" stopColor="#000" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

function ShippingLabel({ w, h }) {
  return (
    <g>
      <rect x={w * 0.07} y={h * 0.52} width={w * 0.28} height={h * 0.3} fill="#f6f3ec" rx={1.5} />
      <rect x={w * 0.09} y={h * 0.56} width={w * 0.13} height={h * 0.08} fill="#222" />
      <line x1={w * 0.09} y1={h * 0.69} x2={w * 0.31} y2={h * 0.69} stroke="#666" strokeWidth={1} />
      <line x1={w * 0.09} y1={h * 0.76} x2={w * 0.27} y2={h * 0.76} stroke="#666" strokeWidth={1} />
    </g>
  );
}

function GoodBox({ w, h, dx, dy, tx, tapeW }) {
  return (
    <g>
      <polygon points={`${w},0 ${w + dx},${-dy} ${w + dx},${h - dy} ${w},${h}`} fill="url(#spdi-side)" stroke="#6e4c27" strokeWidth={0.8} />
      <polygon points={`0,0 ${dx},${-dy} ${w + dx},${-dy} ${w},0`} fill="url(#spdi-top)" stroke="#8a6436" strokeWidth={0.8} />
      <line x1={dx / 2} y1={-dy / 2} x2={w + dx / 2} y2={-dy / 2} stroke="#b88a55" strokeWidth={0.8} />
      <polygon points={`${tx},0 ${tx + dx},${-dy} ${tx + tapeW + dx},${-dy} ${tx + tapeW},0`} fill="#ecd9b0" opacity={0.9} />
      <rect x={0} y={0} width={w} height={h} fill="url(#spdi-front)" stroke="#7a5630" strokeWidth={0.8} />
      <rect x={tx} y={0} width={tapeW} height={h * 0.32} fill="#ecd9b0" opacity={0.9} />
      <ShippingLabel w={w} h={h} />
      <path d={`M${w * 0.78} ${h * 0.84} v-${h * 0.16} m-3 4 l3 -4 l3 4`} stroke="#5a3d1c" strokeWidth={1.2} fill="none" opacity={0.7} />
      <path d={`M${w * 0.88} ${h * 0.84} v-${h * 0.16} m-3 4 l3 -4 l3 4`} stroke="#5a3d1c" strokeWidth={1.2} fill="none" opacity={0.7} />
    </g>
  );
}

/** Crushed box: the top caves in, the front buckles, the corner is squashed. */
function DentedBox({ w, h, dx, dy, seed }) {
  const mx = w * (0.45 + seed * 0.15); // where the top sinks most
  const sag = h * 0.34;
  const corner = h * 0.16; // squashed right corner
  const front = `M0,0 Q${mx * 0.55},${sag * 0.25} ${mx},${sag} Q${mx + (w - mx) * 0.45},${sag * 0.5} ${w},${corner} L${w},${h} L0,${h} Z`;
  return (
    <g>
      {/* side face, squashed at the top */}
      <polygon points={`${w},${corner} ${w + dx},${-dy + corner * 0.7} ${w + dx},${h - dy} ${w},${h}`} fill="url(#spdi-side)" stroke="#6e4c27" strokeWidth={0.8} />
      {/* caved top: two folded panels */}
      <polygon points={`0,0 ${dx},${-dy} ${mx + dx},${-dy + sag * 0.55} ${mx},${sag}`} fill="#d9ad74" stroke="#7a5630" strokeWidth={0.8} />
      <polygon points={`${mx},${sag} ${mx + dx},${-dy + sag * 0.55} ${w + dx},${-dy + corner * 0.7} ${w},${corner}`} fill="#c2935b" stroke="#7a5630" strokeWidth={0.8} />
      <line x1={mx} y1={sag} x2={mx + dx} y2={-dy + sag * 0.55} stroke="#4a3018" strokeWidth={1.6} />
      {/* buckled front */}
      <path d={front} fill="url(#spdi-front)" stroke="#6e4c27" strokeWidth={1} />
      <path d={front} fill="url(#spdi-sag)" opacity={0.75} />
      {/* deep creases radiating from the cave-in */}
      <path d={`M${mx} ${sag} L${mx - w * 0.2} ${h * 0.8}`} stroke="#3d2610" strokeWidth={2} />
      <path d={`M${mx} ${sag} L${mx + w * 0.18} ${h * 0.72}`} stroke="#3d2610" strokeWidth={2} />
      <path d={`M${mx} ${sag} L${mx + w * 0.02} ${h * 0.9}`} stroke="#4a3018" strokeWidth={1.2} opacity={0.8} />
      <path d={`M${mx - w * 0.2} ${h * 0.8} L${mx - w * 0.17} ${h * 0.81}`} stroke="#f0cf9e" strokeWidth={1} opacity={0.6} />
      {/* crumpled right corner */}
      <path d={`M${w} ${corner} l-${w * 0.08} ${h * 0.12} l${w * 0.05} ${h * 0.06} l-${w * 0.06} ${h * 0.1}`} stroke="#3d2610" strokeWidth={1.4} fill="none" />
      {/* bulge on the lower front */}
      <ellipse cx={w * 0.32} cy={h * 0.66} rx={w * 0.14} ry={h * 0.09} fill="#3d2610" opacity={0.28} />
      <ShippingLabel w={w} h={h} />
    </g>
  );
}

/** Torn box: a big ripped hole shows the dark inside, flaps hang off, tape is split. */
function TornBox({ w, h, dx, dy, tx, tapeW, seed }) {
  const cx = w * (0.52 + (seed - 0.5) * 0.12);
  const cy = h * 0.42;
  const rw = w * 0.3;
  const rh = h * 0.3;
  // jagged outline of the hole
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const k = i % 2 === 0 ? 1 : 0.72 + ((i * 37) % 10) / 40;
    pts.push(`${cx + Math.cos(a) * rw * k},${cy + Math.sin(a) * rh * k}`);
  }
  return (
    <g>
      <polygon points={`${w},0 ${w + dx},${-dy} ${w + dx},${h - dy} ${w},${h}`} fill="url(#spdi-side)" stroke="#6e4c27" strokeWidth={0.8} />
      <polygon points={`0,0 ${dx},${-dy} ${w + dx},${-dy} ${w},0`} fill="url(#spdi-top)" stroke="#8a6436" strokeWidth={0.8} />
      {/* split tape on top: two pieces with a gap */}
      <polygon points={`${tx},0 ${tx + dx * 0.35},${-dy * 0.35} ${tx + tapeW + dx * 0.35},${-dy * 0.35} ${tx + tapeW},0`} fill="#ecd9b0" />
      <polygon points={`${tx + dx * 0.65},${-dy * 0.65} ${tx + dx},${-dy} ${tx + tapeW + dx},${-dy} ${tx + tapeW + dx * 0.65},${-dy * 0.65}`} fill="#ecd9b0" />
      {/* lifted top flap */}
      <polygon points={`${w * 0.62},0 ${w * 0.62 + dx * 0.6},${-dy * 0.6} ${w * 0.95 + dx * 0.4},${-dy * 1.9} ${w * 0.92},${-dy * 0.9}`} fill="#e7c08c" stroke="#8a6436" strokeWidth={0.8} />
      <rect x={0} y={0} width={w} height={h} fill="url(#spdi-front)" stroke="#7a5630" strokeWidth={0.8} />
      <ShippingLabel w={w} h={h} />
      {/* corrugated edge (lighter rim) and the hole */}
      <polygon points={pts.join(' ')} fill="#efd3a6" transform={`translate(${cx} ${cy}) scale(1.12) translate(${-cx} ${-cy})`} />
      <polygon points={pts.join(' ')} fill="url(#spdi-hole)" stroke="#1a1006" strokeWidth={1.2} />
      {/* flap hanging down from the bottom of the hole */}
      <path
        d={`M${cx - rw * 0.55} ${cy + rh * 0.65} L${cx + rw * 0.45} ${cy + rh * 0.75} L${cx + rw * 0.2} ${cy + rh * 1.9} L${cx - rw * 0.35} ${cy + rh * 1.6} Z`}
        fill="#dcb07a"
        stroke="#7a5630"
        strokeWidth={1}
      />
      <path d={`M${cx - rw * 0.4} ${cy + rh * 1.0} l${rw * 0.6} ${rh * 0.1} M${cx - rw * 0.36} ${cy + rh * 1.25} l${rw * 0.5} ${rh * 0.1}`} stroke="#a77a46" strokeWidth={0.9} />
      {/* rip lines running away from the hole */}
      <path d={`M${cx - rw * 0.95} ${cy - rh * 0.2} l-${w * 0.1} -${h * 0.12} l-${w * 0.04} ${h * 0.05}`} stroke="#2a1b0c" strokeWidth={1.6} fill="none" />
      <path d={`M${cx + rw * 0.9} ${cy - rh * 0.5} l${w * 0.08} -${h * 0.14}`} stroke="#2a1b0c" strokeWidth={1.6} fill="none" />
    </g>
  );
}

export default function BoxGlyph({ w = 90, h = 70, truth = 'box_good', seed = 0.5, shadow = true, reworked = false }) {
  const d = Math.min(w, h) * 0.45;
  const dx = d * 0.55;
  const dy = d * 0.45;
  const tapeW = w * 0.14;
  const tx = w / 2 - tapeW / 2;
  return (
    <g>
      {shadow ? <ellipse cx={w / 2 + dx / 2} cy={h + 2} rx={w * 0.62} ry={h * 0.1} fill="url(#spdi-shadow)" /> : null}
      {truth === 'dent' ? <DentedBox w={w} h={h} dx={dx} dy={dy} seed={seed} /> : null}
      {truth === 'tear' ? <TornBox w={w} h={h} dx={dx} dy={dy} tx={tx} tapeW={tapeW} seed={seed} /> : null}
      {truth !== 'dent' && truth !== 'tear' ? <GoodBox w={w} h={h} dx={dx} dy={dy} tx={tx} tapeW={tapeW} /> : null}
      {reworked ? (
        // repaired / repacked: blue rework tape around the box
        <g>
          <rect x={0} y={h * 0.16} width={w} height={h * 0.1} fill="#2563eb" opacity={0.9} />
          <polygon points={`${w},${h * 0.16} ${w + dx},${h * 0.16 - dy} ${w + dx},${h * 0.26 - dy} ${w},${h * 0.26}`} fill="#1d4ed8" opacity={0.9} />
        </g>
      ) : null}
    </g>
  );
}

/** Small standalone thumbnail (used as "proof of condition" in the log). */
export function BoxThumb({ truth, seed, size = 44, reworked = false }) {
  return (
    <svg width={size} height={size * 0.85} viewBox="-4 -30 112 108" aria-hidden="true">
      <BoxDefs />
      <BoxGlyph truth={truth} seed={seed} shadow={false} reworked={reworked} />
    </svg>
  );
}
