// ─────────────────────────────────────────────────────────────────────────────
// content/whatsapp-observer.js  —  runs in ISOLATED world on web.whatsapp.com
//
// Two-pronged WhatsApp Web notification detection:
//
//   Level 1 — Title observer
//     WhatsApp sets document.title to "(3) WhatsApp" when messages arrive.
//     We watch for count increases and fire a "N new WhatsApp message(s)" event.
//     Fires even when the tab is in the background.
//
//   Level 2 — DOM toast observer
//     When the WA tab IS focused, WhatsApp renders in-page notification banners
//     (sender name + message preview). We watch document.body for new elements
//     matching known data-testid attributes, then fall back to a structural
//     heuristic for when WA renames their testing attributes.
// ─────────────────────────────────────────────────────────────────────────────

console.log('[CogniShift WA] whatsapp-observer.js loaded');

// ─── shared helper ────────────────────────────────────────────────────────────

function sendToBackground(message) {
  try {
    chrome.runtime.sendMessage(
      { type: 'COGNISHIFT_NOTIFICATION', source: 'web.whatsapp.com', message },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[CogniShift WA] sendMessage error:', chrome.runtime.lastError.message);
        } else {
          console.log('[CogniShift WA] background acknowledged:', response);
        }
      }
    );
  } catch (e) {
    console.warn('[CogniShift WA] extension context invalidated — refresh tab');
  }
}

// ─── Level 1: title observer ──────────────────────────────────────────────────
// document.title cycles: "WhatsApp" → "(2) WhatsApp" → "(5) WhatsApp"
// We fire once per count increase, not once per poll tick.

let lastTitleCount = 0;

function parseUnreadCount(title) {
  const m = title.match(/^\((\d+)\)/);
  return m ? parseInt(m[1], 10) : 0;
}

function onTitleChange() {
  const count = parseUnreadCount(document.title);
  if (count > lastTitleCount) {
    const delta = count - lastTitleCount;
    const msg = `${delta} new WhatsApp message${delta > 1 ? 's' : ''}`;
    console.log('[CogniShift WA] title count increased →', msg);
    sendToBackground(msg);
  }
  // Always update so we catch resets to 0 cleanly
  lastTitleCount = count;
}

function startTitleObserver() {
  const attach = (titleEl) => {
    const obs = new MutationObserver(() => onTitleChange());
    obs.observe(titleEl, { childList: true, characterData: true, subtree: true });
    console.log('[CogniShift WA] title observer attached');
    // Fire once immediately in case there's already an unread count
    onTitleChange();
  };

  const titleEl = document.querySelector('title');
  if (titleEl) {
    attach(titleEl);
  } else {
    // <title> not in DOM yet (SPA still loading) — poll until it appears
    const check = setInterval(() => {
      const t = document.querySelector('title');
      if (t) {
        clearInterval(check);
        attach(t);
      }
    }, 500);
  }
}

// ─── Level 2: DOM toast observer ─────────────────────────────────────────────
// WhatsApp Web renders incoming-message banners in the page when the tab is
// focused. They include sender name + message preview.
//
// Priority order for detection:
//   1. data-testid="msg-notification"   ← WA's own test ID (most stable)
//   2. data-testid*="notification"      ← catch variants
//   3. Structural heuristic             ← role="button" with two text spans

const TOAST_SELECTORS = [
  '[data-testid="msg-notification"]',
  '[data-testid="notification"]',
  '[data-testid*="msg-notif"]',
  '[data-testid*="notification"]',
];

// In-memory dedup: same text within 3 s → skip
const recentMessages = new Map();

function isDuplicate(msg) {
  const now = Date.now();
  const last = recentMessages.get(msg);
  if (last && now - last < 3000) return true;
  recentMessages.set(msg, now);
  // Purge stale entries
  for (const [k, t] of recentMessages) {
    if (now - t > 10000) recentMessages.delete(k);
  }
  return false;
}

function extractTextFromElement(el) {
  // Walk all visible text nodes and collect up to 3
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
  });
  const texts = [];
  let node;
  while ((node = walker.nextNode()) && texts.length < 3) {
    const t = node.textContent.trim();
    if (t) texts.push(t);
  }
  if (texts.length >= 2) return `${texts[0]} — ${texts[1]}`;
  if (texts.length === 1) return texts[0];
  return null;
}

function checkNodeForToast(node) {
  if (!(node instanceof Element)) return;

  // ── Strategy 1: known data-testid selectors ──
  for (const sel of TOAST_SELECTORS) {
    const match = node.matches(sel) ? node : node.querySelector(sel);
    if (match) {
      const text = extractTextFromElement(match);
      if (text && !isDuplicate(text)) {
        console.log('[CogniShift WA] toast via selector:', sel, '→', text);
        sendToBackground(text);
        return;
      }
    }
  }

  // ── Strategy 2: structural heuristic ──
  // WA notification banners are typically role="button" wrappers containing
  // exactly a sender name span and a message preview span.
  const candidates = [
    node.matches('[role="button"]') ? node : null,
    ...Array.from(node.querySelectorAll('[role="button"]')),
  ].filter(Boolean);

  for (const btn of candidates) {
    const text = extractTextFromElement(btn);
    // Must look like "Name — preview text" to avoid false positives on
    // other interactive elements (e.g. the compose button, search bar)
    if (text && text.includes(' — ') && text.length > 8 && !isDuplicate(text)) {
      console.log('[CogniShift WA] toast via heuristic →', text);
      sendToBackground(text);
      return;
    }
  }
}

function startToastObserver() {
  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        checkNodeForToast(node);
      }
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
  console.log('[CogniShift WA] toast (DOM) observer attached');
}

// ─── boot ─────────────────────────────────────────────────────────────────────

function boot() {
  startTitleObserver();
  startToastObserver();
  console.log('[CogniShift WA] both observers running');
}

if (document.body) {
  boot();
} else {
  document.addEventListener('DOMContentLoaded', boot);
}
