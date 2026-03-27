/* ═══════════════════════════════════════
   CHRONO.GRID — script.js
   ═══════════════════════════════════════ */

'use strict';

// ── STATE ──────────────────────────────
const state = {
  dates: [],
  checked: [],
  theme: 'green'
};

const STORAGE_KEY = 'chronogrid_v1';

// ── DOM REFS ───────────────────────────
const $ = id => document.getElementById(id);

const inputPanel      = $('inputPanel');
const progressPanel   = $('progressPanel');
const checklistPanel  = $('checklistPanel');
const checklistContainer = $('checklistContainer');

const startDateInput    = $('startDate');
const intervalDaysInput = $('intervalDays');
const totalIntervalsInput = $('totalIntervals');

const generateBtn = $('generateBtn');
const resetBtn    = $('resetBtn');
const exportBtn   = $('exportBtn');
const exportMenu  = $('exportMenu');
const exportPDFBtn   = $('exportPDF');
const exportImageBtn = $('exportImage');

const progressFill    = $('progressFill');
const progressGlow    = $('progressGlow');
const completedCount  = $('completedCount');
const totalCount      = $('totalCount');
const percentDisplay  = $('percentDisplay');
const progressStatus  = $('progressStatus');

const themeBtns = document.querySelectorAll('.theme-btn');
const canvas    = $('particleCanvas');
const ctx       = canvas.getContext('2d');

// ── PARTICLE SYSTEM ────────────────────
const particles = [];

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function spawnParticles(x, y, count = 14) {
  const color = getComputedStyle(document.body).getPropertyValue('--neon').trim();
  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * Math.PI * 2);
    const speed = 1.5 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.025 + Math.random() * 0.02,
      size: 2 + Math.random() * 3,
      color
    });
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.04; // slight gravity
    p.life -= p.decay;
    if (p.life <= 0) { particles.splice(i, 1); continue; }

    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  requestAnimationFrame(animateParticles);
}
animateParticles();

// ── SOUND ──────────────────────────────
let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playTick() {
  try {
    ensureAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.15);
  } catch(e) { /* silent fail */ }
}

function playUncheck() {
  try {
    ensureAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.15);
  } catch(e) { /* silent fail */ }
}

// ── DATE UTILS ─────────────────────────
const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function formatDate(dateObj) {
  const d = dateObj.getDate().toString().padStart(2, '0');
  const m = MONTHS[dateObj.getMonth()];
  const y = dateObj.getFullYear();
  return `${d} ${m} ${y}`;
}

function getDayLabel(dateObj) {
  return DAYS[dateObj.getDay()];
}

function generateDates(startStr, intervalDays, total) {
  const dates = [];
  const base = new Date(startStr + 'T00:00:00');
  for (let i = 0; i < total; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + (i * intervalDays));
    dates.push(d);
  }
  return dates;
}

