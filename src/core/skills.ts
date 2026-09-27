// The skills the learner model tracks, and how well dictation preserves a mistake in each
// (ADR 0002). "clear": a wrong form sounds clearly different from the right one. "faint":
// the difference is a small sound that a recognizer trained on fluent speech tends to
// smooth over, so a correct form in the transcript is weak evidence.

export const SKILL_IDS = [
  "polite-requests",
  "apologizing",
  "question-forms",
  "past-irregular",
  "past-regular",
  "third-person-s",
  "articles",
  "plurals",
  "obligation",
  "time-prepositions",
  "workplace-vocabulary",
  "register",
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
  "polite-requests": {
    id: "polite-requests",
    name: "Polite requests",
    description: "Asking politely: could you, would you mind, may I, please.",
    audibility: "clear",
  },
  apologizing: {
    id: "apologizing",
    name: "Apologizing and offering a fix",
    description: "Saying sorry and offering a solution: I'm sorry about, let me, I can.",
    audibility: "clear",
  },
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
  obligation: {
    id: "obligation",
    name: "Must, have to, should",
    description: "Rules and advice: you have to, you must, you should.",
    audibility: "clear",
  },
  "time-prepositions": {
    id: "time-prepositions",
    name: "At, on, in for time",
    description: "Prepositions of time: at 3 p.m., on Monday, in the morning.",
    audibility: "faint",
  },
  "workplace-vocabulary": {
    id: "workplace-vocabulary",
    name: "Hospitality words",
    description: "Job words used correctly: check-in, reservation, allergy, amenities, shift.",
    audibility: "clear",
  },
  register: {
    id: "register",
    name: "Right tone",
    description: "Formal with guests, direct but respectful with coworkers and supervisors.",
    audibility: "clear",
  },
};
