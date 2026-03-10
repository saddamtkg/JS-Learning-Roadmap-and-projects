/**
 * gallery.js — Topic-wise YouTube videos. Loads data/gallery-videos.json,
 * flattens all months into one list, lazy-loads thumbnails, supports "Load more"
 * and lightbox playback with fullscreen. Each card shows video title and topic.
 */

(function () {
  const VIDEOS_API = 'data/gallery-videos.json';
  const gridEl = document.getElementById('gallery-grid');
  const lightboxEl = document.getElementById('gallery-lightbox');
  const lightboxContent = document.getElementById('gallery-lightbox-content');
  const lightboxCaption = document.getElementById('gallery-lightbox-caption');
  const lightboxClose = document.getElementById('gallery-lightbox-close');
  const lightboxBackdrop = document.getElementById('gallery-lightbox-backdrop');
  const lightboxPrev = document.getElementById('gallery-lightbox-prev');
  const lightboxNext = document.getElementById('gallery-lightbox-next');

  const ITEMS_PER_PAGE = 20;
  const IMG_PLACEHOLDER =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E";

  let galleryItems = [];
  let currentIndex = 0;
  let visibleCount = 0;
  let loadMoreWrap = null;
  let loadMoreBtn = null;
  let lazyObserver = null;

  /** Fetches video data and flattens all months into a single items array. */
  function fetchVideoItems() {
    return fetch(VIDEOS_API)
      .then((res) => {
        if (!res.ok) throw new Error('Videos load failed');
        return res.json();
      })
      .then((data) => {
        const months = data && Array.isArray(data.months) ? data.months : [];
        const items = [];
        months.forEach((month) => {
          (month.videos || []).forEach((v) => {
            const youtubeId = v.youtubeId || '';
            if (!youtubeId) return;
            items.push({
              type: 'video',
              src: 'https://www.youtube.com/watch?v=' + youtubeId,
              thumbnail: 'https://img.youtube.com/vi/' + youtubeId + '/mqdefault.jpg',
              title: v.title || '',
              topic: v.topic || ''
            });
          });
        });
        return items;
      });
  }

  function escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getYoutubeId(url) {
    if (!url || typeof url !== 'string') return null;
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  /** Creates a single video card (thumbnail, title, topic). */
  function createCard(item, realIndex) {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.setAttribute('data-index', String(realIndex));
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    const thumb = item.thumbnail || item.src;
    const title = escapeHtml(item.title || '');
    const topic = escapeHtml((item.topic || '').trim());

    card.innerHTML =
      '<div class="gallery-card-poster">' +
      (thumb
        ? '<img class="gallery-card-img" data-src="' +
          escapeHtml(thumb) +
          '" src="' +
          IMG_PLACEHOLDER +
          '" alt="' +
          title +
          '" loading="lazy">'
        : '') +
      '<i class="fa-solid fa-play" aria-hidden="true"></i></div>' +
      (title ? '<div class="gallery-card-title">' + title + '</div>' : '') +
      (topic ? '<div class="gallery-card-topic">' + topic + '</div>' : '');

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

  /** Intersection Observer: lazy-load thumbnails when card enters viewport. */
  function initLazyLoadObserver() {
    if (typeof IntersectionObserver === 'undefined') return null;
    return new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const card = entry.target;
          lazyObserver.unobserve(card);
          const img = card.querySelector('img.gallery-card-img[data-src]');
          if (img && img.getAttribute('data-src')) {
            img.src = img.getAttribute('data-src');
            img.removeAttribute('data-src');
          }
        });
      },
      { rootMargin: '80px', threshold: 0.01 }
    );
  }

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

  /** Renders first 20 items and shows Load more button if more exist. */
  function renderInitialGrid() {
    if (!gridEl) return;
    gridEl.innerHTML = '';

    if (!galleryItems.length) {
      gridEl.innerHTML =
        '<p class="col-span-full text-center text-slate-500 py-8">No videos found.</p>';
      if (loadMoreWrap) loadMoreWrap.style.display = 'none';
      return;
    }

    const firstBatch = Math.min(ITEMS_PER_PAGE, galleryItems.length);
    visibleCount = firstBatch;
    appendCards(0, firstBatch, false);
    if (loadMoreWrap) loadMoreWrap.style.display = galleryItems.length > ITEMS_PER_PAGE ? 'block' : 'none';
  }

  /** Load more: spinner + smooth fade-in for new cards. */
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
      loadMoreBtn.innerHTML =
        visibleCount < galleryItems.length
          ? '<i class="fa-solid fa-chevron-down"></i> Load more (' +
            (galleryItems.length - visibleCount) +
            ' left)'
          : '<i class="fa-solid fa-check"></i> All loaded';

      if (loadMoreWrap) loadMoreWrap.style.display = visibleCount >= galleryItems.length ? 'none' : 'block';
    }, delay);
  }

  /** Builds lightbox YouTube iframe with fullscreen support. */
  function buildLightboxMedia(item) {
    const wrap = document.createElement('div');
    wrap.className = 'gallery-lightbox-media';

    const ytId = getYoutubeId(item.src);
    if (ytId) {
      const iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube.com/embed/' + ytId + '?autoplay=1';
      iframe.title = escapeHtml(item.title || 'Video');
      iframe.setAttribute(
        'allow',
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
      );
      iframe.allowFullscreen = true;
      wrap.appendChild(iframe);
    }

    return wrap;
  }

  function openLightbox(index) {
    if (!lightboxEl || index < 0 || index >= galleryItems.length) return;
    currentIndex = index;
    const item = galleryItems[currentIndex];
    lightboxContent.innerHTML = '';
    lightboxContent.appendChild(buildLightboxMedia(item));
    lightboxCaption.textContent =
      (item.title || '') + (item.topic ? ' — ' + item.topic : '');
    lightboxEl.classList.add('is-open');
    lightboxEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightboxEl) return;
    const iframe = lightboxContent.querySelector('iframe');
    if (iframe) iframe.removeAttribute('src');
    lightboxEl.classList.remove('is-open');
    lightboxEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function prevItem() {
    if (!galleryItems.length) return;
    currentIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
    openLightbox(currentIndex);
  }

  function nextItem() {
    if (!galleryItems.length) return;
    currentIndex = (currentIndex + 1) % galleryItems.length;
    openLightbox(currentIndex);
  }

  function init() {
    if (!gridEl) return;
    loadMoreWrap = document.getElementById('gallery-load-more-wrap');

    fetchVideoItems()
      .then((items) => {
        galleryItems = items;
        renderInitialGrid();

        if (loadMoreWrap && galleryItems.length > ITEMS_PER_PAGE) {
          loadMoreBtn = document.createElement('button');
          loadMoreBtn.type = 'button';
          loadMoreBtn.className = 'btn btn-primary gap-2';
          loadMoreBtn.innerHTML =
            '<i class="fa-solid fa-chevron-down"></i> Load more (' +
            Math.max(0, galleryItems.length - ITEMS_PER_PAGE) +
            ' left)';
          loadMoreBtn.addEventListener('click', onLoadMore);
          loadMoreWrap.appendChild(loadMoreBtn);
        }
      })
      .catch(() => {
        gridEl.innerHTML =
          '<p class="col-span-full text-center text-red-600 py-8">Failed to load videos.</p>';
        if (loadMoreWrap) loadMoreWrap.style.display = 'none';
      });

    if (lightboxBackdrop) lightboxBackdrop.addEventListener('click', closeLightbox);
    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxPrev) {
      lightboxPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        prevItem();
      });
    }
    if (lightboxNext) {
      lightboxNext.addEventListener('click', (e) => {
        e.stopPropagation();
        nextItem();
      });
    }

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
