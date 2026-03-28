// ─────────────────────────────────────────────────────────────────────────────
// background/service-worker.js
//
// Receives COGNISHIFT_NOTIFICATION messages from the content script,
// resolves the source_app from the hostname, and fires POST /api/generate-event/.
// ─────────────────────────────────────────────────────────────────────────────

import { USER_ID, API_BASE, SOURCE_APP_MAP, DEFAULT_SOURCE_APP } from '../config.js';

function resolveSourceApp(hostname) {
  // Strip leading "www." for matching
  const host = hostname.replace(/^www\./, '');
  return SOURCE_APP_MAP[host] || SOURCE_APP_MAP[hostname] || DEFAULT_SOURCE_APP;
}

console.log('[CogniShift SW] service-worker.js loaded, USER_ID:', USER_ID);

async function sendToBackend(source_app, message) {
  try {
    // Read config from storage (Phase 2 will write here; falls back to hardcoded values)
    const stored = await chrome.storage.sync.get(['user_id', 'api_base']);
    const user_id = stored.user_id || USER_ID;
    const api_base = stored.api_base || API_BASE;

    console.log('[CogniShift SW] POSTing to', `${api_base}/generate-event/`, { user_id, source_app, message });

    const res = await fetch(`${api_base}/generate-event/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, source_app, message }),
    });

    console.log('[CogniShift SW] response status:', res.status);
  } catch (err) {
    console.warn('[CogniShift SW] fetch failed:', err);
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  console.log('[CogniShift SW] message received:', msg.type);

  if (msg.type !== 'COGNISHIFT_NOTIFICATION') return;

  const source_app = resolveSourceApp(msg.source || '');
  const message = (msg.message || '').trim();

  console.log('[CogniShift SW] resolved source_app:', source_app, '| message:', message);

  if (!message) {
    console.warn('[CogniShift SW] empty message, skipping');
    return;
  }

  sendToBackend(source_app, message);
  sendResponse({ ok: true });
});
