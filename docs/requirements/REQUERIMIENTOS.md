# ESPECIFICACIÓN DE REQUERIMIENTOS DEL SISTEMA — HYPERTRACK

> **Documento Oficial de Requerimientos de Software**  
> **Origen del Análisis:** Análisis estático e ingeniería inversa del código fuente, esquemas de datos, APIs, Server Actions y componentes de la aplicación (excluyendo documentación previa).  
> **Versión del Sistema:** HyperTrack 0.1.0  
> **Stack Base:** Next.js 16 (App Router), React 19, MongoDB 7.4 (Driver Nativo), Argon2id, Web Crypto API, Zod 4, Tailwind CSS, Recharts.

---

## 1. VISIÓN GENERAL DEL SISTEMA (DEDUCIDA DEL CÓDIGO)

**HyperTrack** es una plataforma web progresiva de alto rendimiento orientada al acondicionamiento físico, entrenamiento de fuerza e hipertrofia muscular, nutrición metabólica y gestión multidisciplinaria (Atleta, Coach, Nutricionista y Administrador). 

A diferencia de un tracker convencional, el código implementa un **ecosistema reactivo de telemetría deportiva y metabólica** compuesto por:
1. **Control de Acceso Basado en Roles (RBAC)** con 4 perfiles diferenciados (`USER`, `COACH`, `NUTRITIONIST`, `ADMIN`).
2. **Motor de Entrenamiento en Vivo** con cronómetro circular reactivo de recuperación, telemetría de volumen acumulado en tiempo real y asistencia auditiva/visual.
3. **Algoritmos Inteligentes de Auto-Progresión (IA lógica)** basados en el esfuerzo percibido (RPE) y sobrecarga progresiva adaptativa.
4. **Motor de Récords Personales (PRs)** con vistas materializadas y cálculo dinámico de 1RM mediante la fórmula de Epley.
5. **Gamificación RPG** con cálculo de XP derivado del volumen total levantado y seguimiento de racha activa (*fire streak*).
6. **Seguimiento Biométrico y Clínico** con registro de circunferencias corporales, cálculo automatizado del ratio cintura/cadera y telemetría de composición corporal.
7. **Motor Metabólico de Nutrición** con cálculo clínico de Tasa Metabólica Basal (BMR) por ecuación de Mifflin-St Jeor, Gasto Energético Total Diario (TDEE Real) indexado al factor de actividad física, y anillos concéntricos interactivos de macronutrientes.
8. **Centro de Comando Administrativo y Auditoría Forense** en tiempo real con monitoreo de eventos de seguridad y gestión centralizada de la biblioteca de ejercicios.

---

## 2. ACTORES Y ROLES DEL SISTEMA (RBAC)

De acuerdo con `src/proxy.ts`, `src/types/user.ts`, `src/lib/auth/session.ts` y las pantallas correspondientes:

| Rol | Identificador en Código | Descripción y Alcance |
| :--- | :--- | :--- |
| **Atleta / Cliente** | `USER` | Acceso al Dashboard de 3 pilares, registro de mediciones biométricas, ejecución de entrenamientos en vivo (modo programa o libre), creación de plantillas propias, bitácora histórica, registro de comidas y vinculación de profesionales. |
| **Entrenador Físico** | `COACH` | Acceso a `/coach`. Visualización del roster de atletas vinculados, telemetría de fatiga (Radar muscular Push/Pull/Legs/Core y Mapa de Calor Anatómico), constructor de programas maestros y asignación de protocolos. |
| **Nutricionista** | `NUTRITIONIST` | Acceso a `/nutritionist`. Visualización del roster de atletas vinculados, cálculo de BMR/TDEE clínico, evaluación de adherencia a macronutrientes de 7 días, auditoría de comidas registradas y formulación de protocolos calóricos. |
| **Administrador** | `ADMIN` | Acceso estricto a `/admin`. Gestión global de usuarios (modificación de roles en caliente), métricas globales de plataforma, radar de logs de seguridad en vivo y mantenimiento CRUD de la biblioteca de ejercicios (`exercise_library`). |

---

## 3. CATÁLOGO DE REQUERIMIENTOS FUNCIONALES (RF)

### MÓDULO 1: AUTENTICACIÓN, SEGURIDAD Y GESTIÓN DE SESIONES

* **RF-1.1: Registro de Usuarios (Atletas)**
  * **Entrada:** `email`, `password`, `confirmPassword`.
  * **Validaciones del Código (`user.schema.ts`):**
    * Correo electrónico obligatorio, formato email válido, longitud máxima 254 caracteres.
    * Contraseña obligatoria, entre 8 y 128 caracteres, al menos una letra mayúscula y al menos un dígito numérico.
    * Coincidencia estricta entre `password` y `confirmPassword`.
    * Unicidad obligatoria en base de datos comparando contra `email.normalized` (en minúsculas y sin espacios).
  * **Comportamiento Backend (`POST /api/auth/register`):**
    * Hashing seguro mediante algoritmo criptográfico **Argon2id** (`argon2.argon2id`).
    * Asignación de identificador semántico público `usr_[ULID]` (26 caracteres alfanuméricos en base32 Crockford).
    * Inicialización de usuario con estado de cuenta `PENDING_VERIFICATION`, idioma `es-PE`, zona horaria `America/Lima`, `failedAttempts: 0`.
    * Generación automática de JWT y cookie de sesión para transición directa al onboarding.
  * **Salida:** HTTP 201 con `publicId` y `email`, o error 409/422.

* **RF-1.2: Registro Especializado para Profesionales**
  * **Entrada:** `email`, `password`, `confirmPassword`, `role`.
  * **Validaciones (`registerProApiSchema`):** Mismas reglas de credenciales, con restricción de rol a un enum estricto: `COACH` o `NUTRITIONIST`.
  * **Comportamiento Backend (`POST /api/auth/register-pro`):** Creación del usuario con el rol profesional correspondiente para acceso directo a sus portales específicos.

