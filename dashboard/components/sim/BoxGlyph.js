'use client';

/**
 * 3D cardboard box (SVG <g>). Origin = top-left corner of the FRONT face.
 * The top face goes up-right by `depth`, the side face is on the right.
 * Overall extent: x 0..w+depth*0.55, y -depth*0.45..h
 * truth: 'box_good' | 'dent' | 'tear'. seed (0-1) moves the damage around.
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
      <radialGradient id="spdi-dent">
        <stop offset="0" stopColor="#4a3018" stopOpacity="0.75" />
        <stop offset="0.6" stopColor="#6b4824" stopOpacity="0.45" />
        <stop offset="1" stopColor="#6b4824" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="spdi-shadow">
        <stop offset="0" stopColor="#000" stopOpacity="0.55" />
        <stop offset="1" stopColor="#000" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

export default function BoxGlyph({ w = 90, h = 70, truth = 'box_good', seed = 0.5, shadow = true }) {
  const d = Math.min(w, h) * 0.45; // depth
  const dx = d * 0.55;
  const dy = d * 0.45;
  const tapeW = w * 0.14;
  const tx = w / 2 - tapeW / 2;
  // damage position on the front face
  const fx = w * (0.3 + seed * 0.4);
  const fy = h * (0.35 + (1 - seed) * 0.3);

  return (
    <g>
      {shadow ? <ellipse cx={w / 2 + dx / 2} cy={h + 2} rx={w * 0.62} ry={h * 0.1} fill="url(#spdi-shadow)" /> : null}

      {/* side */}
      <polygon points={`${w},0 ${w + dx},${-dy} ${w + dx},${h - dy} ${w},${h}`} fill="url(#spdi-side)" stroke="#6e4c27" strokeWidth={0.8} />
      {/* top */}
      <polygon points={`0,0 ${dx},${-dy} ${w + dx},${-dy} ${w},0`} fill="url(#spdi-top)" stroke="#8a6436" strokeWidth={0.8} />
      {/* top flap seam + tape */}
      <line x1={dx / 2} y1={-dy / 2} x2={w + dx / 2} y2={-dy / 2} stroke="#b88a55" strokeWidth={0.8} />
      <polygon points={`${tx},0 ${tx + dx},${-dy} ${tx + tapeW + dx},${-dy} ${tx + tapeW},0`} fill="#ecd9b0" opacity={0.9} />
      {/* front */}
      <rect x={0} y={0} width={w} height={h} fill="url(#spdi-front)" stroke="#7a5630" strokeWidth={0.8} />
      <rect x={tx} y={0} width={tapeW} height={h * 0.32} fill="#ecd9b0" opacity={0.9} />
      <line x1={0} y1={h * 0.04} x2={w} y2={h * 0.04} stroke="#a77a46" strokeWidth={0.8} />
      {/* shipping label */}
      <rect x={w * 0.08} y={h * 0.5} width={w * 0.3} height={h * 0.32} fill="#f6f3ec" rx={1.5} />
      <rect x={w * 0.1} y={h * 0.54} width={w * 0.14} height={h * 0.08} fill="#222" />
      <line x1={w * 0.1} y1={h * 0.68} x2={w * 0.34} y2={h * 0.68} stroke="#666" strokeWidth={1} />
      <line x1={w * 0.1} y1={h * 0.75} x2={w * 0.3} y2={h * 0.75} stroke="#666" strokeWidth={1} />
      {/* "this side up" arrows */}
      <path d={`M${w * 0.78} ${h * 0.82} v-${h * 0.16} m-3 4 l3 -4 l3 4`} stroke="#5a3d1c" strokeWidth={1.2} fill="none" opacity={0.7} />
      <path d={`M${w * 0.88} ${h * 0.82} v-${h * 0.16} m-3 4 l3 -4 l3 4`} stroke="#5a3d1c" strokeWidth={1.2} fill="none" opacity={0.7} />

      {truth === 'dent' ? (
        <g>
          <ellipse cx={fx} cy={fy} rx={w * 0.2} ry={h * 0.2} fill="url(#spdi-dent)" />
          <path d={`M${fx - w * 0.17} ${fy - h * 0.06} q ${w * 0.17} ${h * 0.12} ${w * 0.34} 0`} stroke="#4a3018" strokeWidth={1.3} fill="none" opacity={0.8} />
          <path d={`M${fx - w * 0.1} ${fy + h * 0.08} q ${w * 0.1} -${h * 0.06} ${w * 0.2} 0`} stroke="#f0cf9e" strokeWidth={1} fill="none" opacity={0.6} />
          {/* crushed corner on the top edge */}
          <polygon points={`${w * 0.62},0 ${w * 0.78},0 ${w * 0.72},${h * 0.1}`} fill="#7a5630" opacity={0.8} />
        </g>
      ) : null}

      {truth === 'tear' ? (
        <g>
          <path
            d={`M${fx - w * 0.22} ${fy} l${w * 0.08} -${h * 0.1} l${w * 0.07} ${h * 0.12} l${w * 0.08} -${h * 0.11} l${w * 0.07} ${h * 0.13} l${w * 0.08} -${h * 0.07} l-${w * 0.04} ${h * 0.2} l-${w * 0.3} ${h * 0.02} z`}
            fill="#2a1b0c"
            stroke="#1a1006"
            strokeWidth={1}
          />
          {/* torn flap peeling down */}
          <path
            d={`M${fx - w * 0.06} ${fy + h * 0.02} l${w * 0.16} 0 l-${w * 0.03} ${h * 0.24} l-${w * 0.15} -${h * 0.06} z`}
            fill="#e0b47d"
            stroke="#8a6436"
            strokeWidth={0.8}
          />
          <line x1={fx - w * 0.04} y1={fy + h * 0.08} x2={fx + w * 0.07} y2={fy + h * 0.1} stroke="#b88a55" strokeWidth={0.8} />
        </g>
      ) : null}
    </g>
  );
}

/** Small standalone thumbnail (used as "proof of condition" in the log). */
export function BoxThumb({ truth, seed, size = 44 }) {
  return (
    <svg width={size} height={size * 0.85} viewBox="-4 -24 112 102" aria-hidden="true">
      <BoxDefs />
      <BoxGlyph truth={truth} seed={seed} shadow={false} />
    </svg>
  );
}
