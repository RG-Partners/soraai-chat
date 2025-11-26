import { z } from 'zod';

export const passwordRegexPattern =
  process.env.NEXT_PUBLIC_PASSWORD_REGEX_PATTERN ||
  '^(?=.*[a-zA-Z])(?=.*\\d)[a-zA-Z\\d!@#$%^&*()_+\\-=\\[\\]{};\':"\\\\|,.<>\\/?]{8,128}$';

export const passwordRequirementsText =
  process.env.NEXT_PUBLIC_PASSWORD_REQUIREMENTS_TEXT ||
  'Password must be 8-128 characters long and contain at least one letter and one number.';

export const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be at most 128 characters long')
  .regex(new RegExp(passwordRegexPattern), passwordRequirementsText);
