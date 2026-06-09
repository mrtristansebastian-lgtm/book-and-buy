import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    minify: 'terser',
    modulePreload: {
      resolveDependencies(filename, deps, context) {
        if (context?.hostType === 'html') {
          return deps.filter((dep) => !dep.includes('owner-workspace-runtime'));
        }
        return deps;
      }
    },
    terserOptions: {
      compress: {
        passes: 4,
        drop_console: true,
        drop_debugger: true
      },
      format: {
        comments: false
      }
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (
            normalizedId.includes('/src/components/AppErrorBoundary') ||
            normalizedId.includes('/src/components/AppLoading') ||
            normalizedId.includes('/src/components/BuildABookingBrand') ||
            normalizedId.includes('/src/services/errorReporting') ||
            normalizedId.includes('/src/features/bookings/utils/bookingActionHelpers') ||
            normalizedId.includes('/src/features/communications/communicationsModel') ||
            normalizedId.includes('/src/utils/clientPortalRoute') ||
            normalizedId.includes('/src/utils/publicBookingRoute') ||
            normalizedId.includes('/src/utils/slugs')
          ) return 'app-shell';
          if (normalizedId.includes('/src/services/firebase')) return 'firebase-app';
          if (normalizedId.includes('/src/shared/settings/publishableSettings')) return 'settings-model';
          if (normalizedId.includes('/src/data/fonts')) return 'font-engine';
          if (normalizedId.includes('/src/components/OnboardingShowroom')) return 'onboarding-tour';
          if (
            normalizedId.includes('/src/features/profile/components/ProfileNotificationsSection') ||
            normalizedId.includes('/src/features/finance/components/MigrationImportPanel') ||
            normalizedId.includes('/src/components/MigrationImportPanel') ||
            normalizedId.includes('/src/components/OwnerManual')
          ) return 'owner-workspace-runtime';
          if (normalizedId.includes('/src/components/BusinessCalendar')) return 'schedule-workspace';
          if (normalizedId.includes('/src/features/public-booking/hooks/useBookingPageLauncher')) return 'owner-workspace-runtime';
          if (normalizedId.includes('/src/features/public-booking/PublicBookingApp')) return 'public-booking-runtime';
          if (
            normalizedId.includes('/src/features/public-booking/pages/') ||
            normalizedId.includes('/src/features/public-booking/hooks/')
          ) return 'public-booking-runtime';
          if (normalizedId.includes('/src/features/app-runtime/OwnerWorkspaceApp')) return 'owner-workspace-runtime';
          if (normalizedId.includes('/src/components/BookingFlow')) return 'booking-core';
          if ([
            '/src/features/booking-flow/components/BookingCartStep',
            '/src/features/booking-flow/components/BookingCheckoutStep',
            '/src/features/booking-flow/components/BookingPaymentStep',
            '/src/features/booking-flow/components/BookingSuccessState'
          ].some((path) => normalizedId.includes(path))) return 'booking-core';
          if (normalizedId.includes('/src/features/public-booking/components/PublicBookingFlow')) return 'public-booking-runtime';
          if (normalizedId.includes('/src/features/editor/components/EditorBookingPreview')) return 'booking-core';
          if (normalizedId.includes('node_modules/firebase') || normalizedId.includes('node_modules/@firebase')) return 'firebase';
          if (normalizedId.includes('node_modules/@capacitor')) return 'native-runtime';
          if (normalizedId.includes('node_modules/lucide-react')) return 'icons';
          if (normalizedId.includes('node_modules/react') || normalizedId.includes('node_modules/react-dom')) return 'react';
          if (normalizedId.includes('node_modules')) return 'vendor';
        }
      }
    }
  },
  server: {
    host: '127.0.0.1',
    port: 4173
  }
});
