class SiteOptimizer {
    constructor(containerId = 'seo-widget-container') {
        this.containerId = containerId;
        this.results = this.getDefaultResults();
        
        // Wait for page to fully load so we can measure performance
        if (document.readyState === 'complete') {
            this.init();
        } else {
            window.addEventListener('load', () => setTimeout(() => this.init(), 500));
        }
    }

    getDefaultResults() {
        return {
            perf: { score: 100, label: 'Performance', icon: 'fa-bolt', issues: [], color: '' },
            a11y: { score: 100, label: 'Accessibility', icon: 'fa-universal-access', issues: [], color: '' },
            bp: { score: 100, label: 'Best Practices', icon: 'fa-thumbs-up', issues: [], color: '' },
            seo: { score: 100, label: 'SEO', icon: 'fa-magnifying-glass', issues: [], color: '' }
        };
    }

    init() {
        this.analyze();
        this.renderWidget();
    }

    rescan() {
        // Show scanning state in modal button
        const btn = document.getElementById('rescan-btn');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right: 5px;"></i> Scanning...';
        
        setTimeout(() => {
            this.results = this.getDefaultResults(); // Reset results
            this.analyze(); // Re-evaluate the live DOM
            this.renderWidget(); // Update UI
            this.openModal(); // Ensure modal stays open
        }, 600); // Fake small delay for effect
    }

    analyze() {
        // --- 1. Performance ---
        let perfScore = 100;
        
        // Load Time
        let loadTime = 0;
        if (window.performance) {
            const navEntries = window.performance.getEntriesByType("navigation");
            if (navEntries.length > 0) {
                loadTime = Math.round(navEntries[0].domContentLoadedEventEnd);
            } else if (window.performance.timing) {
                const t = window.performance.timing;
                loadTime = t.domContentLoadedEventEnd - t.navigationStart;
            }
        }
        
        if (loadTime > 800 && loadTime < 10000) { // Sanity check to avoid negative huge drops
            const drop = Math.floor((loadTime - 800) / 100);
            perfScore -= drop;
            this.results.perf.issues.push(`Page load time is slow: <b>${loadTime}ms</b>. Aim for < 800ms.`);
        } else if (loadTime <= 800 && loadTime > 0) {
            this.results.perf.issues.push(`Great page load time: <b>${loadTime}ms</b>.`);
        } else {
            this.results.perf.issues.push(`Could not accurately measure page load time.`);
        }
        
        // DOM Size
        const domElements = document.getElementsByTagName('*').length;
        if (domElements > 800) {
            perfScore -= Math.floor((domElements - 800) / 50);
            this.results.perf.issues.push(`Too many DOM elements: <b>${domElements}</b>. This causes layout lag. Limit to < 800.`);
        } else {
            this.results.perf.issues.push(`DOM size is optimal: <b>${domElements}</b> elements.`);
        }

        // Unoptimized Images (No explicit width/height to prevent layout shifts)
        const allImages = document.querySelectorAll('img');
        let unoptimizedImgs = [];
        allImages.forEach(img => {
            if (!img.hasAttribute('width') && !img.hasAttribute('height') && !img.style.width) {
                unoptimizedImgs.push(img.src.split('/').pop() || 'Inline Image');
            }
        });
        if (unoptimizedImgs.length > 0) {
            perfScore -= (unoptimizedImgs.length * 2);
            this.results.perf.issues.push(`Found <b>${unoptimizedImgs.length}</b> image(s) without explicit width/height (Causes Cumulative Layout Shift). Examples: ${unoptimizedImgs.slice(0,2).join(', ')}`);
        }

        // --- 2. Accessibility ---
        let a11yScore = 100;
        
        // Images without Alt
        let missingAlt = [];
        allImages.forEach(img => {
            if (!img.hasAttribute('alt') || img.getAttribute('alt').trim() === '') {
                missingAlt.push(img.src.split('/').pop() || 'Unknown Image');
            }
        });
        if (missingAlt.length > 0) {
            a11yScore -= Math.min(40, missingAlt.length * 10);
            this.results.a11y.issues.push(`Found <b>${missingAlt.length}</b> image(s) missing 'alt' attributes. Files: ${missingAlt.slice(0,3).join(', ')}`);
        } else if (allImages.length > 0) {
            this.results.a11y.issues.push(`All ${allImages.length} images have 'alt' text.`);
        }

        // HTML Lang — bn (Bengali) ও en বৈধ; শুধু অনুপস্থিত থাকলে ইস্যু
        const htmlLang = document.documentElement.getAttribute('lang');
        if (!htmlLang) {
            a11yScore -= 15;
            this.results.a11y.issues.push(`The <code>&lt;html&gt;</code> tag is missing a 'lang' attribute.`);
        } else {
            const validLang = /^(en|bn|hi|ar)(-[A-Za-z]+)?$/.test(htmlLang);
            if (validLang) {
                this.results.a11y.issues.push(`HTML lang is set correctly: <b>"${htmlLang}"</b> (good for screen readers).`);
            } else {
                this.results.a11y.issues.push(`HTML lang attribute is set to <b>"${htmlLang}"</b>.`);
            }
        }

        // Empty Buttons/Links — যেগুলোতে কোনো পাঠ্য বা aria-label নেই (আইকন-অনলি সহ)
        const interactive = document.querySelectorAll('button, a');
        let emptyElements = [];
        interactive.forEach(el => {
            const hasAccessibleName = el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('aria-labelledby');
            const hasText = (el.innerText || el.textContent || '').trim().length >= 2;
            if (!hasAccessibleName && !hasText) {
                emptyElements.push(el.tagName.toLowerCase());
            }
        });
        if (emptyElements.length > 0) {
            a11yScore -= Math.min(25, emptyElements.length * 5);
            this.results.a11y.issues.push(`Found <b>${emptyElements.length}</b> interactive element(s) without readable text or 'aria-label'. Add <code>aria-label</code> for screen readers.`);
        } else {
            this.results.a11y.issues.push(`All buttons and links have accessible names.`);
        }

        // --- 3. Best Practices ---
        let bpScore = 100;
        
        // Doctype
        if (document.compatMode !== 'CSS1Compat') {
            bpScore -= 20;
            this.results.bp.issues.push(`Page does not have a valid <code>&lt;!DOCTYPE html&gt;</code> declaration (Quirks Mode).`);
        } else {
            this.results.bp.issues.push(`Valid HTML5 Doctype found.`);
        }

        // HTTPS
        if (location.protocol !== 'https:' && location.hostname !== '127.0.0.1' && location.hostname !== 'localhost') {
            bpScore -= 20;
            this.results.bp.issues.push(`Site is not served over HTTPS. Real-world sites need SSL certificates.`);
        } else {
            this.results.bp.issues.push(`Secure connection (HTTPS or Localhost) is active.`);
        }
        
        // Deprecated APIs (Simplified check)
        if (document.querySelectorAll('font, center, marquee, blink').length > 0) {
            bpScore -= 15;
            this.results.bp.issues.push(`Found deprecated HTML tags (e.g., font, center). Use CSS instead.`);
        }

        // --- 4. SEO ---
        let seoScore = 100;
        
        // Title
        if (!document.title || document.title.length < 5) {
            seoScore -= 20;
            this.results.seo.issues.push(`Document <code>&lt;title&gt;</code> is missing or too short.`);
        } else {
            this.results.seo.issues.push(`Document title is excellent: <b>"${document.title}"</b>`);
        }

        // Meta Description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc || metaDesc.getAttribute('content').trim().length < 10) {
            seoScore -= 20;
            this.results.seo.issues.push(`Missing or too short <code>&lt;meta name="description"&gt;</code>. This is critical for Google Search.`);
        } else {
            this.results.seo.issues.push(`Meta description is properly set.`);
        }

