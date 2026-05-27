import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import './index.css';

// Mute benign ResizeObserver errors caused by layout shifts
const hideResizeObserverError = () => {
  const e = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (typeof message === 'string' && message.includes('ResizeObserver loop')) {
      return true;
    }
    if (e) return e(message, source, lineno, colno, error);
  };
};
hideResizeObserverError();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
