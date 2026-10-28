// The top of a page: its title, a one-sentence description, and the page's own links or
// actions on a row of their own. The parts sit close together; the page leaves at least
// twice that space between the header and what follows (the 1:2 rule).
//
// Here until @kyzarky/ui 0.5.0 ships it; the design system's copy is the same code.

import type { ReactNode } from "react";

interface PageHeaderProps {
  /** The page's name. Rendered as its only h1. */
  title: ReactNode;
  /** What the page is for, in one sentence. Body size, so it reads before anything else. */
  description?: ReactNode;
  /** Links or buttons about the whole page, such as a `Link` to how it works. */
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-1.5">
      <h1 className="font-semibold text-2xl leading-tight tracking-tight">{title}</h1>
      {description && <p className="max-w-prose text-muted-foreground">{description}</p>}
      {/* At least 24px tall: the target size for a link on its own line (WCAG 2.5.8). */}
      {actions && (
        <div className="mt-1 flex min-h-6 flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {actions}
        </div>
      )}
    </header>
  );
}
