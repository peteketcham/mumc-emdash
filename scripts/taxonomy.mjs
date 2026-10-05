/**
 * Content structure: taxonomies + the initial term assignments for migrated content.
 * Editors can change any of this in the admin (Content Types / Categories / each entry's sidebar).
 */

const T = (slug, label, extra = {}) => ({ slug, label, ...extra });

export const COLLECTIONS = ["pages", "homepage_cards", "kids_cards", "youth_cards"];

export const taxonomies = [
	{
		name: "ministry", label: "Ministry areas", labelSingular: "Ministry area", hierarchical: true,
		collections: COLLECTIONS,
		terms: [
			T("worship", "Worship & Music", { description: "Sunday worship, Taizé, music and special services." }),
			T("kids-families", "Kids & Families", { description: "Sunday School, Playgroup, family dinners, camps and more for children and their families." }),
			T("sunday-school", "Sunday School", { parent: "kids-families" }),
			T("playgroup", "Playgroup", { parent: "kids-families" }),
			T("family-events", "Family Events", { parent: "kids-families" }),
			T("camps", "Camps & Retreats", { parent: "kids-families" }),
			T("youth", "Youth", { description: "Programs, trips and camps for middle school and high school youth." }),
			T("food", "Food & Hunger Relief", { description: "MinneHarvest, the Minnehaha Food Shelf, Meals on Wheels and other ways we fight hunger." }),
			T("justice", "Justice & Inclusion", { description: "Welcoming everyone and working for racial and social justice." }),
			T("racial-justice", "Racial Justice", { parent: "justice" }),
			T("welcome", "Welcome & Reconciling", { parent: "justice" }),
			T("creation", "Climate & Creation", { description: "Solar power, carbon-free energy and caring for creation." }),
			T("community", "Community & Building", { description: "Our building, groups and neighborhood partnerships." }),
			T("giving", "Giving & Mission", { description: "Giving, disaster relief and mission support." }),
			T("connect", "Connect & Communicate", { description: "Newcomers, membership, staff, newsletters and ways to stay in touch." }),
		],
	},
	{
		name: "audience", label: "Audiences", labelSingular: "Audience", hierarchical: false,
		collections: COLLECTIONS,
		terms: [T("everyone", "Everyone"), T("families", "Families with kids"), T("youth", "Youth"), T("adults", "Adults"), T("newcomers", "Visitors & new members")],
	},
	{
		name: "card_type", label: "Card types", labelSingular: "Card type", hierarchical: false,
		collections: ["homepage_cards", "kids_cards", "youth_cards"],
		terms: [
			T("event", "Event", { description: "A dated happening or a photo from one." }),
			T("announcement", "Announcement", { description: "Time-sensitive news." }),
			T("program", "Ongoing program", { description: "Something that happens regularly." }),
			T("resource", "Information / resource"),
			T("action", "Call to action", { description: "Sign up, donate, subscribe, volunteer." }),
		],
	},
];

