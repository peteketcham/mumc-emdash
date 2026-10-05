/** Image field value: a media-library item (local), an external URL, or a plain path. */
export type ImageValue =
	| { provider?: string; id?: string; src?: string; alt?: string; width?: number; height?: number; meta?: { storageKey?: string } }
	| string
	| null
	| undefined;

const MEDIA_ROUTE = "/_emdash/api/media/file";

export function imageSrc(image: ImageValue): string | undefined {
	if (!image) return undefined;
	if (typeof image === "string") return image;
	if (image.src) return image.src;
	if (image.meta?.storageKey) return `${MEDIA_ROUTE}/${image.meta.storageKey}`;
	return undefined;
}

export function imageAlt(image: ImageValue, fallback = ""): string {
	if (!image || typeof image === "string") return fallback;
	return image.alt || fallback;
}

/** Sort entries by their `weight` field (lowest first). */
export function byWeight<T extends { data: { weight?: number | null } }>(entries: T[]): T[] {
	return [...entries].sort((a, b) => (a.data.weight ?? 999) - (b.data.weight ?? 999));
}
