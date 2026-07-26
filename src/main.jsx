import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import './styles.css';
import './styles/extracted.css';
import './styles/workspace-shell.css';
import './styles/dashboard/dashboard-coming-soon.css';
import './styles/runtime/native-typography-consistency.css';
import './styles/runtime/launch-readiness-polish.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <main id="app-shell" className="min-h-screen">
        <App />
      </main>
    </AppErrorBoundary>
  </React.StrictMode>
);
