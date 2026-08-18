import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // '' loads every key, not just VITE_-prefixed ones — this is a dev-server
  // setting, never bundled into the client.
  const env = loadEnv(mode, process.cwd(), '');

  // Point the dev server at a different backend without touching code:
  //   API_PROXY_TARGET=https://api.getspin.in npm run dev
  // Going through the proxy rather than setting VITE_API_URL matters — the
  // browser then makes a same-origin request to localhost and never triggers
  // CORS, which production would reject since its allow-list has no localhost.
  const apiTarget = env.API_PROXY_TARGET || 'http://localhost:4000';
  if (apiTarget !== 'http://localhost:4000') {
    console.log(`\n  ⚠  /api is proxied to ${apiTarget} — this is real data.\n`);
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        // lottie-react pulls in the full player, whose expression engine is built
        // on direct `eval` — a build warning, and dead under a strict CSP. The
        // light build drops that engine (589kB -> 365kB raw). Nothing here needs
        // it: the only expressions were loopOut('cycle') in washing-machine.json,
        // now baked into real keyframes.
        'lottie-web': 'lottie-web/build/player/esm/lottie_light.min.js',
      },
    },
    build: {
      rolldownOptions: {
        output: {
          // Split by library so a change to app code does not invalidate the whole
          // vendor bundle in users' caches. The separator class matches a Windows
          // backslash as well as a POSIX slash, since module ids arrive in either
          // form depending on the platform.
          codeSplitting: {
            groups: [
              { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
              { name: 'motion', test: /node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/ },
              { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/ },
              { name: 'gsap', test: /node_modules[\\/](gsap|@gsap)[\\/]/ },
              // lottie is deliberately excluded: it is reached only through the
              // lazy import in LottiePlayer, and folding it into `vendor` would
              // drag all 177kB back onto the critical path.
              { name: 'vendor', test: /node_modules[\\/](?!lottie)/ },
            ],
          },
        },
      },
    },
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          // Needed when the target is https — otherwise SNI/vhost routing fails.
          secure: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
    },
  };
});
