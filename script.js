/* ===========================
   SecretWeave — script.js
   =========================== */

'use strict';

// ── State ──────────────────────────────────────────────────
let currentMode  = 'encrypt';
let outputResult = '';
let shiftValue   = 3;
let toastTimer   = null;
let liveTimer    = null;
let history      = [];          // stores last 5 results

// ── DOM ────────────────────────────────────────────────────
const inputText         = document.getElementById('inputText');
const shiftDisplay      = document.getElementById('shiftDisplay');
const shiftSlider       = document.getElementById('shiftSlider');
const keywordInput      = document.getElementById('keywordInput');
const actionBtn         = document.getElementById('actionBtn');
const inputLabel        = document.getElementById('inputLabel');
const outputLabel       = document.getElementById('outputLabel');
const statusDot         = document.getElementById('statusDot');
const outputBody        = document.getElementById('outputBody');
const outputPlaceholder = document.getElementById('outputPlaceholder');
const placeholderText   = document.getElementById('placeholderText');
const outputTextEl      = document.getElementById('outputText');
const charMapWrap       = document.getElementById('charMapWrap');
const charMapContainer  = document.getElementById('charMapContainer');
const showCharMapCb     = document.getElementById('showCharMap');
const copyBtn           = document.getElementById('copyBtn');
const swapBtn           = document.getElementById('swapBtn');
const toast             = document.getElementById('toast');
const toastMsg          = document.getElementById('toastMsg');
const charCount         = document.getElementById('charCount');
const strengthBar       = document.getElementById('strengthBar');
const strengthLabel     = document.getElementById('strengthLabel');
const livePreview       = document.getElementById('livePreview');
const historyList       = document.getElementById('historyList');

// ══════════════════════════════════════════════════════════
//  SecretWeave Algorithm
//  ─────────────────────
//  Layer 1 — Shift: each letter is shifted forward/backward
//            by [shiftValue] positions (like Caesar).
//
//  Layer 2 — Keyword Weave: the keyword is used to apply an
//            additional per-letter offset derived from each
//            keyword character's alphabet position (A=1…Z=26).
//            The keyword cycles across letters in the message.
//
//  Together these two layers make the cipher dependent on
//  BOTH a number and a word — neither alone can decrypt it.
//  Non-letter characters always pass through unchanged.
// ══════════════════════════════════════════════════════════

function secretWeave(text, shift, keyword, encrypt) {
  const key = keyword.toUpperCase().replace(/[^A-Z]/g, '') || 'A';

  let letterIdx = 0;
  return text.split('').map(char => {
    if (!/[a-zA-Z]/.test(char)) return char;

    const base     = char >= 'a' ? 97 : 65;
    const keyShift = key.charCodeAt(letterIdx % key.length) - 64; // A=1…Z=26
    const total    = encrypt ? (shift + keyShift) : (52 - shift - keyShift);

    letterIdx++;
    return String.fromCharCode((char.charCodeAt(0) - base + total) % 26 + base);
  }).join('');
}

// ── Strength Meter ─────────────────────────────────────────

function updateStrength() {
  const kw  = keywordInput.value.replace(/[^a-zA-Z]/g, '');
  const s   = shiftValue;
  let score = 0;

  // keyword length score (0–3)
  if (kw.length >= 8)      score += 3;
  else if (kw.length >= 4) score += 2;
  else if (kw.length >= 1) score += 1;

  // shift score — extremes are weaker (0–2)
  if (s >= 8 && s <= 18)   score += 2;
  else if (s >= 4)          score += 1;

  // keyword uniqueness (no repeated chars)
  const unique = new Set(kw.toLowerCase()).size;
  if (unique >= 6)          score += 2;
  else if (unique >= 3)     score += 1;

  // keyword contains both shift zones
  const hasUpperHalf = [...kw.toUpperCase()].some(c => c >= 'N');
  const hasLowerHalf = [...kw.toUpperCase()].some(c => c <= 'M');
  if (hasUpperHalf && hasLowerHalf) score += 1;

  // max score = 8
  const pct = Math.round((score / 8) * 100);

  strengthBar.style.width = pct + '%';

  if (pct < 30) {
    strengthBar.style.background = '#ef4444';
    strengthLabel.textContent    = 'Weak';
    strengthLabel.style.color    = '#ef4444';
  } else if (pct < 60) {
    strengthBar.style.background = '#f59e0b';
    strengthLabel.textContent    = 'Fair';
    strengthLabel.style.color    = '#f59e0b';
  } else if (pct < 85) {
    strengthBar.style.background = '#10b981';
    strengthLabel.textContent    = 'Strong';
    strengthLabel.style.color    = '#10b981';
  } else {
    strengthBar.style.background = '#06b6d4';
    strengthLabel.textContent    = 'Very Strong';
    strengthLabel.style.color    = '#06b6d4';
  }
}

