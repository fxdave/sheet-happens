"use client";

import { AlertTriangle, ChevronDown, Loader2, Play } from "lucide-react";
import { useState } from "react";

import { useMediaQuery } from "@/src/lib/use-media-query";
import { cn } from "@/src/lib/utils";
import {
  Dropdown,
  DropdownContent,
  DropdownLabel,
  DropdownRadioGroup,
  DropdownRadioItem,
  DropdownSeparator,
  DropdownTrigger,
} from "../../ui/Dropdown";
import { SuggestInput } from "../../ui/SuggestInput";
import type { TimerComposerProps } from "./TimerComposer.types";

/**
 * The day log's quick start: what you are working on, which project, ▷. Enter in the field starts
 * too. Starting while a timer runs switches to the new one — the screen decides that, not this.
 */
export function TimerComposer({
  projects,
  value,
  suggestions = [],
  labels,
  pending = false,
  disabled = false,
  error = null,
  className,
  onValueChange,
  onStart,
}: TimerComposerProps) {
  const [missingDescription, setMissingDescription] = useState(false);
  // Resolved before a phone's first paint (see `useMediaQuery`), so the placeholder never flips.
  const compact = useMediaQuery("(max-width: 39.999rem)");
  const selected = projects.find((project) => project.projectId === value.projectId) ?? projects[0];
  const recent = projects.filter((project) => project.recent);
  const others = projects.filter((project) => !project.recent);
  const blocked = disabled || pending || !selected;

  function start() {
    if (blocked || !selected) return;
    if (!value.description.trim()) {
      setMissingDescription(true);
      return;
    }
    onStart({ projectId: selected.projectId, description: value.description.trim() });
  }

  const message = error ?? (missingDescription ? labels.descriptionRequired : null);

  return (
    <div className={cn("grid min-w-0 gap-1.5", className)}>
      <form
        className="flex min-w-0 items-center gap-2 rounded-[var(--radius-md)] border border-accent-line bg-accent-soft/40 py-1.5 pr-1.5 pl-1 sm:gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          start();
        }}
      >
        <SuggestInput
          value={value.description}
          options={suggestions}
          labels={labels.suggestions}
          emptyStateLimit={4}
          placeholder={
            compact && labels.descriptionCompact ? labels.descriptionCompact : labels.description
          }
          aria-label={labels.description}
          invalid={Boolean(message)}
          disabled={disabled}
          className="min-w-0 flex-1"
          fieldClassName="h-9 border-0 bg-transparent text-ellipsis shadow-none focus-visible:ring-0"
          onValueChange={(description) => {
            setMissingDescription(false);
            onValueChange({ projectId: selected?.projectId ?? "", description });
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              start();
            }
          }}
        />

        {selected ? (
          <Dropdown>
            <DropdownTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                aria-label={labels.project(selected.name)}
                className="inline-flex max-w-[min(38%,7.5rem)] min-w-0 shrink items-center gap-1.5 rounded-[var(--radius-pill)] px-2 py-1 text-xs font-medium text-muted-foreground transition-colors duration-[var(--duration-micro)] hover:bg-secondary hover:text-foreground disabled:opacity-50 sm:max-w-[14rem] sm:text-[13px]"
              >
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: selected.color }}
                />
                <span className="truncate">{selected.name}</span>
                <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
              </button>
            </DropdownTrigger>
            <DropdownContent
              align="end"
              className="max-h-[22rem] max-w-[min(20rem,90vw)] overflow-y-auto"
            >
              <DropdownRadioGroup
                value={selected.projectId}
                onValueChange={(projectId) =>
                  onValueChange({ projectId, description: value.description })
                }
              >
                {recent.length ? <DropdownLabel>{labels.recent}</DropdownLabel> : null}
                {recent.map((project) => (
                  <ProjectItem key={project.projectId} {...project} />
                ))}
                {recent.length && others.length ? <DropdownSeparator /> : null}
                {recent.length && others.length ? (
                  <DropdownLabel>{labels.allProjects}</DropdownLabel>
                ) : null}
                {others.map((project) => (
                  <ProjectItem key={project.projectId} {...project} />
                ))}
              </DropdownRadioGroup>
            </DropdownContent>
          </Dropdown>
        ) : null}

        <button
          type="submit"
          disabled={blocked}
          aria-label={labels.start}
          title={labels.start}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground transition-transform duration-[var(--duration-micro)] hover:bg-[color-mix(in_srgb,var(--accent)_88%,black)] active:scale-95 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Play className="size-4 fill-current" aria-hidden="true" />
          )}
        </button>
      </form>

      {message ? (
        <p
          role="alert"
          className="flex items-start gap-1.5 px-1 text-xs font-medium text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 [overflow-wrap:anywhere]">{message}</span>
        </p>
      ) : null}
    </div>
  );
}

function ProjectItem({
  projectId,
  name,
  color,
}: {
  projectId: string;
  name: string;
  color: string;
}) {
  return (
    <DropdownRadioItem value={projectId} className="min-w-0">
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="min-w-0 truncate">{name}</span>
    </DropdownRadioItem>
  );
}
