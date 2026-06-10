import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { exportDatabase, importDatabase } from '@/db/backup';
import { clearChatHistory } from '@/services/chatHistory';
import {
  checkForUpdate,
  downloadAndInstallUpdate,
  getLocalVersionInfo,
} from '@/services/appUpdate';
import { getApiKey, setApiKey } from '@/storage/apiKey';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const bottomPad =
    insets.bottom > 0 ? insets.bottom + 20 : Platform.OS === 'android' ? 48 : 20;
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [downloadingUpdate, setDownloadingUpdate] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [versionLabel, setVersionLabel] = useState('');

  useEffect(() => {
    getApiKey().then((k) => {
      if (k) {
        setKey(k);
        setSaved(true);
      }
    });
    const { version, versionCode } = getLocalVersionInfo();
    setVersionLabel(`v${version} (${versionCode})`);
  }, []);

  async function save() {
    if (!key.trim()) {
      Alert.alert('Error', 'Introduce una API key válida.');
      return;
    }
    await setApiKey(key);
    setSaved(true);
    Alert.alert('Guardado', 'API key guardada en el dispositivo.');
  }

  async function onExport() {
    setExporting(true);
    try {
      await exportDatabase();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      Alert.alert('Exportar', msg);
    } finally {
      setExporting(false);
    }
  }

  function onImport() {
    Alert.alert(
      'Importar backup',
      'Se reemplazarán todos los datos actuales (rutinas, dieta, sesiones, pasos…). La API key no se incluye en el backup.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Importar',
          style: 'destructive',
          onPress: () => void doImport(),
        },
      ],
    );
  }

  async function doImport() {
    setImporting(true);
    try {
      await importDatabase();
      Alert.alert('Listo', 'Backup restaurado. Los datos ya están disponibles.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      Alert.alert('Importar', msg);
    } finally {
      setImporting(false);
    }
  }

  function onClearChat() {
    Alert.alert(
      'Borrar conversación',
      'Se eliminará todo el historial del chat. Tus datos (rutinas, dieta, pasos, suplementos…) no se tocan.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearChatHistory();
              Alert.alert('Conversación borrada', 'El historial del chat se ha eliminado.');
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Error desconocido';
              Alert.alert('Borrar conversación', msg);
            }
          },
        },
      ],
    );
  }

  async function onCheckUpdate() {
    setCheckingUpdate(true);
    try {
      const result = await checkForUpdate();
      if (!result.available) {
        Alert.alert(
          'Actualización',
          `Instalada: ${result.local.version} (build ${result.local.versionCode}).\n` +
            `Remota: ${result.remote.version} (build ${result.remote.versionCode}).`,
        );
        return;
      }

      Alert.alert(
        'Actualización disponible',
        `Nueva versión ${result.remote.version} (build ${result.remote.versionCode}). Tienes ${result.local.version} (build ${result.local.versionCode}).`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Descargar e instalar', onPress: () => void onDownloadUpdate() },
        ],
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      Alert.alert('Actualización', msg);
    } finally {
      setCheckingUpdate(false);
    }
  }

  async function onDownloadUpdate() {
    setDownloadingUpdate(true);
    setDownloadProgress(0);
    try {
      await downloadAndInstallUpdate(setDownloadProgress);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      Alert.alert('Actualización', msg);
    } finally {
      setDownloadingUpdate(false);
      setDownloadProgress(0);
    }
  }

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      <Text style={styles.label}>API key Anthropic</Text>
      <Text style={styles.hint}>
        Se guarda de forma segura en el dispositivo (SecureStore).
      </Text>
      <TextInput
        style={styles.input}
        value={key}
        onChangeText={(t) => {
          setKey(t);
          setSaved(false);
        }}
        placeholder="sk-ant-…"
        placeholderTextColor="#6b7280"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />
      <TouchableOpacity style={styles.btn} onPress={save}>
        <Text style={styles.btnText}>{saved ? 'Actualizar' : 'Guardar'}</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.label}>Actualización de la app</Text>
        <Text style={styles.hint}>
          Instala nuevas versiones encima de la actual sin borrar datos. Versión instalada:{' '}
          {versionLabel || '…'}
        </Text>
        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary, checkingUpdate && styles.btnDisabled]}
          onPress={onCheckUpdate}
          disabled={checkingUpdate || downloadingUpdate}
        >
          {checkingUpdate ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Buscar actualización</Text>
          )}
        </TouchableOpacity>
        {downloadingUpdate && (
          <Text style={styles.progress}>
            Descargando… {Math.round(downloadProgress * 100)}%
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Copia de seguridad</Text>
        <Text style={styles.hint}>
          Exporta o importa la base de datos SQLite. Guárdala en Drive, correo o
          archivos locales antes de reinstalar la app.
        </Text>
        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary, exporting && styles.btnDisabled]}
          onPress={onExport}
          disabled={exporting || importing}
        >
          {exporting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Exportar datos</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnDanger, importing && styles.btnDisabled]}
          onPress={onImport}
          disabled={exporting || importing}
        >
          {importing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Importar backup</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Conversación</Text>
        <Text style={styles.hint}>
          Borra el historial del chat. No afecta a tus datos de rutinas, dieta ni pasos.
        </Text>
        <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={onClearChat}>
          <Text style={styles.btnText}>Borrar conversación</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#0f172a' },
  label: { color: '#f8fafc', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  hint: { color: '#94a3b8', marginBottom: 16, lineHeight: 20 },
  input: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  btn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  section: { marginTop: 32 },
  btnSecondary: { backgroundColor: '#334155', marginTop: 8 },
  btnDanger: { backgroundColor: '#b45309', marginTop: 12 },
  btnDisabled: { opacity: 0.6 },
  progress: { color: '#94a3b8', marginTop: 12, textAlign: 'center' },
});
