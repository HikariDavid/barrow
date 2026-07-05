import { requestExpandedMode } from '@devvit/web/client';
import type { InitPayload } from '../shared/types.js';

const startButton = document.getElementById('start-button') as HTMLButtonElement;
const dayInfo = document.getElementById('day-info') as HTMLDivElement;
const meterFill = document.getElementById('meter-fill') as HTMLDivElement;
const meterLabel = document.getElementById('meter-label') as HTMLDivElement;
const streakEl = document.getElementById('streak') as HTMLDivElement;
const deepestEl = document.getElementById('deepest') as HTMLDivElement;
const loggedOutEl = document.getElementById('logged-out') as HTMLDivElement;

startButton.addEventListener('click', (e) => {
  requestExpandedMode(e, 'game');
});

async function init() {
  try {
    const resp = await fetch('/api/init');
    const data = (await resp.json()) as InitPayload;

    dayInfo.textContent = `Day ${data.dayNumber} \u00b7 ${data.date}`;

    const maxTier = data.meter.tiers[2]!;
    const pct = Math.min((data.meter.value / maxTier) * 100, 100);
    meterFill.style.width = `${pct}%`;

    if (data.meter.value === 0) {
      meterLabel.textContent = 'The Barrow is unmoved.';
    } else if (data.meter.unlockedYesterday >= 1) {
      meterLabel.textContent = 'The dead were many. The Barrow relents.';
    } else {
      meterLabel.textContent = `${data.meter.value} depth explored today.`;
    }

    if (data.streak.current > 1) {
      streakEl.textContent = `\u2644 ${data.streak.current} day streak`;
    } else {
      streakEl.textContent = '';
    }

    if (data.lb.top.length > 0) {
      const lines = data.lb.top.slice(0, 3).map(
        (r) => `<span>${r.user}</span> \u2014 ${r.depth} depth`
      );
      deepestEl.innerHTML = lines.join('<br/>');
    } else {
      deepestEl.textContent = 'No scores yet today.';
    }

    if (data.flags.loggedOut) {
      loggedOutEl.textContent = 'Log in to be remembered.';
      startButton.textContent = 'Wander as Ghost';
    } else {
      loggedOutEl.textContent = '';
    }
  } catch {
    dayInfo.textContent = 'Day 1';
    meterLabel.textContent = 'The Barrow awaits.';
  }
}

init();
