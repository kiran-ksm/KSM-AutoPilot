import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/inter';

import App from './App';
import { ThemeModeProvider } from './contexts/ThemeModeContext';
import { AuthProvider } from './contexts/AuthContext';
import { DemoModeProvider } from './contexts/DemoModeContext';
import { configureAmplify } from './config/amplify';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Must be called synchronously before any component mounts
configureAmplify();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeModeProvider>
          <DemoModeProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </DemoModeProvider>
        </ThemeModeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
