# 0008. Colors come from @kyzarky/ui

**Status:** accepted, 2026-10-13 (Ky decided on 2026-10-07 to build the package and have
each of his apps depend on it).

## Context

Fluent Prior defined its own color tokens in `styles.css`. Ky now publishes a design
system, [`@kyzarky/ui`](https://www.npmjs.com/package/@kyzarky/ui), so his apps share one
visual language. Fluent Prior is its first consumer. The package's first version is the
tokens; its list, meter, and control components come in later versions.

CLAUDE.md's independence rule allows this: a published package at a pinned version can't
change under this project or hold it up.

## Decision

- **`@kyzarky/ui` is a dependency, pinned to an exact version** (0.1.0 today). An upgrade is
  its own commit, made on purpose, after reading the package's changelog.
- **`styles.css` imports the package's `theme.css`** in place of its own token block. The
  app keeps only what's its own: the font stack.
- **Components use the package's token names,** which are shadcn/ui's: `bg-card`,
  `text-muted-foreground`, `bg-primary`, `text-success`, and so on. The package's README
  lists them.
- **Never Tailwind's `dark:` variant.** Each token carries its light and dark value.
- **The app follows the package's written rules** (spacing between rows and groups, type
  roles, 44px controls) as its components arrive, not by hand-building them first.

## What changed on screen

Checked by recording the computed color of 21 roles in the browser before and after, in
light and dark. Three intended changes, all for contrast, and nothing else:

- **Green and amber are slightly darker in light mode,** so the "Did every part" and
  "Did part of it" badges reach 4.5:1.
- **The answer box's edge is darker** in both modes (`border-input`), so the box can be
  seen as a control (3:1).

## Consequences

- **Dark mode needs a newer browser:** Safari 17.5, Chrome 123, or Firefox 120. Older ones
  get the light theme (the package's ADR 0003). Before, any browser Tailwind 4 supports got
  both.
- **A package release can't break this app,** because the version is pinned. The cost is
  that fixes don't arrive on their own.
- **The row readability problem in "What you know" isn't fixed yet.** That's the package's
  0.2.0 (`List`, `ListRow`, `Meter`), adopted here when it ships. The cards, buttons, and
  the Now / Over time control follow in 0.3.0.
- **The second button ("Next") keeps the faint `border` edge** until the package's `Button`
  arrives, though by the package's rule a control's edge should be `input`.
