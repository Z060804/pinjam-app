import React from 'react';
import ReactDOM from 'react-dom/client';
import { AdminApp } from './components/admin/AdminApp';
import '../css/app.css';

const rootElement = document.getElementById('admin-root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <AdminApp />
    </React.StrictMode>
  );
}
