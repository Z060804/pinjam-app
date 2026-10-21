import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MainApp } from './components/MainApp';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import '../css/app.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary homePath="/">
        <BrowserRouter>
          <MainApp />
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
