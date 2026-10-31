import type { Macro } from '../api/types';

/** Tile colors: calories dark, each macro in the tone of its chip. */
export const MACRO_TILE_TONES: Record<Macro, string> = {
  kcal: 'bg-sage-900 text-white',
  proteinG: 'bg-protein-bg text-protein-fg',
  fatG: 'bg-fat-bg text-fat-fg',
  carbsG: 'bg-carbs-bg text-carbs-fg',
};

/** Table cells and headers in the colors of the tiles. */
export const MACRO_TEXT_TONES: Record<Macro, string> = {
  kcal: 'font-semibold',
  proteinG: 'text-protein-fg',
  fatG: 'text-fat-fg',
  carbsG: 'text-carbs-fg',
};