// ── STORAGE ────────────────────────────
function saveToStorage() {
  const payload = {
    dates: state.dates.map(d => d.toISOString()),
    checked: state.checked,
    theme: state.theme,
    inputs: {
      startDate: startDateInput.value,
      intervalDays: intervalDaysInput.value,
      totalIntervals: totalIntervalsInput.value
    }
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data;
  } catch(e) { return null; }
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

// ── PROGRESS ───────────────────────────
function updateProgress(animate = false) {
  const total = state.dates.length;
  const done  = state.checked.filter(Boolean).length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  completedCount.textContent = done;
  totalCount.textContent     = total;
  percentDisplay.textContent = pct + '%';

  progressFill.style.width = pct + '%';
  progressGlow.style.width = pct + '%';

  if (pct === 0)        progressStatus.textContent = 'AWAITING MISSION LAUNCH';
  else if (pct < 25)    progressStatus.textContent = 'MISSION INITIATED — STAND BY';
  else if (pct < 50)    progressStatus.textContent = 'PROGRESS LOGGED — CONTINUE MISSION';
  else if (pct < 75)    progressStatus.textContent = 'HALFWAY MARK CROSSED — SUSTAIN EFFORT';
  else if (pct < 100)   progressStatus.textContent = 'APPROACHING COMPLETION — FINAL STRETCH';
  else                  progressStatus.textContent = '✓ MISSION ACCOMPLISHED — ALL CHECKPOINTS CLEARED';

  // completion badge
  let badge = document.querySelector('.complete-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'complete-badge';
    badge.textContent = '◈ ALL CHECKPOINTS CLEARED ◈';
    progressPanel.appendChild(badge);
  }
  badge.classList.toggle('show', pct === 100);
}

// ── CHECKLIST RENDER ───────────────────
function renderChecklist(animateItems = false) {
  checklistContainer.innerHTML = '';

  state.dates.forEach((dateObj, i) => {
    const item = document.createElement('div');
    item.className = 'checklist-item' + (state.checked[i] ? ' completed' : '');
    if (animateItems) {
      item.style.animationDelay = `${i * 0.04}s`;
    }

    item.innerHTML = `
      <span class="item-index">${String(i + 1).padStart(2, '0')}</span>
      <div class="custom-checkbox">${state.checked[i] ? '✓' : ''}</div>
      <span class="item-date">${formatDate(dateObj)}</span>
      <span class="item-day">${getDayLabel(dateObj)}</span>
    `;

    item.addEventListener('click', () => toggleItem(i, item));
    checklistContainer.appendChild(item);
  });
}

function toggleItem(index, itemEl) {
  const wasChecked = state.checked[index];
  state.checked[index] = !wasChecked;

  if (!wasChecked) {
    playTick();
    itemEl.classList.add('completed', 'flash');
    itemEl.querySelector('.custom-checkbox').textContent = '✓';
    setTimeout(() => itemEl.classList.remove('flash'), 500);

    // Particles at item center
    const rect = itemEl.getBoundingClientRect();
    spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 16);
  } else {
    playUncheck();
    itemEl.classList.remove('completed');
    itemEl.querySelector('.custom-checkbox').textContent = '';
  }

  updateProgress(true);
  saveToStorage();
}

// ── GENERATE ───────────────────────────
function generateChecklist() {
  const startVal    = startDateInput.value;
  const intervalVal = parseInt(intervalDaysInput.value, 10);
  const totalVal    = parseInt(totalIntervalsInput.value, 10);

  if (!startVal)         return shake(startDateInput);
  if (!intervalVal || intervalVal < 1) return shake(intervalDaysInput);
  if (!totalVal || totalVal < 1)       return shake(totalIntervalsInput);

  state.dates   = generateDates(startVal, intervalVal, totalVal);
  state.checked = new Array(totalVal).fill(false);

  saveToStorage();
  showChecklist(true);
}

function shake(el) {
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = 'slideIn 0.2s ease';
  el.style.borderColor = '#ff4466';
  el.style.boxShadow = '0 0 10px rgba(255,68,102,0.3)';
  setTimeout(() => {
    el.style.borderColor = '';
    el.style.boxShadow = '';
  }, 800);
}

function showChecklist(animateItems = false) {
  progressPanel.style.display = '';
  checklistPanel.style.display = '';

  renderChecklist(animateItems);
  updateProgress();

  // Smooth scroll to checklist
  setTimeout(() => checklistPanel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
}

// ── RESET ──────────────────────────────
function resetAll() {
  if (!confirm('Reset all progress? This cannot be undone.')) return;
  clearStorage();
  state.dates   = [];
  state.checked = [];

  progressPanel.style.display   = 'none';
  checklistPanel.style.display  = 'none';
  checklistContainer.innerHTML  = '';

  startDateInput.value          = '';
  intervalDaysInput.value       = '7';
  totalIntervalsInput.value     = '10';

  inputPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── THEME ──────────────────────────────
function applyTheme(theme) {
  state.theme = theme;
  document.body.dataset.theme = theme;
  themeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
  saveToStorage();
}

themeBtns.forEach(btn => {
  btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
});

// ── EXPORT ─────────────────────────────
exportBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  exportMenu.style.display = exportMenu.style.display === 'none' ? 'flex' : 'none';
});

document.addEventListener('click', () => {
  exportMenu.style.display = 'none';
});

