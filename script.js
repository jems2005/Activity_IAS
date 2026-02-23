/* ===========================
   SecretWeave — script.js
   Caesar Cipher App
   =========================== */

'use strict';

// ── State ──────────────────────────────────────────────────
let currentMode  = 'encrypt';
let outputResult = '';
let toastTimer   = null;

// ── DOM References ─────────────────────────────────────────
const inputText         = document.getElementById('inputText');
const shiftDisplay      = document.getElementById('shiftDisplay');
const shiftMinus        = document.getElementById('shiftMinus');
const shiftPlus         = document.getElementById('shiftPlus');
const shiftSlider       = document.getElementById('shiftSlider');
const previewShiftVal   = document.getElementById('previewShiftVal');
const previewFrom       = document.getElementById('previewFrom');
const previewTo         = document.getElementById('previewTo');
const actionBtn         = document.getElementById('actionBtn');
const inputLabel        = document.getElementById('inputLabel');
const outputLabel       = document.getElementById('outputLabel');
const statusDot         = document.getElementById('statusDot');
const outputBody        = document.getElementById('outputBody');
const outputPlaceholder = document.getElementById('outputPlaceholder');
const outputTextEl      = document.getElementById('outputText');
const charMapWrap       = document.getElementById('charMapWrap');
const charMapContainer  = document.getElementById('charMapContainer');
const showCharMapCb     = document.getElementById('showCharMap');
const copyBtn           = document.getElementById('copyBtn');
const swapBtn           = document.getElementById('swapBtn');
const toast             = document.getElementById('toast');
const toastMsg          = document.getElementById('toastMsg');

// ── Caesar Cipher Core ─────────────────────────────────────

/**
 * Encrypt or decrypt text using the Caesar cipher.
 * Only letters are shifted; everything else passes through.
 * Case is preserved.
 *
 * @param {string}  text    - Input text
 * @param {number}  shift   - Shift amount (1–25)
 * @param {boolean} encrypt - true = encrypt, false = decrypt
 * @returns {string}
 */
function caesar(text, shift, encrypt) {
  const s = encrypt ? shift : (26 - shift);
  return text.split('').map(char => {
    if (/[a-zA-Z]/.test(char)) {
      const base = char >= 'a' ? 97 : 65;
      return String.fromCharCode((char.charCodeAt(0) - base + s) % 26 + base);
    }
    return char;
  }).join('');
}

// ── Shift Control ──────────────────────────────────────────

function getShift() {
  return parseInt(shiftSlider.value, 10);
}

function setShift(val) {
  val = Math.max(1, Math.min(25, val));
  shiftSlider.value          = val;
  shiftDisplay.textContent   = val;
  previewShiftVal.textContent = val;
  updatePreview(val);
}

// Update the live alphabet preview strip
function updatePreview(shift) {
  const SAMPLE = 'ABCDEFGHIJ';
  previewFrom.innerHTML = '';
  previewTo.innerHTML   = '';

  SAMPLE.split('').forEach(ch => {
    const top = document.createElement('div');
    top.className   = 'preview-cell';
    top.textContent = ch;
    previewFrom.appendChild(top);

    const enc = caesar(ch, shift, true);
    const bot = document.createElement('div');
    bot.className   = 'preview-cell';
    bot.textContent = enc;
    previewTo.appendChild(bot);
  });
}

// Slider input
shiftSlider.addEventListener('input', () => setShift(getShift()));

// + / - buttons
shiftMinus.addEventListener('click', () => setShift(getShift() - 1));
shiftPlus.addEventListener('click',  () => setShift(getShift() + 1));

// ── Mode ───────────────────────────────────────────────────

