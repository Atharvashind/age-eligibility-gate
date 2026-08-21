import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import CredentialRecovery from './CredentialRecovery.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CredentialRecovery>
      <App />
    </CredentialRecovery>
  </React.StrictMode>
);
