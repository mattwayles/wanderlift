/**
 * Settings' "Export my data" and "Delete all data". The rows come from `userDataRepo`; this adds
 * the two things only the app can do: hand the export to the iOS share sheet (Save to Files, AirDrop,
 * Mail), and cancel the notifications this phone had scheduled before the data behind them goes.
 * No file-system module is involved: the share sheet takes the JSON as text.
 */
import { Share } from 'react-native';
import * as Notifications from 'expo-notifications';
import { userDataRepo } from '@roamfit/store';
import type { Db } from '@roamfit/store';
import { nowUtcInstant } from './localClock';

/** The export as pretty-printed JSON text. */
export function buildExportJson(db: Db): string {
  return JSON.stringify(userDataRepo.exportAllUserData(db, nowUtcInstant()), null, 2);
}

/** Opens the share sheet with the export. True when the sheet opened; a dismissed sheet is not an
 *  error. False only if iOS could not present it. */
export async function shareUserData(db: Db): Promise<boolean> {
  try {
    await Share.share({ title: 'Wanderlift data', message: buildExportJson(db) });
    return true;
  } catch {
    return false;
  }
}

/** Wipes every per-user row and cancels all scheduled notifications. The caller must then restart
 *  the app subtree (`useStore().restart()`) so nothing keeps state read from the deleted data. */
export async function eraseUserData(db: Db): Promise<void> {
  userDataRepo.deleteAllUserData(db);
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Best-effort: the data is gone either way, and the next launch reschedules from a fresh user.
  }
}