function setMode(mode) {
  currentMode = mode;
  const isEncrypt = mode === 'encrypt';

  // Toggle buttons
  document.getElementById('encryptBtn').classList.toggle('active', isEncrypt);
  document.getElementById('decryptBtn').classList.toggle('active', !isEncrypt);
  document.getElementById('encryptBtn').setAttribute('aria-pressed', isEncrypt);
  document.getElementById('decryptBtn').setAttribute('aria-pressed', !isEncrypt);

  // Card color theme
  const inputCard  = document.getElementById('inputCard');
  const outputCard = document.getElementById('outputCard');
  inputCard.classList.toggle('mode-encrypt', isEncrypt);
  inputCard.classList.toggle('mode-decrypt', !isEncrypt);
  outputCard.classList.toggle('mode-encrypt', isEncrypt);
  outputCard.classList.toggle('mode-decrypt', !isEncrypt);

  // Mode badge
  const badge = document.getElementById('modeBadge');
  if (isEncrypt) {
    badge.className = 'mode-badge encrypt';
    badge.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>Encrypting`;
  } else {
    badge.className = 'mode-badge decrypt';
    badge.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2"/>
        <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
      </svg>Decrypting`;
  }

  // Action button
  actionBtn.className = `btn-primary ${mode}-mode`;
  if (isEncrypt) {
    actionBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>Encrypt Message`;
    inputText.placeholder = 'Type your plain text message here…';
    inputLabel.textContent  = 'Plain Text';
    outputLabel.textContent = 'Encrypted Output';
    outputPlaceholder.querySelector('span').textContent = 'Your encrypted output will appear here';
  } else {
    actionBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2"/>
        <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
      </svg>Decrypt Message`;
    inputText.placeholder = 'Paste your cipher text here to decode…';
    inputLabel.textContent  = 'Cipher Text';
    outputLabel.textContent = 'Decrypted Output';
    outputPlaceholder.querySelector('span').textContent = 'Your decrypted output will appear here';
  }

  clearOutput();
}

// ── Process ────────────────────────────────────────────────

function process() {
  const text  = inputText.value;
  const shift = getShift();

  if (!text.trim()) {
    showToast('Please enter some text.', false);
    return;
  }

  const origHTML = actionBtn.innerHTML;
  actionBtn.innerHTML = '<span class="spinner"></span> Processing…';
  actionBtn.disabled  = true;

  setTimeout(() => {
    outputResult = caesar(text, shift, currentMode === 'encrypt');
    renderOutput(outputResult, text, shift);
    actionBtn.innerHTML = origHTML;
    actionBtn.disabled  = false;
  }, 120);
}

// ── Render / Clear Output ──────────────────────────────────

function renderOutput(result, original, shift) {
  outputPlaceholder.style.display = 'none';
  outputTextEl.style.display      = 'block';
  outputTextEl.textContent        = result;
  statusDot.classList.add('active');
  charMapWrap.style.display = 'block';
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
  clearOutput();
}

// ── Character Map ──────────────────────────────────────────

function buildCharMap(original, result) {
  charMapContainer.innerHTML = '';
  const limit = Math.min(original.length, 60);

  for (let i = 0; i < limit; i++) {
    const orig  = original[i];
    const res   = result[i];
    const isAlpha = /[a-zA-Z]/.test(orig);

    const pair = document.createElement('div');
    pair.className = 'char-pair';

    const top = document.createElement('span');
    top.className   = 'char-orig';
    top.textContent = orig === ' ' ? '·' : orig;

    const bot = document.createElement('span');
    bot.className   = 'char-enc' + (!isAlpha ? ' space' : '');
    bot.textContent = res === ' ' ? '·' : res;
    if (isAlpha) bot.title = `${orig} → ${res} (shift ${getShift()})`;

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

// ── Clipboard ──────────────────────────────────────────────

function copyOutput() {
  if (!outputResult) { showToast('Nothing to copy yet.', false); return; }
  navigator.clipboard.writeText(outputResult)
    .then(() => showToast('Copied to clipboard!', true))
    .catch(() => showToast('Copy failed — select and copy manually.', false));
  outputBody.classList.remove('flash');
  void outputBody.offsetWidth;
  outputBody.classList.add('flash');
}

function swapToInput() {
  if (!outputResult) { showToast('Nothing to swap yet.', false); return; }
  inputText.value = outputResult;
  setMode(currentMode === 'encrypt' ? 'decrypt' : 'encrypt');
  showToast('Output moved to input!', true);
}

// ── Toast ──────────────────────────────────────────────────

function showToast(message, success) {
  toast.className = `toast ${success ? 'success' : 'error'}`;
  toastMsg.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

// ── Alphabet Reference Table ───────────────────────────────

(function buildAlphaTable() {
  const table = document.getElementById('alphaTable');
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

// ── Init ───────────────────────────────────────────────────
setShift(3);
