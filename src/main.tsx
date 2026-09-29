import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import CredentialRecovery from './CredentialRecovery.tsx';
import './index.css';

if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const msg = event.reason?.message || String(event.reason || "");
    if (msg.includes("tabs:outgoing.message.ready") || msg.includes("No Listener")) {
      event.preventDefault();
      console.warn("[Midnight] Handled wallet connector channel refresh.");
    }
  });
}


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CredentialRecovery>
      <App />
    </CredentialRecovery>
  </React.StrictMode>
);
