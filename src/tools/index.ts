import * as exercises from './handlers/exercises';
import * as routines from './handlers/routines';
import * as schedule from './handlers/schedule';
import * as sessions from './handlers/sessions';
import * as sets from './handlers/sets';
import * as meals from './handlers/meals';
import * as intake from './handlers/intake';
import * as bodyMetrics from './handlers/bodyMetrics';
import * as stepCount from './handlers/stepCount';
import * as supplements from './handlers/supplements';
import * as batchCooking from './handlers/batchCooking';
import * as shoppingList from './handlers/shoppingList';
import * as analytics from './handlers/analytics';
import { runWithDb } from '@/db/client';
import { getDailyCalorieTarget } from './handlers/intake';
import { toolErr, toolOk } from './utils';

type Handler = (input: Record<string, unknown>) => Promise<string>;

const handlers: Record<string, Handler> = {
  list_exercises: () => exercises.listExercises(),
  create_exercise: (i) => exercises.createExercise(i as never),
  update_exercise: (i) => exercises.updateExercise(i as never),
  delete_exercise: (i) => exercises.deleteExercise(i as never),

  list_routines: () => routines.listRoutines(),
  get_routine: (i) => routines.getRoutine(i as never),
  create_routine: (i) => routines.createRoutine(i as never),
  delete_routine: (i) => routines.deleteRoutine(i as never),
  add_exercise_to_routine: (i) => routines.addExerciseToRoutine(i as never),
  remove_exercise_from_routine: (i) => routines.removeExerciseFromRoutine(i as never),
  swap_exercises_in_routine: (i) => routines.swapExercisesInRoutine(i as never),
  reorder_routine_exercises: (i) => routines.reorderRoutineExercises(i as never),
  create_routine_with_exercises: (i) => routines.createRoutineWithExercises(i as never),

  get_schedule: (i) => schedule.getSchedule(i as never),
  set_schedule_day: (i) => schedule.setScheduleDay(i as never),
  clear_schedule_day: (i) => schedule.clearScheduleDay(i as never),

  start_session: (i) => sessions.startSession(i as never),
  get_active_session: () => sessions.getActiveSession({}),
  complete_session: (i) => sessions.completeSession(i as never),
  list_sessions: (i) => sessions.listSessions(i as never),
  delete_session: (i) => sessions.deleteSession(i as never),

  log_set: (i) => sets.logSet(i as never),
  list_sets: (i) => sets.listSets(i as never),
  update_set: (i) => sets.updateSet(i as never),
  delete_set: (i) => sets.deleteSet(i as never),

  get_meals_for_day: (i) => meals.getMealsForDay(i as never),
  set_meal: (i) => meals.setMeal(i as never),
  delete_meal: (i) => meals.deleteMeal(i as never),
  set_meals_batch: (i) => meals.setMealsBatch(i as never),

  log_intake: (i) => intake.logIntake(i as never),
  list_intake: (i) => intake.listIntake(i as never),
  update_intake: (i) => intake.updateIntake(i as never),
  delete_intake: (i) => intake.deleteIntake(i as never),
  set_daily_calorie_target: (i) => intake.setDailyCalorieTarget(i as never),
  get_daily_calorie_target: async () => toolOk({ daily_calorie_target: await getDailyCalorieTarget() }),
  get_calorie_summary: (i) => intake.getCalorieSummary(i as never),
  get_diet_adherence: (i) => intake.getDietAdherence(i as never),

  log_body_metrics: (i) => bodyMetrics.logBodyMetrics(i as never),
  list_body_metrics: (i) => bodyMetrics.listBodyMetrics(i as never),
  update_body_metrics: (i) => bodyMetrics.updateBodyMetrics(i as never),
  delete_body_metrics: (i) => bodyMetrics.deleteBodyMetrics(i as never),

  get_daily_steps: (i) => stepCount.getStepsForDay(i as never),
  set_daily_steps: (i) => stepCount.setDailySteps(i as never),
  add_daily_steps: (i) => stepCount.addDailySteps(i as never),
  list_daily_steps: (i) => stepCount.listDailySteps(i as never),
  get_steps_progression: (i) => stepCount.getStepsProgression(i as never),
  set_daily_steps_goal: (i) => stepCount.setDailyStepsGoal(i as never),
  get_daily_steps_goal: () => stepCount.getDailyStepsGoal(),

  list_supplements: (i) => supplements.listSupplements(i as never),
  create_supplement: (i) => supplements.createSupplement(i as never),
  update_supplement: (i) => supplements.updateSupplement(i as never),
  delete_supplement: (i) => supplements.deleteSupplement(i as never),
  log_supplement_intake: (i) => supplements.logSupplementIntake(i as never),
  list_supplement_intake: (i) => supplements.listSupplementIntake(i as never),
  delete_supplement_intake: (i) => supplements.deleteSupplementIntake(i as never),

  set_batch_cooking: (i) => batchCooking.setBatchCooking(i as never),
  get_batch_cooking: (i) => batchCooking.getBatchCooking(i as never),
  list_batch_cooking: (i) => batchCooking.listBatchCooking(i as never),
  delete_batch_cooking: (i) => batchCooking.deleteBatchCooking(i as never),

  set_shopping_list: (i) => shoppingList.setShoppingList(i as never),
  get_shopping_list: (i) => shoppingList.getShoppingList(i as never),
  list_shopping_lists: (i) => shoppingList.listShoppingLists(i as never),
  delete_shopping_list: (i) => shoppingList.deleteShoppingList(i as never),

  get_today_context: () => analytics.getTodayContext({}),
  get_exercise_progression: (i) => analytics.getExerciseProgression(i as never),
  get_body_metrics_progression: (i) => analytics.getBodyMetricsProgression(i as never),
};

export async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  const handler = handlers[name];
  if (!handler) return toolErr(`tool desconocida: ${name}`);
  try {
    return await runWithDb(() => handler(input));
  } catch (e) {
    return toolErr(e instanceof Error ? e.message : 'error ejecutando tool');
  }
}

export { toolDefinitions } from './definitions';
