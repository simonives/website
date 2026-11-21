(function () {
  try {
    var p = location.pathname;
    var h = location.hash;
    var state = (!h || h === '#') && (p === '/' || p === '/index.html' || p === '') ? 'game' : 'site';
    document.documentElement.setAttribute('data-home', state);
    if (state === 'game') {
      setTimeout(function () {
        if (!document.documentElement.hasAttribute('data-home-ready')) {
          document.documentElement.removeAttribute('data-home');
          document.documentElement.setAttribute('data-home-timeout', '');
        }
      }, 4000);
    }
  } catch (e) {
    // Leave data-home unset on error so the page falls back to the normal site.
  }
})();
