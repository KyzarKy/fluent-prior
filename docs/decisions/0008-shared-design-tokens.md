# 0008. Colors and shared components come from @kyzarky/ui

**Status:** accepted, 2026-10-13 (Ky decided on 2026-10-07 to build the package and have
each of his apps depend on it). Amended the same day: upgraded to 0.3.0, taking its
components (the last section).

## Context

Fluent Prior defined its own color tokens in `styles.css`. Ky now publishes a design
system, [`@kyzarky/ui`](https://www.npmjs.com/package/@kyzarky/ui), so his apps share one
visual language. Fluent Prior is its first consumer. The package's first version is the
tokens; its list, meter, and control components come in later versions.

CLAUDE.md's independence rule allows this: a published package at a pinned version can't
change under this project or hold it up.

## Decision

- **`@kyzarky/ui` is a dependency, pinned to an exact version** (0.3.0 today). An upgrade is
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
- **The row readability problem in "What you know" wasn't fixed by the tokens.** The
  amendment below fixes it.

## Amendment, 2026-10-13: the components, at 0.3.0

Ky chose to skip 0.2.0 and upgrade once. The app now takes from the package:

- **`List`, `ListRow`, and `Meter`** in "What you know". Each row has a divider and 24px
  between it and the next row's content, against 8px between a label and its own graphic,
  and each group sits 32px below the one before. This is the fix for rows that ran
  together. The panel is 375px taller at phone width. The app's own `Meter` is gone; its
  `Sparkline` stays, since it's specific to the learner model, and sits in a `ListRow`.
- **`Card`** for the three cards, **`Button`** for the two in the answer form, and
  **`SegmentedControl`** for Now / Over time.

What changed on screen and in behavior, beyond the list's spacing:

- **"Next situation" has the darker `input` edge,** like the answer box.
- **Now / Over time is a group of radio buttons,** where it was two toggle buttons. Arrow
  keys move between the options, and a screen reader announces a radio group.
- **Buttons show focus as an outline in the brand color,** where the browser's default
  showed before.
