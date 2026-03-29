// ─────────────────────────────────────────────────────────────────────────────
// content/interceptor.js  —  runs in ISOLATED world (default)
//
// notification-patch.js (MAIN world) patches window.Notification and posts a
// message. This file lives in the isolated world where chrome.runtime is
// available, so it acts as the postMessage → chrome.runtime bridge.
// ─────────────────────────────────────────────────────────────────────────────

console.log('[CogniShift ISOLATED] interceptor.js loaded on', window.location.hostname);

window.addEventListener('message', function (event) {
  // Log every postMessage so we can see if MAIN world is firing at all
  if (event.data && event.data.type) {
    console.log('[CogniShift ISOLATED] postMessage received, type:', event.data.type);
  }

  if (event.source !== window || !event.data) {
    return;
  }

  if (event.data.type === 'COGNISHIFT_PING_EXTENSION') {
    chrome.runtime.sendMessage({ type: 'COGNISHIFT_GET_CONFIG' }, (response) => {
      if (chrome.runtime.lastError) {
        window.postMessage({
          type: 'COGNISHIFT_EXTENSION_PONG',
          configured: false,
          error: chrome.runtime.lastError.message,
        }, '*');
        return;
      }
      window.postMessage({
        type: 'COGNISHIFT_EXTENSION_PONG',
        configured: Boolean(response?.configured),
        user_id: response?.user_id || null,
      }, '*');
    });
    return;
  }

  if (event.data.type === 'COGNISHIFT_CONFIGURE_EXTENSION') {
    const payload = event.data.payload || {};
    chrome.runtime.sendMessage(
      {
        type: 'COGNISHIFT_SAVE_CONFIG',
        payload: {
          user_id: payload.user_id,
          api_base: payload.api_base,
          monitored_apps: payload.monitored_apps || ['gmail', 'slack', 'github', 'calendar', 'youtube'],
        },
      },
      (response) => {
        if (chrome.runtime.lastError) {
          window.postMessage(
            {
              type: 'COGNISHIFT_EXTENSION_CONFIG_RESULT',
              ok: false,
              error: chrome.runtime.lastError.message,
            },
            '*'
          );
          return;
        }

        window.postMessage(
          {
            type: 'COGNISHIFT_EXTENSION_CONFIG_RESULT',
            ok: Boolean(response?.ok),
            configured: Boolean(response?.configured),
            error: response?.error || null,
          },
          '*'
        );
      }
    );
    return;
  }

  if (
    event.data.type !== '__COGNISHIFT_NOTIFICATION__'
  ) {
    return;
  }

  console.log('[CogniShift ISOLATED] relaying to background SW:', event.data.source, event.data.message);

  try {
    chrome.runtime.sendMessage({
      type: 'COGNISHIFT_NOTIFICATION',
      source: event.data.source,
      message: event.data.message,
    }, (response) => {
      if (chrome.runtime.lastError) {
        // Extension was reloaded but this tab wasn't refreshed yet — safe to ignore
        console.warn('[CogniShift ISOLATED] sendMessage error (refresh the tab):', chrome.runtime.lastError.message);
      } else {
        console.log('[CogniShift ISOLATED] background SW acknowledged');
      }
    });
  } catch (e) {
    // Extension context invalidated — tab needs a refresh after extension reload
    console.warn('[CogniShift ISOLATED] context invalidated, refresh this tab:', e.message);
  }
});