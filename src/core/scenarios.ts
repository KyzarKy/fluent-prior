// The hospitality scenario pack. Each scenario is a real work moment and the skills it
// is most likely to exercise. The server looks scenarios up by id, so the grader only ever
// sees text from this file (CLAUDE.md rule 6).

import type { SkillId } from "./skills";

export type Role = "front-desk" | "housekeeping" | "kitchen" | "food-prep" | "front-of-house";

export const ROLE_NAMES: Record<Role, string> = {
  "front-desk": "Front desk",
  housekeeping: "Housekeeping",
  kitchen: "Kitchen",
  "food-prep": "Food prep",
  "front-of-house": "Front of house",
};

export interface Scenario {
  id: string;
  role: Role;
  /** What's happening, from the learner's point of view. */
  situation: string;
  /** What the learner should say or do. */
  task: string;
  targetSkills: SkillId[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: "early-arrival",
    role: "front-desk",
    situation: "A guest arrives at 11 a.m. Check-in is at 3 p.m., and their room isn't ready.",
    task: "Tell the guest politely, and offer them something they can do while they wait.",
    targetSkills: ["polite-requests", "time-prepositions", "register"],
  },
  {
    id: "pharmacy-directions",
    role: "front-desk",
    situation:
      "A guest asks where the nearest pharmacy is. It's two blocks away, left on Main Street.",
    task: "Give the guest directions.",
    targetSkills: ["articles", "register", "workplace-vocabulary"],
  },
  {
    id: "broken-lamp",
    role: "housekeeping",
    situation: "This morning you found a broken lamp in room 214.",
    task: "Tell your supervisor what you found and when.",
    targetSkills: ["past-irregular", "articles", "time-prepositions"],
  },
  {
    id: "come-back-later",
    role: "housekeeping",
    situation: 'You knock on a door to clean the room. The guest says, "Not now, please."',
    task: "Ask the guest what time would be better for you to come back.",
    targetSkills: ["question-forms", "polite-requests", "time-prepositions"],
  },
  {
    id: "peanut-allergy",
    role: "front-of-house",
    situation: "A guest at your table tells you they have a peanut allergy.",
    task: "Tell them what you will do, and what the kitchen does to keep their food safe.",
    targetSkills: ["third-person-s", "workplace-vocabulary", "obligation"],
  },
  {
    id: "slow-food",
    role: "front-of-house",
    situation: "A table has waited 40 minutes for their food, and they're unhappy.",
    task: "Apologize, explain what's happening, and offer something to make it better.",
    targetSkills: ["apologizing", "register", "third-person-s"],
  },
  {
    id: "todays-special",
    role: "front-of-house",
    situation:
      "A guest asks what today's special is. It's grilled salmon with rice and vegetables.",
    task: "Describe the special to the guest.",
    targetSkills: ["third-person-s", "plurals", "articles"],
  },
  {
    id: "ran-out-of-salmon",
    role: "kitchen",
    situation: "During lunch, the kitchen ran out of salmon.",
    task: "Tell the head chef what happened and ask what the servers should tell guests.",
    targetSkills: ["past-irregular", "question-forms", "articles"],
  },
  {
    id: "end-of-shift",
    role: "kitchen",
    situation: "A new coworker asks what they need to do before they go home.",
    task: "Explain the end-of-shift tasks: cleaning stations, labeling food, taking out trash.",
    targetSkills: ["obligation", "plurals", "workplace-vocabulary"],
  },
  {
    id: "delivery-question",
    role: "food-prep",
    situation: "A delivery of vegetables just arrived, and you don't know where it goes.",
    task: "Ask a coworker where to put the boxes.",
    targetSkills: ["question-forms", "plurals", "articles"],
  },
  {
    id: "shift-handoff",
    role: "front-desk",
    situation:
      "The guest in room 118 called twice today about the air conditioning. Maintenance visited at 4 p.m.",
    task: "Tell the next shift what happened with room 118.",
    targetSkills: ["past-regular", "time-prepositions", "third-person-s"],
  },
  {
    id: "noisy-room",
    role: "front-desk",
    situation: "A guest calls the front desk to complain that the room next door is very noisy.",
    task: "Apologize and offer a solution.",
    targetSkills: ["apologizing", "polite-requests", "obligation"],
  },
  {
    id: "room-report",
    role: "housekeeping",
    situation:
      "You finished room 305: you cleaned the bathroom, changed the sheets, and replaced the towels.",
    task: "Tell your supervisor what you did in room 305.",
    targetSkills: ["past-regular", "plurals", "articles"],
  },
  {
    id: "check-in-id",
    role: "front-desk",
    situation: "A guest is checking in. You need to see their ID and a credit card.",
    task: "Ask the guest for what you need.",
    targetSkills: ["polite-requests", "register", "articles"],
  },
];

export function findScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((scenario) => scenario.id === id);
}
