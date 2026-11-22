import type { CSSProperties } from "react";

const TONES = 6;

/**
 * Colour of a service category, picked by the category's sort position.
 * Returns a style that sets `--tone`; use it with the `tone-dot` / `tone-block` classes.
 */
export function categoryTone(sort: number): CSSProperties {
  const index = (((Math.max(sort, 1) - 1) % TONES) + TONES) % TONES;
  return { "--tone": `var(--cat-${index + 1})` } as CSSProperties;
}
