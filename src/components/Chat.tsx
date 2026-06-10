import { useState, useRef, useCallback, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { runAgent, type ChatMessage } from '@/agent/loop';
import { useTodaySteps } from '@/hooks/useTodaySteps';
import {
  getStepTrackerStatus,
  refreshTodayStepsDisplay,
} from '@/services/stepTracker';
import {
  appendChatMessage,
  loadChatHistory,
  trimChatHistory,
} from '@/services/chatHistory';

function showStepDiagnostics() {
  const s = getStepTrackerStatus();
  const sourceLabel =
    s.source === 'health-connect'
      ? 'Health Connect'
      : s.source === 'pedometer'
        ? 'Podómetro (sensor)'
        : 'Ninguna';
  const last =
    s.lastUpdate > 0
      ? `${Math.round((Date.now() - s.lastUpdate) / 1000)}s atrás`
      : 'nunca';
  Alert.alert(
    'Diagnóstico de pasos',
    [
      `Fuente activa: ${sourceLabel}`,
      `Podómetro disponible: ${s.pedometerAvailable ? 'sí' : 'no'}`,
      `Permiso podómetro: ${s.pedometerPermission ? 'concedido' : 'no'}`,
      `Health Connect: ${s.healthConnectAvailable ? 'sí' : 'no'}`,
      `Eventos del sensor: ${s.watchEvents}`,
      `Último delta sensor: ${s.lastWatchSteps}`,
      `Base (BBDD): ${s.baseline}`,
      `Total actual: ${s.current}`,
      `Última actualización: ${last}`,
    ].join('\n'),
  );
}

export function Chat() {
  const insets = useSafeAreaInsets();
  const bottomPad =
    insets.bottom > 0 ? insets.bottom + 12 : Platform.OS === 'android' ? 48 : 12;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const stepsToday = useTodaySteps();
  const listRef = useRef<FlatList>(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    loadChatHistory()
      .then((history) => {
        if (history.length) setMessages(history);
      })
      .catch(() => {});
  }, []);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
      autoScrollRef.current = distanceFromBottom < 80;
    },
    [],
  );

  const onContentSizeChange = useCallback(() => {
    if (autoScrollRef.current) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshTodayStepsDisplay();
      if (!loading) {
        loadChatHistory()
          .then(setMessages)
          .catch(() => {});
      }
    }, [loading]),
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);
    autoScrollRef.current = true;
    void appendChatMessage(userMsg);

    try {
      const reply = await runAgent(messages, text);
      const assistantMsg: ChatMessage = { role: 'assistant', content: reply };
      setMessages([...nextHistory, assistantMsg]);
      await appendChatMessage(assistantMsg);
      void trimChatHistory();
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Error desconocido';
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: `Error: ${err}`,
      };
      setMessages([...nextHistory, errorMsg]);
      void appendChatMessage(errorMsg);
    } finally {
      setLoading(false);
      void refreshTodayStepsDisplay();
    }
  }, [input, loading, messages]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'android' ? 'height' : 'padding'}
      keyboardVerticalOffset={80}
    >
      <TouchableOpacity
        style={styles.stepsBar}
        onPress={showStepDiagnostics}
        activeOpacity={0.6}
      >
        <Text style={styles.stepsText}>
          Pasos hoy: {stepsToday.toLocaleString('es-ES')}
        </Text>
      </TouchableOpacity>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        onScroll={onScroll}
        scrollEventThrottle={100}
        onContentSizeChange={onContentSizeChange}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === 'user' ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            <Text style={styles.bubbleText}>{item.content}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Pregunta sobre rutinas, dieta, calorías o progresión.
          </Text>
        }
      />
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#60a5fa" />
          <Text style={styles.loadingText}>Pensando…</Text>
        </View>
      )}
      <View style={[styles.inputRow, { paddingBottom: bottomPad }]}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Escribe un mensaje…"
          placeholderTextColor="#6b7280"
          multiline
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
          onPress={send}
          disabled={loading}
        >
          <Text style={styles.sendText}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  stepsBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  stepsText: { color: '#94a3b8', fontSize: 14 },
  list: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 40 },
  bubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563eb',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1e293b',
  },
  bubbleText: { color: '#f8fafc', fontSize: 16, lineHeight: 22 },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  loadingText: { color: '#94a3b8' },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  input: {
    flex: 1,
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 120,
    fontSize: 16,
  },
  sendBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: '600' },
});
