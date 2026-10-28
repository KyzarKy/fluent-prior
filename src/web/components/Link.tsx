// A link: an <a> that goes somewhere, and looks it in every state. Anything that does
// something instead (fills a box, switches a view, erases data) is a Button.
//
// Here until @kyzarky/ui ships one; the design system's copy follows the same rules.

import type { ComponentProps } from "react";

export function Link({ className = "", ...props }: ComponentProps<"a">) {
  return (
    <a
      className={`cursor-pointer rounded-sm text-primary underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 ${className}`}
      {...props}
    />
  );
}
