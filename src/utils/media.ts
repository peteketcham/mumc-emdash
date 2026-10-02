/** Image field value: either a media object (from the admin or the seed) or a plain path. */
export type ImageValue = { src?: string; alt?: string; width?: number; height?: number } | string | null | undefined;

export function imageSrc(image: ImageValue): string | undefined {
	if (!image) return undefined;
	return typeof image === "string" ? image : image.src;
}

export function imageAlt(image: ImageValue, fallback = ""): string {
	if (!image || typeof image === "string") return fallback;
	return image.alt || fallback;
}

/** Sort entries by their `weight` field (lowest first). */
export function byWeight<T extends { data: { weight?: number | null } }>(entries: T[]): T[] {
	return [...entries].sort((a, b) => (a.data.weight ?? 999) - (b.data.weight ?? 999));
}
