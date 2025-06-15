import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const container = document.getElementById('root');

if (!window.__root) {
  window.__root = ReactDOM.createRoot(container);
}
window.__root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
