// Scroll Progress Bar
window.addEventListener('scroll', () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    const progressBar = document.getElementById("scroll-progress");
    if (progressBar) progressBar.style.width = scrolled + "%";
});

// Tab Navigation Logic
function switchSyllabusTab(tabId, clickedBtn = null) {
    // Hide all tab contents
    document.querySelectorAll('.syllabus-tab-content').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('block');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById('tab-' + tabId);
    if(selectedTab) {
        selectedTab.classList.remove('hidden');
        selectedTab.classList.add('block');
    }

    // Update active state on desktop tabs
    if(clickedBtn) {
        document.querySelectorAll('#syllabus-tabs-nav .tab').forEach(btn => {
            btn.classList.remove('tab-active', 'bg-white', 'shadow-sm');
            btn.classList.add('hover:bg-white/50');
        });
        clickedBtn.classList.add('tab-active', 'bg-white', 'shadow-sm');
        clickedBtn.classList.remove('hover:bg-white/50');
        
        // Sync mobile dropdown
        const mobileNav = document.getElementById('syllabus-mobile-nav');
        if(mobileNav) mobileNav.value = tabId;
    } else {
        // If called from mobile dropdown, sync desktop tabs visually (though hidden on mobile)
        document.querySelectorAll('#syllabus-tabs-nav .tab').forEach(btn => {
            btn.classList.remove('tab-active', 'bg-white', 'shadow-sm');
            btn.classList.add('hover:bg-white/50');
        });
        // Find the matching desktop button and make it active
        const indexMap = {'m1':0, 'm2':1, 'm3':2, 'm4':3, 'm5':4, 'm6-9':5, 'm10-12':6};
        const btnIndex = indexMap[tabId];
        const btns = document.querySelectorAll('#syllabus-tabs-nav .tab');
        if(btns[btnIndex]) {
            btns[btnIndex].classList.add('tab-active', 'bg-white', 'shadow-sm');
            btns[btnIndex].classList.remove('hover:bg-white/50');
        }
    }
}

// Global Data Variables for dynamic fetching
let taskDetails = {};
let projects = [];

// Initialize App & Fetch Data
document.addEventListener('DOMContentLoaded', () => {
    loadAppData();
});

