// ─────────────────────────────────────────────────────────────────────────────
// background/service-worker.js
//
// Receives COGNISHIFT_NOTIFICATION messages from the content script,
// resolves the source_app from the hostname, and fires POST /api/generate-event/.
// ─────────────────────────────────────────────────────────────────────────────

import { API_BASE, SOURCE_APP_MAP, DEFAULT_SOURCE_APP } from '../config.js';

function resolveSourceApp(hostname) {
  const host = hostname.replace(/^www\./, '');
  return SOURCE_APP_MAP[host] || SOURCE_APP_MAP[hostname] || DEFAULT_SOURCE_APP;
}

console.log('[CogniShift SW] service-worker.js loaded ');

function resolveUserIdFromStorage(stored) {
  if (stored?.user_id) return stored.user_id;

  const rawUser = stored?.cognishift_user;
  if (!rawUser) return null;

  if (typeof rawUser === 'object' && rawUser.user_id) {
    return rawUser.user_id;
  }

  if (typeof rawUser === 'string') {
    try {
      const parsed = JSON.parse(rawUser);
      return parsed?.user_id || null;
    } catch (_e) {
      return null;
    }
  }

  return null;
}

async function sendToBackend(source_app, message) {
  try {
    const stored = await chrome.storage.local.get(['user_id', 'cognishift_user', 'api_base']);
    const user_id = resolveUserIdFromStorage(stored);

    if (!user_id) {
      console.warn('[CogniShift SW] no user_id in storage (checked user_id and cognishift_user.user_id) — open the CogniShift dashboard and click Configure in the Connections tab');
      return;
    }

    const api_base = stored.api_base || API_BASE;

    // Keep a flat key for faster future lookups.
    if (!stored.user_id) {
      chrome.storage.local.set({ user_id });
    }

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
  const message    = (msg.message || '').trim();

  console.log('[CogniShift SW] resolved source_app:', source_app, '| message:', message);

  if (!message) {
    console.warn('[CogniShift SW] empty message, skipping');
    return;
  }

  sendToBackend(source_app, message);
  sendResponse({ ok: true });
});
