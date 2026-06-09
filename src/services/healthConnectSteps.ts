import { Platform } from 'react-native';
import {
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import type { TimeRangeFilter } from 'react-native-health-connect/lib/typescript/types/base.types';
import { getTodayStepsCount, upsertTodaySteps } from '@/tools/handlers/stepCount';

let initialized = false;
let healthConnectReady = false;

function localDayTimeRange(): TimeRangeFilter {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    operator: 'between',
    startTime: start.toISOString(),
    endTime: now.toISOString(),
  };
}

function hasStepsReadPermission(
  permissions: ReadonlyArray<{ recordType?: string; accessType?: string }>,
): boolean {
  return permissions.some(
    (p) => p.recordType === 'Steps' && p.accessType === 'read',
  );
}

export async function isHealthConnectAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const status = await getSdkStatus();
    return status === SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch {
    return false;
  }
}

export async function ensureHealthConnectReady(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (healthConnectReady) return true;

  if (!(await isHealthConnectAvailable())) return false;

  if (!initialized) {
    initialized = await initialize();
    if (!initialized) return false;
  }

  const granted = await getGrantedPermissions();
  if (!hasStepsReadPermission(granted)) {
    const requested = await requestPermission([{ accessType: 'read', recordType: 'Steps' }]);
    if (!hasStepsReadPermission(requested)) return false;
  }

  healthConnectReady = true;
  return true;
}

export async function fetchTodayStepsFromHealthConnect(): Promise<number | null> {
  if (!(await ensureHealthConnectReady())) return null;

  try {
    const result = await aggregateRecord({
      recordType: 'Steps',
      timeRangeFilter: localDayTimeRange(),
    });
    return result.COUNT_TOTAL ?? 0;
  } catch {
    return null;
  }
}

export async function syncTodayStepsFromHealthConnect(): Promise<boolean> {
  const steps = await fetchTodayStepsFromHealthConnect();
  if (steps === null) return false;

  const local = await getTodayStepsCount();
  await upsertTodaySteps(Math.max(steps, local));
  return true;
}

export function usesHealthConnectSync(): boolean {
  return healthConnectReady;
}
