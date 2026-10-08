import React from 'react';
import ReactDOM from 'react-dom/client';
import { MainApp } from './components/MainApp';
import '../css/app.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <MainApp />
    </React.StrictMode>
  );
}
