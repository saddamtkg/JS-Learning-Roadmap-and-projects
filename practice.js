/**
 * Practice & Revision page – load questions, filter by topic/level, mark for revision
 */

const STORAGE_KEY_REVISION = 'js-roadmap-revision-ids';
const STORAGE_KEY_PRACTICE_COUNT = 'js-roadmap-practice-count';

let practiceData = { topics: [] };
let revisionIds = new Set();
let practiceCounts = {};
/** Which topic is shown (index in full list). Only one topic in DOM for performance. */
let activeSegmentIndex = 0;

function loadRevisionFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_REVISION);
        if (raw) revisionIds = new Set(JSON.parse(raw));
    } catch (_) {
        revisionIds = new Set();
    }
}

function saveRevisionToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY_REVISION, JSON.stringify([...revisionIds]));
    } catch (_) {}
}

function loadPracticeCountsFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PRACTICE_COUNT);
        if (raw) practiceCounts = JSON.parse(raw);
        else practiceCounts = {};
    } catch (_) {
        practiceCounts = {};
    }
}

function savePracticeCountToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY_PRACTICE_COUNT, JSON.stringify(practiceCounts));
    } catch (_) {}
}

function getQuestionFullId(topicId, questionId) {
    return `${topicId}__${questionId}`;
}

function toggleRevision(topicId, questionId) {
    const fullId = getQuestionFullId(topicId, questionId);
    if (revisionIds.has(fullId)) {
        revisionIds.delete(fullId);
    } else {
        revisionIds.add(fullId);
    }
    saveRevisionToStorage();
    renderAllTopics();
    updateRevisionBanner();
}

function incrementPracticeCount(topicId, questionId) {
    const fullId = getQuestionFullId(topicId, questionId);
    practiceCounts[fullId] = (practiceCounts[fullId] || 0) + 1;
    savePracticeCountToStorage();
    renderAllTopics();
}

function isRevisionMarked(topicId, questionId) {
    return revisionIds.has(getQuestionFullId(topicId, questionId));
}

function getPracticeCount(topicId, questionId) {
    return practiceCounts[getQuestionFullId(topicId, questionId)] || 0;
}

async function fetchPracticeData() {
    const res = await fetch('data/practice-questions.json');
    if (!res.ok) throw new Error('Failed to load practice questions');
    practiceData = await res.json();
    if (!practiceData.topics) practiceData.topics = [];
    if (!practiceData.months) practiceData.months = [];
}

function useMonths() {
    return practiceData.months && practiceData.months.length > 0;
}

function getSegmentId(segment) {
    return useMonths() ? 'month-' + segment.month : segment.id;
}

function getActiveLevelFilter() {
    const el = document.querySelector('[data-filter-level].active');
    return el ? el.dataset.filterLevel : 'all';
}

function getActiveRevisionFilter() {
    const el = document.querySelector('[data-filter-revision].active');
    return el ? el.dataset.filterRevision === 'only' : false;
}

function getAllSegments() {
    return useMonths() ? practiceData.months : practiceData.topics;
}

function getActiveSegment() {
    const segments = getAllSegments();
    if (!segments.length) return null;
    const idx = Math.max(0, Math.min(activeSegmentIndex, segments.length - 1));
    activeSegmentIndex = idx;
    return segments[idx];
}

function getFilteredSegments() {
    const levelFilter = getActiveLevelFilter();
    const revisionOnly = getActiveRevisionFilter();
    const segments = getAllSegments();

    return segments.filter((seg) => {
        const segId = getSegmentId(seg);
        if (revisionOnly) {
            const hasMarked = seg.questions.some((q) => isRevisionMarked(segId, q.id));
            if (!hasMarked) return false;
        }
        if (!useMonths() && levelFilter !== 'all' && seg.level !== levelFilter) return false;
        return true;
    });
}

