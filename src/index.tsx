import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const rootId = document.getElementById(`view-jsroot`) as HTMLElement;

const root = ReactDOM.createRoot(rootId);

root.render(<App />);
