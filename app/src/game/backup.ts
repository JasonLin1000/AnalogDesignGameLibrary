// Backup / restore of every adg.* key (progress, drafts, settings) as a downloadable JSON file.
import { downloadJson, readJsonFile } from './custom';

export function backupProgress() {
  const data: Record<string, unknown> = { app: 'analog-design-game', version: 1, savedAt: new Date().toISOString(), storage: {} };
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('adg.')) (data.storage as Record<string, string>)[k] = localStorage.getItem(k)!;
  } catch { /* ignore */ }
  downloadJson(`analog-design-game-save-${new Date().toISOString().slice(0, 10)}.json`, data);
}

/** Returns false for a file that is not a save; asks before overwriting and reloads on success. */
export async function restoreProgress(f: File, confirmText: string): Promise<boolean> {
  try {
    const d = (await readJsonFile(f)) as { app?: string; storage?: Record<string, string> };
    if (d.app !== 'analog-design-game' || !d.storage) return false;
    if (!confirm(confirmText)) return true;
    for (const [k, v] of Object.entries(d.storage)) if (k.startsWith('adg.')) localStorage.setItem(k, v);
    location.reload();
    return true;
  } catch { return false; }
}
