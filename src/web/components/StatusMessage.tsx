// Tells the learner why an answer wasn't graded: which spend cap was hit and when it
// resets (ADR 0003), or that grading failed. Never a generic error for a cap.

import type { CapLayer } from "../../core/contract";
import type { Status } from "../App";

function waitTime(seconds: number): string {
  if (seconds < 90) return "a minute";
  if (seconds < 90 * 60) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 36 * 3600) return `${Math.round(seconds / 3600)} hours`;
  return `${Math.round(seconds / 86400)} days`;
}

function capMessage(layer: CapLayer, wait: string): string {
  switch (layer) {
    case "session":
      return "That's a lot of practice for one session. Take a break, then reload the page to start a new one.";
    case "learner":
      return `You're practicing fast. Try again in ${wait}.`;
    case "network":
      return `Lots of people on your network are practicing right now. Try again in ${wait}.`;
    case "app":
      return `Fluent Prior has used its practice budget for now. Try again in ${wait}.`;
  }
}

export function StatusMessage({ status }: { status: Status }) {
  let message: string | undefined;
  if (status.kind === "capped") {
    message = capMessage(status.capped.layer, waitTime(status.capped.resetsInSeconds));
  } else if (status.kind === "failed") {
    message = "Checking didn't work this time. Your answer is still here; try again.";
  }
  if (!message) return null;
  return (
    <p role="status" className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
      {message}
    </p>
  );
}
