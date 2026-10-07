// The hospitality scenario pack. Each scenario is a real work moment and the skills it
// is most likely to exercise. The server looks scenarios up by id, so the grader only ever
// sees text from this file (CLAUDE.md rule 6).

import type { SkillId } from "./skills.js";
import type { Audience, TaskType } from "./tasks.js";

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
  taskType: TaskType;
  audience: Audience;
  /**
   * What a complete answer contains (ADR 0006). Shown to the grader, never to the learner
   * before answering: a list of what a good answer says would prime the answer.
   */
  taskParts: string[];
  targetSkills: SkillId[];
}

// Situations are written as work notes (logs, checklists, tickets) and tasks as goals, so
// the prompt doesn't hand the learner the words or grammar being graded. People reuse
// structures they just read, most strongly when the words overlap ("structural priming").
// Keep new scenarios in this style.
export const SCENARIOS: Scenario[] = [
  {
    id: "early-arrival",
    role: "front-desk",
    audience: "guest",
    situation:
      "Guest at the desk. Time now: 11:00 a.m. Check-in time: 3:00 p.m. Room status: not ready.",
    task: "Explain the situation to the guest and suggest a way for them to spend the wait.",
    taskType: "guest-problems",
    taskParts: [
      "Explains that the room isn't ready, or when it will be",
      "Suggests a specific activity or place to spend the wait",
    ],
    targetSkills: ["be-verbs", "time-prepositions"],
  },
  {
    id: "pharmacy-directions",
    role: "front-desk",
    audience: "guest",
    situation:
      "A guest needs a pharmacy. Nearest one: exit the hotel, turn left, Main Street, about five minutes on foot.",
    task: "Help the guest get there.",
    taskType: "guest-information",
    taskParts: ["Gives directions the guest could follow to the pharmacy"],
    targetSkills: ["place-prepositions", "articles"],
  },
  {
    id: "broken-lamp",
    role: "housekeeping",
    audience: "coworker",
    situation: "Your notes from this morning's rounds. 8:15 a.m., room 214: lamp, broken.",
    task: "Report it to your supervisor.",
    taskType: "reporting-up",
    taskParts: [
      "Says what is broken and where (the lamp in room 214)",
      "Says when it was noticed (this morning, around 8:15)",
    ],
    targetSkills: ["past-irregular", "articles", "time-prepositions"],
  },
  {
    id: "come-back-later",
    role: "housekeeping",
    audience: "guest",
    situation: 'Room 409, cleaning time. The guest opens the door: "Not now, please."',
    task: "Arrange a better time for cleaning with the guest.",
    taskType: "requests",
    taskParts: ["Arranges a time to clean: asks the guest for one, or proposes one"],
    targetSkills: ["question-forms", "time-prepositions"],
  },
  {
    id: "peanut-allergy",
    role: "front-of-house",
    audience: "guest",
    situation:
      "Table 6, ordering. Guest's note: peanut allergy. Kitchen procedure for allergies: separate cutting board, chef checks every plate.",
    task: "Reassure the guest by explaining your next step and the kitchen's procedure.",
    taskType: "guest-information",
    taskParts: [
      "Says what they will do next about the allergy",
      "Says the kitchen uses a separate cutting board",
      "Says the chef checks the plate",
    ],
    targetSkills: ["future-forms", "third-person-s", "modal-verbs"],
  },
  {
    id: "slow-food",
    role: "front-of-house",
    audience: "guest",
    situation:
      "Table 12. Order time: 7:05 p.m. Time now: 7:45 p.m. No food yet. The guests look unhappy. Kitchen status: very busy, food ready in about 5 minutes.",
    task: "Talk to the table: give them a time for their food, and offer something for their trouble.",
    taskType: "guest-problems",
    taskParts: [
      "Tells the guests when their food will arrive",
      "Offers something extra, beyond an apology, to make up for the wait",
    ],
    targetSkills: ["future-forms", "be-verbs"],
  },
  {
    id: "todays-special",
    role: "front-of-house",
    audience: "guest",
    situation:
      "Menu board, today's special: grilled salmon. Sides: rice, seasonal veg. A guest asks about the special.",
    task: "Describe the dish to the guest.",
    taskType: "guest-information",
    taskParts: ["Names the dish (grilled salmon)", "Mentions the sides (rice, vegetables)"],
    targetSkills: ["third-person-s", "plurals", "articles", "possessive-s"],
  },
  {
    id: "ran-out-of-salmon",
    role: "kitchen",
    audience: "coworker",
    situation:
      "Lunch service. Salmon count at 12:40: zero. Servers keep asking what to say to guests.",
    task: "Let the head chef know, and get instructions for the servers.",
    taskType: "reporting-up",
    taskParts: ["Tells the chef the salmon is gone", "Asks what the servers should tell guests"],
    targetSkills: ["past-irregular", "question-forms", "articles"],
  },
  {
    id: "end-of-shift",
    role: "kitchen",
    audience: "coworker",
    situation:
      "A new coworker, first day, asks about the end of the shift. Checklist: station clean-down, labels on all stored food, trash out.",
    task: "Explain the end-of-shift routine.",
    taskType: "briefing-coworkers",
    taskParts: ["Cleaning the station", "Labeling stored food", "Taking out the trash"],
    targetSkills: ["modal-verbs", "plurals"],
  },
  {
    id: "delivery-question",
    role: "food-prep",
    audience: "coworker",
    situation: "Delivery at the back door: fresh produce, six cartons. Storage location: unknown.",
    task: "Get the information you need from a coworker.",
    taskType: "requests",
    taskParts: ["Asks where the delivery should go"],
    targetSkills: ["question-forms", "place-prepositions", "plurals"],
  },
  {
    id: "shift-handoff",
    role: "front-desk",
    audience: "coworker",
    situation:
      "Log for room 118. 10:15 a.m.: guest phone call, air conditioning too warm. 1:30 p.m.: guest phone call, same problem. 4:00 p.m.: maintenance visit, problem fixed.",
    task: "Brief the next shift on room 118.",
    taskType: "briefing-coworkers",
    taskParts: ["The guest's calls about the air conditioning", "That the problem is fixed now"],
    targetSkills: ["past-regular", "be-verbs", "time-prepositions", "third-person-s"],
  },
  {
    id: "noisy-room",
    role: "front-desk",
    audience: "guest",
    situation:
      "Phone call from room 402. Complaint: loud music next door. Available: a quiet room on the 6th floor.",
    task: "Solve the guest's problem.",
    taskType: "guest-problems",
    taskParts: ["Offers a fix: stopping the noise, or moving the guest away from it"],
    targetSkills: ["future-forms", "place-prepositions"],
  },
  {
    id: "room-report",
    role: "housekeeping",
    audience: "coworker",
    situation: "Room 305, status: complete. ✓ bathroom ✓ bed linen ✓ towel change.",
    task: "Tell your supervisor about the work in room 305.",
    taskType: "reporting-up",
    taskParts: ["Reports what was done in room 305"],
    targetSkills: ["past-regular", "plurals", "articles"],
  },
  {
    id: "check-in-id",
    role: "front-desk",
    audience: "guest",
    situation: "Guest checking in. Requirements: photo ID, credit card.",
    task: "Get what you need from the guest.",
    taskType: "requests",
    taskParts: ["Asks for a photo ID", "Asks for a credit card"],
    targetSkills: ["question-forms", "articles"],
  },
];

export function findScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((scenario) => scenario.id === id);
}
