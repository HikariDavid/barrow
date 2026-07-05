import { redis } from '@devvit/redis';
import type { LedgerEntry } from '../../shared/types';

export function ledgerKey(user: string): string {
  return `ledger:${user}`;
}

export async function addLedgerEntry(
  user: string,
  text: string
): Promise<void> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const entry: LedgerEntry = { id, text, ts: Date.now() };
  await redis.hSet(ledgerKey(user), { [id]: JSON.stringify(entry) });
}

export async function getLedgerEntries(
  user: string
): Promise<LedgerEntry[]> {
  const all = await redis.hScan(ledgerKey(user), 0, undefined, 100);
  return all.fieldValues.map((fv: { field: string; value: string }) => JSON.parse(fv.value) as LedgerEntry);
}

export async function clearLedgerEntries(
  user: string,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;
  await redis.hDel(ledgerKey(user), ids);
}
