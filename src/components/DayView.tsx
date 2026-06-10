import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { CalendarModal } from './CalendarModal';
import { ExerciseBreakdownModal } from './ExerciseBreakdownModal';
import {
  getDayPlan,
  mealSlotLabel,
  type DayMeal,
  type DayPlan,
  type DayWorkout,
} from '@/services/dayView';
import {
  addDaysYmd,
  diffDays,
  formatLongDate,
  parseYmd,
  todayLocalYmd,
} from '@/utils/localDate';

const RANGE = 365;
const TOTAL = RANGE * 2 + 1;

function indexToDate(baseToday: string, index: number): string {
  return addDaysYmd(baseToday, index - RANGE);
}

function dateToIndex(baseToday: string, date: string): number {
  return RANGE + diffDays(baseToday, date);
}

export function DayView() {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList>(null);
  const baseTodayRef = useRef(todayLocalYmd());
  const baseToday = baseTodayRef.current;

  const [selectedDate, setSelectedDate] = useState(baseToday);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [workoutModal, setWorkoutModal] = useState<DayWorkout | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      baseTodayRef.current = todayLocalYmd();
      setReloadKey((k) => k + 1);
    }, []),
  );

  const goToDate = useCallback(
    (date: string) => {
      setSelectedDate(date);
      const index = dateToIndex(baseToday, date);
      if (index >= 0 && index < TOTAL) {
        listRef.current?.scrollToIndex({ index, animated: false });
      }
    },
    [baseToday],
  );

  const onCalendarSelect = useCallback(
    (date: string) => {
      setCalendarOpen(false);
      goToDate(date);
    },
    [goToDate],
  );

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / width);
      setSelectedDate(indexToDate(baseToday, index));
    },
    [baseToday, width],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [width],
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.dateSelector}
        onPress={() => setCalendarOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.dateText}>{formatLongDate(selectedDate)}</Text>
        <Text style={styles.dateHint}>
          {selectedDate === baseToday ? 'Hoy · toca para elegir' : 'Toca para elegir fecha'}
        </Text>
      </TouchableOpacity>

      <FlatList
        ref={listRef}
        data={Array.from({ length: TOTAL })}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={RANGE}
        getItemLayout={getItemLayout}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={onMomentumEnd}
        onScrollToIndexFailed={({ index }) => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({ index, animated: false });
          }, 50);
        }}
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        renderItem={({ index }) => (
          <DayPage
            date={indexToDate(baseToday, index)}
            width={width}
            reloadKey={reloadKey}
            onOpenWorkout={setWorkoutModal}
          />
        )}
      />

      <CalendarModal
        visible={calendarOpen}
        selectedDate={selectedDate}
        onSelect={onCalendarSelect}
        onClose={() => setCalendarOpen(false)}
      />

      <ExerciseBreakdownModal
        workout={workoutModal}
        onClose={() => setWorkoutModal(null)}
      />
    </View>
  );
}

