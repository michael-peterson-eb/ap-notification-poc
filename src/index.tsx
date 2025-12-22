import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { injectStyles } from './injectStyles';

declare global {
  interface Window {
    __openNotificationsModal?: () => void;
  }
}

const isDev = process.env.NODE_ENV === 'development';

function ensureReactMountNode() {
  // DEV: use CRA/Vite root if present so you can just run the app normally
  if (isDev) {
    const devRoot = document.getElementById('root');
    if (devRoot) return devRoot;
  }

  // PROD (and fallback): always mount into our own node appended to body
  const existing = document.getElementById('eb-notifications-root');
  if (existing) return existing;

  const el = document.createElement('div');
  el.id = 'eb-notifications-root';
  document.body.appendChild(el);
  return el;
}

function injectHeaderNotificationsButton() {
  const BTN_ATTR = 'data-eb-notifications-header';

  const tryInject = () => {
    const toolbar = document.querySelector('div.rbs-pageheader-toolbar.k-toolbar') as HTMLDivElement | null;

    if (!toolbar) return false;

    // prevent duplicates
    const existing = toolbar.querySelector(`a[${BTN_ATTR}="1"]`) as HTMLAnchorElement | null;
    if (existing) {
      existing.style.display = 'inline-block';
      existing.style.visibility = 'visible';
      return true;
    }

    const a = document.createElement('a');
    a.setAttribute('href', '');
    a.setAttribute('tabindex', '0');
    a.setAttribute(BTN_ATTR, '1');
    a.setAttribute('data-overflow', 'never');
    a.className = 'marker-pageToolbar-action k-button';
    a.textContent = 'Notifications';

    a.style.display = 'inline-block';
    a.style.visibility = 'visible';

    const onActivate = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      window.__openNotificationsModal?.();
    };

    a.addEventListener('click', onActivate, true);
    a.addEventListener('mousedown', onActivate, true);
    a.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') onActivate(e);
      },
      true
    );

    const edit = toolbar.querySelector('a.rbs-marker-button-edit') as HTMLAnchorElement | null;
    if (edit && edit.parentElement === toolbar) {
      toolbar.insertBefore(a, edit);
      return true;
    }

    const firstAction = toolbar.querySelector('a.marker-pageToolbar-action') as HTMLAnchorElement | null;
    if (firstAction && firstAction.parentElement === toolbar) {
      toolbar.insertBefore(a, firstAction);
      return true;
    }

    toolbar.appendChild(a);
    return true;
  };

  if (tryInject()) return;

  const obs = new MutationObserver(() => tryInject());
  obs.observe(document.documentElement, { childList: true, subtree: true });
}

if (!isDev) {
  // host-only concerns
  injectStyles();
  injectHeaderNotificationsButton();
}

const mountNode = ensureReactMountNode();
const root = ReactDOM.createRoot(mountNode);
root.render(<App isDev={isDev} />);