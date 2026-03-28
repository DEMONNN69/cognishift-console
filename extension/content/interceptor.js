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

  if (
    event.source !== window ||
    !event.data ||
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
