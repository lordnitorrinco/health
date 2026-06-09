import { Pedometer } from 'expo-sensors';
import type { EventSubscription } from 'expo-modules-core';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { getTodayStepsCount, upsertTodaySteps } from '@/tools/handlers/stepCount';
import {
  isHealthConnectAvailable,
  syncTodayStepsFromHealthConnect,
} from './healthConnectSteps';

const HC_POLL_MS = 8_000;
const PEDOMETER_POLL_MS = 5_000;

type StepsListener = (steps: number) => void;

let subscription: EventSubscription | null = null;
let baselineSteps = 0;
let started = false;
let healthConnectMode = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let appStateSub: { remove: () => void } | null = null;
let lastNotifiedSteps = -1;
const listeners = new Set<StepsListener>();

function notifySteps(steps: number) {
  if (steps === lastNotifiedSteps) return;
  lastNotifiedSteps = steps;
  listeners.forEach((listener) => listener(steps));
}

export function subscribeTodaySteps(listener: StepsListener): () => void {
  listeners.add(listener);
  void getTodayStepsCount().then((steps) => {
    listener(steps);
    lastNotifiedSteps = steps;
  });
  return () => listeners.delete(listener);
}

async function persistToday(total: number) {
  if (total < 0) return;
  try {
    await upsertTodaySteps(total);
    notifySteps(total);
  } catch {
    // Evita que un fallo puntual de SQLite detenga el polling.
  }
}

async function syncFromWatch(watchSteps: number) {
  const total = baselineSteps + watchSteps;
  if (total >= baselineSteps) {
    await persistToday(total);
  }
}

async function syncHealthConnectIfAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (!(await isHealthConnectAvailable())) return false;

  try {
    const synced = await syncTodayStepsFromHealthConnect();
    if (synced) healthConnectMode = true;
    return synced;
  } catch {
    return false;
  }
}

export async function syncAndNotify(): Promise<number> {
  try {
    await syncHealthConnectIfAvailable();
    const steps = await getTodayStepsCount();
    notifySteps(steps);
    return steps;
  } catch {
    return lastNotifiedSteps >= 0 ? lastNotifiedSteps : 0;
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

function ensurePollingRunning() {
  startPolling(healthConnectMode ? HC_POLL_MS : PEDOMETER_POLL_MS);
}

function onAppActive() {
  void syncAndNotify();
  ensurePollingRunning();
  void refreshBaseline().then(() => startWatching());
}

function onAppInactive() {
  stopPolling();
  stopWatching();
}

function bindAppStateSync() {
  if (appStateSub) return;

  appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') onAppActive();
    else onAppInactive();
  });
}

async function startPedometerFallback() {
  const available = await Pedometer.isAvailableAsync();
  if (!available) return;

  const perm = await Pedometer.requestPermissionsAsync();
  if (!perm.granted) return;

  await refreshBaseline();
  await startWatching();
}

export async function startStepTracker() {
  if (started) return;
  started = true;

  bindAppStateSync();

  await syncHealthConnectIfAvailable();
  await startPedometerFallback();

  await syncAndNotify();
  ensurePollingRunning();

  if (AppState.currentState === 'active') {
    void refreshBaseline().then(() => startWatching());
  }
}

export async function refreshTodayStepsDisplay(): Promise<number> {
  return syncAndNotify();
}
