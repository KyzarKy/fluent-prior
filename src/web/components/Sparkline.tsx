// A small line chart of P(known) over the days the learner practiced. The y-axis is always
// 0 to 100%, so rows can be compared at a glance, and every row shares the same days on
// the x-axis. Decorative: the text beside it says the same thing for screen readers.

/** Keeps points off the edges, where half the stroke would be clipped. */
const INSET = 4;
const scale = (fraction: number) => INSET + fraction * (100 - 2 * INSET);

/** A null is a day before this skill was practiced: no point, so no invented progress. */
export function Sparkline({ values }: { values: readonly (number | null)[] }) {
  const last = Math.max(values.length - 1, 1);
  const points = values.flatMap((p, i) =>
    p === null ? [] : [`${scale(i / last)},${scale(1 - p)}`],
  );
  // One point draws as a dot: a zero-length line with round caps.
  if (points.length === 1) points.push(...points);
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="mt-1 h-8 w-full rounded-md bg-surface-muted"
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="var(--meter)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
