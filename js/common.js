/**
 * common.js — Shared scripts loaded on every page (index, docs, practice).
 * Contains: modal helpers, scroll animations, mobile menu, Daily Routine modal, Profile modal.
 * All comments in English.
 */
(function () {
    'use strict';

    // ========== MODAL HELPER (no layout flicker; CSS scrollbar-gutter used instead of padding) ==========

    /** No-op: reserved for body scroll lock; layout is handled via CSS scrollbar-gutter: stable */
    window.lockBodyScroll = function () {};

    /** No-op: reserved for unlocking body scroll */
    window.unlockBodyScroll = function () {};

    /** No-op: reserved for attaching modal close handler */
    window.setupModalNoFlicker = function () {};

    // ========== SCROLL ANIMATIONS ==========

    let scrollAnimObserver = null;

    /** Creates IntersectionObserver that adds .animated when element enters viewport */
    function createScrollObserver() {
        return new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    const target = entry.target;
                    target.classList.add('animated');
                    target.setAttribute('data-scroll-observed', 'true');
                    scrollAnimObserver.unobserve(target);
                });
            },
            { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.1 }
        );
    }

    /** Returns true if element is within viewport (with margin) so it can be animated immediately on load */
    function isInViewport(element) {
        const rect = element.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const margin = viewportHeight * 0.15;
        return rect.top < viewportHeight - margin && rect.bottom > -margin;
    }

    /** Finds all .scroll-animate elements, animates those in viewport, observes the rest */
    function initScrollAnimations() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if (!scrollAnimObserver) scrollAnimObserver = createScrollObserver();

        document.querySelectorAll('.scroll-animate').forEach(function (element) {
            if (element.getAttribute('data-scroll-observed') === 'true') return;
            if (isInViewport(element)) {
                element.classList.add('animated');
                element.setAttribute('data-scroll-observed', 'true');
            } else {
                scrollAnimObserver.observe(element);
            }
        });
    }

    window.observeScrollAnimations = initScrollAnimations;

    // ========== MOBILE MENU (drawer open/close) ==========

    /** Removes drawer-open class and restores body scroll */
    function closeDrawer() {
        document.body.classList.remove('mobile-drawer-open');
        document.body.style.overflow = '';
    }

    /** Adds drawer-open class and locks body scroll */
    function openDrawer() {
        document.body.classList.add('mobile-drawer-open');
        document.body.style.overflow = 'hidden';
    }

    /** Toggles mobile drawer open/closed */
    function toggleDrawer() {
        if (document.body.classList.contains('mobile-drawer-open')) {
            closeDrawer();
        } else {
            openDrawer();
        }
    }

    /** Binds click handlers to menu toggle, backdrop, close button, and drawer links */
    function initMobileMenu() {
        const menuToggleButton = document.querySelector('[data-mobile-menu-toggle]');
        const drawerBackdrop = document.getElementById('mobile-drawer-backdrop');
        const drawerCloseButton = document.querySelector('[data-mobile-drawer-close]');
        const drawerPanel = document.getElementById('mobile-drawer');

        if (menuToggleButton) menuToggleButton.addEventListener('click', toggleDrawer);
        if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);
        if (drawerCloseButton) drawerCloseButton.addEventListener('click', closeDrawer);
        if (drawerPanel) {
            drawerPanel.querySelectorAll('a[href]').forEach(function (navLink) {
                navLink.addEventListener('click', closeDrawer);
            });
        }
    }

    // ========== DAILY ROUTINE MODAL (20% learn / 80% practice) ==========

    let dailyRoutineDialog = null;

    /** Builds and returns the Daily Routine dialog element (created once, reused) */
    function buildDailyRoutineModal() {
        const dialogElement = document.createElement('dialog');
        dialogElement.id = 'daily-routine-modal';
        dialogElement.className = 'modal modal-bottom sm:modal-middle';
        dialogElement.innerHTML =
            '<form method="dialog" class="modal-box max-w-lg bg-white text-left shadow-xl">' +
            '  <div class="flex items-center justify-between mb-4">' +
            '    <h3 class="text-xl font-bold text-slate-800 flex items-center gap-2">' +
            '      <i class="fa-solid fa-calendar-check text-js"></i> Daily Routine' +
            '    </h3>' +
            '    <button type="submit" class="btn btn-ghost btn-sm btn-circle text-slate-500 hover:bg-slate-100" aria-label="Close">' +
            '      <i class="fa-solid fa-times"></i>' +
            '    </button>' +
            '  </div>' +
            '  <p class="text-slate-600 text-sm mb-4">' +
            '    Pro level developer হতে চাইলে <strong>২০% সময় শেখার জন্য</strong> (ডকুমেন্টেশন, ভিডিও) এবং <strong>৮০% সময় প্র্যাকটিসের জন্য</strong> (কোড লিখা, প্রজেক্ট) দিন।' +
            '  </p>' +
            '  <div class="overflow-x-auto mb-4">' +
            '    <table class="table table-sm table-zebra">' +
            '      <thead><tr><th>মোট সময়/দিন</th><th>শেখা (২০%)</th><th>প্র্যাকটিস (৮০%)</th></tr></thead>' +
            '      <tbody>' +
            '        <tr><td>৩০ মিনিট</td><td>৬ মিনিট</td><td>২৪ মিনিট</td></tr>' +
            '        <tr><td>১ ঘণ্টা</td><td>১২ মিনিট</td><td>৪৮ মিনিট</td></tr>' +
            '        <tr><td>২ ঘণ্টা</td><td>২৪ মিনিট</td><td>১ ঘণ্টা ৩৬ মিনিট</td></tr>' +
            '        <tr><td>৩ ঘণ্টা</td><td>৩৬ মিনিট</td><td>২ ঘণ্টা ২৪ মিনিট</td></tr>' +
            '        <tr><td>৪ ঘণ্টা+</td><td>২০%</td><td>৮০%</td></tr>' +
            '      </tbody>' +
            '    </table>' +
            '  </div>' +
            '  <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900 mb-3">' +
            '    <strong>শেখা (২০%):</strong> ডক্স পড়া, ভিডিও দেখা, কনসেপ্ট রিভিশন।' +
            '  </div>' +
            '  <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-900">' +
            '    <strong>প্র্যাকটিস (৮০%):</strong> হাতে কোড লিখা, প্রজেক্ট বানানো, প্র্যাকটিস পেজের প্রশ্ন, আলগোরিদম সলভ।' +
            '  </div>' +
            '</form>' +
            '<form method="dialog" class="modal-backdrop"><button type="submit" aria-label="Close">close</button></form>';
        dialogElement.addEventListener('close', function () { setTimeout(window.unlockBodyScroll, 0); });
        document.body.appendChild(dialogElement);
        return dialogElement;
    }

    /** Opens the Daily Routine modal (builds on first use) */
    window.showDailyRoutineModal = function () {
        if (!dailyRoutineDialog) dailyRoutineDialog = buildDailyRoutineModal();
        if (window.lockBodyScroll) window.lockBodyScroll();
        dailyRoutineDialog.showModal();
    };

    // ========== PROFILE / WELCOME MODAL ==========

    let profileDialog = null;

    /** Builds and returns the Profile/Welcome dialog element (created once, reused) */
    function buildProfileModal() {
        const dialogElement = document.createElement('dialog');
        dialogElement.id = 'profile-welcome-modal';
        dialogElement.className = 'modal modal-bottom sm:modal-middle';
        dialogElement.innerHTML =
            '<form method="dialog" class="modal-box bg-white text-slate-800">' +
            '  <h3 class="font-bold text-lg border-b pb-2 mb-4">Hello Pro Developer!</h3>' +
            '  <div class="bg-slate-100 p-3 rounded-lg border border-slate-200 mb-4">' +
            '    <h4 class="text-xs font-bold text-slate-500 uppercase mb-1">Your profile</h4>' +
            '    <p class="text-sm text-slate-700">Your base in PHP and WP is a massive advantage. Just map your backend logic to JS frontend concepts. You got this!</p>' +
            '  </div>' +
            '  <h4 class="font-bold text-slate-800 border-b pb-1 mb-2">Focus on:</h4>' +
            '  <ul class="list-disc ml-5 mb-4 space-y-1 text-sm text-slate-700">' +
            '    <li>Leverage your PHP knowledge to learn JS backend quickly</li>' +
            '    <li>Use WordPress UI knowledge to master DOM</li>' +
            '    <li>Focus completely on Performance &amp; Optimization</li>' +
            '  </ul>' +
            '  <div class="mt-4 space-y-2">' +
            '    <a href="https://roadmap.sh/javascript" target="_blank" rel="noopener" class="block p-3 bg-blue-50 rounded-lg border border-blue-100 text-blue-600 hover:underline text-sm font-bold"><i class="fa-solid fa-book mr-1"></i> External: Read Documentation</a>' +
            '    <a href="docs.html" class="block p-3 bg-slate-100 rounded-lg border border-slate-200 text-slate-700 hover:underline text-sm font-bold"><i class="fa-solid fa-book-open mr-1"></i> এই সাইটের ডকুমেন্টেশন</a>' +
            '  </div>' +
            '  <div class="modal-action mt-4">' +
            '    <form method="dialog"><button class="btn btn-sm btn-primary">Understood!</button></form>' +
            '  </div>' +
            '</form>' +
            '<form method="dialog" class="modal-backdrop"><button type="submit" aria-label="Close">close</button></form>';
        dialogElement.addEventListener('close', function () { setTimeout(window.unlockBodyScroll, 0); });
        document.body.appendChild(dialogElement);
        return dialogElement;
    }

    /** Opens the Profile/Welcome modal (builds on first use) */
    window.showWelcomeModal = function () {
        if (!profileDialog) profileDialog = buildProfileModal();
        if (window.lockBodyScroll) window.lockBodyScroll();
        profileDialog.showModal();
    };

    // ========== INIT: run on DOM ready ==========

    function initCommon() {
        initScrollAnimations();
        initMobileMenu();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCommon);
    } else {
        initCommon();
    }
})();