* **RF-1.3: Inicio de Sesión Seguro (Login)**
  * **Entrada:** `email`, `password`.
  * **Validaciones y Seguridad (`POST /api/auth/login`):**
    * Búsqueda por `email.normalized`.
    * **Mitigación de Timing Attacks:** Si el usuario no existe, se aplica un delay artificial de 300 ms antes de devolver el error genérico `INVALID_CREDENTIALS`.
    * **Verificación de Bloqueo:** Si `account.status` es `LOCKED` o `SUSPENDED`, se bloquea el acceso con código HTTP 403 `ACCOUNT_LOCKED`.
    * Verificación de contraseña vía `argon2.verify()`.
    * En caso de fallo de contraseña: se incrementa atómicamente `authentication.failedAttempts` en MongoDB.
    * En caso de éxito: reseteo de `failedAttempts` a 0 y actualización de `audit.lastLoginAt` con la fecha y hora UTC actual.
  * **Salida:** Emisión de cookie segura HTTP-only `ht_session` firmada mediante Web Crypto API (HMAC-SHA256, expiración de 7 días).

* **RF-1.4: Cierre de Sesión (Logout)**
  * **Implementación:** `LogoutButton.tsx` y endpoint correspondiente.
  * **Comportamiento:** Invalidación y limpieza inmediata de la cookie `ht_session` en el cliente y redirección a `/login`.

* **RF-1.5: Control de Acceso Perimetral (Edge Middleware RBAC)**
  * **Implementación:** `src/proxy.ts` ejecutado en Edge Runtime.
  * **Comportamiento:**
    * Intercepta rutas `/dashboard/:path*`, `/workout/:path*`, `/nutrition/:path*`, `/coach/:path*`, `/admin/:path*`.
    * Si la sesión no existe o expiró, redirige a `/login?from=[pathname]` para preservar la intención de navegación.
    * Si un usuario sin rol `COACH` o `ADMIN` intenta acceder a `/coach`, lo redirige a `/dashboard`.
    * Si un usuario sin rol `ADMIN` intenta acceder a `/admin`, lo redirige a `/dashboard`.

---

### MÓDULO 2: ONBOARDING Y PERFIL DEL ATLETA

