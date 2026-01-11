'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { cn } from '@/lib/utils';

interface RangeSelectorProps {
  options: number[];
  selected: number;
  defaultValue?: number;
  paramName?: string;
}

export const RangeSelector = ({
  options,
  selected,
  defaultValue,
  paramName = 'rangeDays',
}: RangeSelectorProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fallback = defaultValue ?? (options.length > 0 ? options[0] : selected);

  const handleChange = (value: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');

    if (value === fallback) {
      params.delete(paramName);
    } else {
      params.set(paramName, String(value));
    }

    const query = params.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    router.push(href);
  };

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Analytics range selector">
      {options.map((option) => {
        const isActive = option === selected;
        return (
          <button
            key={option}
            type="button"
            onClick={() => handleChange(option)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm transition',
              isActive
                ? 'border-sky-500 bg-sky-500/10 text-sky-700 dark:border-sky-400/80 dark:text-sky-200'
                : 'border-light-200/70 text-black/70 hover:border-light-200 hover:bg-light-100/60 dark:border-dark-200/70 dark:text-white/70 dark:hover:border-dark-200 dark:hover:bg-dark-200/40',
            )}
          >
            Last {option} days
          </button>
        );
      })}
    </div>
  );
};

export default RangeSelector;
