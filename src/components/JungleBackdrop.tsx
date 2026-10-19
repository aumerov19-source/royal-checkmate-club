/**
 * Decorative jungle scenery (leaves, palm fronds, vines) rendered behind the app.
 * Purely visual: fixed, non-interactive and hidden from assistive tech.
 */

const LEAF = "M0 0 C -24 -22 -28 -68 0 -100 C 28 -68 24 -22 0 0 Z";

type Tone = { fill: string; vein: string };
const TONES: Tone[] = [
  { fill: "oklch(0.3 0.075 152)", vein: "oklch(0.42 0.09 140)" },
  { fill: "oklch(0.36 0.09 145)", vein: "oklch(0.5 0.1 135)" },
  { fill: "oklch(0.25 0.06 158)", vein: "oklch(0.36 0.08 150)" },
  { fill: "oklch(0.42 0.1 138)", vein: "oklch(0.56 0.11 128)" },
];

export function Leaf({ x, y, rot = 0, s = 1, tone = 0 }: { x: number; y: number; rot?: number; s?: number; tone?: number }) {
  const t = TONES[tone % TONES.length]!;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d={LEAF} fill={t.fill} />
      <path d="M0 -2 L0 -96" stroke={t.vein} strokeWidth={2} fill="none" strokeLinecap="round" />
      {[20, 38, 56, 72].map((v) => (
        <g key={v} stroke={t.vein} strokeWidth={1.2} fill="none" opacity={0.8}>
          <path d={`M0 ${-v} Q -10 ${-v - 8} -17 ${-v - 18}`} />
          <path d={`M0 ${-v} Q 10 ${-v - 8} 17 ${-v - 18}`} />
        </g>
      ))}
    </g>
  );
}

/** Palm frond: a straight rachis with tapering leaflets on both sides. */
function Frond({ x, y, rot = 0, len = 260, tone = 0, sway }: { x: number; y: number; rot?: number; len?: number; tone?: number; sway?: string }) {
  const t = TONES[tone % TONES.length]!;
  const n = 14;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <g className={sway}>
        <path d={`M0 0 Q ${len * 0.08} ${-len * 0.5} 0 ${-len}`} stroke={t.vein} strokeWidth={3} fill="none" strokeLinecap="round" />
        {Array.from({ length: n }).map((_, i) => {
          const p = (i + 1) / (n + 1);
          const ly = -len * p;
          const lx = len * 0.08 * 4 * p * (1 - p) * 0.5;
          const sc = 0.95 - p * 0.6;
          return (
            <g key={i} transform={`translate(${lx} ${ly})`}>
              <path d={LEAF} fill={t.fill} transform={`rotate(-62) scale(${sc * 0.32} ${sc * 0.95})`} />
              <path d={LEAF} fill={t.fill} transform={`rotate(62) scale(${sc * 0.32} ${sc * 0.95})`} />
            </g>
          );
        })}
      </g>
    </g>
  );
}

/** Hanging vine with alternating small leaves. */
function Vine({ x, len, delay = 0 }: { x: number; len: number; delay?: number }) {
  const segs = Math.floor(len / 40);
  let d = `M${x} -4`;
  for (let i = 1; i <= segs; i++) d += ` Q ${x + (i % 2 ? 9 : -9)} ${i * 40 - 20} ${x} ${i * 40}`;
  return (
    <g className="jungle-sway-slow" style={{ transformOrigin: `${x}px 0px`, animationDelay: `${delay}s` }}>
      <path d={d} stroke="oklch(0.36 0.07 140)" strokeWidth={2.2} fill="none" strokeLinecap="round" />
      {Array.from({ length: segs }).map((_, i) => (
        <Leaf key={i} x={x} y={i * 40 + 28} rot={i % 2 ? 125 : -125} s={0.17 + (i % 3) * 0.03} tone={i % 2 ? 1 : 3} />
      ))}
    </g>
  );
}

function Corner({ className, flip }: { className: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 420 420" className={className} style={flip ? { transform: "scaleX(-1)" } : undefined} aria-hidden>
      <g className="jungle-sway" style={{ transformOrigin: "0px 0px" }}>
        <Frond x={-10} y={-10} rot={150} len={360} tone={2} />
        <Frond x={-20} y={30} rot={118} len={300} tone={0} />
        <Leaf x={0} y={0} rot={130} s={1.9} tone={2} />
        <Leaf x={10} y={-10} rot={160} s={1.6} tone={1} />
        <Leaf x={-6} y={20} rot={100} s={1.4} tone={0} />
        <Leaf x={30} y={-6} rot={185} s={1.1} tone={3} />
      </g>
    </svg>
  );
}

function BottomCorner({ className, flip }: { className: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 420 420" className={className} style={flip ? { transform: "scaleX(-1)" } : undefined} aria-hidden>
      <g className="jungle-sway-rev" style={{ transformOrigin: "0px 420px" }}>
        <Frond x={-10} y={430} rot={42} len={340} tone={2} />
        <Frond x={20} y={430} rot={18} len={260} tone={0} />
        <Leaf x={0} y={420} rot={55} s={1.7} tone={1} />
        <Leaf x={40} y={430} rot={20} s={1.3} tone={2} />
        <Leaf x={-10} y={400} rot={80} s={1.2} tone={3} />
      </g>
    </svg>
  );
}

export function JungleBackdrop() {
  return (
    <div className="jungle-backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="jungle-light absolute inset-0" />
      <Corner className="absolute -left-6 -top-6 w-[58vw] max-w-[440px] opacity-80 sm:w-[38vw]" />
      <Corner flip className="absolute -right-6 -top-6 w-[52vw] max-w-[400px] opacity-70 sm:w-[34vw]" />
      <BottomCorner className="absolute -bottom-8 -left-8 w-[50vw] max-w-[380px] opacity-60 sm:w-[30vw]" />
      <BottomCorner flip className="absolute -bottom-8 -right-8 w-[46vw] max-w-[360px] opacity-55 sm:w-[28vw]" />
      <svg viewBox="0 0 1200 320" preserveAspectRatio="xMidYMin slice" className="absolute inset-x-0 top-0 h-[34vh] w-full opacity-50" aria-hidden>
        <Vine x={180} len={200} />
        <Vine x={420} len={130} delay={-3} />
        <Vine x={760} len={170} delay={-6} />
        <Vine x={1010} len={240} delay={-2} />
      </svg>
      <div className="jungle-grain absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,oklch(0.1_0.03_165/0.55))]" />
    </div>
  );
}
