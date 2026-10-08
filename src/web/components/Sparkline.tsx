// A small step chart of one row's P(known), from its first day with practice (left edge) to
// today (right edge). The y-axis is always 0 to 100%, so rows can be compared at a glance.
// Decorative: the text beside it says the same thing for screen readers.

import type { TrendPoint } from "../../core/progress";

/**
 * Steps, not slopes: P(known) only changes on a day with practice, so the line stays flat
 * between them and runs flat from the last one to today.
 */
export function Sparkline({ points }: { points: readonly TrendPoint[] }) {
  const [first, ...rest] = points;
  if (!first) return null;
  const y = (p: number) => (1 - p) * 100;
  const path = [
    `M ${first.x * 100} ${y(first.p)}`,
    ...rest.map((point) => `H ${point.x * 100} V ${y(point.p)}`),
    "H 100",
  ].join(" ");
  // Padding in CSS pixels, so it's the same on every side however wide the row is.
  return (
    <div className="mt-1 rounded-md bg-surface-muted p-2">
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="block h-6 w-full overflow-visible"
      >
        <path
          d={path}
          fill="none"
          stroke="var(--meter)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
