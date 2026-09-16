import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './features/auth/AuthContext';
import { ClientProfileProvider } from './features/client-app/ClientProfileContext';
import { WorkspaceProvider } from './features/workspace/WorkspaceContext';
import './design/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <WorkspaceProvider>
        <ClientProfileProvider>
          <App />
        </ClientProfileProvider>
      </WorkspaceProvider>
    </AuthProvider>
  </React.StrictMode>
);
