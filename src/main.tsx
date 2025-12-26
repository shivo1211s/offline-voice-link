import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";


// Service worker (PWA offline support)
// IMPORTANT: In dev/preview we disable + unregister the SW to avoid caching Vite modules,
// which can cause "Invalid hook call" / "useState is null" due to mixed cached bundles.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope);
        })
        .catch((error) => {
          console.log('SW registration failed:', error);
        });
    });
  } else {
    // Dev: remove any previously registered SW + caches (prevents stale cached bundles)
    Promise.all([
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())),
      window.caches ? caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))) : Promise.resolve(),
    ])
      .then(() => {
        // Reload once to ensure we're no longer controlled by an old SW
        if (!sessionStorage.getItem('sw_unregistered_once')) {
          sessionStorage.setItem('sw_unregistered_once', '1');
          window.location.reload();
        }
      })
      .catch(() => {
        // ignore
      });
  }
}


createRoot(document.getElementById("root")!).render(<App />);
