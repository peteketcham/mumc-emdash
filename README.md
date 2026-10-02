# Minnehaha UMC – EmDash site

[EmDash](https://github.com/emdash-cms/emdash) (Astro CMS) version of minnehaha.org, converted from the Hugo site in `mumc-hugo`.
Same design (theme CSS/JS in `public/`), same pages and card grids, but content is now edited in the EmDash admin UI instead of Markdown files.

## Run it

```bash
npm install
cp .env.example .env            # then set EMDASH_ENCRYPTION_KEY (openssl rand -hex 32)
npm run dev                     # http://localhost:4321
npx emdash seed seed/seed.json  # load the migrated content into data.db (once)
```

Then open `/_emdash/admin` and finish the setup wizard to create your admin account.

> The content lives in `data.db` (SQLite) and `uploads/`. **Both are gitignored**, so after the first seed the database is the source of truth – back it up. Re-running the seed skips anything that already exists.

## What was migrated

`scripts/migrate-from-hugo.mjs` reads the Hugo repo and writes `seed/seed.json`:

| Hugo | EmDash |
|---|---|
| `content/*.md` pages (with `template`/layout) | `pages` collection (`template`: default, kids, youth, staff, contact, slideshow, archive) |
| `content/homepage/*` | `homepage_cards` (`archived` flag → shown on `/archive`) |
| `content/kids/*`, `content/youth/*` | `kids_cards`, `youth_cards` |
| staff list in `staff.md` | `staff` collection |
| homepage slider | `slider` collection |
| `hugo.toml` menus | `primary`, `secondary`, `footer` menus |
| old `*.html` URLs | redirects |

Re-run with `HUGO_DIR=/path/to/mumc-hugo node scripts/migrate-from-hugo.mjs` (regenerates the seed; use a fresh DB to apply it).

## Layout

- `src/layouts/Base.astro`, `src/components/` – ports of the Hugo layouts and partials
- `src/components/pages/` – one component per page template
- `src/site.ts` – address, phone, email, social links, Formspree ID (**set `formspreeId`** for the contact form)
- `public/` – theme CSS/JS, images and PDFs (copied from Hugo `static/`; old URLs keep working)

## Not ported (same as the Hugo repo)

Pages linked from menus/cards but never built there: `/food-shelf/`, `/food-ministries/`, `/groups/`, `/got-kids/`. Add them as `pages` entries in the admin.

## Deploying

Needs a Node server (`npm run build && node dist/server/entry.mjs`) with persistent storage for `data.db` and `uploads/`. Set `EMDASH_ENCRYPTION_KEY` in the environment. Host not chosen yet.
