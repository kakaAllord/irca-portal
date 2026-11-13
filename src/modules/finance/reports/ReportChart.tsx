export type ReportChartData = {
  type: 'bars' | 'line';
  categories: string[];
  series: { name: string; color: string; values: number[] }[];
};

const W = 900;
const H = 220;
const LEFT = 60;
const RIGHT = 10;
const TOP = 16;
const BOTTOM = 26;

/**
 * A report's chart on screen: the same bars or line the PDF draws, from the
 * same figures, scaled to the page's width.
 */
export function ReportChart({ chart }: { chart: ReportChartData }) {
  const values = chart.series.flatMap((s) => s.values);
  const { min, max, step } = scale(Math.min(0, ...values), Math.max(0, ...values));
  const plotW = W - LEFT - RIGHT;
  const plotH = H - TOP - BOTTOM;
  const y = (v: number) => TOP + plotH - ((v - min) / (max - min || 1)) * plotH;
  const group = plotW / Math.max(1, chart.categories.length);
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(v);

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex flex-wrap gap-4 text-[11.5px] text-fg3">
        {chart.series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-sm"
              style={{ background: s.color }}
            />
            {s.name}
          </span>
        ))}
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${chart.series.map((s) => s.name).join(' and ')} for ${chart.categories.join(', ')}`}
        className="h-auto w-full text-fg3"
      >
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={LEFT}
              x2={W - RIGHT}
              y1={y(v)}
              y2={y(v)}
              stroke="currentColor"
              strokeOpacity={v === 0 ? 0.5 : 0.18}
            />
            <text x={LEFT - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="currentColor">
              {short(v)}
            </text>
          </g>
        ))}
        {chart.categories.map((c, i) => (
          <text
            key={c}
            x={LEFT + group * (i + 0.5)}
            y={H - 8}
            textAnchor="middle"
            fontSize="11"
            fill="currentColor"
          >
            {c}
          </text>
        ))}
        {chart.type === 'bars'
          ? chart.series.map((s, k) => {
              const inner = group * 0.7;
              const bar = inner / chart.series.length;
              return s.values.map((v, i) => (
                <rect
                  key={`${s.name}-${i}`}
                  x={LEFT + group * i + (group - inner) / 2 + bar * k}
                  y={y(Math.max(0, v))}
                  width={Math.max(1, bar - 2)}
                  height={Math.max(0.5, Math.abs(y(v) - y(0)))}
                  rx={2}
                  fill={v < 0 ? '#c33c3c' : s.color}
                >
                  <title>{`${s.name}, ${chart.categories[i]}: ${v.toLocaleString('en-GB')}`}</title>
                </rect>
              ));
            })
          : chart.series.map((s) => {
              const points = s.values.map((v, i) => [LEFT + group * (i + 0.5), y(v)] as const);
              return (
                <g key={s.name}>
                  <polyline
                    points={points.map(([px, py]) => `${px},${py}`).join(' ')}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2.5}
                  />
                  {points.map(([px, py], i) => (
                    <circle
                      key={i}
                      cx={px}
                      cy={py}
                      r={4}
                      className="fill-surface"
                      stroke={s.color}
                      strokeWidth={2}
                    >
                      <title>{`${chart.categories[i]}: ${s.values[i]!.toLocaleString('en-GB')}`}</title>
                    </circle>
                  ))}
                </g>
              );
            })}
      </svg>
    </figure>
  );
}

/** Round figures for the axis, as the PDF's chart has them. */
function scale(lo: number, hi: number) {
  if (lo === hi) return { min: 0, max: hi > 0 ? hi : 1, step: hi > 0 ? hi : 1 };
  const raw = (hi - lo) / 4;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw)!;
  return { min: Math.floor(lo / step) * step, max: Math.ceil(hi / step) * step, step };
}

function short(v: number) {
  const a = Math.abs(v);
  const trim = (x: number) => String(Number(x.toFixed(2)));
  if (a >= 1e9) return `${trim(v / 1e9)}B`;
  if (a >= 1e6) return `${trim(v / 1e6)}M`;
  if (a >= 1e3) return `${trim(v / 1e3)}K`;
  return trim(v);
}
