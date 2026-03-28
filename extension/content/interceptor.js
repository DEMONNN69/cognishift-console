// ─────────────────────────────────────────────────────────────────────────────
// content/interceptor.js  —  runs in ISOLATED world (default)
//
// Reads user_id from the page's localStorage (cognishift_user key), syncs it
// into chrome.storage.local so the service worker can use it — no manual
// config needed. Also bridges MAIN-world Notification events to the SW.
// ─────────────────────────────────────────────────────────────────────────────

console.log('[CogniShift ISOLATED] interceptor.js loaded on', window.location.hostname); // NOSONAR

// ── Read user_id from localStorage and sync to chrome.storage.local ──────────
function syncUserFromLocalStorage(options = {}) {
  const { emitError = false, logMissing = false } = options;
  try {
    const raw = window.localStorage.getItem('cognishift_user'); // NOSONAR
    if (!raw) {
      if (logMissing) {
        console.log('[CogniShift ISOLATED] cognishift_user not found in localStorage');
      }
      if (emitError) {
        document.dispatchEvent(new CustomEvent('cognishift-config-error'));
      }
      return false;
    }
    const parsed = JSON.parse(raw);
    const user_id = parsed.user_id;
    console.log(user_id)
    if (!user_id) {
      console.warn('[CogniShift ISOLATED] cognishift_user has no user_id field');
      if (emitError) {
        document.dispatchEvent(new CustomEvent('cognishift-config-error'));
      }
      return false;
    }
    chrome.storage.local.set({ user_id, cognishift_user: raw }, () => {
      if (chrome.runtime.lastError) {
        console.warn('[CogniShift ISOLATED] storage.set error:', chrome.runtime.lastError.message);
        if (emitError) {
          document.dispatchEvent(new CustomEvent('cognishift-config-error'));
        }
      } else {
        console.log('[CogniShift ISOLATED] user_id synced from localStorage:', user_id);
        document.dispatchEvent(new CustomEvent('cognishift-configured', { detail: { user_id } }));
      }
    });
    return true;
  } catch (e) {
    console.warn('[CogniShift ISOLATED] failed to read cognishift_user:', e.message);
    if (emitError) {
      document.dispatchEvent(new CustomEvent('cognishift-config-error'));
    }
    return false;
  }
}

// ── Announce presence so the web app can detect the extension ────────────────
document.dispatchEvent(new CustomEvent('cognishift-ready'));

window.addEventListener('message', function (event) { // NOSONAR
  if (event.source !== window || !event.data || !event.data.type) return; // NOSONAR

  const { type } = event.data;

  // ── Ping — re-announce and re-sync from localStorage ─────────────────────
  if (type === '__COGNISHIFT_PING__') {
    syncUserFromLocalStorage({ emitError: true, logMissing: true });
    document.dispatchEvent(new CustomEvent('cognishift-ready'));
    return;
  }

  // ── Manual configure click from dashboard ───────────────────────────────
  if (type === '__COGNISHIFT_CONFIGURE__') {
    syncUserFromLocalStorage({ emitError: true, logMissing: true });
    document.dispatchEvent(new CustomEvent('cognishift-ready'));
    return;
  }

  // ── Notification relay (unchanged logic) ─────────────────────────────────
  if (type !== '__COGNISHIFT_NOTIFICATION__') return;

  console.log('[CogniShift ISOLATED] relaying to background SW:', event.data.source, event.data.message);

  try {
    chrome.runtime.sendMessage({
      type: 'COGNISHIFT_NOTIFICATION',
      source: event.data.source,
      message: event.data.message,
    }, () => {
      if (chrome.runtime.lastError) {
        console.warn('[CogniShift ISOLATED] sendMessage error (refresh the tab):', chrome.runtime.lastError.message);
      } else {
        console.log('[CogniShift ISOLATED] background SW acknowledged');
      }
    });
  } catch (e) {
    console.warn('[CogniShift ISOLATED] context invalidated, refresh this tab:', e.message);
  }
});
