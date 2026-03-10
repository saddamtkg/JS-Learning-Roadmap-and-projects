/**
 * main.js — Home page (index.html) only: syllabus tabs, projects, task/project/confetti modals.
 * All comments in English. Uses const/let only; escapes data before inserting into HTML (security).
 */

/** Escapes a string for safe insertion into HTML content (prevents XSS when rendering API data) */
function escapeHtmlForSafeInsert(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

/** Escapes a string for safe use in HTML attribute values (e.g. href, title) */
function escapeAttrForSafeInsert(text) {
    if (text == null) return '';
    return escapeHtmlForSafeInsert(text).replace(/"/g, '&quot;');
}

/** Updates the top scroll progress bar width based on page scroll position */
window.addEventListener('scroll', () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    const progressBar = document.getElementById("scroll-progress");
    if (progressBar) progressBar.style.width = scrolled + "%";
});

/** Switches the visible syllabus tab and syncs desktop tabs + mobile dropdown active state */
function switchSyllabusTab(tabId, clickedBtn = null) {
    document.querySelectorAll('.syllabus-tab-content').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('block');
    });

    const selectedTab = document.getElementById('tab-' + tabId);
    if (selectedTab) {
        selectedTab.classList.remove('hidden');
        selectedTab.classList.add('block');
    }

    if (clickedBtn) {
        document.querySelectorAll('#syllabus-tabs-nav .tab').forEach(btn => {
            btn.classList.remove('tab-active', 'bg-white', 'shadow-sm');
            btn.classList.add('hover:bg-white/50');
        });
        clickedBtn.classList.add('tab-active', 'bg-white', 'shadow-sm');
        clickedBtn.classList.remove('hover:bg-white/50');

        const mobileNav = document.getElementById('syllabus-mobile-nav');
        if (mobileNav) mobileNav.value = tabId;
    } else {
        document.querySelectorAll('#syllabus-tabs-nav .tab').forEach(btn => {
            btn.classList.remove('tab-active', 'bg-white', 'shadow-sm');
            btn.classList.add('hover:bg-white/50');
        });
        const indexMap = { 'm1': 0, 'm2': 1, 'm3': 2, 'm4': 3, 'm5': 4, 'm6-9': 5, 'm10-12': 6 };
        const btnIndex = indexMap[tabId];
        const btns = document.querySelectorAll('#syllabus-tabs-nav .tab');
        if (btns[btnIndex]) {
            btns[btnIndex].classList.add('tab-active', 'bg-white', 'shadow-sm');
            btns[btnIndex].classList.remove('hover:bg-white/50');
        }
    }
}

let taskDetails = {};
let projects = [];

/** Smooth scroll to anchor and remove hash from URL (home page in-page links) */
function initAnchorScrollNoHash() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
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
    });
}

/** Home dropdown: on hover over anchor item, scroll to section after short delay (no click needed) */
function initHomeAnchorHover() {
    const menu = document.getElementById('home-anchor-menu');
    if (!menu) return;
    let hoverTimer = null;
    menu.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('mouseenter', function () {
            const href = this.getAttribute('href');
            if (href === '#') return;
            const id = href.slice(1);
            hoverTimer = setTimeout(() => {
                const el = document.getElementById(id);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    if (window.history && window.history.replaceState) {
                        window.history.replaceState(null, '', window.location.pathname + window.location.search);
                    }
                }
                hoverTimer = null;
            }, 180);
        });
        link.addEventListener('mouseleave', function () {
            if (hoverTimer) clearTimeout(hoverTimer);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initAnchorScrollNoHash();
    initHomeAnchorHover();
    loadAppData();
});