// [ministry terms], [audience terms], card type   (keyed by entry slug)
const home = {
	"all-church-service-project": [["giving"], ["everyone"], "event"],
	"building-community": [["community"], ["everyone"], "resource"],
	"carbon-free": [["creation"], ["everyone"], "resource"],
	"choir-concerts": [["worship", "food"], ["everyone"], "event"],
	"church-history": [["connect"], ["newcomers"], "resource"],
	"do-all-the-good": [["giving"], ["everyone"], "resource"],
	"donate": [["giving"], ["everyone"], "action"],
	"end-racism": [["racial-justice"], ["everyone"], "action"],
	"first-visit": [["connect"], ["newcomers"], "resource"],
	"food-ministries": [["food"], ["everyone"], "program"],
	"food-shelf": [["food"], ["everyone"], "program"],
	"george-floyd": [["racial-justice"], ["everyone"], "resource"],
	"good-things": [["welcome"], ["newcomers"], "resource"],
	"got-kids": [["kids-families"], ["families"], "resource"],
	"gym": [["community"], ["everyone"], "announcement"],
	"land-acknowledgement": [["justice"], ["everyone"], "resource"],
	"livestream-worship": [["worship"], ["everyone"], "program"],
	"meet-staff": [["connect"], ["newcomers"], "resource"],
	"membership": [["connect"], ["newcomers"], "resource"],
	"minneharvest": [["food"], ["everyone"], "program"],
	"newsletter-signup": [["connect"], ["everyone"], "action"],
	"newsletters": [["connect"], ["everyone"], "resource"],
	"pasta-dinner": [["food"], ["everyone"], "event"],
	"planned-giving": [["giving"], ["adults"], "resource"],
	"playgroup": [["playgroup"], ["families"], "program"],
	"racial-justice": [["racial-justice"], ["everyone"], "program"],
	"rainbow-reconciling": [["welcome"], ["everyone"], "resource"],
	"reconciling-minnesota": [["welcome"], ["everyone"], "resource"],
	"social-media": [["connect"], ["everyone"], "action"],
	"solar-power": [["creation"], ["everyone"], "resource"],
	"sunday-school": [["sunday-school"], ["families"], "program"],
	"support-food-shelf": [["food"], ["everyone"], "action"],
	"taize-worship": [["worship"], ["everyone"], "event"],
	"ukraine-support": [["giving"], ["everyone"], "action"],
	"umcor": [["giving"], ["everyone"], "action"],
	"wednesday-childcare": [["family-events"], ["families"], "program"],
	"wednesday-dinner": [["family-events", "community"], ["families"], "program"],
	"welcome-video": [["connect"], ["newcomers"], "resource"],
	"winter-musical": [["community"], ["everyone"], "event"],
	"worship-announcement": [["worship"], ["everyone"], "announcement"],
	"youth-group": [["youth"], ["youth"], "program"],
	"youtube-subscribe": [["connect"], ["everyone"], "action"],
};
const kids = {
	"camp-minnesota": [["camps"], ["families"], "action"],
	"summer-camps": [["camps"], ["families", "youth"], "action"],
	"childcare-info": [["family-events"], ["families"], "program"],
	"childcare-night": [["family-events"], ["families"], "event"],
	"christmas-pageant": [["worship", "kids-families"], ["families"], "event"],
	"crybaby-church": [["worship"], ["families"], "resource"],
	"enews-signup": [["connect"], ["everyone"], "action"],
	"family-book-club": [["family-events"], ["families"], "program"],
	"playgroup": [["playgroup"], ["families"], "program"],
	"social-media": [["connect"], ["everyone"], "action"],
	"sunday-school-all": [["sunday-school"], ["everyone"], "program"],
	"sunday-school-kickoff": [["sunday-school"], ["families"], "event"],
	"wednesday-dinners": [["family-events"], ["families"], "program"],
	"worship-invitation": [["worship"], ["everyone"], "announcement"],
	"art-10-commandments": [["sunday-school"], ["families"], "resource"],
	"art-10-plagues": [["sunday-school"], ["families"], "resource"],
	"art-beatitudes": [["sunday-school"], ["families"], "resource"],
	"art-blind-to-see": [["sunday-school"], ["families"], "resource"],
	"art-miracle-fish": [["sunday-school"], ["families"], "resource"],
	"art-playground-worship": [["worship", "sunday-school"], ["families"], "resource"],
	"young-families-dinner": [["family-events"], ["families"], "event"],
	"young-family-sunday-school": [["sunday-school"], ["families"], "program"],
};
const youth = {
	"adventure-camp": [["camps", "youth"], ["youth"], "action"],
	"wilderness-camp": [["camps", "youth"], ["youth"], "action"],
	"easter-musicians": [["worship", "youth"], ["youth"], "event"],
	"easter-sunrise": [["worship", "youth"], ["everyone"], "event"],
	"enews-signup": [["connect"], ["everyone"], "action"],
	"feed-my-starving-children": [["food", "youth"], ["youth"], "event"],
	"sandwich-making": [["food", "youth"], ["youth"], "event"],
	"worship-announcement": [["worship"], ["everyone"], "announcement"],
};
const pages = {
	"food-ministries": [["food"], ["everyone"]], "got-kids": [["kids-families"], ["families"]], "groups": [["community"], ["everyone"]],
	"racial-justice": [["racial-justice"], ["everyone"]], "solar": [["creation"], ["everyone"]], "climate-action": [["creation"], ["everyone"]],
	"uwf": [["community"], ["adults"]], "we-seek": [["worship"], ["everyone"]], "we-serve": [["giving"], ["everyone"]], "we-celebrate": [["worship"], ["everyone"]],
	"welcome": [["connect"], ["newcomers"]], "first-visit": [["connect"], ["newcomers"]], "staff": [["connect"], ["newcomers"]],
	"contact": [["connect"], ["everyone"]], "building": [["community"], ["everyone"]], "calendar": [["connect"], ["everyone"]], "archive": [["connect"], ["everyone"]],
	"weddings-funerals": [["worship"], ["everyone"]], "good-things-happen-here": [["welcome"], ["newcomers"]],
	"church-history": [["connect"], ["newcomers"]], "kids": [["kids-families"], ["families"]], "youth": [["youth"], ["youth"]],
};

const maps = { homepage_cards: home, kids_cards: kids, youth_cards: youth };
const defaults = { homepage_cards: [["connect"], ["everyone"], "resource"], kids_cards: [["kids-families"], ["families"], "event"], youth_cards: [["youth"], ["youth"], "event"] };

/** Adds `taxonomies` to every entry of the taxonomy-enabled collections. Returns names that fell back to defaults. */
export function assignTaxonomies(content) {
	const fallbacks = [];
	for (const [coll, entries] of Object.entries(content)) {
		for (const e of entries) {
			if (coll === "pages") {
				const m = pages[e.slug];
				if (!m) { fallbacks.push(`pages/${e.slug}`); continue; }
				e.taxonomies = { ministry: m[0], audience: m[1] };
			} else if (maps[coll]) {
				let m = maps[coll][e.slug];
				if (!m) { m = defaults[coll]; if (coll === "homepage_cards") fallbacks.push(`${coll}/${e.slug}`); }
				e.taxonomies = { ministry: m[0], audience: m[1], card_type: [m[2]] };
			}
		}
	}
	return fallbacks;
}
