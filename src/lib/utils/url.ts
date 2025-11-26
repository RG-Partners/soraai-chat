export const normalizeThumbnailUrl = (thumbnail: string) => {
  try {
    const parsed = new URL(thumbnail);
    const id = parsed.searchParams.get('id');

    if (id) {
      return `${parsed.origin}${parsed.pathname}?id=${id}`;
    }

    return parsed.toString();
  } catch {
    return thumbnail;
  }
};
