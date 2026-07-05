import { LAUNCH_DATE } from '../../shared/const';

export function getGameDate(dayOffset: number = 0): string {
  const now = new Date();
  const utcMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const offsetMs = dayOffset * 86400000;
  const d = new Date(utcMs + offsetMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDayNumber(date: string): number {
  const launch = new Date(LAUNCH_DATE + 'T00:00:00Z');
  const current = new Date(date + 'T00:00:00Z');
  return Math.floor((current.getTime() - launch.getTime()) / 86400000) + 1;
}

export function tomorrow(date: string): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function yesterday(date: string): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
