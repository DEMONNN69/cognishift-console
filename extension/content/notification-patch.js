// ─────────────────────────────────────────────────────────────────────────────
// content/notification-patch.js  —  runs in MAIN world (page's JS context)
//
// Because this file is declared with "world": "MAIN" in the manifest, Chrome
// executes it directly inside the page's own JavaScript environment. No inline
// script injection needed, so Gmail's CSP cannot block it.
//
// Patches window.Notification, then uses window.postMessage to hand the
// captured data to the ISOLATED-world interceptor.js.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  console.log('[CogniShift MAIN] notification-patch.js loaded on', window.location.hostname);

  if (window.__cognishift_patched) {
    console.log('[CogniShift MAIN] already patched, skipping');
    return;
  }
  window.__cognishift_patched = true;

  const OriginalNotification = window.Notification;
  console.log('[CogniShift MAIN] window.Notification exists?', !!OriginalNotification);
  console.log('[CogniShift MAIN] Patching window.Notification...');

  function PatchedNotification(title, options) {
    console.log('[CogniShift MAIN] Notification intercepted —', title, options);

    // Always construct the real notification so the page behaves normally
    const instance = new OriginalNotification(title, options || {});

    const body = options && options.body ? options.body : '';
    const message = body ? `${title} — ${body}` : title;

    console.log('[CogniShift MAIN] posting message to ISOLATED world:', message);
    window.postMessage(
      {
        type: '__COGNISHIFT_NOTIFICATION__',
        source: window.location.hostname,
        message: message,
      },
      '*'
    );

    return instance;
  }

  // Mirror static members so nothing breaks
  Object.setPrototypeOf(PatchedNotification, OriginalNotification);
  Object.defineProperty(PatchedNotification, 'permission', {
    get: () => OriginalNotification.permission,
  });
  PatchedNotification.requestPermission =
    OriginalNotification.requestPermission.bind(OriginalNotification);

  window.Notification = PatchedNotification;
})();
