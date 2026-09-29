// The skills the learner model tracks, and how well dictation preserves a mistake in each
// (ADR 0002). "clear": a wrong form sounds clearly different from the right one. "faint":
// the difference is a small sound that a recognizer trained on fluent speech tends to
// smooth over, so a correct form in the transcript is weak evidence.

export const SKILL_IDS = [
  "question-forms",
  "past-irregular",
  "past-regular",
  "third-person-s",
  "be-verbs",
  "future-forms",
  "articles",
  "plurals",
  "possessive-s",
  "modal-verbs",
  "time-prepositions",
  "place-prepositions",
] as const;

export type SkillId = (typeof SKILL_IDS)[number];

export type Audibility = "clear" | "faint";

export interface Skill {
  id: SkillId;
  /** Shown to learners. */
  name: string;
  /** Tells the grader what counts as using this skill. */
  description: string;
  audibility: Audibility;
}

export const SKILLS: Record<SkillId, Skill> = {
  "question-forms": {
    id: "question-forms",
    name: "Question word order",
    description: "Word order in questions: 'Where does this go?', not 'Where this goes?'",
    audibility: "clear",
  },
  "past-irregular": {
    id: "past-irregular",
    name: "Irregular past tense",
    description: "Irregular past forms: went, found, broke, ran out, told.",
    audibility: "clear",
  },
  "past-regular": {
    id: "past-regular",
    name: "Regular past tense (-ed)",
    description: "Regular past forms ending in -ed: cleaned, called, changed.",
    audibility: "faint",
  },
  "third-person-s": {
    id: "third-person-s",
    name: "He/she/it verbs (-s)",
    description: "The -s on present-tense verbs after he, she, it: 'the chef checks'.",
    audibility: "faint",
  },
  "be-verbs": {
    id: "be-verbs",
    name: "Is, are, was",
    description:
      "Forms of be, as a main verb or a helper: the room is ready, we are checking, it was broken.",
    audibility: "faint",
  },
  "future-forms": {
    id: "future-forms",
    name: "Talking about the future",
    description: "Plans and promises: I'll call, I'm going to check, we're sending someone.",
    audibility: "faint",
  },
  "possessive-s": {
    id: "possessive-s",
    name: "Possessive 's",
    description: "Belonging, said with 's: today's special, the guest's bag.",
    audibility: "faint",
  },
  "place-prepositions": {
    id: "place-prepositions",
    name: "At, on, in for places",
    description: "Prepositions of place and direction: on Main Street, at the desk, in room 214.",
    audibility: "faint",
  },
  articles: {
    id: "articles",
    name: "A, an, the",
    description: "Articles before nouns: a room, an hour, the manager.",
    audibility: "faint",
  },
  plurals: {
    id: "plurals",
    name: "Plural -s",
    description: "Plural nouns: two towels, the sheets, some guests.",
    audibility: "faint",
  },
  "modal-verbs": {
    id: "modal-verbs",
    name: "Can, could, must, should",
    description:
      "Modal verbs and have to, followed by a plain verb: could you help, you must tell, you have to clean. Not 'must to tell' or 'can you helping'.",
    audibility: "clear",
  },
  "time-prepositions": {
    id: "time-prepositions",
    name: "At, on, in for time",
    description: "Prepositions of time: at 3 p.m., on Monday, in the morning.",
    audibility: "faint",
  },
};
