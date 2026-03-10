/**
 * docs.js — Documentation page (docs.html) only: scroll spy, code copy buttons, anchor scroll without hash.
 * All comments in English. Uses const/let only; meaningful names for variables and parameters.
 */
(function () {
    'use strict';

    const DOC_SECTION_IDS = [
        'core-array-object-loop', 'js-basics', 'arrays-objects', 'string-json',
        'dom', 'async', 'performance', 'dsa', 'big-o', 'algorithms', 'patterns', 'advanced-js'
    ];

    /** Sets the active class on the sidebar link that matches the given section id; removes from others */
    function setActiveNav(sectionId) {
        const navLinks = document.querySelectorAll('#docs-sidebar .nav-doc-link');
        navLinks.forEach(function (link) {
            const linkHref = link.getAttribute('href') || '';
            const targetSectionId = linkHref.replace('#', '');
            if (targetSectionId === sectionId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    /** Observes doc sections and highlights the topmost visible one in the sidebar */
    function initScrollSpy() {
        const sections = DOC_SECTION_IDS
            .map(function (id) { return document.getElementById(id); })
            .filter(Boolean);

        if (!sections.length) return;

        const sectionObserver = new IntersectionObserver(
            function (entries) {
                const visibleEntries = entries.filter(function (entry) { return entry.isIntersecting; });
                if (!visibleEntries.length) return;
                const topmostSection = visibleEntries.reduce(function (prev, curr) {
                    return prev.boundingClientRect.top <= curr.boundingClientRect.top ? prev : curr;
                });
                setActiveNav(topmostSection.target.id);
            },
            { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
        );

        sections.forEach(function (sectionEl) { sectionObserver.observe(sectionEl); });
    }

    /** Returns the combined text of all code blocks inside a mockup-code block (for copy) */
    function getCodeText(codeBlock) {
        const codeLines = codeBlock.querySelectorAll('pre');
        return Array.prototype.map.call(codeLines, function (lineEl) {
            const codeEl = lineEl.querySelector('code');
            return codeEl ? codeEl.textContent : lineEl.textContent;
        }).join('\n');
    }

    /** Wraps each .mockup-code in a .doc-code-wrap and adds a Copy button that copies code to clipboard */
    function addCopyButtons() {
        const codeBlocks = document.querySelectorAll('.mockup-code');
        codeBlocks.forEach(function (codeBlock) {
            if (codeBlock.closest('.doc-code-wrap')) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'doc-code-wrap';
            codeBlock.parentNode.insertBefore(wrapper, codeBlock);
            wrapper.appendChild(codeBlock);

            const copyButton = document.createElement('button');
            copyButton.type = 'button';
            copyButton.className = 'doc-code-copy';
            copyButton.setAttribute('aria-label', 'Copy code');
            copyButton.textContent = 'Copy';
            wrapper.appendChild(copyButton);

            copyButton.addEventListener('click', function () {
                const codeText = getCodeText(codeBlock);
                navigator.clipboard.writeText(codeText).then(function () {
                    copyButton.textContent = 'Copied!';
                    copyButton.classList.add('copied');
                    setTimeout(function () {
                        copyButton.textContent = 'Copy';
                        copyButton.classList.remove('copied');
                    }, 1800);
                });
            });
        });
    }

    /** Smooth scroll to anchor on click and remove hash from URL */
    function initAnchorScrollNoHash() {
        document.querySelectorAll('a[href^="#"]').forEach(function (link) {
            link.addEventListener('click', function (event) {
                const anchorHref = this.getAttribute('href');
                if (anchorHref === '#') return;
                const targetId = anchorHref.slice(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    event.preventDefault();
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    const baseUrl = window.location.pathname + window.location.search;
                    if (window.history && window.history.replaceState) {
                        window.history.replaceState(null, '', baseUrl);
                    }
                }
            });
        });
    }

    /** Runs scroll spy, copy buttons, and anchor scroll for the docs page */
    function initDocsPage() {
        initScrollSpy();
        addCopyButtons();
        initAnchorScrollNoHash();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDocsPage);
    } else {
        initDocsPage();
    }
})();
