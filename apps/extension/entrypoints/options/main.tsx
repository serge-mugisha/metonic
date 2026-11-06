import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './style.css';

const root = document.getElementById('root');
if (!root) throw new Error('Options page is missing its #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
