# Minnehaha UMC – EmDash site

[EmDash](https://github.com/emdash-cms/emdash) (Astro CMS) version of minnehaha.org, converted from the Hugo site in `mumc-hugo`.
Same design (theme CSS/JS in `public/`), same pages and card grids, but content is now edited in the EmDash admin UI instead of Markdown files.

## Run it

```bash
npm install
cp .env.example .env     # then set EMDASH_ENCRYPTION_KEY (openssl rand -hex 32)
npm run content:load     # creates data.db: schema, taxonomies, media library, menus, redirects, content
npm run dev              # http://localhost:4321
```

Open `/_emdash/admin` and finish the setup wizard to create your admin account.

`npm run content:load` runs three steps: it applies `seed/seed-schema.json` (collections, taxonomies, menus), imports every image in `seed/media-manifest.json` into the media library (copying files from `public/` into `uploads/`), then loads the content from `seed/seed.json`. Existing rows are skipped, so it is safe to re-run, but it will not overwrite edits. To start over from the migrated content: stop the dev server, delete `data.db*` and `uploads/`, and run it again (**this discards any admin edits**).

> The content lives in `data.db` (SQLite) and `uploads/`. **Both are gitignored**, so after the first load the database is the source of truth. Back it up. Restart `npm run dev` after changing `package.json`, `.env` or the Astro config. Editing in the admin during a restart can fail with "Vite module runner has been closed".

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
| old `*.html` URLs | Astro redirects in `legacy-redirects.mjs` |

Re-run with `HUGO_DIR=/path/to/mumc-hugo npm run content:migrate` (regenerates the seed files and media manifest; use a fresh DB to apply them).

## Content structure

- **Media library**: card, banner, slider and staff images are media items, grouped into folders (Homepage cards, Kids cards, Youth cards, Pages & banners, Staff, Homepage slider). Image fields point at library items; replace a picture by picking another from the library. 
- **Taxonomies** (assigned to pages and cards; edit them in each entry's sidebar, or under Categories/Terms):
  - `ministry` (hierarchical): Worship & Music; Kids & Families (Sunday School, Playgroup, Family Events, Camps & Retreats); Youth; Food & Hunger Relief; Justice & Inclusion (Racial Justice, Welcome & Reconciling); Climate & Creation; Community & Building; Giving & Mission; Connect & Communicate.
  - `audience`: Everyone, Families with kids, Youth, Adults, Visitors & new members.
  - `card_type` (cards only): Event, Announcement, Ongoing program, Information / resource, Call to action.
- **Documents** (PDFs etc., about 336 files in `seed/documents/`) are in the media library under the *Documents* folder and are served at their original URLs, e.g. `/documents/MUMC Room Rental.pdf`, so existing links, menus and search results keep working (PDFs open in the browser instead of downloading). To update one, upload a file with the **same filename** in the Media library. The route is `src/pages/documents/[...name].ts`; on Cloudflare, change it to read from R2 directly instead of fetching itself.
- **Dated cards disappear on their own.** Card collections have a *Hide after* date/time. Once it passes, the card leaves its page (and shows on `/archive` for homepage cards) with no manual step. *Archived* still works for manual archiving. (For a future start date use EmDash's built-in Schedule action when publishing.) The initial dates for the Taizé, pasta-dinner and service-project cards are set in `scripts/migrate-from-hugo.mjs` (`EXPIRES`).
- The site lists everything by ministry at `/ministries/` and `/ministries/<term>/`. The initial assignments live in `scripts/taxonomy.mjs`.
- Card collections have an **Archived** column in the admin list. The admin cannot filter by custom fields yet, so use that column to spot archived cards.

## Layout

- `src/layouts/Base.astro`, `src/components/` – ports of the Hugo layouts and partials
- `src/components/pages/` – one component per page template
- `src/site.ts` – address, phone, email, social links, Formspree ID (**set `formspreeId`** for the contact form)
- `public/` – theme CSS/JS, images and PDFs (copied from Hugo `static/`; old URLs keep working)

## Not ported (same as the Hugo repo)

Pages linked from menus/cards but never built there: `/food-shelf/` (the Food Shelf card and menu link still point to it). Add them as `pages` entries in the admin.

## Old URLs

`legacy-redirects.mjs` maps old minnehaha.org `.html` pages to the new routes (loaded in `astro.config.mjs`). EmDash's admin **Redirects** screen cannot handle URLs ending in a file extension, so use it only for extensionless paths.

## Deploying

Needs a Node server (`npm run build && node dist/server/entry.mjs`) with persistent storage for `data.db` and `uploads/`. Set `EMDASH_ENCRYPTION_KEY` in the environment. Host not chosen yet.
