import { Pedometer } from 'expo-sensors';
import type { EventSubscription } from 'expo-modules-core';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { getTodayStepsCount, upsertTodaySteps } from '@/tools/handlers/stepCount';
import {
  isHealthConnectAvailable,
  syncTodayStepsFromHealthConnect,
  usesHealthConnectSync,
} from './healthConnectSteps';

let subscription: EventSubscription | null = null;
let baselineSteps = 0;
let started = false;
let healthConnectMode = false;

async function persistToday(total: number) {
  if (total < 0) return;
  await upsertTodaySteps(total);
}

async function syncFromWatch(watchSteps: number) {
  const total = baselineSteps + watchSteps;
  if (total >= baselineSteps) {
    await persistToday(total);
  }
}

async function startWatching() {
  if (subscription) return;

  subscription = Pedometer.watchStepCount((result) => {
    void syncFromWatch(result.steps);
  });
}

function stopWatching() {
  subscription?.remove();
  subscription = null;
}

async function refreshBaseline() {
  baselineSteps = await getTodayStepsCount();
}

async function tryStartHealthConnectSync(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (!(await isHealthConnectAvailable())) return false;

  const synced = await syncTodayStepsFromHealthConnect();
  if (!synced) return false;

  healthConnectMode = true;
  return true;
}

async function startPedometerFallback() {
  const available = await Pedometer.isAvailableAsync();
  if (!available) return;

  const perm = await Pedometer.requestPermissionsAsync();
  if (!perm.granted) return;

  await refreshBaseline();
  await startWatching();
}

function bindAppStateSync() {
  AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state !== 'active') {
      if (!healthConnectMode) stopWatching();
      return;
    }

    if (healthConnectMode || usesHealthConnectSync()) {
      void syncTodayStepsFromHealthConnect();
      return;
    }

    void refreshBaseline().then(() => startWatching());
  });
}

export async function startStepTracker() {
  if (started) return;
  started = true;

  if (await tryStartHealthConnectSync()) {
    bindAppStateSync();
    return;
  }

  await startPedometerFallback();
  bindAppStateSync();
}

export async function refreshTodayStepsDisplay(): Promise<number> {
  if (Platform.OS === 'android') {
    await syncTodayStepsFromHealthConnect();
  }
  return getTodayStepsCount();
}
