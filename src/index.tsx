// src/index.tsx
import ReactDOM from 'react-dom/client';
import App from './App';
import { injectStyles } from './injectStyles';

if (process.env.NODE_ENV !== 'development') {
  injectStyles();
}

const rootId = document.getElementById(`view-jsroot`) as HTMLElement;
const root = ReactDOM.createRoot(rootId);
root.render(<App />);
