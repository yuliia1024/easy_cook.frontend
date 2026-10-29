import { z } from 'zod';
import { MENU_TITLE_MAX_LENGTH } from '../../lib/limits';

export const menuTitleSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Enter a title')
    .max(MENU_TITLE_MAX_LENGTH, `At most ${MENU_TITLE_MAX_LENGTH} characters`),
});

export type MenuTitleValues = z.input<typeof menuTitleSchema>;
export type MenuTitleOutput = z.output<typeof menuTitleSchema>;
