import { AccentName } from "../../theme/tokens";

export const jogoTileTones: AccentName[] = ["teal", "lime", "lilac", "yellow", "orange", "pink"];

export function categoriesText(category: string | string[] | null | undefined): string {
  if (!category) return "";
  return Array.isArray(category) ? category.filter(Boolean).join(", ") : category;
}

export function categoriesOf(category: string | string[] | null | undefined): string[] {
  if (!category) return [];
  return (Array.isArray(category) ? category : [category]).filter(Boolean);
}

export function playersRange(min: number | null | undefined, max: number | null | undefined): string {
  if (min && max) return min === max ? String(min) : `${min}–${max}`;
  if (max) return `até ${max}`;
  if (min) return `${min}+`;
  return "";
}

export function playersText(min: number | null | undefined, max: number | null | undefined): string {
  const range = playersRange(min, max);
  if (!range) return "";
  const single = (min === 1 && max === 1) || (!min && max === 1);
  return `${range} ${single ? "jogador" : "jogadores"}`;
}