function getFilteredQuestionsForSegment(segment) {
    const segId = getSegmentId(segment);
    const levelFilter = getActiveLevelFilter();
    const revisionOnly = getActiveRevisionFilter();

    return segment.questions.filter((q) => {
        if (revisionOnly && !isRevisionMarked(segId, q.id)) return false;
        if (levelFilter !== 'all' && q.level !== levelFilter) return false;
        return true;
    });
}

function renderQuestion(segmentId, q, questionNumber) {
    const fullId = getQuestionFullId(segmentId, q.id);
    const marked = isRevisionMarked(segmentId, q.id);
    const count = getPracticeCount(segmentId, q.id);
    const hasHint = q.hint && q.hint.trim();
    const hasAnswer = q.answer && q.answer.trim();
    const num = questionNumber != null ? questionNumber : '';
    const level = ['beginner', 'intermediate', 'advanced'].includes(q.level) ? q.level : 'beginner';

    return `
        <div class="question-item rounded-lg p-4 mb-3 ${marked ? 'revision-marked' : ''}" data-topic="${escapeHtml(segmentId)}" data-q="${escapeHtml(q.id)}" id="q-${escapeHtml(fullId)}">
            <div class="flex flex-wrap items-start justify-between gap-2">
                <p class="text-slate-700 flex-1 min-w-0 font-medium">${num ? `<span class="question-num text-js font-mono font-bold mr-2">${num}.</span>` : ''}${escapeHtml(q.question)}</p>
                <div class="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <span class="badge badge-sm level-badge-${level} text-xs">${escapeHtml(level)}</span>
                    ${count > 0 ? `<span class="text-slate-400 text-xs" title="Practice count">${count}×</span>` : ''}
                    ${hasHint ? `<span class="tooltip tooltip-bottom max-w-xs" data-tip="${escapeAttr(q.hint)}"><button type="button" class="btn btn-xs btn-ghost text-amber-600" title="Question idea / Hint" aria-label="Hint"><i class="fa-solid fa-lightbulb"></i></button></span>` : ''}
                    ${hasAnswer ? `<span class="tooltip tooltip-bottom max-w-xs" data-tip="${escapeAttr(q.answer)}"><button type="button" class="btn btn-xs btn-ghost text-green-600" title="Answer idea — ensure your practice is correct" aria-label="Answer idea"><i class="fa-solid fa-circle-check"></i></button></span>` : ''}
                    <button type="button" class="btn btn-xs ${marked ? 'btn-warning' : 'btn-ghost'}" data-action="revision" title="${marked ? 'Remove from revision' : 'Mark for revision'}" aria-label="${marked ? 'Remove from revision' : 'Mark for revision'}">
                        <i class="fa-solid fa-rotate-right"></i>
                    </button>
                    <button type="button" class="btn btn-xs btn-ghost" data-action="practiced" title="I practiced this" aria-label="I practiced this">
                        <i class="fa-solid fa-check"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function escapeAttr(text) {
    if (text == null) return '';
    return escapeHtml(text).replace(/"/g, '&quot;');
}

function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderSegment(segment) {
    const segId = getSegmentId(segment);
    const questions = getFilteredQuestionsForSegment(segment);
    if (questions.length === 0) return '';

    const icon = segment.icon || 'fa-code';
    const monthRef = segment.monthRef ? ` (Roadmap: ${segment.monthRef})` : '';
    const levelBadge = useMonths() ? '' : `<span class="badge badge-sm level-badge-${segment.level}">${segment.level}</span>`;

    return `
        <section class="topic-section bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 practice-card scroll-mt-24" id="topic-${escapeHtml(segId)}">
            <h2 class="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2">
                <i class="fa-solid ${icon} text-js"></i>
                ${escapeHtml(segment.title)}${monthRef}
            </h2>
            <p class="text-slate-500 text-sm mb-4">
                ${levelBadge}
                <span class="text-slate-500">${questions.length} question(s)</span>
            </p>
            <div class="topic-body">
                ${questions.map((q, idx) => renderQuestion(segId, q, idx + 1)).join('')}
            </div>
        </section>
    `;
}

function renderPracticeSidebar() {
    const list = document.getElementById('practice-sidebar-list');
    if (!list) return;

    if (useMonths() && practiceData.months.length > 0) {
        list.innerHTML = practiceData.months.map((seg, idx) => {
            const segId = 'month-' + seg.month;
            const icon = seg.icon || 'fa-code';
            const rawTitle = seg.title || 'Month ' + seg.month;
            const topicOnly = rawTitle.replace(/^Month \d+:\s*/i, '').trim() || rawTitle;
            const activeClass = idx === activeSegmentIndex ? ' active bg-js/10 text-jsdark border-l-2 border-js' : '';
            return `<li><a href="#topic-${escapeHtml(segId)}" class="practice-nav-link rounded-lg py-2 px-3 hover:bg-slate-100 hover:text-jsdark text-sm font-medium flex items-center gap-2${activeClass}" data-segment-index="${idx}"><i class="fa-solid ${icon} w-4 text-js text-xs flex-shrink-0"></i><span class="practice-sidebar-text truncate block min-w-0">${escapeHtml(topicOnly)}</span></a></li>`;
        }).join('');
    } else if (practiceData.topics && practiceData.topics.length > 0) {
        list.innerHTML = practiceData.topics.map((seg, idx) => {
            const icon = seg.icon || 'fa-code';
            const activeClass = idx === activeSegmentIndex ? ' active bg-js/10 text-jsdark border-l-2 border-js' : '';
            return `<li><a href="#topic-${escapeHtml(seg.id)}" class="practice-nav-link rounded-lg py-2 px-3 hover:bg-slate-100 hover:text-jsdark text-sm font-medium flex items-center gap-2${activeClass}" data-segment-index="${idx}"><i class="fa-solid ${icon} w-4 text-js text-xs"></i><span>${escapeHtml(seg.title)}</span></a></li>`;
        }).join('');
    } else {
        list.innerHTML = '<li class="text-slate-400 text-sm">No topics loaded.</li>';
    }
    setupSidebarClicks();
}

function updateSidebarActiveState() {
    const list = document.getElementById('practice-sidebar-list');
    if (!list) return;
    list.querySelectorAll('.practice-nav-link').forEach((a, idx) => {
        const isActive = Number(a.getAttribute('data-segment-index')) === activeSegmentIndex;
        a.classList.toggle('active', isActive);
        a.classList.toggle('bg-js/10', isActive);
        a.classList.toggle('text-jsdark', isActive);
        a.classList.toggle('border-l-2', isActive);
        a.classList.toggle('border-js', isActive);
    });
}

function setupSidebarClicks() {
    const list = document.getElementById('practice-sidebar-list');
    if (!list) return;
    list.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#topic-"]');
        if (!link) return;
        e.preventDefault();
        const idx = link.getAttribute('data-segment-index');
        if (idx != null) {
            activeSegmentIndex = parseInt(idx, 10);
            renderActiveTopicOnly();
            updateSidebarActiveState();
            const href = link.getAttribute('href');
            const id = href ? href.slice(1) : '';
            const el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (window.history && window.history.replaceState) {
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
        }
    });
}

function bindQuestionActions(container) {
    if (!container) return;
    container.querySelectorAll('[data-action="revision"]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.question-item');
            const topicId = item?.dataset?.topic;
            const qId = item?.dataset?.q;
            if (topicId && qId) toggleRevision(topicId, qId);
        });
    });
    container.querySelectorAll('[data-action="practiced"]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.question-item');
            const topicId = item?.dataset?.topic;
            const qId = item?.dataset?.q;
            if (topicId && qId) incrementPracticeCount(topicId, qId);
        });
    });
}

/** Render only the active topic (keeps DOM small for performance). */
function renderActiveTopicOnly() {
    const container = document.getElementById('practice-topics');
    if (!container) return;

    const segment = getActiveSegment();
    if (!segment) {
        container.innerHTML = `
            <div class="text-center py-16 empty-state-icon">
                <i class="fa-solid fa-clipboard-question text-6xl text-slate-300 mb-4"></i>
                <p class="text-slate-500 font-medium">No topics loaded.</p>
            </div>
        `;
        return;
    }

    const questions = getFilteredQuestionsForSegment(segment);
    if (questions.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16 empty-state-icon">
                <i class="fa-solid fa-filter text-6xl text-slate-300 mb-4"></i>
                <p class="text-slate-500 font-medium">No questions match in this topic for the current filter.</p>
                <p class="text-slate-400 text-sm mt-1">Try changing level or turn off "Revision only".</p>
            </div>
        `;
        return;
    }

    container.innerHTML = renderSegment(segment);
    bindQuestionActions(container);
    updateSidebarActiveState();
}

