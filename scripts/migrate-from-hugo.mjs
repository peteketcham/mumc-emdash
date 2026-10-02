#!/usr/bin/env node
/**
 * One-time migration: reads the Hugo site (mumc-hugo) and writes seed/seed.json
 * for this EmDash project (schema, menus, redirects and all content).
 *
 *   HUGO_DIR=../mumc-hugo node scripts/migrate-from-hugo.mjs
 *
 * The seed is applied automatically on first run when the database is empty.
 * After that the database is the source of truth; re-running this script does
 * not touch an existing database.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { parse as parseYaml } from "yaml";
import { fromMarkdown } from "mdast-util-from-markdown";

const HUGO = resolve(process.env.HUGO_DIR || "../mumc-hugo");
const OUT = resolve("seed/seed.json");
const warnings = [];
const warn = (m) => warnings.push(m);

// ---------- helpers ----------
const mediaId = (src) => "mig-" + createHash("sha1").update(src).digest("hex").slice(0, 16);
/** Local file in public/ -> EmDash "external" media value (served as a static file). */
const img = (src, alt, extra = {}) =>
	src ? { provider: "external", id: mediaId(src), src, alt: alt ?? "", ...extra } : undefined;
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ""));

function readMd(file) {
	const t = readFileSync(file, "utf8");
	const m = t.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!m) return { fm: {}, body: t };
	return { fm: parseYaml(m[1]) || {}, body: m[2] };
}

