// ─────────────────────────────────────────────────────────────────────────────
// background/service-worker.js
//
// Receives COGNISHIFT_NOTIFICATION messages from the content script,
// resolves the source_app from the hostname, and fires POST /api/generate-event/.
// ─────────────────────────────────────────────────────────────────────────────

import { API_BASE, SOURCE_APP_MAP, DEFAULT_SOURCE_APP } from '../config.js';
import { API_BASE, SOURCE_APP_MAP, DEFAULT_SOURCE_APP } from '../config.js';

function resolveSourceApp(hostname) {
  // Strip leading "www." for matching
  const host = hostname.replace(/^www\./, '');
  return SOURCE_APP_MAP[host] || SOURCE_APP_MAP[hostname] || DEFAULT_SOURCE_APP;
}

console.log('[CogniShift SW] service-worker.js loaded');

// Apps that should always be present in monitored_apps.
// Adding a new source here automatically migrates existing stored configs.
const ALWAYS_MONITORED = ['gmail', 'slack', 'github', 'calendar', 'youtube', 'whatsapp'];

function normalizeMonitoredApps(input) {
  if (!Array.isArray(input) || input.length === 0) {
    return [...ALWAYS_MONITORED];
  }
  const cleaned = input.filter((item) => typeof item === 'string' && item.length > 0);
  // Migrate: ensure any newly added always-monitored apps are included
  const merged = [...new Set([...cleaned, ...ALWAYS_MONITORED])];
  return merged;
}

async function sendToBackend(source_app, message) {
  try {
    // Read config from storage (set by one-click dashboard integration)
    const stored = await chrome.storage.sync.get(['user_id', 'api_base', 'monitored_apps']);
    const user_id = stored.user_id || null;
    const api_base = stored.api_base || API_BASE;
    const monitoredApps = normalizeMonitoredApps(stored.monitored_apps);

    // Persist migrated list if it grew (e.g. new apps added since last connect)
    if (Array.isArray(stored.monitored_apps) && monitoredApps.length > stored.monitored_apps.length) {
      chrome.storage.sync.set({ monitored_apps: monitoredApps });
      console.log('[CogniShift SW] migrated monitored_apps →', monitoredApps);
    }

    if (!user_id) {
      console.warn('[CogniShift SW] user_id is not configured yet. Open dashboard and use One-click Connect.');
      return;
    }

    if (!monitoredApps.includes(source_app)) {
      console.log('[CogniShift SW] source is disabled, skipping:', source_app);
      return;
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

  if (msg.type === 'COGNISHIFT_SAVE_CONFIG') {
    const payload = msg.payload || {};
    if (!payload.user_id) {
      sendResponse({ ok: false, error: 'user_id is required' });
      return;
    }

    const update = {
      user_id: payload.user_id,
      api_base: payload.api_base || API_BASE,
      monitored_apps: normalizeMonitoredApps(payload.monitored_apps),
    };

    chrome.storage.sync.set(update, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      console.log('[CogniShift SW] extension config saved:', update);
      sendResponse({ ok: true, configured: true });
    });
    return true;
  }

  if (msg.type === 'COGNISHIFT_GET_CONFIG') {
    chrome.storage.sync.get(['user_id', 'api_base', 'monitored_apps'], (stored) => {
      const user_id = stored.user_id || null;
      sendResponse({
        configured: Boolean(user_id),
        user_id,
        api_base: stored.api_base || API_BASE,
        monitored_apps: normalizeMonitoredApps(stored.monitored_apps),
      });
    });
    return true;
  }

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