// ── Live Preview ────────────────────────────────────────────

function updateLivePreview() {
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => {
    const text = inputText.value.slice(0, 40); // preview first 40 chars
    const kw   = keywordInput.value || 'A';
    if (!text.trim()) {
      livePreview.textContent = '—';
      return;
    }
    livePreview.textContent = secretWeave(text, shiftValue, kw, currentMode === 'encrypt')
      + (inputText.value.length > 40 ? '…' : '');
  }, 250);
}

// ── Character Count ─────────────────────────────────────────

function updateCharCount() {
  const len = inputText.value.length;
  charCount.textContent = len === 0 ? '' : `${len} char${len !== 1 ? 's' : ''}`;
}

// ── Shift Controls ─────────────────────────────────────────

function setShift(val) {
  shiftValue = Math.min(25, Math.max(1, val));
  shiftDisplay.textContent = shiftValue;
  shiftSlider.value        = shiftValue;
  updateStrength();
  updateLivePreview();
}

function adjustShift(delta) { setShift(shiftValue + delta); }
function syncSlider()        { setShift(parseInt(shiftSlider.value, 10)); }

// ── Mode ───────────────────────────────────────────────────

function setMode(mode) {
  currentMode = mode;
  const isEncrypt = mode === 'encrypt';

  document.getElementById('encryptBtn').classList.toggle('active', isEncrypt);
  document.getElementById('decryptBtn').classList.toggle('active', !isEncrypt);
  document.getElementById('encryptBtn').setAttribute('aria-pressed', isEncrypt);
  document.getElementById('decryptBtn').setAttribute('aria-pressed', !isEncrypt);

  const inputCard  = document.getElementById('inputCard');
  const outputCard = document.getElementById('outputCard');
  inputCard.classList.toggle('mode-encrypt',  isEncrypt);
  inputCard.classList.toggle('mode-decrypt', !isEncrypt);
  outputCard.classList.toggle('mode-encrypt',  isEncrypt);
  outputCard.classList.toggle('mode-decrypt', !isEncrypt);

  const badge = document.getElementById('modeBadge');
  if (isEncrypt) {
    badge.className = 'mode-badge encrypt';
    badge.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <rect x="3" y="11" width="18" height="11" rx="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Encrypting`;
    actionBtn.className             = 'btn-primary encrypt-mode';
    actionBtn.innerHTML             = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Encrypt Message`;
    inputText.placeholder           = 'Type your plain text here…';
    inputLabel.textContent          = 'Plain Text';
    outputLabel.textContent         = 'Encrypted Output';
    placeholderText.textContent     = 'Your encrypted output will appear here';
  } else {
    badge.className = 'mode-badge decrypt';
    badge.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <rect x="3" y="11" width="18" height="11" rx="2"/>
        <path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg> Decrypting`;
    actionBtn.className             = 'btn-primary decrypt-mode';
    actionBtn.innerHTML             = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg> Decrypt Message`;
    inputText.placeholder           = 'Paste your cipher text here…';
    inputLabel.textContent          = 'Cipher Text';
    outputLabel.textContent         = 'Decrypted Output';
    placeholderText.textContent     = 'Your decrypted output will appear here';
  }

  updateLivePreview();
  clearOutput();
}

// ── Process ────────────────────────────────────────────────

function process() {
  const text = inputText.value;
  const kw   = keywordInput.value || 'A';

  if (!text.trim()) { showToast('Please enter some text.', false); return; }

  const origHTML      = actionBtn.innerHTML;
  actionBtn.innerHTML = '<span class="spinner"></span> Processing…';
  actionBtn.disabled  = true;

  setTimeout(() => {
    outputResult = secretWeave(text, shiftValue, kw, currentMode === 'encrypt');
    renderOutput(outputResult, text);
    addToHistory(text, outputResult, shiftValue, kw);
    actionBtn.innerHTML = origHTML;
    actionBtn.disabled  = false;
  }, 120);
}

// ── Render / Clear ─────────────────────────────────────────

function renderOutput(result, original) {
  outputPlaceholder.style.display = 'none';
  outputTextEl.style.display      = 'block';
  outputTextEl.textContent        = result;
  statusDot.classList.add('active');
  charMapWrap.style.display       = 'block';
  copyBtn.disabled = false;
  swapBtn.disabled = false;
  buildCharMap(original, result);
}

function clearOutput() {
  outputResult = '';
  outputPlaceholder.style.display = 'flex';
  outputTextEl.style.display      = 'none';
  outputTextEl.textContent        = '';
  statusDot.classList.remove('active');
  charMapWrap.style.display       = 'none';
  showCharMapCb.checked           = false;
  charMapContainer.style.display  = 'none';
  charMapContainer.innerHTML      = '';
  copyBtn.disabled = true;
  swapBtn.disabled = true;
}

function clearAll() {
  inputText.value = '';
  updateCharCount();
  updateLivePreview();
  clearOutput();
}

// ── History ────────────────────────────────────────────────

function addToHistory(original, result, shift, kw) {
  const entry = {
    mode:     currentMode,
    original: original.slice(0, 30) + (original.length > 30 ? '…' : ''),
    result:   result.slice(0, 30) + (result.length > 30 ? '…' : ''),
    shift,
    kw,
    time:     new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
  history.unshift(entry);
  if (history.length > 5) history.pop();
  renderHistory();
}

function renderHistory() {
  if (!historyList) return;
  historyList.innerHTML = '';
  if (history.length === 0) {
    historyList.innerHTML = '<p class="history-empty">No history yet</p>';
    return;
  }
  history.forEach((h, i) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="history-meta">
        <span class="history-badge ${h.mode}">${h.mode === 'encrypt' ? '🔒' : '🔓'} ${h.mode}</span>
        <span class="history-time">${h.time}</span>
      </div>
      <div class="history-text">
        <span class="history-from">${h.original}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        <span class="history-to">${h.result}</span>
      </div>
      <div class="history-params">Shift ${h.shift} · Key "${h.kw}"</div>`;
    item.addEventListener('click', () => {
      inputText.value = history[i].original.replace('…','');
      keywordInput.value = history[i].kw;
      setShift(history[i].shift);
      updateCharCount();
    });
    historyList.appendChild(item);
  });
}

