'use client';

import BoxGlyph, { BoxDefs } from './BoxGlyph';
import { CLASSES, ZONE, lightOf } from '@/lib/sim/engine';

// Scene geometry (SVG user units). 3/4 view: belt top surface + front frame face.
const W = 1200;
const H = 440;
const X0 = 70;
const X1 = 1040;
const BW = X1 - X0;
const SURF_BACK = 214; // back edge of the belt surface
const SURF_FRONT = 262; // front edge of the belt surface
const FRAME_BOT = 292; // bottom of the front frame
const FLOOR = 352; // floor line (legs end here)
const BOX_BASE = 252; // bottom of a box front face (sits on the belt)
const px = (x) => X0 + x * BW;

function Defs() {
  return (
    <defs>
      <linearGradient id="sc-wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1a212b" />
        <stop offset="1" stopColor="#141a22" />
      </linearGradient>
      <linearGradient id="sc-floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#262d36" />
        <stop offset="1" stopColor="#11161c" />
      </linearGradient>
      <linearGradient id="sc-belt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#15191f" />
        <stop offset="1" stopColor="#262c35" />
      </linearGradient>
      <linearGradient id="sc-frame" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8a96a5" />
        <stop offset="0.25" stopColor="#5d6876" />
        <stop offset="1" stopColor="#3a434f" />
      </linearGradient>
      <linearGradient id="sc-steel" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#4b5563" />
        <stop offset="0.5" stopColor="#9ca3af" />
        <stop offset="1" stopColor="#4b5563" />
      </linearGradient>
      <linearGradient id="sc-cone" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#60a5fa" stopOpacity="0.32" />
        <stop offset="1" stopColor="#60a5fa" stopOpacity="0.04" />
      </linearGradient>
      <linearGradient id="sc-chute" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#6b7280" />
        <stop offset="1" stopColor="#374151" />
      </linearGradient>
      <radialGradient id="sc-lamp" cx="0.5" cy="0" r="0.9">
        <stop offset="0" stopColor="#fff7d6" stopOpacity="0.16" />
        <stop offset="1" stopColor="#fff7d6" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="sc-vignette" cx="0.5" cy="0.45" r="0.75">
        <stop offset="0.6" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.45" />
      </radialGradient>
      <filter id="sc-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" />
      </filter>
    </defs>
  );
}

function Roller({ cx, cy, r, angle }) {
  const a = (angle * Math.PI) / 180;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#2b323c" stroke="#a3acb8" strokeWidth={1.5} />
      <line x1={cx - Math.cos(a) * r * 0.75} y1={cy - Math.sin(a) * r * 0.75} x2={cx + Math.cos(a) * r * 0.75} y2={cy + Math.sin(a) * r * 0.75} stroke="#c3cad3" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={r * 0.28} fill="#9aa4b1" />
    </g>
  );
}

function TowerLight({ light }) {
  const lamps = [
    { key: 'red', color: '#ef4444', y: 0 },
    { key: 'yellow', color: '#f59e0b', y: 24 },
    { key: 'green', color: '#22c55e', y: 48 },
  ];
  return (
    <g transform="translate(1120 70)">
      <rect x={-4} y={66} width={8} height={FLOOR - 136} fill="url(#sc-steel)" />
      <rect x={-18} y={FLOOR - 76} width={36} height={8} rx={2} fill="#3a434f" />
      <rect x={-13} y={-14} width={26} height={82} rx={5} fill="#1f2630" stroke="#4b5563" />
      {lamps.map((l) => {
        const on = light === l.key;
        return (
          <g key={l.key}>
            {on ? <circle cx={0} cy={l.y} r={18} fill={l.color} opacity={0.55} filter="url(#sc-glow)" /> : null}
            <rect x={-10} y={l.y - 10} width={20} height={20} rx={4} fill={on ? l.color : '#2b333d'} opacity={on ? 1 : 0.9} />
            <rect x={-10} y={l.y - 10} width={20} height={6} rx={3} fill="#fff" opacity={on ? 0.35 : 0.06} />
          </g>
        );
      })}
      <text x={0} y={-24} textAnchor="middle" fontSize={11} fill="#8b949e">
        Tower light
      </text>
    </g>
  );
}