        // Viewport
        const viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            seoScore -= 15;
            this.results.seo.issues.push(`Missing <code>&lt;meta name="viewport"&gt;</code> tag for mobile responsiveness.`);
        } else {
            this.results.seo.issues.push(`Viewport meta tag is configured for mobile.`);
        }

        // H1 Usage
        const h1s = document.querySelectorAll('h1');
        if (h1s.length === 0) {
            seoScore -= 15;
            this.results.seo.issues.push(`Page does not have an <code>&lt;h1&gt;</code> heading. Search engines need this to understand page context.`);
        } else if (h1s.length > 1) {
            seoScore -= 5;
            this.results.seo.issues.push(`Page has <b>${h1s.length}</b> <code>&lt;h1&gt;</code> headings. Best practice is exactly one per page.`);
        } else {
            this.results.seo.issues.push(`Found exactly one <code>&lt;h1&gt;</code> tag.`);
        }

        // Enforce Bounds and Assign Colors
        Object.keys(this.results).forEach(key => {
            let score = eval(key + 'Score');
            score = Math.max(0, Math.min(100, score));
            this.results[key].score = score;
            
            if (score >= 90) this.results[key].color = '#22c55e'; // Green
            else if (score >= 60) this.results[key].color = '#f59e0b'; // Orange
            else this.results[key].color = '#ef4444'; // Red
        });
    }

    renderWidget() {
        let container = document.getElementById(this.containerId);
        if (!container) return;

        // Render the floating widget
        container.innerHTML = `
            <div id="floating-seo-widget" style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; background: #0f172a; color: white; padding: 15px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155; width: 220px; font-family: sans-serif; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" onclick="window.optimizerInstance.openModal()">
                <h4 style="margin: 0 0 6px 0; font-size: 14px; font-weight: bold; color: #F7DF1E;">
                    <span><i class="fa-solid fa-gauge-high"></i> Optimizer Goal</span>
                </h4>
                <div style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #334155;">
                    <div id="optimizer-widget-date" style="font-variant-numeric: tabular-nums; font-size: 14px; color: #fff; font-weight: 600; line-height: 1.3;">-- --- ----</div>
                    <div id="optimizer-widget-clock" style="font-variant-numeric: tabular-nums; font-size: 15px; color: #fff; font-weight: 700; line-height: 1.3;">--:--:-- --</div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
                    <span>Performance</span>
                    <span style="color: ${this.results.perf.color}; font-weight: bold; font-family: monospace;">${this.results.perf.score}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
                    <span>Accessibility</span>
                    <span style="color: ${this.results.a11y.color}; font-weight: bold; font-family: monospace;">${this.results.a11y.score}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
                    <span>Best Practices</span>
                    <span style="color: ${this.results.bp.color}; font-weight: bold; font-family: monospace;">${this.results.bp.score}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 12px;">
                    <span>SEO</span>
                    <span style="color: ${this.results.seo.color}; font-weight: bold; font-family: monospace;">${this.results.seo.score}</span>
                </div>
                
                <div style="margin-top: 10px; font-size: 10px; text-align: center; color: #94a3b8; border-top: 1px dashed #334155; padding-top: 5px;">
                    Click to view detailed issues
                </div>
            </div>
        `;

        this.startClock();
        // Create or update modal
        this.renderModal();
    }

    startClock() {
        const pad = (n) => (n < 10 ? '0' + n : '' + n);
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const update = () => {
            const dateEl = document.getElementById('optimizer-widget-date');
            const clockEl = document.getElementById('optimizer-widget-clock');
            if (!dateEl || !clockEl) return;
            const d = new Date();
            const h = d.getHours();
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            dateEl.textContent = d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
            clockEl.textContent = pad(h12) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + ' ' + ampm;
        };
        if (this.clockInterval) clearInterval(this.clockInterval);
        update();
        this.clockInterval = setInterval(update, 1000);
    }

    renderModal() {
        // Remove existing modal if any
        const existingModal = document.getElementById('seo-modal-overlay');
        if (existingModal) existingModal.remove();

        let modalHtml = `
            <div id="seo-modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 10000; justify-content: center; align-items: center; backdrop-filter: blur(4px);">
                <div style="background: white; border-radius: 16px; width: 90%; max-width: 900px; max-height: 90vh; overflow-y: auto; padding: 30px; position: relative; font-family: sans-serif; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
                    
                    <button aria-label="Close analysis modal" onclick="window.optimizerInstance.closeModal()" style="position: absolute; top: 15px; right: 20px; background: none; border: none; font-size: 28px; cursor: pointer; color: #64748b; line-height: 1;">&times;</button>
                    
                    <h2 style="margin: 0 0 5px 0; font-size: 24px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 10px;">
                        <i class="fa-solid fa-laptop-code" style="color: #3b82f6;"></i> Real-Time DOM & Page Analysis
                    </h2>
                    <p style="margin: 0 0 25px 0; font-size: 14px; color: #64748b;">Live evaluation of exact DOM elements and current page state.</p>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px;">
        `;

        Object.keys(this.results).forEach(key => {
            const data = this.results[key];
            
            const issuesList = data.issues.map(issue => {
                const isGood = issue.includes('Great') || issue.includes('optimal') || issue.includes('correctly') || issue.includes('All') || issue.includes('Valid') || issue.includes('Secure') || issue.includes('properly') || issue.includes('configured') || issue.includes('exactly one') || issue.includes('excellent');
                const iconColor = isGood ? '#22c55e' : '#ef4444';
                const iconClass = isGood ? 'fa-check-circle' : 'fa-triangle-exclamation';
                
                return `<li style="display:flex; align-items:flex-start; gap:10px; margin-bottom:12px; font-size:13px; color:#475569; line-height: 1.5; background: ${isGood ? '#f0fdf4' : '#fef2f2'}; padding: 10px; border-radius: 8px; border: 1px solid ${isGood ? '#bbf7d0' : '#fecaca'};">
                            <i class="fa-solid ${iconClass}" style="color:${iconColor}; margin-top:2px;"></i>
                            <span style="flex: 1;">${issue}</span>
                        </li>`;
            }).join('');

            modalHtml += `
                <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
                                <i class="fa-solid ${data.icon} fa-lg" style="color: #64748b;"></i>
                            </div>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #1e293b;">${data.label}</h3>
                        </div>
                        <div style="font-size: 28px; font-weight: 800; color: ${data.color}; font-family: monospace;">
                            ${data.score}
                        </div>
                    </div>
                    <ul style="list-style: none; padding: 0; margin: 0; max-height: 250px; overflow-y: auto; padding-right: 5px;">
                        ${issuesList}
                    </ul>
                </div>
            `;
        });

        modalHtml += `
                    </div>
                    <div style="margin-top: 30px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                        <button id="rescan-btn" onclick="window.optimizerInstance.rescan()" style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 15px; transition: background 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                            <i class="fa-solid fa-rotate-right" style="margin-right: 8px;"></i> Live Re-Scan DOM
                        </button>
                        <p style="margin-top: 10px; font-size: 12px; color: #94a3b8;">Scans the live DOM. If you changed things via dev tools, score will update instantly without page refresh.</p>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    openModal() {
        const modal = document.getElementById('seo-modal-overlay');
        if (modal) modal.style.display = 'flex';
    }

    closeModal() {
        const modal = document.getElementById('seo-modal-overlay');
        if (modal) modal.style.display = 'none';
    }
}

// Instantiate and expose globally so inline onclick works
window.optimizerInstance = new SiteOptimizer('seo-widget-container');
