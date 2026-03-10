/**
 * gallery.js — Loads gallery from API, renders masonry grid, and handles lightbox (full view, prev/next).
 * Images and videos (YouTube or local) supported. Content driven by data/gallery.json.
 */

(function () {
  const GALLERY_API = 'data/gallery.json';
  const gridEl = document.getElementById('gallery-grid');
  const lightboxEl = document.getElementById('gallery-lightbox');
  const lightboxContent = document.getElementById('gallery-lightbox-content');
  const lightboxCaption = document.getElementById('gallery-lightbox-caption');
  const lightboxClose = document.getElementById('gallery-lightbox-close');
  const lightboxBackdrop = document.getElementById('gallery-lightbox-backdrop');
  const lightboxPrev = document.getElementById('gallery-lightbox-prev');
  const lightboxNext = document.getElementById('gallery-lightbox-next');

  const ITEMS_PER_PAGE = 20;
  let galleryItems = [];
  let currentIndex = 0;
  let visibleCount = 0;
  let loadMoreWrap = null;
  let loadMoreBtn = null;

  /**
   * Fetches gallery data from API and returns items array.
   * @returns {Promise<Array>}
   */
  function fetchGallery() {
    return fetch(GALLERY_API)
      .then((res) => {
        if (!res.ok) throw new Error('Gallery load failed');
        return res.json();
      })
      .then((data) => (data.items && Array.isArray(data.items) ? data.items : []));
  }

  /**
   * Escapes HTML for safe use in innerHTML.
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Extracts YouTube video ID from URL (watch or youtu.be).
   * @param {string} url
   * @returns {string|null}
   */
  function getYoutubeId(url) {
    if (!url || typeof url !== 'string') return null;
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  /** Placeholder data URL for img before lazy load (1x1 transparent) */
  const IMG_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E";

  /**
   * Creates a single gallery card DOM element. Images use data-src for lazy load and fade-in when loaded.
   * @param {Object} item
   * @param {number} realIndex
   * @returns {HTMLElement}
   */
  function createCard(item, realIndex) {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.setAttribute('data-index', String(realIndex));
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    const thumb = item.thumbnail || item.src;
    const title = escapeHtml(item.title || '');
    if (item.type === 'video') {
      card.innerHTML =
        '<div class="gallery-card-poster">' +
        (thumb ? '<img class="gallery-card-img" data-src="' + escapeHtml(thumb) + '" src="' + IMG_PLACEHOLDER + '" alt="' + title + '" loading="lazy">' : '') +
        '<i class="fa-solid fa-play" aria-hidden="true"></i></div>' +
        (title ? '<div class="gallery-card-title">' + title + '</div>' : '');
    } else {
      card.innerHTML =
        '<div class="gallery-card-img-wrap">' +
        '<img class="gallery-card-img" data-src="' + escapeHtml(thumb) + '" src="' + IMG_PLACEHOLDER + '" alt="' + title + '" loading="lazy">' +
        '</div>' +
        (title ? '<div class="gallery-card-title">' + title + '</div>' : '');
    }
    const imgs = card.querySelectorAll('img.gallery-card-img');
    imgs.forEach((img) => {
      img.addEventListener('load', () => img.classList.add('gallery-img-loaded'));
      img.addEventListener('error', () => img.classList.add('gallery-img-loaded'));
      if (img.complete) img.classList.add('gallery-img-loaded');
    });
    card.addEventListener('click', () => openLightbox(realIndex));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(realIndex);
      }
    });
    return card;
  }

  /**
   * Intersection Observer: when a card enters viewport, set img src from data-src (lazy load).
   */
  function initLazyLoadObserver() {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const card = entry.target;
          observer.unobserve(card);
          const img = card.querySelector('img.gallery-card-img[data-src]');
          if (img && img.getAttribute('data-src')) {
            img.src = img.getAttribute('data-src');
            img.removeAttribute('data-src');
          }
        });
      },
      { rootMargin: '80px', threshold: 0.01 }
    );
    return observer;
  }

  /** Lazy-load observer instance; cards are observed when appended. */
  let lazyObserver = null;

  /**
   * Appends cards for gallery items from index `from` (inclusive) to `to` (exclusive).
   * @param {number} from
   * @param {number} to
   * @param {boolean} animate - if true, new cards get smooth fade-in to avoid flickering
   */
  function appendCards(from, to, animate) {
    if (!gridEl) return;
    if (!lazyObserver) lazyObserver = initLazyLoadObserver();
    const nodes = [];
    for (let i = from; i < to && i < galleryItems.length; i++) {
      const card = createCard(galleryItems[i], i);
      if (animate) card.classList.add('gallery-card-enter');
      gridEl.appendChild(card);
      nodes.push(card);
      if (lazyObserver) lazyObserver.observe(card);
    }
    if (animate && nodes.length > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          nodes.forEach((el) => el.classList.add('gallery-card-visible'));
        });
      });
    }
  }

  /**
   * Shows first 20 items and "Load more" button if there are more. Called after fetch.
   */
  function renderInitialGrid() {
    if (!gridEl) return;
    gridEl.innerHTML = '';
    if (!galleryItems.length) {
      gridEl.innerHTML = '<p class="col-span-full text-center text-slate-500 py-8">No items in gallery.</p>';
      if (loadMoreWrap) loadMoreWrap.style.display = 'none';
      return;
    }
    const firstBatch = Math.min(ITEMS_PER_PAGE, galleryItems.length);
    visibleCount = firstBatch;
    appendCards(0, firstBatch, false);
    if (loadMoreWrap) loadMoreWrap.style.display = galleryItems.length > ITEMS_PER_PAGE ? 'block' : 'none';
  }

  /**
   * Loads next 20 items with spinner and smooth fade-in; hides button when all loaded.
   */
  function onLoadMore() {
    if (!loadMoreBtn) return;
    loadMoreBtn.disabled = true;
    loadMoreBtn.innerHTML = '<span class="loading loading-spinner loading-sm"></span> Loading...';
    loadMoreBtn.classList.add('gallery-loadmore-loading');

    const nextEnd = Math.min(visibleCount + ITEMS_PER_PAGE, galleryItems.length);
    const delay = 180;

    setTimeout(() => {
      appendCards(visibleCount, nextEnd, true);
      visibleCount = nextEnd;
      loadMoreBtn.disabled = false;
      loadMoreBtn.classList.remove('gallery-loadmore-loading');
      loadMoreBtn.innerHTML = visibleCount < galleryItems.length
        ? '<i class="fa-solid fa-chevron-down"></i> Load more (' + (galleryItems.length - visibleCount) + ' left)'
        : '<i class="fa-solid fa-check"></i> All loaded';
      if (loadMoreWrap) loadMoreWrap.style.display = visibleCount >= galleryItems.length ? 'none' : 'block';
    }, delay);
  }

  /**
   * Builds lightbox media node (img, iframe for YouTube, or video for local).
   * @param {Object} item
   * @returns {HTMLElement}
   */
  function buildLightboxMedia(item) {
    const wrap = document.createElement('div');
    wrap.className = 'gallery-lightbox-media';
    if (item.type === 'video') {
      const ytId = getYoutubeId(item.src);
      if (ytId) {
        const iframe = document.createElement('iframe');
        iframe.src = 'https://www.youtube.com/embed/' + ytId + '?autoplay=1';
        iframe.title = escapeHtml(item.title || 'Video');
        wrap.appendChild(iframe);
      } else {
        const video = document.createElement('video');
        video.src = item.src;
        video.controls = true;
        video.autoplay = true;
        video.setAttribute('controlsList', 'nodownload');
        wrap.appendChild(video);
      }
    } else {
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = escapeHtml(item.title || '');
      wrap.appendChild(img);
    }
    return wrap;
  }

  /**
   * Opens lightbox at given index and updates content/caption.
   * @param {number} index
   */
  function openLightbox(index) {
    if (!lightboxEl || index < 0 || index >= galleryItems.length) return;
    currentIndex = index;
    const item = galleryItems[currentIndex];
    lightboxContent.innerHTML = '';
    lightboxContent.appendChild(buildLightboxMedia(item));
    lightboxCaption.textContent = item.title || '';
    lightboxEl.classList.add('is-open');
    lightboxEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Closes lightbox and stops video playback.
   */
  function closeLightbox() {
    if (!lightboxEl) return;
    const video = lightboxContent.querySelector('video');
    const iframe = lightboxContent.querySelector('iframe');
    if (video) {
      video.pause();
      video.removeAttribute('src');
    }
    if (iframe) iframe.removeAttribute('src');
    lightboxEl.classList.remove('is-open');
    lightboxEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /**
   * Shows previous item in lightbox.
   */
  function prevItem() {
    if (galleryItems.length === 0) return;
    currentIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
    openLightbox(currentIndex);
  }

  /**
   * Shows next item in lightbox.
   */
  function nextItem() {
    if (galleryItems.length === 0) return;
    currentIndex = (currentIndex + 1) % galleryItems.length;
    openLightbox(currentIndex);
  }

  function init() {
    if (!gridEl) return;
    loadMoreWrap = document.getElementById('gallery-load-more-wrap');

    fetchGallery()
      .then((items) => {
        galleryItems = items;
        renderInitialGrid();
        if (loadMoreWrap && galleryItems.length > ITEMS_PER_PAGE) {
          loadMoreBtn = document.createElement('button');
          loadMoreBtn.type = 'button';
          loadMoreBtn.className = 'btn btn-primary gap-2';
          loadMoreBtn.innerHTML = '<i class="fa-solid fa-chevron-down"></i> Load more (' + Math.max(0, galleryItems.length - ITEMS_PER_PAGE) + ' left)';
          loadMoreBtn.addEventListener('click', onLoadMore);
          loadMoreWrap.appendChild(loadMoreBtn);
        }
      })
      .catch(() => {
        gridEl.innerHTML = '<p class="col-span-full text-center text-red-600 py-8">Failed to load gallery.</p>';
        if (loadMoreWrap) loadMoreWrap.style.display = 'none';
      });

    if (lightboxBackdrop) lightboxBackdrop.addEventListener('click', closeLightbox);
    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); prevItem(); });
    if (lightboxNext) lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); nextItem(); });

    document.addEventListener('keydown', (e) => {
      if (!lightboxEl || !lightboxEl.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevItem();
      if (e.key === 'ArrowRight') nextItem();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
