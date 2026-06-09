import { useState, useRef, useCallback, useEffect } from 'react';
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
  AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { runAgent, type ChatMessage } from '@/agent/loop';
import { refreshTodayStepsDisplay } from '@/services/stepTracker';

export function Chat() {
  const insets = useSafeAreaInsets();
  const bottomPad =
    insets.bottom > 0 ? insets.bottom + 12 : Platform.OS === 'android' ? 48 : 12;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stepsToday, setStepsToday] = useState(0);
  const listRef = useRef<FlatList>(null);

  const loadSteps = useCallback(async () => {
    setStepsToday(await refreshTodayStepsDisplay());
  }, []);

  useEffect(() => {
    void loadSteps();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void loadSteps();
    });
    return () => sub.remove();
  }, [loadSteps]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    try {
      const reply = await runAgent(messages, text);
      setMessages([...nextHistory, { role: 'assistant', content: reply }]);
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Error desconocido';
      setMessages([
        ...nextHistory,
        { role: 'assistant', content: `Error: ${err}` },
      ]);
    } finally {
      setLoading(false);
      void loadSteps();
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [input, loading, messages, loadSteps]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'android' ? 'height' : 'padding'}
      keyboardVerticalOffset={80}
    >
      <View style={styles.stepsBar}>
        <Text style={styles.stepsText}>Pasos hoy: {stepsToday.toLocaleString('es-ES')}</Text>
      </View>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
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
