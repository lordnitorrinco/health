# Health

App Android personal para gestionar gimnasio y dieta. UI de chat; datos en SQLite local; Claude (Anthropic) con tools CRUD sobre rutinas, calendario, sesiones, series, dieta (plan por calorías + tracking de ingesta) y composición corporal.

**Stack:** Expo SDK 56 · TypeScript · expo-sqlite · Drizzle · Anthropic API (fetch) · expo-secure-store

## Estructura del proyecto

```
health/
├── app/
│   ├── _layout.tsx                 # Layout raíz (expo-router)
│   ├── index.tsx                   # Pantalla principal: chat
│   └── settings.tsx                # API key Anthropic (SecureStore)
├── src/
│   ├── agent/
│   │   ├── client.ts               # Cliente Anthropic SDK
│   │   ├── loop.ts                 # Bucle tool-use (hasta 15 iteraciones)
│   │   └── systemPrompt.ts         # Prompt del asistente
│   ├── components/
│   │   └── Chat.tsx                # FlatList mensajes + input
│   ├── db/
│   │   ├── schema.ts               # 9 tablas Drizzle
│   │   ├── client.ts               # Singleton expo-sqlite + Drizzle
│   │   ├── migrate.ts              # Bootstrap migraciones al arrancar
│   │   └── migrations/
│   │       └── 0000_initial.sql    # Migración inicial
│   ├── services/
│   │   ├── stepTracker.ts          # Sincroniza pasos (Health Connect o pedometer)
│   │   └── healthConnectSteps.ts   # Lectura de pasos vía Health Connect
│   │   └── apiKey.ts               # Leer/escribir API key (SecureStore)
│   └── tools/
│       ├── definitions.ts          # Schemas Anthropic (~33 tools)
│       ├── index.ts                # Registro y dispatch de tools
│       └── handlers/
│           ├── exercises.ts
│           ├── routines.ts         # incl. create_routine_with_exercises
│           ├── schedule.ts
│           ├── sessions.ts
│           ├── sets.ts
│           ├── meals.ts            # incl. set_meals_batch (con calorías)
│           ├── intake.ts           # log ingesta, resumen calórico, adherencia dieta
│           ├── bodyMetrics.ts
│           └── analytics.ts        # get_today_context, progresiones
├── assets/
│   └── .gitkeep                    # Icono/splash (mínimo Expo)
├── android/                        # Generado por `expo prebuild` (no commitear)
├── app.json                        # Android only · com.lordnitorrinco.gym
├── babel.config.js
├── drizzle.config.ts
├── expo-env.d.ts
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

## Base de datos (SQLite)

```
Tablas
├── exercises           # Catálogo de ejercicios
├── routines            # Plantillas de rutina
├── routine_exercises   # Ejercicios por rutina (orden)
├── schedule            # Calendario (fecha → rutina)
├── sessions            # Entrenamientos (started_at, completed_at)
├── sets                # Series (peso, reps) por sesión
├── meals               # Plan diario: 5 comidas/día + calorías por comida
├── intake_log          # Ingesta real (extras y comidas registradas al comer)
├── body_metrics        # Peso + % grasa, agua, músculo
└── settings            # Clave-valor (p. ej. daily_calorie_target)
```

### Dieta e ingesta

- **`meals`** = plan (qué deberías comer, con `calories` por comida).
- **`intake_log`** = lo que realmente comes (`description`, `calories`, `logged_at`).
- **`settings.daily_calorie_target`** = objetivo calórico diario.

Resumen del día: objetivo − suma(`intake_log`) = kcal restantes. El plan (`meals`) se compara aparte como referencia.

**`get_diet_adherence(from, to)`** — por cada día del rango: objetivo, consumido (`intake_log`), kcal del plan, extras, si se pasó del objetivo; resumen agregado para preguntas de rigurosidad semanal.

Ejemplos de chat:
- *"Hazme un plan de 2000 kcal para la semana"*
- *"Hoy además de la dieta me he comido un donut"*
- *"¿Cuántas calorías me quedan hoy?"*
- *"¿Cómo de riguroso fui en la dieta la semana pasada?"*
- *"Ajusta el entrenamiento de hoy para compensar la BBQ del domingo"*

## Tools del agente

```
Ejercicios     list · create · update · delete
Rutinas        list · get · create · delete · add · remove · swap · reorder · create_with_exercises
Calendario     get_schedule · set_schedule_day · clear_schedule_day
Sesiones       start · get_active · complete · list · delete
Series         log · list · update · delete
Dieta (plan)    get_meals_for_day · set_meal · delete_meal · set_meals_batch  (+ calorías)
Ingesta         log_intake · list_intake · update_intake · delete_intake
Calorías        set_daily_calorie_target · get_daily_calorie_target · get_calorie_summary · get_diet_adherence
Composición     log · list · update · delete
Consultas       get_today_context · get_exercise_progression · get_body_metrics_progression
```

## Desarrollo

```bash
npm install
npx expo run:android          # Instalar en dispositivo (USB)
npm run build:apk             # Genera health-release.apk
```

APK release: [`health-release.apk`](health-release.apk) (también en `android/app/build/outputs/apk/release/`).

API key: pantalla Ajustes → SecureStore. Permisos: `INTERNET`, `READ_STEPS` (Health Connect), `ACTIVITY_RECOGNITION` (fallback pedometer).

## Copia de seguridad

En **Ajustes → Exportar datos** se genera un archivo `.db` (SQLite serializado) que puedes guardar en Drive, correo, etc. **Importar backup** restaura rutinas, dieta, sesiones, pasos y métricas. La API key no va en el backup (sigue en SecureStore).

Recomendado exportar antes de reinstalar o actualizar la APK.

## Pasos diarios

En Android 14+ el sistema cuenta pasos en **Health Connect** aunque la app esté cerrada. Al abrir o volver a primer plano, la app lee el total del día y lo guarda en SQLite (`daily_steps`).

1. La primera vez pedirá permiso de lectura de pasos en Health Connect.
2. Si Health Connect no está disponible o se deniega el permiso, usa el **pedometer** de Expo (solo con la app abierta).

Requisitos: Android 8+ (`minSdkVersion` 26). En Android 13 o anterior puede hacer falta instalar [Health Connect](https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata) desde Play Store.