/** Kept for callers that expect renderAllTopics (same behavior: render active only). */
function renderAllTopics() {
    renderActiveTopicOnly();
}

function updateRevisionBanner() {
    const banner = document.getElementById('revision-only-banner');
    const count = revisionIds.size;
    if (!banner) return;
    if (count === 0) {
        banner.classList.add('hidden');
        const revisionBtn = document.querySelector('[data-filter-revision="only"]');
        if (revisionBtn) revisionBtn.classList.remove('active');
        return;
    }
    banner.classList.remove('hidden');
    const numEl = banner.querySelector('[data-revision-count]');
    if (numEl) numEl.textContent = count;
}

function setupFilters() {
    document.querySelectorAll('[data-filter-level]').forEach((el) => {
        el.addEventListener('click', () => {
            document.querySelectorAll('[data-filter-level]').forEach((e) => e.classList.remove('active'));
            el.classList.add('active');
            renderAllTopics();
        });
    });

    document.querySelectorAll('[data-filter-revision]').forEach((el) => {
        el.addEventListener('click', () => {
            const value = el.dataset.filterRevision;
            document.querySelectorAll('[data-filter-revision]').forEach((e) => {
                e.classList.toggle('active', e.dataset.filterRevision === value);
            });
            renderAllTopics();
            updateRevisionBanner();
        });
    });
}

