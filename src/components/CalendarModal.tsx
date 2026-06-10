import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { formatLocalYmd, monthLabel, parseYmd, todayLocalYmd } from '@/utils/localDate';

type Props = {
  visible: boolean;
  selectedDate: string;
  onSelect: (date: string) => void;
  onClose: () => void;
};

const WEEKDAY_HEADERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function CalendarModal({ visible, selectedDate, onSelect, onClose }: Props) {
  const initial = parseYmd(selectedDate);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  useEffect(() => {
    if (visible) {
      const d = parseYmd(selectedDate);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [visible, selectedDate]);

  const today = todayLocalYmd();
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(formatLocalYmd(new Date(viewYear, viewMonth, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.card} activeOpacity={1}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={12}>
              <Text style={styles.nav}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{monthLabel(viewYear, viewMonth)}</Text>
            <TouchableOpacity onPress={() => shiftMonth(1)} hitSlop={12}>
              <Text style={styles.nav}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAY_HEADERS.map((w, i) => (
              <Text key={i} style={styles.weekday}>
                {w}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((cell, i) => {
              if (!cell) return <View key={i} style={styles.cell} />;
              const dayNum = parseYmd(cell).getDate();
              const isSelected = cell === selectedDate;
              const isToday = cell === today;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.cell, isSelected && styles.cellSelected]}
                  onPress={() => onSelect(cell)}
                >
                  <Text
                    style={[
                      styles.cellText,
                      isToday && styles.cellToday,
                      isSelected && styles.cellTextSelected,
                    ]}
                  >
                    {dayNum}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.todayBtn} onPress={() => onSelect(today)}>
            <Text style={styles.todayBtnText}>Hoy</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  nav: { color: '#60a5fa', fontSize: 28, paddingHorizontal: 12 },
  monthLabel: { color: '#f8fafc', fontSize: 16, fontWeight: '600' },
  weekRow: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: { backgroundColor: '#2563eb', borderRadius: 999 },
  cellText: { color: '#e2e8f0', fontSize: 15 },
  cellTextSelected: { color: '#fff', fontWeight: '700' },
  cellToday: { color: '#60a5fa', fontWeight: '700' },
  todayBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  todayBtnText: { color: '#60a5fa', fontSize: 15, fontWeight: '600' },
});