// Mimic Hugo's goldmark "typographer" so text renders identically.
function typo(s) {
	return s
		.replace(/---/g, "—")
		.replace(/--/g, "–")
		.replace(/\.\.\./g, "…")
		.replace(/(^|[\s(\[{—–])"/g, "$1“")
		.replace(/"/g, "”")
		.replace(/(^|[\s(\[{—–])'/g, "$1‘")
		.replace(/'/g, "’");
}

// ---------- markdown -> Portable Text ----------
function mdToPortableText(md, prefix) {
	if (!md || !md.trim()) return [];
	const tree = fromMarkdown(md);
	let n = 0;
	const key = () => `${prefix}${(n++).toString(36)}`;
	const blocks = [];

	function inline(nodes, marks, ctx) {
		for (const node of nodes) {
			switch (node.type) {
				case "text":
					ctx.spans.push({ _type: "span", _key: key(), text: typo(node.value), marks: [...marks] });
					break;
				case "strong":
					inline(node.children, [...marks, "strong"], ctx);
					break;
				case "emphasis":
					inline(node.children, [...marks, "em"], ctx);
					break;
				case "inlineCode":
					ctx.spans.push({ _type: "span", _key: key(), text: node.value, marks: [...marks, "code"] });
					break;
				case "break":
					ctx.spans.push({ _type: "span", _key: key(), text: "\n", marks: [...marks] });
					break;
				case "link": {
					const k = key();
					ctx.markDefs.push({ _type: "link", _key: k, href: node.url });
					inline(node.children, [...marks, k], ctx);
					break;
				}
				case "html": {
					// Inline raw HTML (rare): keep visible text only.
					warn(`${prefix}: inline HTML dropped: ${node.value}`);
					break;
				}
				default:
					warn(`${prefix}: unsupported inline node "${node.type}"`);
			}
		}
	}

	function textBlock(children, style, extra = {}) {
		const ctx = { spans: [], markDefs: [] };
		inline(children, [], ctx);
		if (ctx.spans.length === 0) return;
		blocks.push({ _type: "block", _key: key(), style, markDefs: ctx.markDefs, children: ctx.spans, ...extra });
	}

	function walk(nodes, listCtx) {
		for (const node of nodes) {
			switch (node.type) {
				case "paragraph":
					textBlock(node.children, "normal", listCtx ?? {});
					break;
				case "heading":
					textBlock(node.children, `h${node.depth}`);
					break;
				case "blockquote":
					for (const c of node.children) if (c.type === "paragraph") textBlock(c.children, "blockquote");
					break;
				case "list":
					for (const item of node.children) {
						const level = (listCtx?.level ?? 0) + 1;
						const ctx = { listItem: node.ordered ? "number" : "bullet", level };
						for (const child of item.children) {
							if (child.type === "paragraph") textBlock(child.children, "normal", ctx);
							else if (child.type === "list") walk([child], ctx);
							else warn(`${prefix}: unsupported list child "${child.type}"`);
						}
					}
					break;
				case "html": {
					// Raw HTML: iframes become EmDash's native iframe block; anything else a sanitized HTML block.
					const frames = [...node.value.matchAll(/<iframe\b[^>]*>/gi)];
					if (frames.length) {
						for (const [tag] of frames) {
							const attr = (name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`, "i"))?.[1];
							const src = (attr("src") || "").replace(/&amp;/g, "&");
							const h = parseInt(attr("height") || "", 10);
							const title = src.includes("calendar.google.com") ? "Church calendar" : src.includes("docs.google.com") ? "Chart" : "Embedded content";
							blocks.push(clean({ _type: "iframe", _key: key(), src, title, height: Number.isInteger(h) ? h : undefined }));
						}
						if (node.value.replace(/<iframe\b[^>]*>\s*<\/iframe>/gi, "").replace(/<\/?div[^>]*>/gi, "").trim()) warn(`${prefix}: extra HTML next to iframe dropped`);
					} else {
						blocks.push({ _type: "htmlBlock", _key: key(), html: node.value });
					}
					break;
				}
				case "thematicBreak":
					break;
				default:
					warn(`${prefix}: unsupported block node "${node.type}"`);
			}
		}
	}
	walk(tree.children, null);
	return blocks;
}

// ---------- schema ----------
const F = (slug, label, type, extra = {}) => ({ slug, label, type, ...extra });
const select = (slug, label, options, extra = {}) => F(slug, label, "select", { validation: { options }, ...extra });
const repeater = (slug, label, subFields) => F(slug, label, "repeater", { validation: { subFields } });
const sub = (slug, label, type, extra = {}) => ({ slug, label, type, ...extra });

const cardFields = [
	F("title", "Title (internal name)", "string", { required: true, searchable: true }),
	F("weight", "Display order (lower shows first)", "integer"),
	F("archived", "Archived (moves to the Archive page)", "boolean"),
	F("image", "Image", "image"),
	F("tags", "Caption above text", "string"),
	F("body", "Text", "portableText", { searchable: true }),
	F("link", "Link (URL or /page)", "string"),
	F("external", "Open link in a new tab", "boolean"),
	F("video", "Video file (MP4 path)", "string"),
	F("video_ogg", "Video fallback (OGG path)", "string"),
	F("video_fallback", "Video fallback link (YouTube URL)", "string"),
];

const collections = [
	{
		slug: "pages", label: "Pages", labelSingular: "Page", icon: "file-text", sortOrder: 1,
		supports: ["drafts", "revisions", "search", "seo"],
		fields: [
			F("title", "Title", "string", { required: true, searchable: true }),
			F("subtitle", "Subtitle", "string"),
			F("description", "Description (search engines)", "text"),
			select("template", "Page type", ["default", "kids", "youth", "staff", "contact", "slideshow", "archive"]),
			F("banner", "Banner image", "image"),
			F("intro", "Intro text", "text"),
			F("content", "Content", "portableText", { searchable: true }),
			F("featured_title", "Featured box: title", "string"),
			F("featured_heading", "Featured box: heading", "string"),
			F("featured_text", "Featured box: text", "text"),
			F("featured_image", "Featured box: image", "image"),
			select("featured_position", "Featured box: position", ["left", "right"]),
			F("video", "Video file (MP4 path)", "string"),
			F("video_ogg", "Video fallback (OGG path)", "string"),
			F("video_fallback", "Video fallback link (YouTube URL)", "string"),
			F("location_link", "Map link (shows a \"where are we\" link)", "url"),
			F("downloads_title", "Downloads: heading", "string"),
			repeater("downloads", "Downloads", [sub("name", "Name", "string", { required: true }), sub("url", "File path or URL", "string", { required: true }), sub("description", "Description", "string")]),
			repeater("embeds", "Embedded content (iframes)", [sub("title", "Title", "string"), sub("url", "URL", "url", { required: true }), sub("width", "Width", "string"), sub("height", "Height", "string")]),
			repeater("slides", "Slideshow images", [sub("image", "Image", "image", { required: true })]),
			F("office_hours", "Office hours", "string"),
			F("staff_photo", "Staff photo", "image"),
			repeater("staff_contacts", "Staff contact list", [sub("name", "Name", "string", { required: true }), sub("role", "Role", "string"), sub("email", "Email", "string")]),
		],
	},
	{
		slug: "staff", label: "Staff", labelSingular: "Staff member", icon: "users", sortOrder: 2, routable: false, supports: ["drafts"],
		fields: [
			F("name", "Name", "string", { required: true, searchable: true }),
			F("display_title", "Heading shown on the page (e.g. REV. NAME, PASTOR:)", "string"),
			F("weight", "Display order (lower shows first)", "integer"),
			F("photo", "Photo", "image"),
			F("bio", "Bio", "text", { searchable: true }),
			F("email", "Email", "string"),
		],
	},
	{ slug: "homepage_cards", label: "Homepage cards", labelSingular: "Homepage card", icon: "layout-grid", sortOrder: 3, routable: false, supports: ["drafts", "revisions"], fields: cardFields },
	{ slug: "kids_cards", label: "Kids page cards", labelSingular: "Kids card", icon: "layout-grid", sortOrder: 4, routable: false, supports: ["drafts", "revisions"], fields: cardFields },
	{ slug: "youth_cards", label: "Youth page cards", labelSingular: "Youth card", icon: "layout-grid", sortOrder: 5, routable: false, supports: ["drafts", "revisions"], fields: cardFields },
	{
		slug: "slider", label: "Homepage slider", labelSingular: "Slide", icon: "image", sortOrder: 6, routable: false, supports: ["drafts"],
		fields: [F("title", "Name", "string", { required: true }), F("weight", "Display order (lower shows first)", "integer"), F("image", "Slide image (wide, about 1600x738)", "image", { required: true })],
	},
];

// ---------- content ----------
const content = { pages: [], staff: [], homepage_cards: [], kids_cards: [], youth_cards: [], slider: [] };
const cardKeys = new Set(["title", "weight", "draft", "archived", "image", "image_alt", "image_width", "image_height", "link", "external", "tags", "video", "video_ogg", "video_fallback"]);

function convertCards(dir, collection) {
	for (const f of readdirSync(dir).filter((x) => x.endsWith(".md") && x !== "_index.md").sort()) {
		const { fm, body } = readMd(join(dir, f));
		for (const k of Object.keys(fm)) if (!cardKeys.has(k)) warn(`${collection}/${f}: unmapped front matter "${k}"`);
		const slug = basename(f, ".md");
		content[collection].push({
			id: `${collection}-${slug}`, slug, status: fm.draft ? "draft" : "published",
			data: clean({
				title: fm.title, weight: fm.weight, archived: !!fm.archived,
				image: img(fm.image, fm.image_alt), tags: fm.tags,
				body: mdToPortableText(body, `${collection}-${slug}-`),
				link: fm.link, external: !!fm.external,
				video: fm.video, video_ogg: fm.video_ogg, video_fallback: fm.video_fallback,
			}),
		});
	}
}
convertCards(join(HUGO, "content/homepage"), "homepage_cards");
convertCards(join(HUGO, "content/kids"), "kids_cards");
convertCards(join(HUGO, "content/youth"), "youth_cards");

const pageKeys = new Set(["title", "description", "subtitle", "layout", "banner", "banner_alt", "intro", "featured", "video", "video_ogg", "video_fallback", "video_poster", "location_link", "downloads", "embeds", "slides", "office_hours", "staff_photo", "staff_contacts", "staff", "formspree_id"]);
const templateFor = { contact: "contact", staff: "staff", slideshow: "slideshow", archive: "archive" };

function convertPage(file, slug, template) {
	const { fm, body } = readMd(file);
	for (const k of Object.keys(fm)) if (!pageKeys.has(k)) warn(`page ${slug}: unmapped front matter "${k}"`);
	if (fm.video_poster) warn(`page ${slug}: video_poster not migrated`);
	const feat = fm.featured || {};
	content.pages.push({
		id: `page-${slug}`, slug, status: "published",
		data: clean({
			title: fm.title, subtitle: fm.subtitle, description: fm.description,
			template: template || templateFor[fm.layout] || "default",
			banner: img(fm.banner, fm.banner_alt), intro: fm.intro,
			content: mdToPortableText(body, `page-${slug}-`),
			featured_title: feat.title, featured_heading: feat.heading, featured_text: feat.text,
			featured_image: img(feat.image, ""), featured_position: feat.position,
			video: fm.video, video_ogg: fm.video_ogg, video_fallback: fm.video_fallback,
			location_link: fm.location_link,
			downloads_title: fm.downloads?.title,
			downloads: fm.downloads?.files?.map((d) => clean({ name: d.name, url: d.url, description: d.description })),
			embeds: fm.embeds?.map((e) => clean({ title: e.title, url: e.url, width: e.width, height: e.height })),
			slides: fm.slides?.map((s) => ({ image: img(s.image, s.alt) })),
			office_hours: fm.office_hours, staff_photo: img(fm.staff_photo, "Minnehaha UMC Staff"),
			staff_contacts: fm.staff_contacts?.map((c) => clean({ name: c.name, role: c.role, email: c.email })),
		}),
	});
	if (fm.staff) {
		fm.staff.forEach((s, i) =>
			content.staff.push({
				id: `staff-${i + 1}`, slug: (s.name || `member-${i}`).toLowerCase().replace(/[^a-z0-9]+/g, "-"), status: "published",
				data: clean({ name: s.name, display_title: s.title, weight: (i + 1) * 10, photo: img(s.photo, s.name), bio: s.bio, email: s.email }),
			}),
		);
	}
}

for (const f of readdirSync(join(HUGO, "content")).filter((x) => x.endsWith(".md") && x !== "_index.md").sort()) {
	convertPage(join(HUGO, "content", f), basename(f, ".md"));
}
convertPage(join(HUGO, "content/kids/_index.md"), "kids", "kids");
convertPage(join(HUGO, "content/youth/_index.md"), "youth", "youth");

// Homepage slider lives in layouts/index.html in Hugo.
{
	const html = readFileSync(join(HUGO, "layouts/index.html"), "utf8");
	const re = /<img src="\{\{ "([^"]+)" \| relURL \}\}" alt="([^"]*)" width="(\d+)" height="(\d+)">/g;
	let m, i = 0;
	while ((m = re.exec(html))) {
		i++;
		content.slider.push({ id: `slide-${i}`, slug: `slide-${i}`, status: "published", data: { title: m[2], weight: i * 10, image: img(m[1], m[2], { width: +m[3], height: +m[4] }) } });
	}
	if (!i) warn("no slider images found in layouts/index.html");
}

// ---------- menus ----------
const L = (label, url, extra = {}) => ({ type: "custom", label, url, ...extra });
const menus = [
	{
		name: "primary", label: "Top menu (dropdowns)",
		items: [
			L("HOME", "/"), L("CALENDAR", "/calendar/"),
			{ ...L("KIDS/YOUTH", "#"), children: [L("Kids", "/kids/"), L("Youth", "/youth/")] },
			{ ...L("CLIMATE", "#"), children: [L("Solar Power", "/solar/"), L("Climate Action", "/climate-action/")] },
			{ ...L("GROUPS", "/groups/"), children: [L("Racial Justice", "/racial-justice/"), L("United Women in Faith", "/uwf/")] },
			{ ...L("FOOD MISSIONS", "#"), children: [L("Food Shelf", "/food-shelf/"), L("3 Food Missions", "/food-ministries/")] },
			{ ...L("BLDG. USE", "#"), children: [L("Work Orders, Building & Kitchen", "/building/"), L("Major Event Cleanup Checklist", "/documents/majorcleanupchecklist.pdf"), L("Group Cleanup Checklist", "/documents/groupcleanupchecklist.pdf"), L("Room Rentals", "/documents/MUMC Room Rental.pdf")] },
			L("WEDDING/FUNERAL", "/weddings-funerals/"),
			{ ...L("FORMS", "#"), children: [L("Event Media Form", "/documents/eventmediaform.pdf"), L("Claim Form", "/documents/MUMC_Claim_Form.pdf"), L("Gym Rules & Liability Waiver", "/documents/Gym Rules and Liability Waiver.pdf")] },
			{ ...L("FAQs", "#"), children: [L("Good Things Happen Here", "/good-things-happen-here/"), L("Questions? Answers!", "/documents/QandA.pdf"), L("Who Do I Talk To?", "/documents/whointhechurch.pdf"), L("Church history", "/church-history/")] },
		],
	},
	{
		name: "secondary", label: "Main menu (below the logo)",
		items: [L("HOME", "/"), L("WELCOME", "/welcome/"), L("FIRST VISIT", "/first-visit/"), L("WE SEEK", "/we-seek/"), L("WE SERVE", "/we-serve/"), L("WE CELEBRATE", "/we-celebrate/"), L("STAFF", "/staff/"), L("CONTACT US", "/contact/")],
	},
	{ name: "footer", label: "Footer quick links", items: [L("First Visit", "/first-visit/"), L("Calendar", "/calendar/"), L("Staff", "/staff/"), L("Contact Us", "/contact/")] },
];

// Old minnehaha.org URLs -> new routes, so existing links keep working.
const redirects = Object.entries({
	"/index.html": "/", "/welcome.html": "/welcome/", "/1firstvisit.html": "/first-visit/", "/firstvisit.html": "/first-visit/",
	"/seek.html": "/we-seek/", "/serve.html": "/we-serve/", "/celebrate.html": "/we-celebrate/", "/MUMC_staff.html": "/staff/",
	"/contact.html": "/contact/", "/calendar.html": "/calendar/", "/kids.html": "/kids/", "/youth.html": "/youth/",
	"/racialjustice.html": "/racial-justice/", "/climateaction.html": "/climate-action/", "/goodthingshappenhere.html": "/good-things-happen-here/",
	"/solar.html": "/solar/", "/building.html": "/building/", "/umw.html": "/uwf/", "/weddings_funerals.html": "/weddings-funerals/", "/slideshow.html": "/church-history/",
}).map(([source, destination]) => ({ source, destination, type: 301, groupName: "Old minnehaha.org pages" }));

const seed = {
	$schema: "https://emdashcms.com/seed.schema.json",
	version: "1",
	meta: { name: "Minnehaha UMC", description: "Website for Minnehaha United Methodist Church, Minneapolis", author: "Minnehaha UMC" },
	settings: { title: "Minnehaha United Methodist Church", tagline: "Minnehaha United Methodist Church - Your neighborhood church in Minneapolis" },
	collections, menus, redirects, content,
};
mkdirSync(resolve("seed"), { recursive: true });
writeFileSync(OUT, JSON.stringify(seed, null, "\t") + "\n");
console.log(`Wrote ${OUT}`);
for (const [k, v] of Object.entries(content)) console.log(`  ${k}: ${v.length}`);
console.log(`  menus: ${menus.length}, redirects: ${redirects.length}`);
if (warnings.length) { console.log(`\n${warnings.length} warning(s):`); for (const w of warnings) console.log("  - " + w); }
