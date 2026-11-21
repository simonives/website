(function () {
  try {
    var p = location.pathname;
    var h = location.hash;
    var state = h !== '#site' && (p === '/' || p === '/index.html' || p === '') ? 'game' : 'site';
    document.documentElement.setAttribute('data-home', state);
  } catch (e) {
    // Leave data-home unset on error so the page falls back to the normal site.
  }
})();
