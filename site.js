document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const navContainer = document.querySelector('.nav-container');

    menuToggle.addEventListener('click', () => {
        const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
        menuToggle.setAttribute('aria-expanded', !expanded);
        navContainer.classList.toggle('is-active');
        document.body.classList.toggle('no-scroll');
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
            menuToggle.setAttribute('aria-expanded', 'false');
            navContainer.classList.remove('is-active');
            document.body.classList.remove('no-scroll');
            menuToggle.focus();
        }
    });
});

(function () {
    var header = document.querySelector('.site-header');
    if (header) {
        function updateScrolled() {
            header.classList.toggle('scrolled', window.scrollY > 10);
        }
        window.addEventListener('scroll', updateScrolled, { passive: true });
        updateScrolled();
    }

    var toggle = document.getElementById('theme-toggle');
    if (toggle) {
        toggle.addEventListener('click', function () {
            var isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }

    // Reveal-on-scroll — opt in only when motion is allowed
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var revealEls = document.querySelectorAll('.reveal');
    if (!prefersReduced && 'IntersectionObserver' in window && revealEls.length) {
        document.documentElement.classList.add('js-motion');
        revealEls.forEach(function (el) { el.classList.add('is-hidden'); });
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.remove('is-hidden');
                    entry.target.classList.add('is-visible');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });
        revealEls.forEach(function (el) { io.observe(el); });
    }
})();
