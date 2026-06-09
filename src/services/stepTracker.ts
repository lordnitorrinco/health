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
type StepSource = 'none' | 'pedometer' | 'health-connect';

let subscription: EventSubscription | null = null;
let baselineSteps = 0;
let started = false;
let healthConnectMode = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let appStateSub: { remove: () => void } | null = null;
let lastNotifiedSteps = -1;
const listeners = new Set<StepsListener>();

// Diagnóstico observable desde la UI.
const status = {
  source: 'none' as StepSource,
  pedometerAvailable: false,
  pedometerPermission: false,
  healthConnectAvailable: false,
  watchEvents: 0,
  lastWatchSteps: 0,
  baseline: 0,
  current: 0,
  lastUpdate: 0,
};

export type StepTrackerStatus = typeof status;

export function getStepTrackerStatus(): StepTrackerStatus {
  return { ...status };
}

function notifySteps(steps: number) {
  status.current = steps;
  status.lastUpdate = Date.now();
  if (steps === lastNotifiedSteps) return;
  lastNotifiedSteps = steps;
  listeners.forEach((listener) => listener(steps));
}

export function subscribeTodaySteps(listener: StepsListener): () => void {
  listeners.add(listener);
  void getTodayStepsCount().then((steps) => {
    listener(steps);
    lastNotifiedSteps = steps;
    status.current = steps;
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

function onWatchEvent(watchSteps: number) {
  status.watchEvents++;
  status.lastWatchSteps = watchSteps;
  status.source = healthConnectMode ? 'health-connect' : 'pedometer';

  const total = baselineSteps + watchSteps;
  // Actualización inmediata en pantalla, sin esperar a SQLite.
  if (total >= 0) notifySteps(total);
  void persistToday(total);
}

async function syncHealthConnectIfAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (!(await isHealthConnectAvailable())) return false;

  status.healthConnectAvailable = true;
  try {
    const synced = await syncTodayStepsFromHealthConnect();
    if (synced) {
      healthConnectMode = true;
      status.source = 'health-connect';
    }
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

function startWatching() {
  if (subscription) return;
  subscription = Pedometer.watchStepCount((result) => {
    onWatchEvent(result.steps);
  });
}

function stopWatching() {
  subscription?.remove();
  subscription = null;
}

async function refreshBaseline() {
  baselineSteps = await getTodayStepsCount();
  status.baseline = baselineSteps;
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

// Recrea la suscripción para que watchSteps cuente desde la nueva baseline.
async function restartWatching() {
  stopWatching();
  await refreshBaseline();
  startWatching();
}

function onAppActive() {
  void syncAndNotify();
  ensurePollingRunning();
  if (status.pedometerPermission) void restartWatching();
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

async function startPedometer() {
  try {
    status.pedometerAvailable = await Pedometer.isAvailableAsync();
    if (!status.pedometerAvailable) return;

    const perm = await Pedometer.requestPermissionsAsync();
    status.pedometerPermission = perm.granted;
    if (!perm.granted) return;

    await refreshBaseline();
    startWatching();
    if (status.source === 'none') status.source = 'pedometer';
  } catch {
    status.pedometerAvailable = false;
  }
}

export async function startStepTracker() {
  if (started) return;
  started = true;

  bindAppStateSync();

  await syncHealthConnectIfAvailable();
  await startPedometer();

  await syncAndNotify();
  ensurePollingRunning();
}

export async function refreshTodayStepsDisplay(): Promise<number> {
  return syncAndNotify();
}
