import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import { initAuthBridge, supabaseConfigured } from './services/supabase.ts';

// Must run before render so the route guards see a restored session rather than
// bouncing a signed-in user to the splash screen on reload.
if (supabaseConfigured) initAuthBridge();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Now that nothing polls, this is the main way stale data catches up
      // after the app has been in the background. staleTime on each query
      // stops it firing on every incidental focus.
      refetchOnWindowFocus: true,
    },
  },
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('[pwa] SW registration failed', err));
  });
}

/**
 * Removes the inline splash in index.html once React has actually painted,
 * rather than after a fixed delay — a timer either uncovers a blank screen on a
 * slow device or holds the splash after the app is ready.
 */
function dismissBootSplash(): void {
  const boot = document.getElementById('boot');
  if (!boot) return;
  boot.classList.add('done');
  boot.addEventListener('transitionend', () => boot.remove(), { once: true });
  // transitionend never fires under reduced motion or in a hidden tab.
  setTimeout(() => boot.remove(), 600);
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    {!supabaseConfigured ? (
      <div style={{ padding: 24, fontFamily: 'system-ui', lineHeight: 1.5 }}>
        <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>Supabase is not configured</h1>
        <p style={{ margin: 0, color: '#545454' }}>
          Copy <code>frontend/.env.example</code> to <code>frontend/.env</code> and set
          <code> VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then restart the
          dev server.
        </p>
      </div>
    ) : (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
    )}
  </StrictMode>
);

// Two frames: the first schedules React's commit, the second runs after it has
// been painted.
requestAnimationFrame(() => requestAnimationFrame(dismissBootSplash));