* **RF-2.1: Onboarding Progresivo Multi-Paso (Stepper de 5 Fases)**
  * **Implementación:** `OnboardingForm.tsx`, `profile.schema.ts`, `saveOnboardingProfile`.
  * **Paso 1: Identidad Personal:**
    * `firstName` y `lastName` (2 a 80 caracteres, sin números ni símbolos especiales `@$*`).
    * Generación en backend de `displayName = firstName + " " + lastName`.
  * **Paso 2: Datos Biológicos y Demográficos:**
    * `sex`: Enum (`MALE`, `FEMALE`, `OTHER`, `PREFER_NOT_TO_SAY`).
    * `birthDate`: Fecha válida; validación de edad mínima de 13 años y máxima de 120 años.
  * **Paso 3: Contacto y Medidas Iniciales:**
    * `phone`: Formato internacional E.164 (`^\+[1-9]\d{6,14}$`).
    * Validación en tiempo real de unicidad de teléfono (`checkPhoneExists`) para evitar duplicación entre cuentas.
    * `heightCm`: Entero de 50 a 300 cm.
    * `weightKg`: Número de 20 a 500 kg.
  * **Paso 4: Metas Deportivas y Sistema:**
    * `primaryGoal`: Enum (`HYPERTROPHY`, `FAT_LOSS`, `STRENGTH`, `ENDURANCE`, `GENERAL_HEALTH`, `RECOMPOSITION`).
    * `measurementSystem`: Enum (`METRIC`, `IMPERIAL`).
  * **Paso 5: Estilo de Vida y Contexto de Entrenamiento:**
    * `activityLevel`: Enum PAL (`SEDENTARY`, `LIGHTLY_ACTIVE`, `MODERATELY_ACTIVE`, `VERY_ACTIVE`, `EXTRA_ACTIVE`).
    * `trainingExperience`: Enum (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`).
    * `trainingFrequencyDays`: Entero de 1 a 7 días por semana.
    * `sleepHoursAvg`: Número de 3 a 14 horas diarias promedio.
  * **Salida:** Persistencia en colección `profiles` con `prf_[ULID]`, vinculación con `users._id` (ObjectId) y redirección automática al Dashboard.

* **RF-2.2: Vinculación Multidisciplinaria de Profesionales**
  * **Implementación:** `src/actions/profile.ts` (`linkProfessional`) y `src/app/(dashboard)/profile/page.tsx`.
  * **Comportamiento:**
    * El atleta puede vincular a su cuenta un Entrenador Físico (`roleType: "COACH"`) o un Nutricionista (`roleType: "NUTRITIONIST"`) ingresando su `publicId` (`usr_...`).
    * Verificación de existencia del profesional en la base de datos y validación estricta de que su rol corresponda al tipo solicitado.
    * Almacenamiento en `users.coachId` o `users.nutritionistId`.
    * Funcionalidad de **desvinculación** inmediata (`$unset`) dejando el identificador vacío.

---

### MÓDULO 3: TELEMETRÍA BIOMÉTRICA Y COMPOSICIÓN CORPORAL

* **RF-3.1: Actualización Continua de Medidas y Circunferencias (Conformidad con Validador MongoDB)**
  * **Implementación:** `BiometricsUpdater.tsx`, `logBiometrics` (`actions/profile.ts`), `src/lib/domain/biometrics.ts`, `ProfileDAO.insertMeasurement` (`src/lib/dao/profile.dao.ts`), `profile.schema.ts`.
  * **Datos Capturados:**
    * Peso corporal actual (obligatorio, 20 a 500 kg).
    * Porcentaje de grasa corporal estimado (opcional, 1% a 60%).
    * Circunferencias anatómicas en cm: Cintura (`waistCm`: 30-200 cm), Cadera (`hipCm`: 30-200 cm), Pecho (`chestCm`: 40-200 cm), Brazo (`armCm`: 15-70 cm), Muslo (`thighCm`: 20-100 cm), Pantorrilla (`calfCm`: 15-70 cm).
  * **Cálculo Clínico Automatizado (Dominio Puro `biometrics.ts`):**
    * Si se ingresan cintura y cadera, el motor de dominio calcula automáticamente el **Ratio Cintura/Cadera (WHR)**:  
      $$\text{waistToHipRatio} = \text{round}\left(\frac{\text{waistCm}}{\text{hipCm}}, 2\right)$$
    * **Estratificación de Riesgo Cardiovascular según la OMS:**
      * En Hombres: $\text{WHR} > 0.90 \rightarrow \text{ALTO RIESGO}$; $\text{WHR} \le 0.90 \rightarrow \text{BAJO RIESGO}$.
      * En Mujeres: $\text{WHR} > 0.85 \rightarrow \text{ALTO RIESGO}$; $\text{WHR} \le 0.85 \rightarrow \text{BAJO RIESGO}$.
  * **Persistencia Estricta en Base de Datos (Conformidad `$jsonSchema`):**
    * La capa `ProfileDAO` formatea e inserta el documento cumpliendo las restricciones físicas de la colección `body_measurements`:
      * `clientId`: BSON `ObjectId` del atleta vinculado.
      * `logDate`: BSON `Date` UTC de la medición.
      * `metrics`: Subdocumento conteniendo `weightKg` (obligatorio) y `bodyFatPercentage`.
      * `circumferences`: Subdocumento con circunferencias anatómicas en centímetros y `waistToHipRatio`.
      * `audit`: Objeto de trazabilidad con `createdAt` y `updatedAt`.
    * Actualiza inmediatamente el campo `physical.weightKg` y `physical.bodyFatPercentage` en el perfil del usuario (`profiles`) mediante upsert seguro para disponibilidad instantánea en el HUD y en las gráficas de evolución de peso.
    * Soporte de lectura retrocompatible dual: la interfaz consulta tanto `$or: [{ userId }, { clientId }]` asegurando visualización continua de datos históricos.

---

### MÓDULO 4: MOTOR DE ENTRENAMIENTO EN VIVO (LIVE WORKOUT TRACKER)

* **RF-4.1: Modos de Entrenamiento**
  * **Implementación:** `src/app/(dashboard)/workout/live/page.tsx`, `WorkoutTracker.tsx`.
  * **Modo Programa (`mode=program`):** Consulta a `GET /api/routines/today`, precarga el nombre del programa, lista de ejercicios, series, repeticiones y RPE objetivo asignados para el día actual.
  * **Modo Gimnasio Libre:** Permite al atleta añadir cualquier ejercicio de forma flexible con número ilimitado de series y repeticiones.

* **RF-4.2: Temporizador de Descanso Inteligente (Telemetry HUD)**
  * Temporizador circular SVG interactivo configurado por defecto a **90 segundos**.
  * Al completar cualquier serie mediante el botón de check (✓), se dispara la cuenta regresiva.
  * El encabezado del sistema entra en estado visual de **RECUPERACIÓN** (fondo rojo/óxido con animación de pulso).
  * Posibilidad de saltar o cancelar el descanso anticipadamente.
  * Al expirar el tiempo (0 s), el sistema emite una **alerta visual flash** en pantalla completa y reproduce feedback auditivo interactivo (`Audio API`).

* **RF-4.3: Telemetría de Volumen en Vivo**
  * El sistema calcula reactivamente el volumen total acumulado en kilogramos durante el entrenamiento:  
    $$\text{Volumen Total} = \sum (\text{peso} \times \text{repeticiones})$$
  * Se proyecta en un visor holográfico en la cabecera de la sesión.

* **RF-4.4: Contexto Histórico Inmediato por Ejercicio**
  * Conexión con `GET /api/workouts/history/latest`.
  * A medida que el atleta escribe o selecciona un ejercicio (ej. "Press de Banca Plano"), la interfaz muestra de inmediato la última marca registrada: peso levantado, repeticiones logradas y fecha de ejecución.

* **RF-4.5: Finalización y Registro de Sesión**
  * **Implementación:** `logWorkoutSession` (`actions/workout.ts`), `POST /api/workouts/session`.
  * **Procesamiento de Servidor:**
    * Cálculo de duración real en minutos: $\text{durationMinutes} = \max\left(1, \text{round}\left(\frac{\text{finishedAt} - \text{startedAt}}{60000}\right)\right)$.
    * Evaluación de unidades de peso (`KG` o `LBS`).
    * Almacenamiento en colección `workout_sessions` con identificador `wks_[ULID]`.

* **RF-4.6: Modo Atleta Libre — Plantillas Personalizadas**
  * **Implementación:** `/workout/templates/new`, `createWorkoutTemplate`, `getUserTemplates`.
  * Permite a los atletas sin coach diseñar y guardar sus propias plantillas de entrenamiento (`workout_templates` con prefijo `tpl_[ULID]`), indicando nombre, notas, series, rango de repeticiones y descanso objetivo.

---

### MÓDULO 5: ALGORITMOS DE RENDIMIENTO, PRs Y GAMIFICACIÓN

* **RF-5.1: Algoritmo de Auto-Progresión (IA Lógica)**
  * **Implementación:** `src/lib/utils/auto-progression.ts` (`applyAutoProgression`).
  * **Lógica de Ejecución:** Analiza la sesión previa del atleta para los ejercicios programados para el día actual y calcula el RPE promedio reportado:
    * **Regla de Sobrecarga (`OVERLOAD`):** Si $\text{RPE promedio} \le 7$ (esfuerzo percibido ligero/moderado), el sistema inyecta en la rutina de hoy un incremento automático de $+2.5\text{ kg}$ sobre el peso máximo previo.
    * **Regla de Descarga (`DELOAD`):** Si $\text{RPE promedio} \ge 9.5$ (fatiga extrema o fallo inminente), el sistema reduce preventivamente $-2.5\text{ kg}$ para evitar lesiones y sobreentrenamiento.

* **RF-5.2: Motor de Récords Personales (PRs) y 1RM Estimado**
  * **Implementación:** `calculateAndMarkPRs` (`pr-calculator.ts`), `actions/workout.ts`, colección `personal_records`.
  * **Cálculo de 1RM (Fórmula de Epley):**
    $$\text{1RM Estimado} = \text{Peso} \times \left(1 + \frac{\text{Reps}}{30}\right)$$
  * **Detección Reactiva:**
    * Convierte pesos en libras a kilogramos ($\text{kg} = \text{lbs} \times 0.453592$).
    * Compara contra el historial de `personal_records` o sesiones previas.
    * Si la serie supera el peso máximo previo o iguala el peso con mayor número de repeticiones, marca la serie con `isPR = true`, incrementa el contador de la sesión `prsBroken`, y actualiza/upserta la colección `personal_records`.
    * Vincula la sesión mediante `workoutSessionId`.

* **RF-5.3: Gamificación RPG y Nivel del Atleta**
  * **Implementación:** `logWorkoutSession`, `UserLevel.tsx`.
  * **Conversión de Volumen a Experiencia (XP):** Cada kilogramo de volumen total levantado genera puntos de experiencia a una tasa del 10%:  
    $$\text{XP Ganado} = \lfloor \text{Volumen Total (kg)} \times 0.1 \rfloor$$
  * Incremento atómico en `profiles.totalXp` y `profiles.lifetimeVolume`.
  * Visualización de barra de progreso de nivel, rango de combate y días de racha (*fire streak*).

* **RF-5.4: Estado de Recuperación Neuromuscular**
  * **Implementación:** `dashboard/page.tsx`.
  * Clasificación algorítmica del atleta según su frecuencia de entrenamiento en los últimos 7 días y horas transcurridas desde la última sesión:
    * **SOBREENTRENADO:** $\ge 6$ sesiones semanales.
    * **FATIGADO:** $\ge 5$ sesiones semanales o sesión realizada en el día en curso.
    * **DESCANSADO:** $> 3$ días sin entrenar.
    * **ÓPTIMO:** Parámetros de frecuencia y descanso en rango ideal.

---

### MÓDULO 6: HISTORIAL, LOGROS Y FEEDBACK SOCIAL

* **RF-6.1: Bitácora de Combate (Historial de Sesiones)**
  * **Implementación:** `src/app/(dashboard)/workout/history/page.tsx`.
  * Listado desplegable cronológico de todas las sesiones completadas con fecha, tipo (Libre/Programa), duración, volumen total y badges de PRs obtenidos.
  * Desglose visual serie por serie con indicadores de récords y mapa térmico muscular del impacto.

* **RF-6.2: Salón de la Fama (Achievements)**
  * **Implementación:** `src/app/(dashboard)/achievements/page.tsx` y endpoint `/api/analytics/prs`.
  * Agregación por ejercicio del peso máximo absoluto levantado en la historia del atleta y fecha de logro.
  * Tarjetas de trofeo de alto impacto visual con diseño dorado.

* **RF-6.3: Sistema de Comentarios Interactivos en Sesiones**
  * **Implementación:** `SessionComments.tsx`, `/api/workouts/[id]/comments/route.ts`.
  * Comunicación bidireccional entre el atleta y el entrenador vinculada directamente a la sesión de entrenamiento.
  * Validación del comentario con `commentSchema` (texto no vacío, máximo 1000 caracteres).
  * Registro de autor (`authorPublicId`), rol (`USER` o `COACH`) y timestamp en el array embebido `workout_sessions.comments`.

---

### MÓDULO 7: GESTIÓN DE RUTINAS Y DÍAS ASIGNADOS

* **RF-7.1: Gestor de Rutinas Semanales**
  * **Implementación:** `src/app/(dashboard)/routines/page.tsx`, `RoutineForm.tsx`, `RoutineList.tsx`, `GET/POST /api/routines`, `PUT /api/routines/[id]`.
  * Creación de programas de entrenamiento con nombre, ejercicios, series y asignación explícita a días de la semana (`MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`, `SATURDAY`, `SUNDAY`).
  * Control de estados de plantilla: `ACTIVE`, `INACTIVE`, `ARCHIVED`, `COMPLETED`.
  * Actualización en caliente del estado de la rutina.

---

### MÓDULO 8: NUTRICIÓN Y METABOLISMO

* **RF-8.1: Formulación de Protocolos Nutricionales**
  * **Implementación:** `nutritionPlanSchema`, `POST/GET /api/nutrition/plan`, `setNutritionProtocol` (`nutritionist/[clientId]/actions.ts`).
  * Asignación de requerimientos calóricos diarios (`dailyCalories`: entre 1000 y 10000 kcal).
  * Metas de macronutrientes: Proteínas (`proteinGrams`), Carbohidratos (`carbsGrams`), Grasas (`fatsGrams`).
  * Metas opcionales de hidratación diaria (0.5 a 10 litros) y fibra diaria (0 a 100 g).
  * Al crearse un nuevo plan, los planes previos del cliente pasan automáticamente a estado `CANCELLED`.
  * Generación de identificador con prefijo `nut_[ULID]`.

* **RF-8.2: Registro Diario de Comidas (Meal Logger)**
  * **Implementación:** `MealLogger.tsx`, `MealTracker.tsx`, `mealLogSchema`, `POST /api/nutrition/log`.
  * Tipos de comida: `Desayuno`, `Almuerzo`, `Cena`, `Snack`.
  * Captura de nombre del alimento (2 a 100 caracteres), calorías totales (> 0 y $\le$ 5000 kcal), y desglose de macronutrientes (proteína, carbohidratos, grasas).
  * Almacenamiento en `meal_logs` con `mlg_[ULID]` y fecha en timestamp UTC absoluto.

* **RF-8.3: Monitoreo Visual de Adherencia Nutricional (Macro Rings)**
  * **Implementación:** `MacroRings.tsx`, `NutritionOverview.tsx`, `NutritionCharts.tsx`.
  * Anillos concéntricos SVG interactivos en el Dashboard que comparan los macros consumidos en el día actual versus los objetivos del protocolo.
  * Cálculo porcentual de adherencia calórica diaria:
    $$\text{Adherencia (\%)} = \max\left(0, 100 - \left|\frac{\text{Consumo} - \text{Objetivo}}{\text{Objetivo}}\right| \times 100\right)$$
  * Gráfico de barras apiladas de macronutrientes (Kcal por Proteínas/Carbos/Grasas) de los últimos 7 días con Recharts.

---

### MÓDULO 9: PORTAL DEL ENTRENADOR (COACH PORTAL)

* **RF-9.1: Roster de Atletas y Monitoreo de Fuerza**
  * **Implementación:** `src/app/(dashboard)/coach/page.tsx`.
  * Filtra y muestra estrictamente a los usuarios cuyo `coachId` coincide con el `session.sub` del coach autenticado.
  * Aggregation Pipeline sobre `workout_sessions` de los últimos 28 días que calcula:
    * Volumen total levantado por cliente en 4 semanas.
    * Máximo 1RM estimado en los tres ejercicios fundamentales: **Bench Press**, **Squat** y **Deadlift**.

* **RF-9.2: Constructor de Programas para Clientes**
  * **Implementación:** `src/app/(dashboard)/coach/programs/new/page.tsx`, `createTrainingProgram` (`actions/workout.ts`).
  * Creación de programas de entrenamiento (`training_programs` con prefijo `prg_`): nombre, objetivo, nivel, lista ordenada de ejercicios con `targetSets`, `targetReps`, `targetRpe` y `restSeconds`.

* **RF-9.3: Asignación de Programas y Telemetría Anatómica**
  * **Implementación:** `src/app/(dashboard)/coach/assign-program/[clientId]/page.tsx`, `assignProgramToClient`.
  * **Radar de Atributos Musculares (`StatRadar`):** Procesa el volumen de los últimos 30 días categorizado en `Push`, `Pull`, `Legs` y `Core`.
  * **Mapa de Calor Anatómico (`MuscleHeatmap`):** Renderiza la silueta humana SVG resaltando en rojo neón y animación de pulso los grupos musculares fatigados (`chest`, `shoulders`, `biceps`, `quads`, `calves`, `abs`).
  * Asignación del programa al cliente (`program_assignments`, `asn_`): marca como completada cualquier asignación activa previa y registra auditoría de seguridad (`logSecurityAction`).

---

### MÓDULO 10: PORTAL DEL NUTRICIONISTA (NUTRITIONIST PORTAL)

* **RF-10.1: Roster de Clientes Asignados**
  * **Implementación:** `src/app/(dashboard)/nutritionist/page.tsx`.
  * Lista atletas vinculados por `nutritionistId == session.sub` y permite acceso al panel clínico individual.

* **RF-10.2: Ficha Metabólica y Cálculo Clínico BMR / TDEE**
  * **Implementación:** `src/app/(dashboard)/nutritionist/[clientId]/page.tsx`.
  * **Cálculo de Tasa Metabólica Basal (BMR - Mifflin-St Jeor):**
    $$\text{BMR}_{\text{Hombre}} = (10 \times \text{peso}) + (6.25 \times \text{altura}) - (5 \times \text{edad}) + 5$$
    $$\text{BMR}_{\text{Mujer}} = (10 \times \text{peso}) + (6.25 \times \text{altura}) - (5 \times \text{edad}) - 161$$
  * **Cálculo de TDEE Real:** Multiplica el BMR por el factor de actividad física del perfil:
    * `SEDENTARY`: $\times 1.2$
    * `LIGHTLY_ACTIVE`: $\times 1.375$
    * `MODERATELY_ACTIVE`: $\times 1.55$
    * `VERY_ACTIVE`: $\times 1.725$
    * `EXTRA_ACTIVE`: $\times 1.9$
  * **Proyección de Objetivos:** Muestra automáticamente las calorías calculadas para déficit calórico ($-500\text{ kcal}$), mantenimiento y superávit ($+300\text{ kcal}$), así como el rango óptimo sugerido de proteína ($1.8\text{ a }2.2\text{ g/kg}$).
  * **Gráfica de Evolución de Peso (`WeightChart`):** Recharts que grafica todas las mediciones de peso histórico del atleta.
  * **Tabla de Auditoría de Comidas:** Desglose cronológico de las últimas 50 comidas con macros individuales.

* **RF-10.3: Telemetría de Carga de Entrenamiento y Prescripción Adaptativa**
  * **Implementación:** `src/app/(dashboard)/nutritionist/[clientId]/page.tsx`, `src/lib/domain/trainingLoad.ts` (`analyzeTrainingLoad`).
  * **Evaluación Continua del Estímulo (Ventana de 30 Días):**
    * Analiza todas las sesiones en `workout_sessions` del atleta en los últimos 30 días para correlacionar gasto energético y daño muscular.
    * Extrae 5 métricas biométricas de fatiga:
      1. **Frecuencia Semanal:** Promedio de sesiones por semana ($\text{sesiones} \times 7 / 30$).
      2. **Volumen Acumulado:** Tonelaje total levantado expresado en Toneladas ($Tn$) o Kilogramos ($Kg$).
      3. **RPE Medio:** Esfuerzo percibido promedio en las series registradas (escala Borg modificada 1-10).
      4. **Duración Media:** Minutos promedio invertidos por sesión de entrenamiento.
      5. **Total de Sesiones:** Conteo total de entrenamientos completados en la ventana.
  * **Clasificación Heurística de Carga:**
    * **`HEAVY` (Carga Fuerte / Alta Exigencia):** Frecuencia $\ge 4\text{ días/sem}$ y ($\text{Volumen} \ge 35,000\text{ kg}$ o $\text{RPE Medio} \ge 8.0$). Indica alto vaciado de glucógeno y demanda de síntesis proteica.
    * **`MODERATE` (Carga Moderada / Progresión Estándar):** Frecuencia $\ge 2.5\text{ días/sem}$ o $\text{Volumen} \ge 15,000\text{ kg}$.
    * **`LIGHT` (Carga Suave / Descarga / Deload):** Sesiones esporádicas o volumen bajo ($< 15,000\text{ kg}$).
  * **Prescripción Metabólica Adaptativa y Calibración:**
    * Genera recomendaciones clínicas automáticas para el nutricionista:
      * **Bajo Carga `HEAVY`:** Prescripción elevada de carbohidratos ($6.0 - 8.0\text{ g/kg}$) para repleción de glucógeno muscular, proteína alta ($2.0 - 2.4\text{ g/kg}$) e hidratación reforzada ($+1000\text{ ml}$).
      * **Bajo Carga `MODERATE`:** Carbohidratos balanceados ($4.0 - 5.5\text{ g/kg}$), proteína estándar ($1.8 - 2.2\text{ g/kg}$) e hidratación de base.
      * **Bajo Carga `LIGHT`:** Carbohidratos controlados ($2.5 - 4.0\text{ g/kg}$), ajuste a mantenimiento calórico o déficit para recomposición corporal.
    * Banner de autocalibración inteligente sobre el formulario del protocolo nutricional (`dailyCalories`, `protein`, `carbs`, `fats`).

---

### MÓDULO 11: CENTRO DE COMANDO ADMINISTRATIVO (ADMIN COMMAND CENTER)

* **RF-11.1: Métricas Globales de Plataforma**
  * **Implementación:** `src/app/(dashboard)/admin/page.tsx`.
  * Pipeline de agregación global que calcula:
    * Total de atletas activos registrados en `users`.
    * Suma total de kilogramos levantados en la historia de la plataforma (`workout_sessions.exercises.sets.completed`).
    * Total de planes nutricionales activos vigentes.

* **RF-11.2: Gestión Centralizada de Usuarios y Roles**
  * Tabla de usuarios con email, identificador público `usr_...`, rol actual y estado de cuenta.
  * Acción de servidor `updateUserRole`: Modificación en tiempo real del rol de cualquier usuario (`USER`, `COACH`, `NUTRITIONIST`, `ADMIN`) con revalidación instantánea de rutas (`revalidatePath`).

* **RF-11.3: Biblioteca Maestra de Ejercicios (`exercise_library`)**
  * **Implementación:** `src/app/(dashboard)/admin/exercises/page.tsx`, `addExercise`, `deleteExercise`.
  * Catálogo completo de ejercicios con prefijo `exe_[ULID]`.
  * Formulario de alta con validación de:
    * Nombre del ejercicio.
    * Músculo principal (`CHEST`, `BACK`, `LEGS`, `SHOULDERS`, `BICEPS`, `TRICEPS`, `CORE`, `CALVES`, `GLUTES`).
    * Mecánica de movimiento (`COMPOUND`, `ISOLATION`, `ISOMETRIC`).
    * Equipamiento requerido (`BARBELL`, `DUMBBELL`, `MACHINE`, `CABLE`, `BODYWEIGHT`, `KETTLEBELL`, `OTHER`).
  * Eliminación de ejercicios del catálogo central.

* **RF-11.4: Radar de Auditoría en Tiempo Real**
  * Consola de visualización de eventos de la colección `audit_logs`: timestamp ISO, actor (`actorId`), acción de seguridad (ej. `ASSIGN_PROGRAM`), target (`targetId`) y metadatos complementarios en formato JSON.

---

### MÓDULO 12: CACHÉ MATERIALIZADA Y AGREGACIONES

* **RF-12.1: Endpoint de Caché de Dashboard (Cache-First)**
  * **Implementación:** `GET /api/dashboard/cache`, `dashboard.schema.ts`.
  * Soporta los períodos `DAILY`, `WEEKLY`, `MONTHLY`, `LIFETIME`.
  * **Estrategia Cache-First (TTL 1 hora):**
    * Si existe un documento en `dashboard_cache` generado hace menos de 3600 segundos, se retorna de inmediato con cabecera `X-Cache: HIT`.
    * En caso de *Cache Miss*: Se ejecutan pipelines de agregación en MongoDB sobre `workout_sessions` y `nutrition_logs`, se computa el tonelaje, entrenamientos completados, porcentaje de adherencia y calorías promedio, se realiza un `upsert` en `dashboard_cache` y se retorna con `X-Cache: MISS`.

---

### MÓDULO 13: CAPA DE ACCESO A DATOS (DAO PATTERN) Y ARQUITECTURA LIMPIA

* **RF-13.1: Abstracción y Encapsulamiento de Persistencia (BaseDAO)**
  * **Implementación:** `src/lib/dao/base.dao.ts`.
  * Encapsula la conexión singleton al cliente nativo de MongoDB.
  * Provee utilidades seguras para conversión de tipos BSON: `toObjectId` y `isValidObjectId` para blindar consultas contra excepciones de casteo.

* **RF-13.2: DAOs Especializados por Entidad de Dominio**
  * **`UserDAO` (`src/lib/dao/user.dao.ts`):** Consultas por `email.normalized`, búsqueda por `publicId` o `_id`, vinculación de entrenadores/nutricionistas (`coachId`, `nutritionistId`), actualización de roles RBAC y control atómico de intentos fallidos de autenticación (`failedAttempts`).
  * **`WorkoutDAO` (`src/lib/dao/workout.dao.ts`):** Consultas y mutaciones sobre `exercise_library`, `workout_programs`, `program_assignments`, `workout_sessions` y `personal_records`.
  * **`NutritionDAO` (`src/lib/dao/nutrition.dao.ts`):** Registro de comidas diarias (`meal_logs`), consulta del protocolo activo e inactivación atómica (`updateMany`) de planes cancelados en `nutrition_plans`.
  * **`ProfileDAO` (`src/lib/dao/profile.dao.ts`):** Gestión de expedientes (`profiles`), inserción estricta de medidas físicas en `body_measurements` según `$jsonSchema` y actualización reactiva de peso corporal y grasa.
  * **`AuditDAO` (`src/lib/dao/audit.dao.ts`):** Registro estructurado e inmutable de eventos de seguridad y transacciones críticas en la colección `audit_logs`.

---

### MÓDULO 14: SUITE DE TESTING TDD (TEST-DRIVEN DEVELOPMENT)

* **RF-14.1: Cobertura Automatizada de Reglas de Negocio con Vitest**
  * **Implementación:** `npm test`, `vitest.config.ts`, `src/__tests__/*`.
  * 5 suites independientes de pruebas unitarias puras (22 tests pasando):
    1. `metabolic.test.ts`: Ecuaciones de BMR Mifflin-St Jeor, factores PAL, proyección de superávit/déficit y balance estequiométrico de macronutrientes.
    2. `biomechanics.test.ts`: Ecuación de 1RM de Epley, cálculo acumulativo de volumen de entrenamiento y reglas de auto-progresión basadas en RPE.
    3. `biometrics.test.ts`: Ratio cintura/cadera (WHR) y clasificación de riesgo cardiovascular de la OMS para hombres y mujeres.
    4. `trainingLoad.test.ts`: Algoritmo de detección de carga de entrenamiento (`HEAVY`, `MODERATE`, `LIGHT`) y formulación adaptativa de nutrientes de recuperación.
    5. `user.schema.test.ts`: Validación de esquemas Zod para registro y autenticación.

## 4. CATÁLOGO DE REQUERIMIENTOS NO FUNCIONALES (RNF)

### RNF-1: SEGURIDAD Y PROTECCIÓN DE DATOS
* **RNF-1.1: Hashing Criptográfico:** Contraseñas hasheadas exclusivamente con **Argon2id**, el estándar recomendado contra ataques de hardware dedicado (ASIC/GPU), prohibiendo algoritmos débiles o texto plano.
* **RNF-1.2: Gestión Nativa de Tokens:** Tokens JWT HS256 firmados mediante la API criptográfica nativa del runtime (`crypto.subtle`), sin dependencias de paquetes obsoletos o vulnerables.
* **RNF-1.3: Cookies Seguras:** La sesión se transporta en la cookie `ht_session`, configurada con atributos `httpOnly: true`, `sameSite: "lax"`, `path: "/"` y `secure: true` obligatorio en entornos de producción.
* **RNF-1.4: Protección contra Timing Attacks:** En el endpoint de autenticación, ante emails no registrados, se aplica un retardo inducido de 300 ms para impedir que un atacante determine la existencia de cuentas midiendo tiempos de respuesta.
* **RNF-1.5: Sanitización y Trazabilidad:** Los endpoints públicos jamás exponen identificadores internos `_id` de MongoDB (ObjectIds); todas las transferencias cliente-servidor utilizan IDs públicos semánticos (`usr_`, `prf_`, `wks_`, etc.).
* **RNF-1.6: Pistas de Auditoría:** Acciones críticas de asignación de programas o cambios de privilegios se registran en `audit_logs` con actor, target, acción y fecha.

### RNF-2: INTEGRIDAD Y CONSISTENCIA DEL MODELO DE DATOS
* **RNF-2.1: Validación de Esquema en Doble Capa:**
  * Capa 1: Validación de entrada en cliente y servidor con esquemas **Zod** (en `src/lib/schemas/`).
  * Capa 2: Esquemas físicos estrictos de MongoDB (`$jsonSchema`) definidos en la base de datos `HyperTrackb`.
* **RNF-2.2: Estandarización de Identificadores (ULID):**
  * Los IDs públicos siguen patrones regex estrictos: prefijo de 3 caracteres en minúsculas seguido de guion bajo y 26 caracteres alfanuméricos ULID (ej: `^usr_[0-9A-HJKMNP-TV-Z]{26}$`).
* **RNF-2.3: Consistencia Temporal:** Todas las marcas de tiempo (`createdAt`, `updatedAt`, `startedAt`, `finishedAt`, `date`) se almacenan en formato UTC absoluto (instancias `Date` de BSON).

### RNF-3: RENDIMIENTO Y EFICIENCIA
* **RNF-3.1: Reutilización de Conexiones:** Cliente singleton de MongoDB almacenado en `globalThis` durante desarrollo para prevenir agotamiento de sockets (*connection leaks*) por hot-reloading de Next.js.
* **RNF-3.2: Agregaciones Optimizadas y Vistas Materializadas:**
  * Récords personales desacoplados en la colección `personal_records` para evitar recorrer todas las sesiones históricas en cada consulta.
  * Agregaciones periódicas cacheadas en `dashboard_cache` con TTL de 1 hora.
* **RNF-3.3: Ejecución Perimetral:** El middleware de protección de rutas y evaluación RBAC se ejecuta en Edge Runtime sobre `NextRequest`.

### RNF-4: USABILIDAD, DISEÑO Y EXPERIENCIA VISUAL (UI/UX)
* **RNF-4.1: Sistema de Diseño Brutalista Industrial:**
  * Paleta de colores deliberada: fondos negros puros (`#000000`, `zinc-950`), bordes de alto contraste (`zinc-800`), acentos en rojo sangre (`#dc2626`) y dorado para logros (`yellow-500`).
  * Tipografías de alta legibilidad: fuentes monoespaciadas para datos métricos y tipografías condensadas/pesadas para encabezados en mayúsculas sostenidas.
* **RNF-4.2: Visualización de Datos Avanzada:**
  * Gráficas de área reactivas para sobrecarga progresiva (`VolumeChart`).
  * Gráfica de radar de 4 ejes para distribución de volumen muscular (`StatRadar`).
  * Gráfica radial de macronutrientes (`MacroRadialChart`) y barras apiladas (`MacroStackedChart`).
  * Silueta anatómica SVG interactiva de mapa térmico de fatiga muscular (`MuscleHeatmap`).
* **RNF-4.3: Ergonomía Móvil para Gimnasio:**
  * Botones táctiles grandes para registro rápido entre series en el modo en vivo.
  * Temporizador de descanso flotante visible en todo momento con botón de salto rápido.
  * Inputs numéricos optimizados para teclado táctil con bloqueo de spinners del navegador.

---

## 5. TABLA RESUMEN DE TRAZABILIDAD (CÓDIGO FUENTE)

| Requerimiento Funcional | Archivos de Implementación Principal | Endpoint / Server Action / Componente |
| :--- | :--- | :--- |
| **RF-1: Auth & RBAC** | `src/app/api/auth/*`, `src/lib/auth/session.ts`, `src/proxy.ts` | `POST /api/auth/register`, `POST /api/auth/login`, `proxy.ts` |
| **RF-2: Onboarding** | `src/actions/onboarding.ts`, `src/components/forms/onboarding-form.tsx` | `saveOnboardingProfile`, `checkPhoneExists` |
| **RF-3: Biometría & WHR** | `src/actions/profile.ts`, `src/components/telemetry/BiometricsUpdater.tsx` | `logBiometrics`, `biometricsSchema` |
| **RF-4: Entrenamiento en Vivo** | `src/app/(dashboard)/workout/live/page.tsx`, `actions/workout.ts` | `LiveWorkoutPage`, `logWorkoutSession`, `POST /api/workouts/session` |
| **RF-5: Auto-Progresión & PRs** | `src/lib/utils/auto-progression.ts`, `pr-calculator.ts` | `applyAutoProgression`, `calculateAndMarkPRs` |
| **RF-6: Salón de la Fama** | `src/app/(dashboard)/achievements/page.tsx`, `/api/analytics/prs` | `AchievementsPage`, `GET /api/analytics/prs` |
| **RF-7: Comentarios Sesión** | `src/components/workout/SessionComments.tsx`, `api/workouts/[id]/comments` | `POST/GET /api/workouts/[id]/comments` |
| **RF-8: Nutrición & Macros** | `src/actions/nutrition.ts`, `src/app/api/nutrition/*`, `MacroRings.tsx` | `logMeal`, `POST /api/nutrition/log`, `POST /api/nutrition/plan` |
| **RF-9: Vinculación Pro** | `src/actions/profile.ts`, `src/app/(dashboard)/profile/page.tsx` | `linkProfessional` (`coachId`, `nutritionistId`) |
| **RF-10: Portal Coach** | `src/app/(dashboard)/coach/*`, `src/actions/workout.ts` | `CoachDashboard`, `createTrainingProgram`, `assignProgramToClient` |
| **RF-11: Portal Nutrición** | `src/app/(dashboard)/nutritionist/*`, `nutritionist/[clientId]/*` | `NutritionistDashboard`, `setNutritionProtocol` |
| **RF-11.3: Telemetría de Carga** | `src/lib/domain/trainingLoad.ts`, `src/app/(dashboard)/nutritionist/[clientId]/page.tsx` | `analyzeTrainingLoad` (HEAVY/MODERATE/LIGHT, macros adaptativos) |
| **RF-12: Comando Admin** | `src/app/(dashboard)/admin/*`, `src/actions/admin.ts` | `AdminPage`, `updateUserRole`, `addExercise`, `deleteExercise` |
| **RF-13: Caché & Analytics** | `src/app/api/dashboard/cache/route.ts`, `analytics/volume/route.ts` | `GET /api/dashboard/cache`, `GET /api/analytics/volume` |
| **RF-14: Capa DAO (SOLID)** | `src/lib/dao/*`, `src/lib/domain/*` | `BaseDAO`, `UserDAO`, `WorkoutDAO`, `NutritionDAO`, `ProfileDAO`, `AuditDAO` |
| **RF-15: Testing TDD** | `vitest.config.ts`, `src/__tests__/**/*` | 5 suites (Vitest), 22 tests unitarios pasando |

---
*Fin del documento oficial de requerimientos.*