async function loadAppData() {
    try {
        // Show loading spinner in projects container
        const container = document.getElementById('projects-container');
        if (container) {
            container.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-16">
                    <span class="loading loading-spinner loading-lg text-js mb-4"></span>
                    <p class="text-slate-400 animate-pulse font-mono">Fetching data from API...</p>
                </div>
            `;
        }

        // Fetch both JSON files in parallel
        const [tasksRes, projectsRes] = await Promise.all([
            fetch('./data/tasks.json'),
            fetch('./data/projects.json')
        ]);

        if (!tasksRes.ok || !projectsRes.ok) {
            throw new Error("Failed to fetch API data");
        }

        // Parse JSON
        taskDetails = await tasksRes.json();
        projects = await projectsRes.json();

        // Render the data
        renderProjects();

    } catch (error) {
        console.error("Data loading error:", error);
        const container = document.getElementById('projects-container');
        if (container) {
            container.innerHTML = `
                <div class="col-span-full bg-red-900/20 border border-red-500/50 rounded-xl p-8 text-center">
                    <i class="fa-solid fa-triangle-exclamation text-4xl text-red-500 mb-3"></i>
                    <h3 class="text-xl font-bold text-red-400 mb-2">Failed to load API Data</h3>
                    <p class="text-slate-400 text-sm">এই সাইটটি লাইভ দেখতে: GitHub Pages / Netlify এ ডিপ্লয় করুন, অথবা লোকালিতে VS Code Live Server চালু করে খুলুন। সরাসরি ফাইল ওপেন (file://) করলে fetch কাজ করে না।</p>
                </div>
            `;
        }
    }
}

function renderProjects() {
    const container = document.getElementById('projects-container');
    if (!container) return;
    
    container.innerHTML = projects.map((p, i) => {
        const delay = (i % 5) + 1;
        return `
        <div class="card bg-slate-800 border ${p.highlight ? 'border-js shadow-[0_0_15px_rgba(247,223,30,0.2)]' : 'border-slate-700'} hover:border-slate-500 transition-colors cursor-pointer group scroll-animate" data-animate="fadeUp" data-delay="${delay}" onclick="openProjectModal(${p.id}, '${p.title}', '${p.phase}')">
            <div class="card-body p-5">
                <div class="flex justify-between items-start mb-3">
                    <div class="bg-slate-700 w-10 h-10 rounded-lg flex items-center justify-center group-hover:bg-js group-hover:text-jsdark transition-colors">
                        <i class="fa-solid ${p.icon} text-lg"></i>
                    </div>
                    <span class="text-xs text-slate-400 font-mono">#${p.id}</span>
                </div>
                <h3 class="card-title text-lg font-bold mb-1">${p.title}</h3>
                <div class="flex flex-wrap gap-1 mt-2">
                    ${p.tags.map(t => `<span class="badge badge-sm badge-outline border-slate-600 text-slate-300">${t}</span>`).join('')}
                </div>
                <button class="btn btn-sm btn-ghost w-full mt-4 border border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500 group-hover:text-js group-hover:bg-slate-700/80 transition-colors">View Details</button>
            </div>
        </div>
    `;
    }).join('');

    if (typeof window.observeScrollAnimations === 'function') {
        window.observeScrollAnimations();
    }
}

// Task Modal Logic Update
function showTaskModal(taskId) {
    // If data isn't loaded yet
    if(Object.keys(taskDetails).length === 0) {
        alert("Please wait, data is still loading from API...");
        return;
    }

    const data = taskDetails[taskId];
    if(!data) {
        console.error("Task data not found for ID:", taskId);
        return;
    }

    document.getElementById('task-modal-title').innerText = data.title;
    
    // Create rich HTML content for topics
    let htmlContent = `<div class="bg-slate-100 p-3 rounded-lg border border-slate-200 mb-4">
        <h4 class="text-xs font-bold text-slate-500 uppercase mb-1">Target Task:</h4>
        <p class="text-sm font-mono text-slate-700">${data.description}</p>
    </div>`;
    
    htmlContent += `<h4 class="font-bold text-slate-800 border-b pb-1 mb-2">Topics to Learn:</h4>`;
    htmlContent += `<ul class="list-disc ml-5 mb-4 space-y-1 text-sm text-slate-700">`;
    data.topics.forEach(topic => {
        htmlContent += `<li>${topic}</li>`;
    });
    htmlContent += `</ul>`;

    const docSection = { M1W1: '#arrays-objects', M1W3: '#string-json', M2W1: '#dom', M2W3: '#async', M3W1: '#dsa', M3W3: '#big-o', M4W1: '#algorithms', M4W2: '#algorithms', M5W1: '#patterns', M6W1: '#advanced-js', M10W1: '#core-array-object-loop', Welcome: '' };
    const docsHash = docSection[taskId] || '';
    htmlContent += `<div class="mt-4 space-y-2">
        <a href="${data.docLink}" target="_blank" rel="noopener" class="block p-3 bg-blue-50 rounded-lg border border-blue-100 text-blue-600 hover:underline text-sm font-bold"><i class="fa-solid fa-book mr-1"></i> External: Read Documentation</a>
        <a href="docs.html${docsHash}" class="block p-3 bg-slate-100 rounded-lg border border-slate-200 text-slate-700 hover:underline text-sm font-bold"><i class="fa-solid fa-book-open mr-1"></i> এই সাইটের ডকুমেন্টেশন</a>
    </div>`;

    document.getElementById('task-modal-desc').innerHTML = htmlContent;
    document.getElementById('task_modal').showModal();
}

// Ensure Welcome modal uses the new format
function showWelcomeModal() {
    showTaskModal('Welcome');
}

// Project Modal Logic
let currentCompletedProjects = 0;

function openProjectModal(id, title, phase) {
    if(projects.length === 0) return;

    const project = projects.find(p => p.id === id);
    document.getElementById('proj-title').innerText = `${id}. ${title}`;
    document.getElementById('proj-phase').innerText = phase;
    
    let functionsHtml = '';
    if (project && project.functions) {
        functionsHtml = `<div class="mt-4 mb-2">
            <h5 class="text-xs font-bold text-slate-500 uppercase mb-2"><i class="fa-solid fa-code text-js mr-1"></i> Functions & APIs to implement:</h5>
            <div class="flex flex-wrap gap-2">` + 
            project.functions.map(f => `<span class="px-2 py-1 bg-slate-700 rounded-md text-xs font-mono text-green-400 border border-slate-600">${f}</span>`).join('') + 
            `</div>
        </div>`;
    }
    
    // Custom messages based on phase to link with DSA/Opt
    let msg = "Implement this using clean JS code.";
    if(phase === "DSA") msg = "Focus on Time Complexity! Use proper Data Structures (Map/Set) instead of heavy nested arrays. Think about O(N) vs O(N^2).";
    if(phase === "Advanced") msg = "Focus on Performance! Prevent Memory Leaks, use Debouncing, and ensure DOM paints are minimized.";
    if(phase === "Basic" || phase === "Intermediate") msg = "Since you know WP/PHP, compare how JS handles state on the client side vs server side rendering. Master the DOM API.";
    
    document.getElementById('proj-desc').innerHTML = `${msg}${functionsHtml}`;
    document.getElementById('project_modal').showModal();
}

function markProjectComplete() {
    document.getElementById('project_modal').close();
    
    // Show Toast
    const toast = document.getElementById('toast-notify');
    document.getElementById('toast-msg').innerText = "Project marked as complete! 🎉";
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);

    // Update Circle
    if(currentCompletedProjects < 20) {
        currentCompletedProjects++;
        const percent = (currentCompletedProjects / 20) * 100;
        const circle = document.getElementById('project-progress-circle');
        circle.style.setProperty('--value', percent);
        circle.innerText = `${percent}%`;
    }
}

function triggerConfetti() {
    const toast = document.getElementById('toast-notify');
    document.getElementById('toast-msg').innerText = "Let's code efficiently! 💻";
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}