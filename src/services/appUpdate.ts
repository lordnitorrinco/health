import * as Application from 'expo-application';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { UPDATE_APK_URL, UPDATE_MANIFEST_URL } from '@/config/update';

export type VersionInfo = {
  version: string;
  versionCode: number;
};

export type UpdateCheckResult = {
  available: boolean;
  local: VersionInfo;
  remote: VersionInfo;
};

export function getLocalVersionInfo(): VersionInfo {
  return {
    version: Application.nativeApplicationVersion ?? '0',
    versionCode: Number(Application.nativeBuildVersion ?? '0'),
  };
}

export async function fetchRemoteVersionInfo(): Promise<VersionInfo | null> {
  const res = await fetch(UPDATE_MANIFEST_URL, { cache: 'no-store' });
  if (!res.ok) return null;

  const json = (await res.json()) as {
    expo?: { version?: string; android?: { versionCode?: number } };
  };

  const version = json.expo?.version;
  const versionCode = json.expo?.android?.versionCode;
  if (!version || versionCode == null) return null;

  return { version, versionCode };
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  if (Platform.OS !== 'android') {
    throw new Error('Las actualizaciones in-app solo están disponibles en Android.');
  }

  const local = getLocalVersionInfo();
  const remote = await fetchRemoteVersionInfo();
  if (!remote) {
    throw new Error('No se pudo comprobar actualizaciones (sin conexión o manifest inválido).');
  }

  return {
    available: remote.versionCode > local.versionCode,
    local,
    remote,
  };
}

export async function downloadAndInstallUpdate(
  onProgress?: (progress: number) => void,
): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new Error('Las actualizaciones in-app solo están disponibles en Android.');
  }

  const target = `${FileSystem.cacheDirectory}health-update.apk`;

  const download = FileSystem.createDownloadResumable(
    UPDATE_APK_URL,
    target,
    {},
    (progress) => {
      const total = progress.totalBytesExpectedToWrite;
      if (total <= 0) return;
      onProgress?.(progress.totalBytesWritten / total);
    },
  );

  const result = await download.downloadAsync();
  if (!result?.uri) throw new Error('La descarga del APK falló.');

  const contentUri = await FileSystem.getContentUriAsync(result.uri);

  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    type: 'application/vnd.android.package-archive',
    flags: 1,
  });
}
