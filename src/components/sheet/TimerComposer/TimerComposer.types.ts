import type { SuggestInputLabels, SuggestOption } from "../../ui/SuggestInput";

export type TimerComposerProject = {
  projectId: string;
  name: string;
  color: string;
  /** Recent projects are listed first, under their own heading. */
  recent?: boolean;
};

export type TimerComposerValue = {
  projectId: string;
  description: string;
};

export type TimerComposerLabels = {
  /** Placeholder and accessible name of the description field — `What are you working on?` */
  description: string;
  /** A shorter placeholder below `sm`, where the full one would be cut — `Working on…`. */
  descriptionCompact?: string;
  /** Accessible name of the project menu trigger, given the selected project. */
  project: (projectName: string) => string;
  recent: string;
  allProjects: string;
  start: string;
  /** Shown when Start is pressed with an empty description. */
  descriptionRequired: string;
  suggestions: SuggestInputLabels;
};

export type TimerComposerProps = {
  /** Recent first, then the rest, in the order to list them. */
  projects: readonly TimerComposerProject[];
  value: TimerComposerValue;
  suggestions?: readonly SuggestOption[];
  labels: TimerComposerLabels;
  pending?: boolean;
  disabled?: boolean;
  error?: string | null;
  className?: string;
  onValueChange: (value: TimerComposerValue) => void;
  /** Start (or switch to) a timer; Enter in the field does the same. */
  onStart: (value: TimerComposerValue) => void;
};
