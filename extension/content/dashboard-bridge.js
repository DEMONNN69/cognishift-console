// Bridge between CogniShift web app and extension runtime.
// Runs in ISOLATED world on dashboard origins and relays postMessage payloads.

console.log('[CogniShift BRIDGE] dashboard-bridge loaded on', window.location.origin);

const CONFIGURE_TYPE = 'COGNISHIFT_CONFIGURE_EXTENSION';
const PING_TYPE = 'COGNISHIFT_PING_EXTENSION';

window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || typeof event.data !== 'object') {
    return;
  }

  if (event.data.type === PING_TYPE) {
    chrome.runtime.sendMessage({ type: 'COGNISHIFT_GET_CONFIG' }, (response) => {
      window.postMessage(
        {
          type: 'COGNISHIFT_EXTENSION_PONG',
          configured: Boolean(response?.configured),
          user_id: response?.user_id || null,
        },
        '*'
      );
    });
    return;
  }

  if (event.data.type !== CONFIGURE_TYPE) {
    return;
  }

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
        },
        '*'
      );
    }
  );
});