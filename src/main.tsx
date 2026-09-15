import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Pinch zoom & double-tap zoom must only apply inside the Leaflet map,
// so block the browser's native page zoom anywhere else on touch devices.
const isOnMap = (target: EventTarget | null) =>
  target instanceof Element && target.closest('.leaflet-container') != null;

let lastTouchEnd = 0;
document.addEventListener(
  'touchstart',
  (e) => {
    if (e.touches.length >= 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      if (!isOnMap(a.target) && !isOnMap(b.target)) e.preventDefault();
    } else if (!isOnMap(e.touches[0]?.target)) {
      const now = Date.now();
      if (now - lastTouchEnd < 350) e.preventDefault(); // double-tap outside map
      lastTouchEnd = now;
    }
  },
  { passive: false },
);
document.addEventListener('touchend', () => {
  lastTouchEnd = Date.now();
}, { passive: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
