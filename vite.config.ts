import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

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
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'vendor-react';
              }
              return 'vendor-other';
            }
            // Page chunks - lazy loaded pages (only for pages, not components)
            if (id.includes('/pages/')) {
              // Supervisor dashboard is heavy - separate chunk
              if (id.includes('SupervisorDashboard') || id.includes('SupervisorAnalytics') ||
                  id.includes('AssignmentManager') || id.includes('MaterialsLibrary') ||
                  id.includes('ClassroomManager') || id.includes('CurriculumPreviewTab')) {
                return 'page-supervisor';
              }
              // Admin pages
              if (id.includes('/admin/') || id.includes('Admin')) {
                return 'page-admin';
              }
              // Org pages
              if (id.includes('/org/') || id.includes('Org')) {
                return 'page-org';
              }
              // Game pages
              if (id.includes('GameLoop') || id.includes('RoundResult') || id.includes('DailyChallenge') ||
                  id.includes('Battles') || id.includes('TrailMap') || id.includes('PlacementQuiz')) {
                return 'page-game';
              }
              // Learning hub
              if (id.includes('LearningHub') || id.includes('TeacherLearningHub') || id.includes('AssignmentAttempt')) {
                return 'page-learning';
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
