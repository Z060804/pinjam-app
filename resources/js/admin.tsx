import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AdminApp } from './components/admin/AdminApp';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import '../css/app.css';

const rootElement = document.getElementById('admin-root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary homePath="/admin" fallbackTitle="Terjadi Kendala pada Panel Admin">
        <BrowserRouter>
          <AdminApp />
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
