/**
 * docs.html — active section highlight + code copy buttons
 */
(function () {
  'use strict';

  var sectionIds = [
    'core-array-object-loop', 'js-basics', 'arrays-objects', 'string-json',
    'dom', 'async', 'performance', 'dsa', 'big-o', 'algorithms', 'patterns', 'advanced-js'
  ];

  function setActiveNav(id) {
    var links = document.querySelectorAll('#docs-sidebar .nav-doc-link');
    links.forEach(function (a) {
      var href = a.getAttribute('href') || '';
      var targetId = href.replace('#', '');
      if (targetId === id) {
        a.classList.add('active');
      } else {
        a.classList.remove('active');
      }
    });
  }

  function initScrollSpy() {
    var sections = sectionIds
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);

    if (!sections.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        var visible = entries.filter(function (e) { return e.isIntersecting; });
        if (!visible.length) return;
        var topmost = visible.reduce(function (a, b) {
          return a.boundingClientRect.top <= b.boundingClientRect.top ? a : b;
        });
        setActiveNav(topmost.target.id);
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
    );

    sections.forEach(function (el) { observer.observe(el); });
  }

  function getCodeText(block) {
    var lines = block.querySelectorAll('pre');
    return Array.prototype.map.call(lines, function (pre) {
      var code = pre.querySelector('code');
      return code ? code.textContent : pre.textContent;
    }).join('\n');
  }

  function addCopyButtons() {
    var blocks = document.querySelectorAll('.mockup-code');
    blocks.forEach(function (block) {
      if (block.closest('.doc-code-wrap')) return;

      var wrap = document.createElement('div');
      wrap.className = 'doc-code-wrap';
      block.parentNode.insertBefore(wrap, block);
      wrap.appendChild(block);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'doc-code-copy';
      btn.setAttribute('aria-label', 'Copy code');
      btn.textContent = 'Copy';
      wrap.appendChild(btn);

      btn.addEventListener('click', function () {
        var text = getCodeText(block);
        navigator.clipboard.writeText(text).then(function () {
          btn.textContent = 'Copied!';
          btn.classList.add('copied');
          setTimeout(function () {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
          }, 1800);
        });
      });
    });
  }

  function initAnchorScrollNoHash() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var href = this.getAttribute('href');
        if (href === '#') return;
        var id = href.slice(1);
        var el = document.getElementById(id);
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          var url = window.location.pathname + window.location.search;
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', url);
          }
        }
      });
    });
  }

  function init() {
    initScrollSpy();
    addCopyButtons();
    initAnchorScrollNoHash();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
