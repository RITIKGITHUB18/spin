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
      refetchOnWindowFocus: false,
    },
  },
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('[pwa] SW registration failed', err));
  });
}

createRoot(document.getElementById('root')!).render(
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