// ── Character Map ──────────────────────────────────────────

function buildCharMap(original, result) {
  const kw  = (keywordInput.value || 'A').toUpperCase().replace(/[^A-Z]/g, '') || 'A';
  charMapContainer.innerHTML = '';
  const limit = Math.min(original.length, 60);
  let li = 0;

  for (let i = 0; i < limit; i++) {
    const orig    = original[i];
    const res     = result[i];
    const isAlpha = /[a-zA-Z]/.test(orig);

    const pair = document.createElement('div');
    pair.className = 'char-pair';

    const top = document.createElement('span');
    top.className   = 'char-orig';
    top.textContent = orig === ' ' ? '·' : orig;

    const bot = document.createElement('span');
    bot.className   = 'char-enc' + (!isAlpha ? ' space' : '');
    bot.textContent = res === ' ' ? '·' : res;

    if (isAlpha) {
      const ks = kw.charCodeAt(li % kw.length) - 64;
      bot.title = `Shift: ${shiftValue} · Key letter: ${kw[li % kw.length]} (+${ks}) · Total: ${shiftValue + ks}`;
      li++;
    }

    pair.appendChild(top);
    pair.appendChild(bot);
    charMapContainer.appendChild(pair);
  }

  if (original.length > limit) {
    const more = document.createElement('span');
    more.className   = 'char-map-more';
    more.textContent = `+${original.length - limit} more`;
    charMapContainer.appendChild(more);
  }
}

function toggleCharMap() {
  charMapContainer.style.display = showCharMapCb.checked ? 'flex' : 'none';
}

// ── Clipboard / Swap ───────────────────────────────────────

function copyOutput() {
  if (!outputResult) return;
  navigator.clipboard.writeText(outputResult)
    .then(() => showToast('Copied to clipboard!', true))
    .catch(() => showToast('Copy failed — select manually.', false));
  outputBody.classList.remove('flash');
  void outputBody.offsetWidth;
  outputBody.classList.add('flash');
}

function swapToInput() {
  if (!outputResult) return;
  inputText.value = outputResult;
  updateCharCount();
  updateLivePreview();
  setMode(currentMode === 'encrypt' ? 'decrypt' : 'encrypt');
  showToast('Output moved to input!', true);
}

// ── Toast ──────────────────────────────────────────────────

function showToast(message, success) {
  toast.style.background = success ? '#059669' : '#dc2626';
  toastMsg.textContent   = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

// ── Alphabet Table ─────────────────────────────────────────

(function buildAlphaTable() {
  const table = document.getElementById('alphaTable');
  if (!table) return;
  for (let i = 0; i < 26; i++) {
    const cell   = document.createElement('div');
    cell.className = 'alpha-cell';
    const letter = document.createElement('span');
    letter.className   = 'letter';
    letter.textContent = String.fromCharCode(65 + i);
    const num    = document.createElement('span');
    num.className   = 'num';
    num.textContent = i;
    cell.appendChild(letter);
    cell.appendChild(num);
    table.appendChild(cell);
  }
})();

// ── Event Listeners ────────────────────────────────────────

inputText.addEventListener('input', () => {
  updateCharCount();
  updateLivePreview();
});

keywordInput.addEventListener('input', () => {
  keywordInput.value = keywordInput.value.replace(/[^a-zA-Z]/g, '');
  updateStrength();
  updateLivePreview();
});

// ── Init ───────────────────────────────────────────────────

copyBtn.disabled = true;
swapBtn.disabled = true;
updateStrength();
renderHistory();
