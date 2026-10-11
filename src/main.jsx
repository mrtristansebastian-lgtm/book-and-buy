import '../public/chat-controls.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './features/auth/AuthContext';
import { ClientProfileProvider } from './features/client-app/ClientProfileContext';
import { WorkspaceProvider } from './features/workspace/WorkspaceContext';
import './design/index.css';
import './design/profile-storyboard.css';
import './features/website/components/home-sections/profile-about.css';
import './features/storefront/components/profile-detail.css';
import './design/profile-contact-location.css';
import './design/profile-glass.css';
import './design/profile-story-navigation.css';

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
