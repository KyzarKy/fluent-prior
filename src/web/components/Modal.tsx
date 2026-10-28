// A modal with a title and a body. The header, with the title and the close button, stays
// put; only the body scrolls. A native <dialog> opened with showModal(): the browser keeps
// focus inside it, closes it on Escape, returns focus to whatever opened it, and makes the
// page behind it inert.
//
// Here until @kyzarky/ui ships one; the design system's copy follows the same rules.

import { Button } from "@kyzarky/ui";
import { type ReactNode, useEffect, useId, useRef } from "react";

interface Props {
  open: boolean;
  /** Called however it closes: Escape, the close button, or a click outside. */
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (open && !element?.open) element?.showModal();
    if (!open && element?.open) element.close();
  }, [open]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape is the keyboard way out, built into <dialog>.
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      // A click outside the box lands on the dialog's backdrop, which belongs to the dialog.
      onClick={(event) => {
        if (event.target === event.currentTarget) dialog.current?.close();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-xl bg-transparent p-0 backdrop:bg-black/50"
    >
      <div className="flex max-h-[85dvh] flex-col rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
        <header className="flex shrink-0 items-center justify-between gap-2 border-border border-b py-2 pr-2 pl-5">
          <h2 id={titleId} className="font-semibold text-lg">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={() => dialog.current?.close()}
            className="text-xl"
          >
            ×
          </Button>
        </header>
        {/* Focusable, so the body can be scrolled from the keyboard when it holds no controls. */}
        <section
          aria-labelledby={titleId}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable by keyboard (WCAG 2.1.1).
          tabIndex={0}
          className="overflow-y-auto rounded-b-2xl p-5 focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2"
        >
          {children}
        </section>
      </div>
    </dialog>
  );
}
