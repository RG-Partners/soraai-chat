export function buildUserDetailUrl(
  userId: string,
  currentSearchParams = '',
): string {
  if (!currentSearchParams) {
    return `/admin/users/${userId}`;
  }

  const encoded = encodeURIComponent(currentSearchParams);
  return `/admin/users/${userId}?searchPageParams=${encoded}`;
}

export function buildReturnUrl(
  baseUrl: string,
  encodedSearchParams = '',
): string {
  if (!encodedSearchParams) {
    return baseUrl;
  }

  try {
    const decoded = decodeURIComponent(encodedSearchParams);
    return decoded ? `${baseUrl}?${decoded}` : baseUrl;
  } catch (error) {
    console.error('Failed to decode search params', error);
    return baseUrl;
  }
}
