/**
 * practice.js — Practice page (practice.html) only: load questions, filter by topic/level, mark for revision.
 * All comments in English.
 */

const STORAGE_KEY_REVISION = 'js-roadmap-revision-ids';
const STORAGE_KEY_PRACTICE_COUNT = 'js-roadmap-practice-count';

let practiceData = { topics: [] };
let revisionIds = new Set();
let practiceCounts = {};
/** Index of the currently visible topic segment (only one in DOM for performance) */
let activeSegmentIndex = 0;

/** Loads revision-marked question IDs from localStorage into revisionIds */
function loadRevisionFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_REVISION);
        if (raw) revisionIds = new Set(JSON.parse(raw));
    } catch (_) {
        revisionIds = new Set();
    }
}

/** Persists revisionIds to localStorage */
function saveRevisionToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY_REVISION, JSON.stringify([...revisionIds]));
    } catch (_) {}
}

/** Loads per-question practice counts from localStorage into practiceCounts */
function loadPracticeCountsFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PRACTICE_COUNT);
        if (raw) practiceCounts = JSON.parse(raw);
        else practiceCounts = {};
    } catch (_) {
        practiceCounts = {};
    }
}

/** Saves practiceCounts to localStorage */
function savePracticeCountToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY_PRACTICE_COUNT, JSON.stringify(practiceCounts));
    } catch (_) {}
}

/** Returns a unique id string for a question (topicId__questionId) */
function getQuestionFullId(topicId, questionId) {
    return `${topicId}__${questionId}`;
}

/** Toggles revision mark for a question, saves storage, re-renders and updates banner */
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

/** Increments the practice count for a question and saves to storage */
function incrementPracticeCount(topicId, questionId) {
    const fullId = getQuestionFullId(topicId, questionId);
    practiceCounts[fullId] = (practiceCounts[fullId] || 0) + 1;
    savePracticeCountToStorage();
    renderAllTopics();
}

/** Returns true if the question is marked for revision */
function isRevisionMarked(topicId, questionId) {
    return revisionIds.has(getQuestionFullId(topicId, questionId));
}

/** Returns the number of times the user marked this question as practiced */
function getPracticeCount(topicId, questionId) {
    return practiceCounts[getQuestionFullId(topicId, questionId)] || 0;
}

/** Fetches practice-questions.json and populates practiceData (topics or months) */
async function fetchPracticeData() {
    const res = await fetch('data/practice-questions.json');
    if (!res.ok) throw new Error('Failed to load practice questions');
    practiceData = await res.json();
    if (!practiceData.topics) practiceData.topics = [];
    if (!practiceData.months) practiceData.months = [];
}

/** Returns true if data uses months array instead of topics */
function useMonths() {
    return practiceData.months && practiceData.months.length > 0;
}

/** Returns the segment id string (e.g. month-1 or topic id) */
function getSegmentId(segment) {
    return useMonths() ? 'month-' + segment.month : segment.id;
}

/** Returns the active level filter: 'all', 'beginner', 'intermediate', or 'advanced' */
function getActiveLevelFilter() {
    const el = document.querySelector('[data-filter-level].active');
    return el ? el.dataset.filterLevel : 'all';
}

/** Returns true if "Revision only" filter is active */
function getActiveRevisionFilter() {
    const el = document.querySelector('[data-filter-revision].active');
    return el ? el.dataset.filterRevision === 'only' : false;
}

function getAllSegments() {
    return useMonths() ? practiceData.months : practiceData.topics;
}

/** Returns the segment at activeSegmentIndex (clamped); updates activeSegmentIndex */
function getActiveSegment() {
    const segments = getAllSegments();
    if (!segments.length) return null;
    const idx = Math.max(0, Math.min(activeSegmentIndex, segments.length - 1));
    activeSegmentIndex = idx;
    return segments[idx];
}

/** Returns segments that pass the current level and revision-only filters */
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

