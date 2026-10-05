/**
 * A card is "current" unless an editor archived it or its "Hide after" date has passed.
 * Evaluated on each request, so dated cards drop off the page (and appear on /archive) on their own.
 */
type CardLike = { data: { archived?: boolean | null; expires?: string | null } };

export function isExpired(card: CardLike, now = new Date()): boolean {
	const e = card.data.expires;
	if (!e) return false;
	const t = Date.parse(e);
	return !Number.isNaN(t) && t <= now.getTime();
}

export const isCurrent = (card: CardLike, now = new Date()) => !card.data.archived && !isExpired(card, now);
export const isArchivedOrExpired = (card: CardLike, now = new Date()) => !isCurrent(card, now);
