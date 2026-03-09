/**
 * Scroll-triggered animations using IntersectionObserver.
 * Add class "scroll-animate" and optional data-animate="fadeUp|fadeLeft|fadeRight|scale|blur", data-delay="1".."5".
 * Call window.observeScrollAnimations() after adding new .scroll-animate elements (e.g. dynamic cards).
 */
(function () {
    'use strict';

    var observer = null;

    function createObserver() {
        return new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('animated');
                    entry.target.setAttribute('data-scroll-observed', 'true');
                    observer.unobserve(entry.target);
                });
            },
            { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.1 }
        );
    }

    function isInViewport(el) {
        var rect = el.getBoundingClientRect();
        var vh = window.innerHeight || document.documentElement.clientHeight;
        var margin = vh * 0.15;
        return rect.top < vh - margin && rect.bottom > -margin;
    }

    function initScrollAnimations() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if (!observer) observer = createObserver();

        document.querySelectorAll('.scroll-animate').forEach(function (el) {
            if (el.getAttribute('data-scroll-observed') === 'true') return;
            if (isInViewport(el)) {
                el.classList.add('animated');
                el.setAttribute('data-scroll-observed', 'true');
            } else {
                observer.observe(el);
            }
        });
    }

    window.observeScrollAnimations = initScrollAnimations;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScrollAnimations);
    } else {
        initScrollAnimations();
    }
})();
