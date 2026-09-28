import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: true,
      // Allow Dev Tunnels (VS Code port forwarding) to reach this dev server.
      // The tunnel domain is not a loopback or LAN address, so Vite's default
      // Host allowlist rejects it with 403.
      allowedHosts: ['.devtunnels.ms'],
    },
    build: {
      minify: 'esbuild' as const,
      cssCodeSplit: true,
      target: 'es2020',
      // Reduce chunk size warning limit
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Vendor chunks - prioritize specific libraries first
            if (id.includes('node_modules')) {
              if (id.includes('recharts')) {
                return 'vendor-recharts';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-lucide';
              }
              if (id.includes('motion')) {
                return 'vendor-motion';
              }
              if (id.includes('@radix-ui') || id.includes('@headlessui')) {
                return 'vendor-ui';
              }
              if (id.includes('date-fns') || id.includes('clsx') || id.includes('classnames')) {
                return 'vendor-utils';
              }
              // react's own runtime dependencies must live beside react and
              // react-dom, otherwise vendor-react and vendor-other import each
              // other and Rollup reports a circular chunk. They are loaded
              // eagerly either way, so the first-load payload does not change.
              if (
                id.includes('react') ||
                id.includes('react-dom') ||
                id.includes('react-router') ||
                id.includes('scheduler') ||
                id.includes('use-sync-external-store')
              ) {
                return 'vendor-react';
              }
              return 'vendor-other';
            }
            // Shared app runtime: the contexts, API client, hooks and utils are
            // imported by the entry point *and* by every lazy page. Giving them
            // a chunk of their own stops the page chunks from importing each
            // other (Rollup warns about those cycles) and keeps exactly the same
            // modules in the first-load payload.
            if (
              id.includes('/src/context/') ||
              id.includes('/src/api/') ||
              id.includes('/src/utils/') ||
              id.includes('/src/hooks/') ||
              // VoiceSpellingParser is a plain module pulled in by the
              // useSpeechRecognition hook, so it travels with the hooks.
              id.includes('/src/components/VoiceSpellingParser')
            ) {
              return 'app-core';
            }
            // Supervisor dashboard is heavy and its tabs live in /components,
            // so this rule has to run before the page-only rules below.
            if (
              id.includes('SupervisorDashboard') ||
              id.includes('SupervisorAnalytics') ||
              id.includes('ClassroomManager') ||
              id.includes('CurriculumPreviewTab')
            ) {
              return 'page-supervisor';
            }
            // Page chunks - lazy loaded pages (only for pages, not components)
            if (id.includes('/pages/')) {
              // Admin pages
              if (id.includes('/admin/') || id.includes('Admin')) {
                return 'page-admin';
              }
              // Game pages
              if (
                id.includes('GameLoop') ||
                id.includes('RoundResult') ||
                id.includes('DailyChallenge') ||
                id.includes('TrailMap') ||
                id.includes('PlacementQuiz')
              ) {
                return 'page-game';
              }
              return 'page-other';
            }
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
  };
});