function init() {
    loadRevisionFromStorage();
    loadPracticeCountsFromStorage();

    fetchPracticeData()
        .then(() => {
            renderPracticeSidebar();
            renderAllTopics();
            updateRevisionBanner();
        })
        .catch((err) => {
            const container = document.getElementById('practice-topics');
            if (container) {
                container.innerHTML = `
                    <div class="alert alert-error">
                        <i class="fa-solid fa-circle-exclamation"></i>
                        <span>Could not load questions. ${escapeHtml(err.message)}</span>
                    </div>
                `;
            }
        });

    setupFilters();
}

// Scroll progress bar (practice page)
function initScrollProgress() {
    const progressBar = document.getElementById('scroll-progress');
    if (!progressBar) return;
    window.addEventListener('scroll', () => {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
        progressBar.style.width = scrolled + '%';
    });
}

// Anchor links: স্মুথ স্ক্রল, URL-এ # যুক্ত হবে না (sidebar সহ dynamic link এর জন্য delegation)
function initAnchorScrollNoHash() {
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (!link) return;
        const href = link.getAttribute('href');
        if (href === '#') return;
        const id = href.slice(1);
        const el = document.getElementById(id);
        if (el) {
            e.preventDefault();
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            const url = window.location.pathname + window.location.search;
            if (window.history && window.history.replaceState) {
                window.history.replaceState(null, '', url);
            }
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initScrollProgress();
        initAnchorScrollNoHash();
        init();
    });
} else {
    initScrollProgress();
    initAnchorScrollNoHash();
    init();
}
