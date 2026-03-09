/**
 * Mobile drawer menu — open/close toggle. Desktop header unchanged.
 */
(function () {
    function closeDrawer() {
        document.body.classList.remove('mobile-drawer-open');
        document.body.style.overflow = '';
    }
    function openDrawer() {
        document.body.classList.add('mobile-drawer-open');
        document.body.style.overflow = 'hidden';
    }
    function toggleDrawer() {
        if (document.body.classList.contains('mobile-drawer-open')) {
            closeDrawer();
        } else {
            openDrawer();
        }
    }

    function init() {
        var btn = document.querySelector('[data-mobile-menu-toggle]');
        var backdrop = document.getElementById('mobile-drawer-backdrop');
        var closeBtn = document.querySelector('[data-mobile-drawer-close]');
        var drawer = document.getElementById('mobile-drawer');

        if (btn) btn.addEventListener('click', toggleDrawer);
        if (backdrop) backdrop.addEventListener('click', closeDrawer);
        if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
        if (drawer) {
            drawer.querySelectorAll('a[href]').forEach(function (link) {
                link.addEventListener('click', closeDrawer);
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
