export const parseEnvBoolean = (
  value: string | undefined,
  defaultValue: boolean = false,
) => {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on', 'enabled'].includes(normalized);
};
