# 0008. Colors and shared components come from @kyzarky/ui

**Status:** accepted, 2026-10-13 (Ky decided on 2026-10-07 to build the package and have
each of his apps depend on it). Amended the same day: upgraded to 0.3.0, taking its
components. Amended 2026-10-28: upgraded to 0.4.0 for `Modal` and `Link`. Amended 2026-10-29:
upgraded to 0.5.0 for `PageHeader`, then 0.5.1 for the iPhone scroll fix (the last
three sections).

## Context

Fluent Prior defined its own color tokens in `styles.css`. Ky now publishes a design
system, [`@kyzarky/ui`](https://www.npmjs.com/package/@kyzarky/ui), so his apps share one
visual language. Fluent Prior is its first consumer. The package's first version is the
tokens; its list, meter, and control components come in later versions.

CLAUDE.md's independence rule allows this: a published package at a pinned version can't
change under this project or hold it up.

## Decision

- **`@kyzarky/ui` is a dependency, pinned to an exact version** (0.5.1 today). An upgrade is
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

## Amendment, 2026-10-28: Modal and Link, at 0.4.0

`Modal` and `Link` started in this app for "How it works" and moved to the package
(its ADR 0004), along with two rules: links go somewhere and buttons do something, and a
modal has a title and a body. The app's own copies are gone. Nothing changes on screen:
the package's versions are the same code.

## Amendment, 2026-10-29: PageHeader, at 0.5.0

The header's new layout (the package's ADR 0005) was built in the package first and tried
here from an unpublished build before 0.5.0 was published, so the app never had its own
copy. What changed on screen:

- **"How it works" sits beside the title on a phone** and on a row of its own from 640px
  up, never at the end of the description's sentence. The header went from 118px tall
  (stacked, during review) to 86px at 375px wide, so more of the answer box shows on a
  small phone.
- **The description is at body size,** where it was `text-sm`.
- **The link is a 24px target.**
- **The page behind How it works no longer scrolls,** a fix in the package's `Modal` and
  `theme.css`.

0.5.1, the same day: that fix held in Chrome but not on an iPhone, where Safari still
scrolled the page. 0.5.1's `Modal` pins the page in place while it's open and puts it
back where it was on close. The scroll test now starts partway down the page and checks
the page comes back there.
