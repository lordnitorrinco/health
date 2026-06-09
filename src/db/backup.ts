import {
  backupDatabaseSync,
  deleteDatabaseSync,
  deserializeDatabaseSync,
  openDatabaseSync,
} from 'expo-sqlite';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  closeDatabase,
  DB_NAME,
  getSqlite,
  resetDatabaseConnection,
} from './client';

function bytesToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function backupFileName(): string {
  return `health-backup-${new Date().toISOString().slice(0, 10)}.db`;
}

function assertSqliteBackup(bytes: Uint8Array) {
  if (bytes.length < 16) {
    throw new Error('Archivo demasiado pequeño o corrupto.');
  }
  const header = new TextDecoder().decode(bytes.subarray(0, 15));
  if (!header.startsWith('SQLite format')) {
    throw new Error('No parece un backup válido de SQLite.');
  }
}

export async function exportDatabase(): Promise<void> {
  const data = getSqlite().serializeSync();
  const path = `${FileSystem.cacheDirectory}${backupFileName()}`;

  await FileSystem.writeAsStringAsync(path, bytesToBase64(data), {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Compartir no está disponible en este dispositivo.');
  }

  await Sharing.shareAsync(path, {
    mimeType: 'application/x-sqlite3',
    dialogTitle: 'Exportar datos de Health',
  });
}

export async function importDatabase(): Promise<void> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) return;

  const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = base64ToBytes(base64);
  assertSqliteBackup(bytes);

  await closeDatabase();

  try {
    deleteDatabaseSync(DB_NAME);
    const src = deserializeDatabaseSync(bytes);
    const dest = openDatabaseSync(DB_NAME);
    backupDatabaseSync({ sourceDatabase: src, destDatabase: dest });
    src.closeSync();
    dest.closeSync();
  } catch (e) {
    resetDatabaseConnection();
    throw e instanceof Error ? e : new Error('No se pudo restaurar el backup.');
  }

  resetDatabaseConnection();
}
