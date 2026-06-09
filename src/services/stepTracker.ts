import { Pedometer } from 'expo-sensors';
import type { EventSubscription } from 'expo-modules-core';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { getTodayStepsCount, upsertTodaySteps } from '@/tools/handlers/stepCount';
import {
  isHealthConnectAvailable,
  syncTodayStepsFromHealthConnect,
  usesHealthConnectSync,
} from './healthConnectSteps';

const HC_POLL_MS = 20_000;
const PEDOMETER_POLL_MS = 10_000;

type StepsListener = (steps: number) => void;

let subscription: EventSubscription | null = null;
let baselineSteps = 0;
let started = false;
let healthConnectMode = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let appStateSub: { remove: () => void } | null = null;
const listeners = new Set<StepsListener>();

function notifySteps(steps: number) {
  listeners.forEach((listener) => listener(steps));
}

export function subscribeTodaySteps(listener: StepsListener): () => void {
  listeners.add(listener);
  void getTodayStepsCount().then(listener);
  return () => listeners.delete(listener);
}

async function persistToday(total: number) {
  if (total < 0) return;
  await upsertTodaySteps(total);
  notifySteps(total);
}

async function syncFromWatch(watchSteps: number) {
  const total = baselineSteps + watchSteps;
  if (total >= baselineSteps) {
    await persistToday(total);
  }
}

async function syncAndNotify(): Promise<number> {
  if (Platform.OS === 'android') {
    if (healthConnectMode || usesHealthConnectSync()) {
      await syncTodayStepsFromHealthConnect();
    }
  }
  const steps = await getTodayStepsCount();
  notifySteps(steps);
  return steps;
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

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

function startPolling(intervalMs: number) {
  stopPolling();
  pollTimer = setInterval(() => {
    void syncAndNotify();
  }, intervalMs);
}

function onAppActive() {
  void syncAndNotify();
  startPolling(healthConnectMode ? HC_POLL_MS : PEDOMETER_POLL_MS);

  if (!healthConnectMode) {
    void refreshBaseline().then(() => startWatching());
  }
}

function onAppInactive() {
  stopPolling();
  if (!healthConnectMode) stopWatching();
}

function bindAppStateSync() {
  if (appStateSub) return;

  appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') onAppActive();
    else onAppInactive();
  });

  if (AppState.currentState === 'active') onAppActive();
}

async function tryStartHealthConnectSync(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (!(await isHealthConnectAvailable())) return false;

  const synced = await syncTodayStepsFromHealthConnect();
  if (!synced) return false;

  healthConnectMode = true;
  const steps = await getTodayStepsCount();
  notifySteps(steps);
  return true;
}

async function startPedometerFallback() {
  const available = await Pedometer.isAvailableAsync();
  if (!available) return;

  const perm = await Pedometer.requestPermissionsAsync();
  if (!perm.granted) return;

  await refreshBaseline();
  await startWatching();
  notifySteps(await getTodayStepsCount());
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
  return syncAndNotify();
}
