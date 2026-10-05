/**
 * Old minnehaha.org page URLs -> the new routes, so existing links and bookmarks keep working.
 * Registered as Astro redirects (see astro.config.mjs) because EmDash's admin-managed redirects
 * deliberately skip any URL ending in a file extension such as .html.
 */
export const legacyRedirects = {
	"/welcome.html": "/welcome/",
	"/1firstvisit.html": "/first-visit/",
	"/firstvisit.html": "/first-visit/",
	"/seek.html": "/we-seek/",
	"/serve.html": "/we-serve/",
	"/celebrate.html": "/we-celebrate/",
	"/MUMC_staff.html": "/staff/",
	"/contact.html": "/contact/",
	"/calendar.html": "/calendar/",
	"/kids.html": "/kids/",
	"/youth.html": "/youth/",
	"/racialjustice.html": "/racial-justice/",
	"/climateaction.html": "/climate-action/",
	"/goodthingshappenhere.html": "/good-things-happen-here/",
	"/solar.html": "/solar/",
	"/building.html": "/building/",
	"/umw.html": "/uwf/",
	"/weddings_funerals.html": "/weddings-funerals/",
	"/slideshow.html": "/church-history/",
};