exportPDFBtn.addEventListener('click', async () => {
  exportMenu.style.display = 'none';
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const theme = state.theme === 'green' ? '#00ff8c' : state.theme === 'blue' ? '#00b4ff' : '#b450ff';

    // Header
    doc.setFillColor(3, 9, 18);
    doc.rect(0, 0, 210, 297, 'F');
    doc.setTextColor(theme);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('CHRONO.GRID — CHECKPOINT LOG', 14, 20);

    doc.setTextColor(100, 130, 100);
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}`, 14, 28);

    const done  = state.checked.filter(Boolean).length;
    const total = state.dates.length;
    const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
    doc.text(`Progress: ${done}/${total} (${pct}%)`, 14, 34);

    // Items
    let y = 46;
    doc.setFontSize(10);
    state.dates.forEach((dateObj, i) => {
      const checked = state.checked[i];
      doc.setFillColor(checked ? 6 : 4, checked ? 15 : 9, checked ? 30 : 18);
      doc.roundedRect(14, y - 4, 182, 8, 1, 1, 'F');

      // Index
      doc.setTextColor(60, 100, 70);
      doc.setFont('helvetica', 'normal');
      doc.text(String(i + 1).padStart(2, '0'), 18, y + 1);

      // Checkbox
      doc.setDrawColor(checked ? theme : '#333');
      if (checked) {
        doc.setFillColor(0, checked ? 200 : 50, checked ? 100 : 50);
        doc.roundedRect(27, y - 3, 5, 5, 0.5, 0.5, 'FD');
        doc.setTextColor(3, 9, 18);
        doc.setFontSize(7);
        doc.text('✓', 28.5, y + 0.8);
        doc.setFontSize(10);
      } else {
        doc.roundedRect(27, y - 3, 5, 5, 0.5, 0.5, 'D');
      }

      // Date
      const col = checked ? theme : '#cceecc';
      doc.setTextColor(parseInt(col.slice(1,3),16), parseInt(col.slice(3,5),16), parseInt(col.slice(5,7),16));
      doc.setFont('helvetica', checked ? 'bold' : 'normal');
      doc.text(formatDate(dateObj), 36, y + 1);

      // Day
      doc.setTextColor(60, 100, 70);
      doc.setFontSize(7);
      doc.text(getDayLabel(dateObj), 185, y + 1, { align: 'right' });
      doc.setFontSize(10);

      y += 10;
      if (y > 280) { doc.addPage(); y = 20; }
    });

    doc.save('chrono-grid-checklist.pdf');
  } catch(e) {
    alert('PDF export failed. Please try Image export instead.');
    console.error(e);
  }
});

exportImageBtn.addEventListener('click', async () => {
  exportMenu.style.display = 'none';
  try {
    const el = checklistPanel;
    const canvas = await html2canvas(el, {
      backgroundColor: '#030912',
      scale: 2,
      logging: false
    });
    const link = document.createElement('a');
    link.download = 'chrono-grid-checklist.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch(e) {
    alert('Image export failed. Please try PDF export instead.');
    console.error(e);
  }
});

// ── SET DEFAULT DATE ───────────────────
function setDefaultDate() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  startDateInput.value = `${y}-${m}-${d}`;
}

// ── INIT / RESTORE ─────────────────────
function init() {
  setDefaultDate();

  const saved = loadFromStorage();
  if (saved) {
    // Restore theme first
    if (saved.theme) applyTheme(saved.theme);

    // Restore inputs
    if (saved.inputs) {
      if (saved.inputs.startDate)      startDateInput.value      = saved.inputs.startDate;
      if (saved.inputs.intervalDays)   intervalDaysInput.value   = saved.inputs.intervalDays;
      if (saved.inputs.totalIntervals) totalIntervalsInput.value = saved.inputs.totalIntervals;
    }

    // Restore dates & checked states
    if (saved.dates && saved.dates.length > 0) {
      state.dates   = saved.dates.map(iso => new Date(iso));
      state.checked = saved.checked || new Array(state.dates.length).fill(false);
      showChecklist(false);
    }
  }
}

// ── EVENT LISTENERS ────────────────────
generateBtn.addEventListener('click', generateChecklist);
resetBtn.addEventListener('click', resetAll);

// Allow Enter key on inputs
[startDateInput, intervalDaysInput, totalIntervalsInput].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') generateChecklist(); });
});

// ── BOOT ───────────────────────────────
init();