function DayPage({
  date,
  width,
  reloadKey,
  onOpenWorkout,
}: {
  date: string;
  width: number;
  reloadKey: number;
  onOpenWorkout: (w: DayWorkout) => void;
}) {
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNextBatch, setShowNextBatch] = useState(false);
  const [showNextList, setShowNextList] = useState(false);

  const isSunday = parseYmd(date).getDay() === 0;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setShowNextBatch(false);
    setShowNextList(false);
    getDayPlan(date)
      .then((p) => {
        if (active) setPlan(p);
      })
      .catch(() => {
        if (active) setPlan(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [date, reloadKey]);

  return (
    <ScrollView style={{ width }} contentContainerStyle={styles.page}>
      <Text style={styles.sectionTitle}>Entrenamiento</Text>
      {plan?.workout ? (
        <TouchableOpacity
          style={styles.workoutCard}
          onPress={() => onOpenWorkout(plan.workout!)}
          activeOpacity={0.7}
        >
          <Text style={styles.workoutName}>{plan.workout.routineName}</Text>
          <Text style={styles.workoutHint}>Ver ejercicios ›</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.empty}>Sin entrenamiento asignado.</Text>
      )}

      <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Menú del día</Text>
      {plan && plan.meals.length > 0 ? <DayMacroSummary meals={plan.meals} /> : null}
      {loading && !plan ? (
        <ActivityIndicator color="#60a5fa" style={{ marginTop: 12 }} />
      ) : plan && plan.meals.length > 0 ? (
        plan.meals.map((m) => (
          <View key={m.id} style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <Text style={styles.mealSlot}>{mealSlotLabel(m.slot)}</Text>
              <View style={styles.mealMeta}>
                {m.time ? <Text style={styles.mealTime}>{m.time}</Text> : null}
                {m.calories != null ? (
                  <Text style={styles.mealCals}>{m.calories} kcal</Text>
                ) : null}
              </View>
            </View>
            <Text style={styles.mealDesc}>{m.description}</Text>
            {m.proteinG != null || m.carbsG != null || m.fatG != null ? (
              <View style={styles.macroRow}>
                {m.proteinG != null ? (
                  <Text style={styles.macroProt}>P {m.proteinG}g</Text>
                ) : null}
                {m.carbsG != null ? (
                  <Text style={styles.macroCarb}>HC {m.carbsG}g</Text>
                ) : null}
                {m.fatG != null ? (
                  <Text style={styles.macroFat}>G {m.fatG}g</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ))
      ) : (
        <Text style={styles.empty}>Sin comidas planificadas.</Text>
      )}

      {isSunday && plan ? (
        <>
          <Text style={[styles.sectionTitle, styles.sectionSpacing]}>
            Preparar semana siguiente
          </Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, showNextBatch && styles.toggleBtnActive]}
              onPress={() => setShowNextBatch((v) => !v)}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleBtnText}>Batch</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, showNextList && styles.toggleBtnActive]}
              onPress={() => setShowNextList((v) => !v)}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleBtnText}>Lista</Text>
            </TouchableOpacity>
          </View>

          {showNextBatch ? (
            <View style={styles.weekCard}>
              <Text style={styles.weekCardLabel}>Batch cooking · semana siguiente</Text>
              <Text style={styles.weekText}>
                {plan.nextWeekBatchCooking ?? 'Sin batch cooking para la semana siguiente.'}
              </Text>
            </View>
          ) : null}

          {showNextList ? (
            <View style={styles.weekCard}>
              <Text style={styles.weekCardLabel}>Lista de la compra · semana siguiente</Text>
              <Text style={styles.weekText}>
                {plan.nextWeekShoppingList ?? 'Sin lista de la compra para la semana siguiente.'}
              </Text>
            </View>
          ) : null}
        </>
      ) : null}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function DayMacroSummary({ meals }: { meals: DayMeal[] }) {
  const sum = (pick: (m: DayMeal) => number | null) =>
    meals.reduce((acc, m) => acc + (pick(m) ?? 0), 0);
  const kcal = sum((m) => m.calories);
  const prot = sum((m) => m.proteinG);
  const carbs = sum((m) => m.carbsG);
  const fat = sum((m) => m.fatG);
  if (!kcal && !prot && !carbs && !fat) return null;

  return (
    <View style={styles.totalsCard}>
      {kcal ? <Text style={styles.totalKcal}>{kcal} kcal</Text> : null}
      <View style={styles.macroRow}>
        {prot ? <Text style={styles.macroProt}>P {prot}g</Text> : null}
        {carbs ? <Text style={styles.macroCarb}>HC {carbs}g</Text> : null}
        {fat ? <Text style={styles.macroFat}>G {fat}g</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  dateSelector: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#111827',
  },
  dateText: { color: '#f8fafc', fontSize: 18, fontWeight: '700', textTransform: 'capitalize' },
  dateHint: { color: '#64748b', fontSize: 12, marginTop: 2 },
  page: { padding: 16 },
  sectionTitle: { color: '#94a3b8', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionSpacing: { marginTop: 24 },
  workoutCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workoutName: { color: '#f8fafc', fontSize: 17, fontWeight: '600', flex: 1 },
  workoutHint: { color: '#60a5fa', fontSize: 14 },
  mealCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginTop: 10 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  mealSlot: { color: '#60a5fa', fontSize: 13, fontWeight: '700' },
  mealMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealTime: { color: '#cbd5e1', fontSize: 13, fontWeight: '600' },
  mealCals: { color: '#64748b', fontSize: 13 },
  mealDesc: { color: '#e2e8f0', fontSize: 15, lineHeight: 21 },
  macroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  macroProt: { color: '#f87171', fontSize: 12, fontWeight: '700' },
  macroCarb: { color: '#fbbf24', fontSize: 12, fontWeight: '700' },
  macroFat: { color: '#34d399', fontSize: 12, fontWeight: '700' },
  totalsCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalKcal: { color: '#f8fafc', fontSize: 15, fontWeight: '700' },
  weekCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginTop: 10 },
  weekCardLabel: { color: '#60a5fa', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  weekText: { color: '#e2e8f0', fontSize: 14, lineHeight: 21 },
  empty: { color: '#64748b', fontSize: 14, marginTop: 10 },
  toggleRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  toggleBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  toggleBtnActive: { backgroundColor: '#1d4ed8', borderColor: '#2563eb' },
  toggleBtnText: { color: '#f1f5f9', fontSize: 15, fontWeight: '600' },
});