/** If the active segment has no questions after filtering, switch to first segment that has questions */
function ensureActiveSegmentHasQuestions() {
    const segments = getAllSegments();
    if (!segments.length) return;
    const currentQuestions = getFilteredQuestionsForSegment(getActiveSegment());
    if (currentQuestions.length > 0) return;
    for (let i = 0; i < segments.length; i++) {
        if (getFilteredQuestionsForSegment(segments[i]).length > 0) {
            activeSegmentIndex = i;
            return;
        }
    }
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

/** Returns HTML string for one question card (number, text, level, hint/answer tools, revision/practiced buttons) */
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
                    <button type="button" class="btn btn-xs ${marked ? 'btn-warning' : 'btn-ghost'}" data-action="revision" title="${marked ? 'রিভিশন থেকে সরান' : 'পরবর্তীতে আবার করবেন — রিভিশন লিস্টে যোগ করুন'}" aria-label="${marked ? 'রিভিশন থেকে সরান' : 'রিভিশনের জন্য মার্ক করুন'}">
                        <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
                    </button>
                    <button type="button" class="btn btn-xs btn-ghost practice-done-btn" data-action="practiced" title="এই প্রশ্নটা প্র্যাকটিস করেছি — ক্লিক করলে কাউন্ট বাড়বে (কতবার প্র্যাকটিস করেছেন সেটা দেখাবে)" aria-label="প্র্যাকটিস করেছি — ক্লিক করলে কাউন্ট বাড়ে">
                        <i class="fa-solid fa-check" aria-hidden="true"></i><span class="practice-done-label">প্র্যাকটিস করেছি</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

/** Escapes text for safe use in HTML attributes (including quotes) */
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

/** Returns HTML string for one topic section (heading + filtered question list) */
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

/** Fills the practice sidebar list with topic links and active state; calls setupSidebarClicks */
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

/** Updates active/highlight classes on sidebar links to match activeSegmentIndex */
function updateSidebarActiveState() {
    const sidebarList = document.getElementById('practice-sidebar-list');
    if (!sidebarList) return;
    sidebarList.querySelectorAll('.practice-nav-link').forEach((navLink) => {
        const isActive = Number(navLink.getAttribute('data-segment-index')) === activeSegmentIndex;
        navLink.classList.toggle('active', isActive);
        navLink.classList.toggle('bg-js/10', isActive);
        navLink.classList.toggle('text-jsdark', isActive);
        navLink.classList.toggle('border-l-2', isActive);
        navLink.classList.toggle('border-js', isActive);
    });
}

/** Delegates clicks on sidebar topic links: set active segment, render, scroll, no hash in URL */
function setupSidebarClicks() {
    const list = document.getElementById('practice-sidebar-list');
    if (!list) return;
    list.addEventListener('click', (event) => {
        const topicLink = event.target.closest('a[href^="#topic-"]');
        if (!topicLink) return;
        event.preventDefault();
        const segmentIndexStr = topicLink.getAttribute('data-segment-index');
        if (segmentIndexStr != null) {
            activeSegmentIndex = parseInt(segmentIndexStr, 10);
            renderActiveTopicOnly();
            updateSidebarActiveState();
            const anchorHref = topicLink.getAttribute('href');
            const targetSectionId = anchorHref ? anchorHref.slice(1) : '';
            const targetSection = document.getElementById(targetSectionId);
            if (targetSection) targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (window.history && window.history.replaceState) {
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
        }
    });
}

/** Attaches click handlers for revision and practiced buttons inside the given container */
function bindQuestionActions(container) {
    if (!container) return;
    container.querySelectorAll('[data-action="revision"]').forEach((revisionButton) => {
        revisionButton.addEventListener('click', () => {
            const questionItem = revisionButton.closest('.question-item');
            const topicId = questionItem?.dataset?.topic;
            const questionId = questionItem?.dataset?.q;
            if (topicId && questionId) toggleRevision(topicId, questionId);
        });
    });
    container.querySelectorAll('[data-action="practiced"]').forEach((practicedButton) => {
        practicedButton.addEventListener('click', () => {
            const questionItem = practicedButton.closest('.question-item');
            const topicId = questionItem?.dataset?.topic;
            const questionId = questionItem?.dataset?.q;
            if (topicId && questionId) incrementPracticeCount(topicId, questionId);
        });
    });
}

/** Renders only the active topic section (keeps DOM small for performance) */
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

/** Alias for renderActiveTopicOnly for callers that expect renderAllTopics */
function renderAllTopics() {
    renderActiveTopicOnly();
}

/** Shows or hides the revision banner and updates the count; syncs filter button state */
function updateRevisionBanner() {
    const banner = document.getElementById('revision-only-banner');
    const count = revisionIds.size;
    if (!banner) return;
    if (count === 0) {
        banner.classList.add('hidden');
        document.querySelectorAll('[data-filter-revision="only"]').forEach((btn) => btn.classList.remove('active'));
        return;
    }
    banner.classList.remove('hidden');
    const numEl = banner.querySelector('[data-revision-count]');
    if (numEl) numEl.textContent = count;
    const revisionOnly = getActiveRevisionFilter();
    document.querySelectorAll('[data-filter-revision="only"]').forEach((btn) => btn.classList.toggle('active', revisionOnly));
    syncFilterAriaPressed();
}

/** Updates aria-pressed on level and revision filter buttons to match active state */
function syncFilterAriaPressed() {
    document.querySelectorAll('[data-filter-level]').forEach((el) => {
        el.setAttribute('aria-pressed', el.classList.contains('active') ? 'true' : 'false');
    });
    document.querySelectorAll('[data-filter-revision]').forEach((el) => {
        el.setAttribute('aria-pressed', el.classList.contains('active') ? 'true' : 'false');
    });
}

/** Binds level and revision filter buttons to re-render and update banner */
function setupFilters() {
    document.querySelectorAll('[data-filter-level]').forEach((el) => {
        el.addEventListener('click', () => {
            document.querySelectorAll('[data-filter-level]').forEach((e) => e.classList.remove('active'));
            el.classList.add('active');
            syncFilterAriaPressed();
            ensureActiveSegmentHasQuestions();
            renderAllTopics();
            updateSidebarActiveState();
        });
    });

    document.querySelectorAll('[data-filter-revision]').forEach((el) => {
        el.addEventListener('click', () => {
            const value = el.dataset.filterRevision;
            document.querySelectorAll('[data-filter-revision]').forEach((e) => {
                e.classList.toggle('active', e.dataset.filterRevision === value);
            });
            syncFilterAriaPressed();
            ensureActiveSegmentHasQuestions();
            renderAllTopics();
            updateRevisionBanner();
            updateSidebarActiveState();
        });
    });
}

/** Loads storage, fetches data, renders sidebar and content, sets up filters */
function init() {
    loadRevisionFromStorage();
    loadPracticeCountsFromStorage();

    fetchPracticeData()
        .then(() => {
            renderPracticeSidebar();
            renderAllTopics();
            updateRevisionBanner();
            syncFilterAriaPressed();
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

/** Updates the top scroll progress bar width on scroll (practice page) */
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

/** Smooth scroll to anchor on click and remove hash from URL (delegation for dynamic sidebar links) */
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
