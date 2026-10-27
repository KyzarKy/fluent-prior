// Tabs that switch the page between views, following the WAI-ARIA tabs pattern: one tab
// stop for the whole row, arrow keys move between tabs, and each tab names its panel by id
// (`panel-<id>`). The panels themselves are the caller's.
//
// Not in @kyzarky/ui yet: one consumer isn't enough to design its API.

import { type KeyboardEvent, useRef } from "react";

interface Props<Id extends string> {
  /** What the tabs choose between, for screen readers. Not displayed. */
  label: string;
  tabs: readonly { id: Id; label: string }[];
  selected: Id;
  onSelect: (id: Id) => void;
}

export function Tabs<Id extends string>({ label, tabs, selected, onSelect }: Props<Id>) {
  const buttons = useRef(new Map<Id, HTMLButtonElement>());

  function onKeyDown(event: KeyboardEvent) {
    const index = tabs.findIndex((tab) => tab.id === selected);
    const last = tabs.length - 1;
    const target = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];
    const tab = target === undefined ? undefined : tabs[target];
    if (!tab) return;
    event.preventDefault();
    onSelect(tab.id);
    buttons.current.get(tab.id)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="flex border-border border-b"
    >
      {tabs.map((tab) => {
        const active = tab.id === selected;
        return (
          <button
            key={tab.id}
            ref={(button) => {
              if (button) buttons.current.set(tab.id, button);
            }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-controls={`panel-${tab.id}`}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(tab.id)}
            className={`-mb-px min-h-11 flex-1 border-b-2 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2 ${
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
