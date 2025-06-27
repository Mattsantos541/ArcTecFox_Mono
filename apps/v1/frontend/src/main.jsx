import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const container = document.getElementById('root');

// Force a completely clean slate
if (window.__root) {
  try {
    window.__root.unmount();
  } catch (e) {
    console.log('Unmount error (expected):', e.message);
  }
  delete window.__root;
}

// Clear any React internals
container.innerHTML = '';

// Remove any React-related properties
Object.keys(container).forEach(key => {
  if (key.startsWith('_react') || key.startsWith('__react')) {
    delete container[key];
  }
});

console.log('✅ Creating fresh root');
window.__root = ReactDOM.createRoot(container);

window.__root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);