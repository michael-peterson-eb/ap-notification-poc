import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { injectStyles } from './injectStyles';
import { hasAnyNotificationsPermission } from 'utils/permissions';
import { params } from 'utils/consts';

declare global {
  interface Window {
    __openCommunicationsModal?: () => void;
  }
}

const isDev = process.env.NODE_ENV === 'development';
const isStandalone = !!params.standaloneMode;

function ensureReactMountNode(): HTMLElement {
  // Standalone: mount into predefined element
  if (isStandalone) {
    const viewRoot = document.getElementById('root-element');
    if (viewRoot) return viewRoot;

    const el = document.createElement('div');
    el.id = 'root-element';
    document.body.appendChild(el);
    return el;
  }

  // Host mode: mount into our own node appended to body
  const existing = document.getElementById('eb-notifications-root');
  if (existing) return existing;

  const el = document.createElement('div');
  el.id = 'eb-notifications-root';
  document.body.appendChild(el);
  return el;
}

function injectHeaderCommunicationsButton() {
  const BTN_ATTR = 'data-eb-notifications-header';

  // small helper to inject one-time stylesheet for hover/focus
  const ensureButtonStyles = () => {
    if (document.getElementById('eb-communications-btn-styles')) return;
    const css = `
      a[${BTN_ATTR}="1"] {
        text-decoration: none;
      }
      a[${BTN_ATTR}="1"]:hover {
        filter: brightness(0.95);
      }
      a[${BTN_ATTR}="1"]:focus {
        outline: none;
      }
      a[${BTN_ATTR}="1"]:focus-visible {
        box-shadow: 0 0 0 4px rgba(0,90,230,0.18);
        border-radius: 8px;
      }
    `;
    const style = document.createElement('style');
    style.id = 'eb-communications-btn-styles';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  };

  const tryInject = () => {
    const toolbar = document.querySelector('div.rbs-pageheader-toolbar.k-toolbar') as HTMLDivElement | null;
    if (!toolbar) return false;

    // prevent duplicates
    const existing = toolbar.querySelector(`a[${BTN_ATTR}="1"]`) as HTMLAnchorElement | null;
    if (existing) {
      existing.style.display = 'inline-flex';
      existing.style.visibility = 'visible';
      return true;
    }

    ensureButtonStyles();

    const a = document.createElement('a');
    a.setAttribute('href', '');
    a.setAttribute('tabindex', '0');
    a.setAttribute(BTN_ATTR, '1');
    a.setAttribute('data-overflow', 'never');
    a.className = 'marker-pageToolbar-action k-button';
    a.setAttribute('role', 'button');
    a.setAttribute('aria-label', 'Open Communications');

    // Layout + visual styles for the pill button
    Object.assign(a.style, {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      padding: '6px 16px',
      background: '#0042B6',
      color: '#fff',
      borderRadius: '8px',
      height: '32px',
      boxSizing: 'border-box',
      fontWeight: '600',
      fontSize: '14px',
      lineHeight: '1',
      cursor: 'pointer',
      border: 'none',
      textDecoration: 'none',
      verticalAlign: 'middle',
    });

    // Insert SVG + label (use the SVG you provided)
    a.innerHTML = `
      <span style="display:inline-flex;align-items:center;gap:8px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="12" viewBox="0 0 17 12" fill="none" aria-hidden="true" focusable="false">
          <path d="M16.7354 0C12.4998 0 8.55986 2.2773 6.45263 5.94384L6.45065 5.94712C6.44668 5.95369 6.40104 6.03646 6.32763 6.18359C4.76209 4.50205 2.57417 3.54436 0.264561 3.54436H0V7.13274H0.264561C2.82352 7.13274 4.90561 9.19853 4.90561 11.7373V12H8.52745L8.52216 11.732C8.52216 11.7182 8.50165 10.3651 9.09824 8.74925C10.2385 5.66271 13.3081 3.58903 16.7354 3.58903H17V0H16.7354ZM0.529121 6.61317V4.07379C2.66412 4.14604 4.66883 5.09256 6.08423 6.69987C6.06505 6.74323 6.04521 6.78789 6.0247 6.83453C5.73898 7.49466 5.32031 8.60211 5.08419 9.88166C4.36393 8.04445 2.60658 6.71761 0.529121 6.61317ZM5.4387 11.4739C5.49294 9.7273 6.07299 8.07795 6.45925 7.16295C7.40902 8.42476 7.93549 9.90793 7.98841 11.4739H5.4387ZM16.4709 3.06683C12.9297 3.17062 9.78874 5.35464 8.60153 8.5673C8.45602 8.96207 8.34556 9.3391 8.2609 9.68854C7.98907 8.64415 7.50889 7.66019 6.83228 6.78001C6.78796 6.72286 6.74563 6.66835 6.70463 6.61711C6.82368 6.36685 6.90437 6.2184 6.91297 6.20264C8.88262 2.77716 12.5269 0.621381 16.4709 0.528765V3.06683Z" fill="white"/>
        </svg>
        <span style="display:inline-block; transform:translateY(0.5px);">Communications</span>
      </span>
    `;

    // Make sure it is visible inline-block for the toolbar layout
    a.style.visibility = 'visible';

    const onActivate = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      // keep your existing hook intact
      window.__openCommunicationsModal?.();
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
  obs.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

// Host-only concerns
if (!isDev) {
  injectStyles();
  if (!isStandalone && hasAnyNotificationsPermission()) {
    injectHeaderCommunicationsButton();
  }
}

const mountNode = ensureReactMountNode();
const root = ReactDOM.createRoot(mountNode);

root.render(<App isDev={isDev} isStandalone={isStandalone} />);