export default function ConveyorScene({ sim }) {
  const travel = sim.beltOffset * BW; // px the belt has moved (mod BW)
  const slatGap = 26;
  const slatShift = travel % slatGap;
  const rollerAngle = (travel / (2 * Math.PI * 9)) * 360;
  const camL = px(ZONE.camStart);
  const camR = px(ZONE.camEnd);
  const camC = (camL + camR) / 2;
  const decX = px(ZONE.camEnd);
  const irX = px(ZONE.ir);
  const armX = px(ZONE.arm);
  const ext = sim.arm.active ? Math.sin(Math.PI * Math.min(sim.arm.t * 1.6, 1)) : 0;
  const light = lightOf(sim);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Conveyor simulation">
      <Defs />
      <BoxDefs />

      {/* ---------- room ---------- */}
      <rect x={0} y={0} width={W} height={FLOOR} fill="url(#sc-wall)" />
      {Array.from({ length: 13 }, (_, i) => (
        <line key={`wp${i}`} x1={i * 100} y1={0} x2={i * 100} y2={FLOOR} stroke="#1f2733" strokeWidth={2} />
      ))}
      <rect x={0} y={150} width={W} height={4} fill="#202835" />
      <ellipse cx={camC} cy={0} rx={260} ry={190} fill="url(#sc-lamp)" />
      <ellipse cx={armX} cy={0} rx={240} ry={170} fill="url(#sc-lamp)" />
      <rect x={0} y={FLOOR} width={W} height={H - FLOOR} fill="url(#sc-floor)" />
      {Array.from({ length: 16 }, (_, i) => (
        <line key={`fl${i}`} x1={i * 80 - 40} y1={FLOOR} x2={i * 80 - 140} y2={H} stroke="#1c232c" strokeWidth={1.5} />
      ))}
      <line x1={0} y1={FLOOR + 30} x2={W} y2={FLOOR + 30} stroke="#d4a017" strokeWidth={3} opacity={0.35} strokeDasharray="22 14" />

      {/* ---------- camera gantry (behind the belt) ---------- */}
      <rect x={camL - 30} y={34} width={8} height={FLOOR - 34} fill="url(#sc-steel)" />
      <rect x={camR + 22} y={34} width={8} height={FLOOR - 34} fill="url(#sc-steel)" />
      <rect x={camL - 34} y={28} width={camR - camL + 68} height={10} rx={2} fill="#6b7280" />
      <polygon points={`${camC - 14},70 ${camC + 14},70 ${camR},${SURF_FRONT} ${camL},${SURF_FRONT}`} fill="url(#sc-cone)" />

      {/* ---------- reject chute + bin (below the front of the belt) ---------- */}
      <polygon points={`${armX - 62},${SURF_FRONT} ${armX + 62},${SURF_FRONT} ${armX + 74},${FLOOR - 4} ${armX - 74},${FLOOR - 4}`} fill="url(#sc-chute)" opacity={0.9} />
      <g>
        <polygon points={`${armX - 86},${FLOOR - 10} ${armX + 86},${FLOOR - 10} ${armX + 96},${FLOOR + 2} ${armX - 76},${FLOOR + 2}`} fill="#5b1d20" />
        <rect x={armX - 86} y={FLOOR - 10 + 12} width={172} height={74} rx={4} fill="#3b1416" stroke="#ef4444" strokeWidth={2} />
        <text x={armX} y={FLOOR + 26} textAnchor="middle" fontSize={13} fill="#fca5a5" fontWeight={700}>
          REJECT · ถังคัดออก
        </text>
        <text x={armX} y={FLOOR + 56} textAnchor="middle" fontSize={26} fill="#fecaca" fontWeight={800} fontFamily="Consolas, monospace">
          {sim.stats.rejectedBin}
        </text>
      </g>

      {/* ---------- belt ---------- */}
      {/* legs */}
      {Array.from({ length: 6 }, (_, i) => {
        const x = X0 + 30 + (i * (BW - 60)) / 5;
        return <rect key={`leg${i}`} x={x - 5} y={FRAME_BOT} width={10} height={FLOOR - FRAME_BOT} fill="url(#sc-steel)" />;
      })}
      <rect x={X0 + 20} y={FLOOR - 26} width={BW - 40} height={6} fill="#3a434f" />
      {/* back rail */}
      <rect x={X0 - 10} y={SURF_BACK - 8} width={BW + 20} height={8} rx={2} fill="#6b7280" />
      {/* belt surface + moving slats */}
      <polygon points={`${X0},${SURF_BACK} ${X1},${SURF_BACK} ${X1},${SURF_FRONT} ${X0},${SURF_FRONT}`} fill="url(#sc-belt)" />
      {Array.from({ length: Math.ceil(BW / slatGap) + 2 }, (_, i) => {
        const x = X0 + i * slatGap + slatShift - slatGap;
        if (x < X0 - 6 || x > X1 + 4) return null;
        return <line key={`sl${i}`} x1={x + 6} y1={SURF_BACK + 1} x2={x} y2={SURF_FRONT - 1} stroke="#323a45" strokeWidth={3} />;
      })}
      {/* front frame with rollers */}
      <rect x={X0 - 14} y={SURF_FRONT} width={BW + 28} height={FRAME_BOT - SURF_FRONT} rx={3} fill="url(#sc-frame)" />
      {Array.from({ length: Math.floor(BW / 48) + 1 }, (_, i) => (
        <Roller key={`r${i}`} cx={X0 + 8 + i * 48} cy={(SURF_FRONT + FRAME_BOT) / 2} r={9} angle={rollerAngle + i * 17} />
      ))}
      <circle cx={X0 - 10} cy={(SURF_BACK + FRAME_BOT) / 2} r={38} fill="#2a313b" stroke="#6b7280" strokeWidth={3} />
      <circle cx={X0 - 10} cy={(SURF_BACK + FRAME_BOT) / 2} r={10} fill="#9aa4b1" />
      <circle cx={X1 + 10} cy={(SURF_BACK + FRAME_BOT) / 2} r={38} fill="#2a313b" stroke="#6b7280" strokeWidth={3} />
      <circle cx={X1 + 10} cy={(SURF_BACK + FRAME_BOT) / 2} r={10} fill="#9aa4b1" />
      {/* motor */}
      <rect x={X0 - 48} y={FRAME_BOT + 6} width={58} height={34} rx={4} fill="#1e3a5f" stroke="#3b82f6" />
      <text x={X0 - 19} y={FRAME_BOT + 27} textAnchor="middle" fontSize={10} fill="#bfdbfe">
        MOTOR
      </text>

      {/* decision line on the belt */}
      <line x1={decX + 4} y1={SURF_BACK} x2={decX} y2={SURF_FRONT} stroke="#e6edf3" strokeDasharray="5 5" strokeWidth={2} opacity={0.75} />
      <text x={decX} y={FRAME_BOT + 18} textAnchor="middle" fontSize={11} fill="#c9d1d9">
        เส้นตัดสิน · count once
      </text>

      {/* PASS exit */}
      <g>
        <text x={X1 + 54} y={SURF_BACK - 120} textAnchor="end" fontSize={13} fill="#86efac" fontWeight={700}>
          PASS → คลังสินค้า
        </text>
        <text x={X1 + 54} y={SURF_BACK - 94} textAnchor="end" fontSize={24} fill="#bbf7d0" fontWeight={800} fontFamily="Consolas, monospace">
          {sim.stats.accepted}
        </text>
      </g>

      {/* ---------- boxes ---------- */}
      {sim.boxes.map((b) => {
        const w = 84 * b.size;
        const h = 62 * b.size;
        const d = Math.min(w, h) * 0.45;
        let x = px(b.x) - w / 2;
        let y = BOX_BASE - h + b.lane * 0.6;
        let rot = 0;
        let opacity = 1;
        if (b.state === 'rejecting') {
          const t = Math.min(b.rejectT, 1);
          y += t * 105;
          x += t * 8;
          rot = t * 22;
        }
        if (b.x > ZONE.end - 0.04) opacity = Math.max(0, (ZONE.end - b.x) / 0.04);
        const inCam = b.seen && b.state === 'belt' && b.x >= ZONE.camStart && b.x <= ZONE.camEnd;
        const decided = b.decision && b.state === 'belt' && b.x > ZONE.camEnd;
        const cls = inCam ? CLASSES[b.seen.cls] : null;
        const top = y - d * 0.45;
        return (
          <g key={b.id} opacity={opacity}>
            <g transform={`translate(${x} ${y}) rotate(${rot} ${w / 2} ${h})`}>
              <BoxGlyph w={w} h={h} truth={b.truth} seed={b.seed} />
            </g>
            {inCam ? (
              <g>
                <rect x={x - 5} y={top - 5} width={w + d * 0.55 + 10} height={h + d * 0.45 + 10} fill="none" stroke={cls.color} strokeWidth={2.5} />
                <rect x={x - 5} y={top - 25} width={Math.max(92, w + 12)} height={20} fill={cls.color} />
                <text x={x} y={top - 10} fontSize={13} fill="#0b0f14" fontWeight={700} fontFamily="Consolas, monospace">
                  {b.seen.cls} {b.seen.conf.toFixed(2)}
                </text>
              </g>
            ) : null}
            {decided ? (
              <g>
                <rect x={x + w / 2 - 44} y={top - 30} width={88} height={22} rx={11} fill={b.decision === 'REJECT' ? '#7f1d1d' : '#14532d'} opacity={0.92} />
                <text x={x + w / 2} y={top - 14} textAnchor="middle" fontSize={13} fontWeight={800} fill={b.decision === 'REJECT' ? '#fecaca' : '#bbf7d0'}>
                  {b.decision === 'REJECT' ? '✖ REJECT' : '✔ PASS'}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}

      {/* ---------- camera (in front of boxes) ---------- */}
      <g transform={`translate(${camC} 52)`}>
        <rect x={-3} y={-16} width={6} height={12} fill="#6b7280" />
        <rect x={-36} y={-6} width={72} height={30} rx={6} fill="#263040" stroke="#4b5867" />
        <rect x={-36} y={-6} width={72} height={8} rx={4} fill="#334155" />
        <circle cx={0} cy={9} r={11} fill="#05070a" stroke="#60a5fa" strokeWidth={2} />
        <circle cx={0} cy={9} r={5} fill="#3b82f6" />
        <circle cx={-3} cy={6} r={2} fill="#dbeafe" />
        <circle cx={28} cy={2} r={2.5} fill={sim.running ? '#ef4444' : '#374151'} />
        <text x={50} y={6} fontSize={14} fill="#e6edf3" fontWeight={700}>
          CiRA CORE
        </text>
        <text x={50} y={22} fontSize={11} fill="#8b949e">
          camera · DeepDetect · 15 fps
        </text>
      </g>

      {/* ---------- IR breakbeam ---------- */}
      <g>
        <rect x={irX - 5} y={SURF_BACK - 30} width={10} height={24} rx={2} fill="#374151" stroke="#6b7280" />
        <rect x={irX - 7} y={SURF_FRONT - 2} width={14} height={20} rx={2} fill="#374151" stroke="#6b7280" />
        <line x1={irX} y1={SURF_BACK - 8} x2={irX} y2={SURF_FRONT} stroke="#ef4444" strokeWidth={sim.irBlocked ? 3 : 1.5} strokeDasharray={sim.irBlocked ? '0' : '3 5'} opacity={sim.irBlocked ? 1 : 0.7} />
        {sim.irBlocked ? <circle cx={irX} cy={SURF_BACK - 18} r={6} fill="#ef4444" filter="url(#sc-glow)" /> : null}
        <text x={irX} y={SURF_BACK - 36} textAnchor="middle" fontSize={11} fill="#c9d1d9">
          IR sensor
        </text>
      </g>

      {/* ---------- pneumatic pusher ---------- */}
      <g>
        <rect x={armX - 70} y={90} width={8} height={SURF_BACK - 90} fill="url(#sc-steel)" />
        <rect x={armX + 62} y={90} width={8} height={SURF_BACK - 90} fill="url(#sc-steel)" />
        <rect x={armX - 72} y={84} width={144} height={10} rx={2} fill="#6b7280" />
        <rect x={armX - 15} y={94} width={30} height={56} rx={5} fill="url(#sc-steel)" stroke="#4b5563" />
        <rect x={armX - 17} y={100} width={34} height={6} fill="#374151" />
        <rect x={armX - 17} y={136} width={34} height={6} fill="#374151" />
        <rect x={armX - 4} y={150} width={8} height={18 + ext * 62} fill="#d1d5db" />
        <rect x={armX - 50} y={166 + ext * 62} width={100} height={14} rx={3} fill={ext > 0.05 ? '#ef4444' : '#9ca3af'} stroke="#374151" />
        <text x={armX} y={78} textAnchor="middle" fontSize={11} fill="#c9d1d9">
          แขนปัด (pneumatic)
        </text>
      </g>

      {/* ---------- ESP32 control box ---------- */}
      <g transform={`translate(${armX + 84} 100)`}>
        <rect x={0} y={0} width={96} height={54} rx={5} fill="#0f3d2e" stroke="#1f8a5c" strokeWidth={1.5} />
        <rect x={8} y={8} width={30} height={20} rx={2} fill="#111827" stroke="#374151" />
        <text x={66} y={20} textAnchor="middle" fontSize={13} fill="#d1fae5" fontWeight={700}>
          ESP32
        </text>
        <circle cx={14} cy={40} r={4} fill={ext > 0.05 ? '#ef4444' : '#14532d'} />
        <circle cx={28} cy={40} r={4} fill={sim.irBlocked ? '#f59e0b' : '#3b2f0f'} />
        <text x={40} y={44} fontSize={10} fill="#a7f3d0">
          cmd {sim.esp32Cmds}
        </text>
        <path d={`M48 54 C 48 80, ${-84 + 40} 70, ${-84 + 30} 96`} stroke="#1f8a5c" strokeWidth={2} fill="none" opacity={0.7} />
      </g>

      <TowerLight light={light} />

      <rect x={0} y={0} width={W} height={H} fill="url(#sc-vignette)" pointerEvents="none" />

      {!sim.running ? (
        <g>
          <rect x={0} y={0} width={W} height={H} fill="#000" opacity={0.35} />
          <text x={W / 2} y={H / 2 - 40} textAnchor="middle" fontSize={34} fill="#fff" fontWeight={800}>
            ⏸ หยุดสายพาน
          </text>
        </g>
      ) : null}
    </svg>
  );
}
