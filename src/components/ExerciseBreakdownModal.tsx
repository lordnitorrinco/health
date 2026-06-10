import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  getRoutineExercises,
  type DayWorkout,
  type RoutineExercise,
} from '@/services/dayView';

type Props = {
  workout: DayWorkout | null;
  onClose: () => void;
};

export function ExerciseBreakdownModal({ workout, onClose }: Props) {
  const [exercises, setExercises] = useState<RoutineExercise[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!workout) return;
    let active = true;
    setLoading(true);
    setExercises([]);
    getRoutineExercises(workout.routineId)
      .then((rows) => {
        if (active) setExercises(rows);
      })
      .catch(() => {
        if (active) setExercises([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [workout]);

  return (
    <Modal
      visible={workout !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {workout?.routineName ?? ''}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#60a5fa" style={{ marginVertical: 24 }} />
          ) : exercises.length > 0 ? (
            <ScrollView style={styles.list}>
              {exercises.map((ex, i) => (
                <View key={`${ex.exerciseId}-${i}`} style={styles.row}>
                  <Text style={styles.index}>{i + 1}</Text>
                  <View style={styles.exInfo}>
                    <Text style={styles.exName}>{ex.exerciseName}</Text>
                    {ex.muscleGroup ? (
                      <Text style={styles.exMuscle}>{ex.muscleGroup}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
              <View style={{ height: 16 }} />
            </ScrollView>
          ) : (
            <Text style={styles.empty}>Esta rutina no tiene ejercicios.</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: '700', flex: 1, marginRight: 12 },
  close: { color: '#94a3b8', fontSize: 20 },
  list: { marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  index: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '700',
    width: 28,
  },
  exInfo: { flex: 1 },
  exName: { color: '#f1f5f9', fontSize: 16 },
  exMuscle: { color: '#64748b', fontSize: 13, marginTop: 2 },
  empty: { color: '#64748b', fontSize: 14, marginVertical: 24, textAlign: 'center' },
});
