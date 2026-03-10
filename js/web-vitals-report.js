/**
 * Collects LCP, INP, CLS (Web Vitals) and notifies the optimizer for real performance score.
 * Load as type="module" after site-optimizer.js.
 */
import { onCLS, onINP, onLCP } from 'https://unpkg.com/web-vitals@3/dist/web-vitals.js';

if (typeof window !== 'undefined') {
  if (!window.__webVitalsMetrics) window.__webVitalsMetrics = {};

  function report(metric) {
    window.__webVitalsMetrics[metric.name] = { value: metric.value, rating: metric.rating };
    if (typeof window.__optimizerUpdateFromWebVitals === 'function') {
      window.__optimizerUpdateFromWebVitals(window.__webVitalsMetrics);
    }
  }

  onLCP(report);
  onINP(report);
  onCLS(report);
}
