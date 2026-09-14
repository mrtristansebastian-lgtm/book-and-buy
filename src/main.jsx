import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './features/auth/AuthContext';
import { WorkspaceProvider } from './features/workspace/WorkspaceContext';
import { applyColorScheme, getColorScheme } from './shared/theme/colorScheme';
import './design/index.css';

applyColorScheme(getColorScheme());

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>
    </AuthProvider>
  </React.StrictMode>
);