/** Fetches tasks.json and projects.json, then renders project cards; shows error UI on failure */
async function loadAppData() {
    try {
        const container = document.getElementById('projects-container');
        if (container) {
            container.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-16">
                    <span class="loading loading-spinner loading-lg text-js mb-4"></span>
                    <p class="text-slate-400 animate-pulse font-mono">Fetching data from API...</p>
                </div>
            `;
        }

        const [tasksRes, projectsRes] = await Promise.all([
            fetch('./data/tasks.json'),
            fetch('./data/projects.json')
        ]);

        if (!tasksRes.ok || !projectsRes.ok) throw new Error("Failed to fetch API data");

        taskDetails = await tasksRes.json();
        projects = await projectsRes.json();

        renderProjects();
    } catch (error) {
        console.error("Data loading error:", error);
        const container = document.getElementById('projects-container');
        if (container) {
            const safeErrorMessage = escapeHtmlForSafeInsert(error.message);
            container.innerHTML = `
                <div class="col-span-full bg-red-900/20 border border-red-500/50 rounded-xl p-8 text-center">
                    <i class="fa-solid fa-triangle-exclamation text-4xl text-red-500 mb-3"></i>
                    <h3 class="text-xl font-bold text-red-400 mb-2">Failed to load API Data</h3>
                    <p class="text-slate-400 text-sm">এই সাইটটি লাইভ দেখতে: GitHub Pages / Netlify এ ডিপ্লয় করুন, অথবা লোকালিতে VS Code Live Server চালু করে খুলুন। সরাসরি ফাইল ওপেন (file://) করলে fetch কাজ করে না।</p>
                    <p class="text-slate-500 text-xs mt-2">${safeErrorMessage}</p>
                </div>
            `;
        }
    }
}

/** Renders project cards into #projects-container and re-runs scroll animations for new elements */
function renderProjects() {
    const container = document.getElementById('projects-container');
    if (!container) return;

    const safeProjectCards = projects.map((project, index) => {
        const animationDelay = (index % 5) + 1;
        const safeTitle = escapeAttrForSafeInsert(project.title);
        const safePhase = escapeAttrForSafeInsert(project.phase);
        const safeIcon = escapeHtmlForSafeInsert(project.icon || 'fa-code');
        const safeTags = (project.tags || []).map(tag => escapeHtmlForSafeInsert(tag));
        const borderClass = project.highlight ? 'border-js shadow-[0_0_15px_rgba(247,223,30,0.2)]' : 'border-slate-700';
        const tagsHtml = safeTags.map(tag => `<span class="badge badge-sm badge-outline border-slate-600 text-slate-300">${tag}</span>`).join('');
        return `
        <div class="card bg-slate-800 border ${borderClass} hover:border-slate-500 transition-colors cursor-pointer group scroll-animate" data-animate="fadeUp" data-delay="${animationDelay}" onclick="openProjectModal(${Number(project.id)}, '${safeTitle}', '${safePhase}')">
            <div class="card-body p-5">
                <div class="flex justify-between items-start mb-3">
                    <div class="bg-slate-700 w-10 h-10 rounded-lg flex items-center justify-center group-hover:bg-js group-hover:text-jsdark transition-colors">
                        <i class="fa-solid ${safeIcon} text-lg"></i>
                    </div>
                    <span class="text-xs text-slate-400 font-mono">#${Number(project.id)}</span>
                </div>
                <h3 class="card-title text-lg font-bold mb-1">${safeTitle}</h3>
                <div class="flex flex-wrap gap-1 mt-2">${tagsHtml}</div>
                <button class="btn btn-sm btn-ghost w-full mt-4 border border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500 group-hover:text-js group-hover:bg-slate-700/80 transition-colors">View Details</button>
            </div>
        </div>
    `;
    }).join('');
    container.innerHTML = safeProjectCards;

    if (typeof window.observeScrollAnimations === 'function') {
        window.observeScrollAnimations();
    }
}


/** Opens task detail modal for the given taskId (from tasks.json); shows title, topics, doc links */
function showTaskModal(taskId) {
    if (Object.keys(taskDetails).length === 0) {
        alert("Please wait, data is still loading from API...");
        return;
    }

    const data = taskDetails[taskId];
    if (!data) {
        console.error("Task data not found for ID:", taskId);
        return;
    }

    const taskModalTitleEl = document.getElementById('task-modal-title');
    if (taskModalTitleEl) taskModalTitleEl.textContent = data.title;

    const safeDescription = escapeHtmlForSafeInsert(data.description);
    const safeTopics = (data.topics || []).map(topic => escapeHtmlForSafeInsert(topic));
    const safeDocLink = escapeAttrForSafeInsert(data.docLink);
    const docSectionMap = { M1W1: '#arrays-objects', M1W3: '#string-json', M2W1: '#dom', M2W3: '#async', M3W1: '#dsa', M3W3: '#big-o', M4W1: '#algorithms', M4W2: '#algorithms', M5W1: '#patterns', M6W1: '#advanced-js', M10W1: '#core-array-object-loop', Welcome: '' };
    const docsHash = docSectionMap[taskId] || '';
    const topicsListHtml = safeTopics.map(t => `<li>${t}</li>`).join('');
    const taskModalDescEl = document.getElementById('task-modal-desc');
    if (taskModalDescEl) {
        taskModalDescEl.innerHTML = `<div class="bg-slate-100 p-3 rounded-lg border border-slate-200 mb-4">
        <h4 class="text-xs font-bold text-slate-500 uppercase mb-1">Target Task:</h4>
        <p class="text-sm font-mono text-slate-700">${safeDescription}</p>
    </div><h4 class="font-bold text-slate-800 border-b pb-1 mb-2">Topics to Learn:</h4><ul class="list-disc ml-5 mb-4 space-y-1 text-sm text-slate-700">${topicsListHtml}</ul><div class="mt-4 space-y-2">
        <a href="${safeDocLink}" target="_blank" rel="noopener" class="block p-3 bg-blue-50 rounded-lg border border-blue-100 text-blue-600 hover:underline text-sm font-bold"><i class="fa-solid fa-book mr-1"></i> External: Read Documentation</a>
        <a href="docs.html${docsHash}" class="block p-3 bg-slate-100 rounded-lg border border-slate-200 text-slate-700 hover:underline text-sm font-bold"><i class="fa-solid fa-book-open mr-1"></i> এই সাইটের ডকুমেন্টেশন</a>
    </div>`;
    }
    if (window.lockBodyScroll) window.lockBodyScroll();
    document.getElementById('task_modal').showModal();
}

let currentCompletedProjects = 0;

/** Opens project modal with title, phase, description and function list for the given project id */
function openProjectModal(projectId, title, phase) {
    if (projects.length === 0) return;

    const project = projects.find(p => p.id === projectId);
    const projTitleEl = document.getElementById('proj-title');
    const projPhaseEl = document.getElementById('proj-phase');
    if (projTitleEl) projTitleEl.textContent = `${projectId}. ${title}`;
    if (projPhaseEl) projPhaseEl.textContent = phase;

    let functionsHtml = '';
    if (project && project.functions && project.functions.length > 0) {
        const safeFunctions = project.functions.map(fn => escapeHtmlForSafeInsert(fn));
        functionsHtml = `<div class="mt-4 mb-2">
            <h5 class="text-xs font-bold text-slate-500 uppercase mb-2"><i class="fa-solid fa-code text-js mr-1"></i> Functions & APIs to implement:</h5>
            <div class="flex flex-wrap gap-2">${safeFunctions.map(fn => `<span class="px-2 py-1 bg-slate-700 rounded-md text-xs font-mono text-green-400 border border-slate-600">${fn}</span>`).join('')}</div>
        </div>`;
    }

    const phaseMessages = {
        DSA: "Focus on Time Complexity! Use proper Data Structures (Map/Set) instead of heavy nested arrays. Think about O(N) vs O(N^2).",
        Advanced: "Focus on Performance! Prevent Memory Leaks, use Debouncing, and ensure DOM paints are minimized.",
        Basic: "Since you know WP/PHP, compare how JS handles state on the client side vs server side rendering. Master the DOM API.",
        Intermediate: "Since you know WP/PHP, compare how JS handles state on the client side vs server side rendering. Master the DOM API."
    };
    const message = phaseMessages[phase] || "Implement this using clean JS code.";
    const projDescEl = document.getElementById('proj-desc');
    if (projDescEl) projDescEl.innerHTML = escapeHtmlForSafeInsert(message) + functionsHtml;
    if (window.lockBodyScroll) window.lockBodyScroll();
    document.getElementById('project_modal').showModal();
}

/** Closes project modal, shows toast, and updates progress circle if under 20 completed */
function markProjectComplete() {
    document.getElementById('project_modal').close();

    const toast = document.getElementById('toast-notify');
    document.getElementById('toast-msg').innerText = "Project marked as complete! 🎉";
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);

    if (currentCompletedProjects < 20) {
        currentCompletedProjects++;
        const percent = (currentCompletedProjects / 20) * 100;
        const circle = document.getElementById('project-progress-circle');
        circle.style.setProperty('--value', percent);
        circle.innerText = `${percent}%`;
    }
}

/** Shows a short toast message (used from confetti modal CTA) */
function triggerConfetti() {
    const toast = document.getElementById('toast-notify');
    document.getElementById('toast-msg').innerText = "Let's code efficiently! 💻";
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

/** Opens the confetti / roadmap goal modal (used by header button) */
function openConfettiModal() {
    if (window.lockBodyScroll) window.lockBodyScroll();
    document.getElementById('confetti-modal').showModal();
}

(function setupIndexModalsNoFlicker() {
    const onModalClose = () => setTimeout(() => { if (window.unlockBodyScroll) window.unlockBodyScroll(); }, 0);
    const taskModal = document.getElementById('task_modal');
    const projectModal = document.getElementById('project_modal');
    const confettiModal = document.getElementById('confetti-modal');
    if (taskModal) taskModal.addEventListener('close', onModalClose);
    if (projectModal) projectModal.addEventListener('close', onModalClose);
    if (confettiModal) confettiModal.addEventListener('close', onModalClose);
})();
