/* mobile */
isMobile = false;
isiPad = false;
function isMobile_f() {
  var array_mobileIds = new Array('iphone', 'android', 'ipad', 'ipod');
  var uAgent = navigator.userAgent.toLowerCase();
  for (var i = 0; i < array_mobileIds.length; i++) {
    if (uAgent.search(array_mobileIds[i]) > -1) {
      isMobile = true;
      if (array_mobileIds[i] == 'ipad') isiPad = true;
    }
  }
}
isMobile_f();

//Animation
if (!isMobile) document.write('<link rel="stylesheet" href="layout/plugins/cssanimation/animate.css" type="text/css">');
if (!isMobile) document.write('<link rel="stylesheet" href="layout/plugins/cssanimation/delays.css" type="text/css">');

//FlexSlider
// document.write('<link rel="stylesheet" href="layout/plugins/flexslider/flexslider.css" type="text/css">');
if (!isMobile) document.write('<link rel="stylesheet" href="layout/plugins/flexslider/animation_delays.css" type="text/css"/>');

//Calendar
// document.write('<link rel="stylesheet" href="layout/plugins/calendar/calendar.css" type="text/css">');
// document.write('<script type="text/javascript" src="layout/plugins/calendar/calendar.js"></script>');

//Media Element
// document.write('<link rel="stylesheet" href="layout/plugins/mediaelement/mediaelementplayer.css" type="text/css"/>');
// document.write('<script type="text/javascript" src="layout/plugins/mediaelement/mediaelement-and-player.min.js"></script>');
// document.write('<script type="text/javascript" src="layout/plugins/mediaelement/custom.js"></script>');

