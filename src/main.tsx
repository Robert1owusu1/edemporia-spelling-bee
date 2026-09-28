import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// index.html ships a `<div id="root">`; fail loudly if that ever changes
// rather than handing `null` to createRoot (the old `!` assertion).
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root container #root is missing from index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
