import type { APIRoute } from "astro";
import { getDb } from "emdash/runtime";

export const prerender = false;

/**
 * Serves documents (PDFs etc.) from the EmDash media library at their original public URLs,
 * e.g. /documents/Fall%202026%20MUMC%20newsletter_sm.pdf, so links on the old site, in search engines
 * and in menus keep working. Upload or replace a file in the admin's Media library (keep the same
 * filename) and the link updates. PDFs and images open in the browser; other types download.
 *
 * EmDash's own media route always forces a download for PDFs, so this route looks the file up by
 * filename and re-serves it inline. (Cloudflare: swap the self-fetch for a direct R2 read.)
 */
const INLINE = new Set(["application/pdf", "image/png", "image/jpeg", "image/gif", "image/webp"]);

export const GET: APIRoute = async ({ params, url }) => {
	const name = params.name ? decodeURIComponent(params.name) : "";
	if (!name || name.includes("/")) return new Response("Not found", { status: 404 });

	const db = await getDb();
	const row = await db
		.selectFrom("media")
		.select(["storage_key", "mime_type", "filename"])
		.where("status", "=", "ready")
		.where("filename", "=", name)
		.executeTakeFirst();
	if (!row) return new Response("Not found", { status: 404 });

	const upstream = await fetch(new URL(`/_emdash/api/media/file/${encodeURIComponent(row.storage_key)}`, url.origin));
	if (!upstream.ok || !upstream.body) return new Response("Not found", { status: 404 });

	const type = row.mime_type;
	const safeName = String(row.filename).replace(/["\\\r\n]/g, "_");
	const headers: Record<string, string> = {
		"Content-Type": type,
		"Content-Disposition": `${INLINE.has(type) ? "inline" : "attachment"}; filename="${safeName}"`,
		"Cache-Control": "public, max-age=3600",
		"X-Content-Type-Options": "nosniff",
	};
	const len = upstream.headers.get("content-length");
	if (len) headers["Content-Length"] = len;
	return new Response(upstream.body, { status: 200, headers });
};
