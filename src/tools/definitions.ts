import type { Tool } from './toolTypes';

const mealSlotEnum = [
  'breakfast',
  'morning_snack',
  'lunch',
  'afternoon_snack',
  'dinner',
] as const;

function tool(
  name: string,
  description: string,
  properties: Record<string, unknown>,
  required: string[] = []
): Tool {
  return {
    name,
    description,
    input_schema: {
      type: 'object' as const,
      properties,
      required,
    },
  };
}

export const toolDefinitions: Tool[] = [
  tool('list_exercises', 'Lista todos los ejercicios del catálogo.', {}),
  tool('create_exercise', 'Crea un ejercicio.', {
    name: { type: 'string' },
    muscle_group: { type: 'string' },
  }, ['name']),
  tool('update_exercise', 'Actualiza un ejercicio.', {
    id: { type: 'number' },
    name: { type: 'string' },
    muscle_group: { type: 'string' },
  }, ['id']),
  tool('delete_exercise', 'Elimina un ejercicio.', { id: { type: 'number' } }, ['id']),

  tool('list_routines', 'Lista rutinas.', {}),
  tool('get_routine', 'Obtiene rutina con ejercicios.', {
    id: { type: 'number' },
    name: { type: 'string' },
  }),
  tool('create_routine', 'Crea rutina vacía.', { name: { type: 'string' } }, ['name']),
  tool('delete_routine', 'Elimina rutina.', { id: { type: 'number' } }, ['id']),
  tool('add_exercise_to_routine', 'Añade ejercicio a rutina.', {
    routine_id: { type: 'number' },
    exercise_id: { type: 'number' },
    exercise_name: { type: 'string' },
    sort_order: { type: 'number' },
  }, ['routine_id', 'sort_order']),
  tool('remove_exercise_from_routine', 'Quita ejercicio de rutina.', {
    routine_id: { type: 'number' },
    exercise_id: { type: 'number' },
    exercise_name: { type: 'string' },
  }, ['routine_id']),
  tool('swap_exercises_in_routine', 'Sustituye un ejercicio por otro en una rutina.', {
    routine_id: { type: 'number' },
    routine_name: { type: 'string' },
    old_exercise: { type: 'string' },
    new_exercise: { type: 'string' },
    new_muscle_group: { type: 'string' },
  }, ['old_exercise', 'new_exercise']),
  tool('reorder_routine_exercises', 'Reordena ejercicios de una rutina.', {
    routine_id: { type: 'number' },
    exercise_ids_in_order: { type: 'array', items: { type: 'number' } },
  }, ['routine_id', 'exercise_ids_in_order']),
  tool('create_routine_with_exercises', 'Crea rutina completa con ejercicios en una transacción.', {
    name: { type: 'string' },
    exercises: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          muscle_group: { type: 'string' },
          sort_order: { type: 'number' },
        },
        required: ['name', 'sort_order'],
      },
    },
  }, ['name', 'exercises']),

  tool('get_schedule', 'Calendario entre dos fechas YYYY-MM-DD.', {
    from: { type: 'string' },
    to: { type: 'string' },
  }, ['from', 'to']),
  tool('set_schedule_day', 'Asigna rutina a un día.', {
    date: { type: 'string' },
    routine_id: { type: 'number' },
    routine_name: { type: 'string' },
  }, ['date']),
  tool('clear_schedule_day', 'Limpia rutina de un día.', { date: { type: 'string' } }, ['date']),

  tool('start_session', 'Inicia sesión de entrenamiento.', {
    routine_id: { type: 'number' },
    routine_name: { type: 'string' },
  }),
  tool('get_active_session', 'Sesión activa si existe.', {}),
  tool('complete_session', 'Marca sesión como completada.', { session_id: { type: 'number' } }),
  tool('list_sessions', 'Lista sesiones recientes.', { limit: { type: 'number' } }),
  tool('delete_session', 'Elimina sesión.', { id: { type: 'number' } }, ['id']),

  tool('log_set', 'Registra serie peso/reps.', {
    session_id: { type: 'number' },
    exercise_id: { type: 'number' },
    exercise_name: { type: 'string' },
    weight_kg: { type: 'number' },
    reps: { type: 'number' },
  }, ['weight_kg', 'reps']),
  tool('list_sets', 'Lista series.', {
    session_id: { type: 'number' },
    exercise_id: { type: 'number' },
    exercise_name: { type: 'string' },
  }),
  tool('update_set', 'Actualiza serie.', {
    id: { type: 'number' },
    weight_kg: { type: 'number' },
    reps: { type: 'number' },
  }, ['id']),
  tool('delete_set', 'Elimina serie.', { id: { type: 'number' } }, ['id']),

  tool('get_meals_for_day', 'Comidas planificadas de un día.', {
    date: { type: 'string' },
    slot: { type: 'string', enum: mealSlotEnum },
  }, ['date']),
  tool('set_meal', 'Define comida del plan.', {
    date: { type: 'string' },
    slot: { type: 'string', enum: mealSlotEnum },
    description: { type: 'string' },
    calories: { type: 'number' },
  }, ['date', 'slot', 'description']),
  tool('delete_meal', 'Elimina comida del plan.', { id: { type: 'number' } }, ['id']),
  tool('set_meals_batch', 'Define múltiples comidas del plan.', {
    meals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string' },
          slot: { type: 'string', enum: mealSlotEnum },
          description: { type: 'string' },
          calories: { type: 'number' },
        },
        required: ['date', 'slot', 'description'],
      },
    },
  }, ['meals']),

  tool('log_intake', 'Registra ingesta real (extras o comidas consumidas).', {
    description: { type: 'string' },
    calories: { type: 'number' },
    logged_at: { type: 'string' },
  }, ['description', 'calories']),
  tool('list_intake', 'Ingesta registrada en rango de fechas.', {
    from: { type: 'string' },
    to: { type: 'string' },
  }, ['from', 'to']),
  tool('update_intake', 'Actualiza registro de ingesta.', {
    id: { type: 'number' },
    description: { type: 'string' },
    calories: { type: 'number' },
  }, ['id']),
  tool('delete_intake', 'Elimina registro de ingesta.', { id: { type: 'number' } }, ['id']),

  tool('set_daily_calorie_target', 'Define objetivo calórico diario.', {
    calories: { type: 'number' },
  }, ['calories']),
  tool('get_daily_calorie_target', 'Obtiene objetivo calórico diario.', {}),
  tool('get_calorie_summary', 'Resumen calórico de un día.', { date: { type: 'string' } }, ['date']),
  tool('get_diet_adherence', 'Adherencia dieta en rango de fechas.', {
    from: { type: 'string' },
    to: { type: 'string' },
  }, ['from', 'to']),

  tool('log_body_metrics', 'Registra peso y composición corporal.', {
    weight_kg: { type: 'number' },
    body_fat_pct: { type: 'number' },
    water_pct: { type: 'number' },
    muscle_pct: { type: 'number' },
    recorded_at: { type: 'string' },
  }, ['weight_kg']),
  tool('list_body_metrics', 'Lista métricas corporales.', {
    from: { type: 'string' },
    to: { type: 'string' },
    limit: { type: 'number' },
  }),
  tool('update_body_metrics', 'Actualiza métricas corporales.', {
    id: { type: 'number' },
    weight_kg: { type: 'number' },
    body_fat_pct: { type: 'number' },
    water_pct: { type: 'number' },
    muscle_pct: { type: 'number' },
  }, ['id']),
  tool('delete_body_metrics', 'Elimina métricas corporales.', { id: { type: 'number' } }, ['id']),

  tool('get_daily_steps', 'Pasos de un día.', { date: { type: 'string' } }),
  tool('set_daily_steps', 'Fija pasos de un día (sobreescribe).', {
    date: { type: 'string' },
    steps: { type: 'number' },
  }, ['steps']),
  tool('add_daily_steps', 'Suma pasos a un día.', {
    date: { type: 'string' },
    steps: { type: 'number' },
  }, ['steps']),
  tool('list_daily_steps', 'Pasos por día en un rango.', {
    from: { type: 'string' },
    to: { type: 'string' },
  }, ['from', 'to']),
  tool('get_steps_progression', 'Resumen de pasos en un rango (total, media, máximo).', {
    from: { type: 'string' },
    to: { type: 'string' },
  }, ['from', 'to']),

  tool('get_today_context', 'Contexto de hoy: calendario, sesión, comidas, pasos.', {}),
  tool('get_exercise_progression', 'Progresión de ejercicio o grupo muscular.', {
    exercise_name: { type: 'string' },
    muscle_group: { type: 'string' },
    from: { type: 'string' },
    to: { type: 'string' },
  }, ['from', 'to']),
  tool('get_body_metrics_progression', 'Evolución peso/composición corporal.', {
    from: { type: 'string' },
    to: { type: 'string' },
  }, ['from', 'to']),
];
