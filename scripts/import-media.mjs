#!/usr/bin/env node
/**
 * Loads the site's images into the EmDash media library.
 *
 *   node scripts/import-media.mjs
 *
 * Reads seed/media-manifest.json (written by migrate-from-hugo.mjs), copies each file from public/
 * into the uploads directory under its storage key, and creates the `media` rows (grouped into
 * folders). Idempotent: items that already exist are skipped. Run it after the schema exists
 * (`npx emdash seed seed/seed-schema.json`) and before loading content (`npx emdash seed seed/seed.json`);
 * `npm run content:load` does all three.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const DB = resolve(process.env.EMDASH_DB || "data.db");
const UPLOADS = resolve(process.env.EMDASH_UPLOADS || "uploads");
const manifest = JSON.parse(readFileSync(resolve("seed/media-manifest.json"), "utf8"));

mkdirSync(UPLOADS, { recursive: true });
const db = new DatabaseSync(DB);
db.exec("PRAGMA busy_timeout = 5000");

const folderIds = new Map();
const folderFor = (name) => {
	if (!name) return null;
	if (folderIds.has(name)) return folderIds.get(name);
	const key = name.toLowerCase();
	let row = db.prepare("SELECT id FROM media_folders WHERE name_key = ?").get(key);
	if (!row) {
		const id = "01K1" + createHash("sha1").update(key).digest("hex").slice(0, 22).toUpperCase().replace(/[ILOU]/g, "0");
		db.prepare("INSERT INTO media_folders (id, name, name_key) VALUES (?, ?, ?)").run(id, name, key);
		row = { id };
	}
	folderIds.set(name, row.id);
	return row.id;
};

const exists = db.prepare("SELECT 1 FROM media WHERE id = ?");
const insert = db.prepare(`INSERT INTO media (id, filename, mime_type, size, width, height, alt, storage_key, content_hash, created_at, status, folder_id)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?)`);

let created = 0, skipped = 0, missing = 0;
db.exec("BEGIN");
for (const m of manifest) {
	if (exists.get(m.id)) { skipped++; continue; }
	// Documents ship in seed/documents (served via /documents/<name>); images live in public/.
	const file = m.src.startsWith("/documents/") ? join(resolve("seed/documents"), decodeURI(m.src.slice("/documents/".length))) : join(resolve("public"), decodeURI(m.src));
	if (!existsSync(file)) { console.warn(`missing file: ${m.src}`); missing++; continue; }
	copyFileSync(file, join(UPLOADS, m.storageKey));
	const hash = createHash("sha256").update(readFileSync(file)).digest("hex");
	insert.run(m.id, m.filename, m.mimeType, statSync(file).size, m.width ?? null, m.height ?? null, m.alt || null, m.storageKey, hash, new Date().toISOString(), folderFor(m.folder));
	created++;
}
db.exec("COMMIT");
console.log(`Media library: ${created} imported, ${skipped} already present${missing ? `, ${missing} missing` : ""}.`);
