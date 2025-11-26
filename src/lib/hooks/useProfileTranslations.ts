import { useTranslations } from 'next-intl';

export function useProfileTranslations(view: 'admin' | 'user' = 'user') {
  const t = useTranslations(`User.Profile.${view}`);
  const tCommon = useTranslations('User.Profile.common');

  return {
    t,
    tCommon,
  };
}
