# HyperTrack — Diccionario Completo de Archivos y Flujos de Interacción

> **Objetivo de este documento:** Detallar exactamente **qué hace cada archivo del proyecto**, cómo se comunican entre sí y cuáles son los **flujos de datos paso a paso** (End-to-End). Con esta guía podrás abrir cualquier archivo en tu editor de código y explicar con soltura qué hace cada línea.

---

## Tabla de Contenidos
1. [Árbol Visual del Proyecto](#1-árbol-visual-del-proyecto)
2. [Configuración Raíz y Servidor](#2-configuración-raíz-y-servidor)
3. [Controladores: Server Actions (`src/actions/`)](#3-controladores-server-actions-srcactions)
4. [Capa de Persistencia: Patrón DAO (`src/lib/dao/`)](#4-capa-de-persistencia-patrón-dao-srclibdao)
5. [Lógica de Negocio: Dominio Puro (`src/lib/domain/`)](#5-lógica-de-negocio-dominio-puro-srclibdomain)
6. [Validación de Entrada: Esquemas Zod (`src/lib/schemas/`)](#6-validación-de-entrada-esquemas-zod-srclibschemas)
7. [Seguridad, Sesión y Utilidades (`src/lib/auth/`, `audit/`, `db/`, `utils/`)](#7-seguridad-sesión-y-utilidades)
8. [Tipos del Sistema (`src/types/`)](#8-tipos-del-sistema-srctypes)
9. [Suites de Pruebas Unitarias (`src/__tests__/`)](#9-suites-de-pruebas-unitarias-src__tests__)
10. [Rutas de la Aplicación y Vistas (`src/app/`)](#10-rutas-de-la-aplicación-y-vistas-srcapp)
11. [Componentes Visuales Clave (`src/components/`)](#11-componentes-visuales-clave-srccomponents)
12. [Flujos de Interacción Paso a Paso (End-to-End)](#12-flujos-de-interacción-paso-a-paso-end-to-end)
13. [Torreta de Defensa: ¿Qué archivo abrir si el profesor te pide...?](#13-torreta-de-defensa-qué-archivo-abrir-si-el-profesor-te-pide)

---

## 1. Árbol Visual del Proyecto

```text
HyperTrack - mongoDB/
├── package.json                    # Dependencias, scripts y configuración npm
├── tsconfig.json                   # Configuración del compilador TypeScript
├── next.config.ts                  # Configuración del framework Next.js 16
├── run-seed.ts                     # Script ejecutor de datos de prueba
├── src/
│   ├── proxy.ts                    # Edge Proxy (Middleware perimetral RBAC de Next.js 16)
│   ├── actions/                    # Controladores Server Actions (Manejan peticiones del usuario)
│   │   ├── admin.ts                # Gestión de roles, ejercicios y auditoría de admin
│   │   ├── nutrition.ts            # Registro de comidas y macros del atleta
│   │   ├── onboarding.ts           # Captura de perfil inicial biométrico
│   │   ├── profile.ts              # Vinculación coach/nutri y registro de medidas corporales
│   │   └── workout.ts              # Sesiones en vivo, cálculo 1RM, programas y récords
│   ├── lib/
│   │   ├── auth/session.ts         # JWT nativo con Web Crypto y cookies HttpOnly
│   │   ├── audit.ts                # Función helper para auditoría forense
│   │   ├── db/                     # Conexión MongoDB nativa y seeder
│   │   ├── dao/                    # Patrón DAO (Acceso desacoplado a Base de Datos)
│   │   │   ├── base.dao.ts         # Clase abstracta con Singleton y BSON helpers
│   │   │   ├── user.dao.ts         # Consultas de usuarios, roles y vinculaciones
│   │   │   ├── workout.dao.ts      # Consultas de entrenamientos, programas y PRs
│   │   │   ├── nutrition.dao.ts    # Consultas de planes nutricionales y comidas
│   │   │   ├── profile.dao.ts      # Consultas de perfiles y medidas antropométricas
│   │   │   └── audit.dao.ts        # Registro forense inmutable de seguridad
│   │   ├── domain/                 # Reglas puras SOLID (Matemáticas sin BD ni HTTP)
│   │   │   ├── biomechanics.ts     # Fórmula de Epley (1RM), volumen y RPE
│   │   │   ├── biometrics.ts       # Ratio WHR y riesgo cardiovascular OMS
│   │   │   ├── metabolic.ts        # BMR (Mifflin-St Jeor), TDEE y reparto de macros
│   │   │   └── trainingLoad.ts     # Analizador de 30 días de carga (HEAVY/MODERATE/LIGHT)
│   │   ├── schemas/                # Esquemas de validación dual con Zod
│   │   └── utils/                  # Generador de IDs ULID, auto-progresión, PR calculator
│   ├── types/                      # Interfaces TypeScript del sistema
│   ├── __tests__/                  # 5 suites y 22 pruebas automatizadas (Vitest)
│   ├── components/                 # Componentes de interfaz (gráficas Recharts, formularios)
│   └── app/                        # Rutas de Next.js (App Router)
│       ├── (auth)/                 # Rutas públicas: login, register, login profesional
│       ├── (dashboard)/            # Rutas privadas: dashboard, workout, coach, nutritionist, admin
│       ├── (onboarding)/           # Flujo de bienvenida y captura biométrica
│       └── api/                    # Endpoints internos REST
```

---

## 2. Configuración Raíz y Servidor

- **[`package.json`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/package.json):**
  - **Qué hace:** Declara los paquetes del proyecto y scripts de ejecución.
  - **Scripts clave:**
    - `npm run dev`: Inicia el servidor de desarrollo en `http://localhost:3000`.
    - `npm test`: Ejecuta las 22 pruebas unitarias con Vitest.
    - `npm run build`: Compila para producción.
  - **Librerías principales:** Next.js 16.2.10, React 19.2.4, MongoDB 7.4.0 (driver nativo oficial), Argon2 0.44.0 (hashing de contraseñas), Zod 4 (validación de esquemas), Vitest 5 (TDD), Recharts (gráficas de telemetría).

- **[`src/proxy.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/proxy.ts):**
  - **Qué hace:** Es el **Edge Proxy** (Middleware perimetral) oficial de Next.js 16.
  - **Cómo interactúa:** Se ejecuta en el runtime del Edge antes de resolver cualquier ruta. Inspecciona la cabecera `Cookie`, extrae `ht_session`, verifica la firma criptográfica HMAC-SHA256 del JWT mediante Web Crypto API (`crypto.subtle`) y evalúa el control de acceso basado en roles (RBAC):
    - Si el usuario accede a `/coach/*` y su rol no es `COACH` ni `ADMIN` -> emite `NextResponse.redirect("/dashboard")`.
    - Si accede a `/admin/*` y su rol no es `ADMIN` -> emite `NextResponse.redirect("/dashboard")`.
    - Si no existe sesión válida -> emite `NextResponse.redirect("/login?from=[pathname]")`.

- **[`run-seed.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/run-seed.ts):**
  - **Qué hace:** Script ejecutable que siembra la base de datos con usuarios y datos de demostración para los 4 roles (atleta de prueba, coach de prueba, nutricionista y admin).

- **[`.env.example`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/.env.example):**
  - **Qué hace:** Plantilla de variables de entorno requeridas: `MONGODB_URI`, `MONGODB_DB`, y `AUTH_SECRET` (secreto criptográfico de al menos 32 caracteres para firmar los JWT).

---

## 3. Controladores: Server Actions (`src/actions/`)

Las Server Actions son funciones asíncronas con directiva `"use server"` que reciben las acciones del usuario desde la interfaz, validan la sesión, ejecutan la lógica y devuelven el resultado.

### 1. [`src/actions/workout.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/actions/workout.ts) (El controlador de entrenamientos)
- **`getExercises()`:** Trae el catálogo de ejercicios de la BD mediante `WorkoutDAO.getAllExercises()`. Si está vacío, inserta automáticamente 8 ejercicios maestros por defecto.
- **`createTrainingProgram(data)`:** Usado por el **Coach** para diseñar un nuevo programa de entrenamiento con ejercicios, series, repeticiones y RPE. Lo guarda con `WorkoutDAO.createTrainingProgram()`.
- **`assignProgramToClient(clientIdStr, programPublicId)`:** Asigna el programa al atleta especificado, desactiva asignaciones anteriores mediante el DAO y crea un registro de auditoría (`logSecurityAction`).
- **`createWorkoutTemplate(data)`:** Permite al **Atleta libre** guardar su propia plantilla personalizada.
- **`logWorkoutSession(data)`:** Orquesta el registro completo de una sesión de entrenamiento:
  1. Calcula la duración en minutos entre `startedAt` y `finishedAt`.
  2. Llama a `calculateEpley1RM` y `calculateVolumeLoad` de `src/lib/domain/biomechanics.ts`.
  3. Compara cada serie contra los récords previos y actualiza marcas máximas con `WorkoutDAO.upsertPR()`.
  4. Guarda la sesión en MongoDB mediante `WorkoutDAO.insertWorkoutSession()`.
  5. Suma experiencia (+XP) al atleta y registra la auditoría.

### 2. [`src/actions/nutrition.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/actions/nutrition.ts) (El controlador nutricional)
- **`logMeal(formData)`:** Recibe los datos de una comida (tipo: Desayuno/Almuerzo/Cena/Snack, nombre, calorías, proteínas, carbohidratos, grasas). Valida la sesión activa y llama a `NutritionDAO.insertMealLog()` para persistir el registro diario.

### 3. [`src/actions/profile.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/actions/profile.ts) (El controlador de perfil y vinculaciones)
- **`linkProfessional(formData)`:** Permite al atleta vincularse con su Entrenador o Nutricionista usando el `publicId` de este último:
  - Si el ID viene en blanco -> **Desvincula** al profesional (`UserDAO.unlinkProfessional`).
  - Si viene un ID -> Busca al profesional en `UserDAO`, verifica que tenga el rol correspondiente (`COACH` o `NUTRITIONIST`) y lo asocia en el campo `coachId` o `nutritionistId` del atleta (`UserDAO.linkProfessional`).
  - Registra el evento en la auditoría (`logSecurityAction`).
- **`logBiometrics(formData)`:** Recibe el peso corporal, cintura y cadera. Calcula el ratio cintura-cadera con `calculateWHR` de `src/lib/domain/biometrics.ts` y lo guarda mediante `ProfileDAO`.

### 4. [`src/actions/onboarding.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/actions/onboarding.ts) (El controlador de primer ingreso)
- **`saveOnboardingProfile(data, userId)`:** Se ejecuta cuando un atleta nuevo completa el formulario de 5 pasos: guarda fecha de nacimiento, sexo biológico, altura, peso, nivel de actividad y metas mediante `ProfileDAO.createProfile()`.

### 5. [`src/actions/admin.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/actions/admin.ts) (El controlador de administración)
- **`updateUserRole(userId, formData)`:** Verifica que quien ejecute sea `ADMIN`. Cambia en caliente el rol de un usuario (`USER`, `COACH`, `NUTRITIONIST`, `ADMIN`) a través de `UserDAO.updateRole()` y audita el cambio en `audit_logs`.
- **`addExercise(formData)` / `deleteExercise(publicId)`:** Da de alta o baja ejercicios en el catálogo maestro mediante `WorkoutDAO`.

---

## 4. Capa de Persistencia: Patrón DAO (`src/lib/dao/`)

Esta capa encapsula el 100% de las consultas a MongoDB para que el resto del sistema no tenga que escribir código BSON o lidiar con conexiones.

### 1. [`src/lib/dao/base.dao.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/dao/base.dao.ts) (Clase Base Abstracta)
- Define la conexión Singleton reutilizable a MongoDB para no saturar los pools de conexiones.
- Provee métodos auxiliares vitales:
  - `toObjectId(id)`: Convierte un string a `ObjectId` de MongoDB de forma segura. Si el string está corrupto, retorna `null` en vez de provocar una excepción que tumbe el servidor.
  - `isValidObjectId(id)`: Valida si una cadena cumple con el formato hexadecimal de 24 caracteres.

### 2. [`src/lib/dao/user.dao.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/dao/user.dao.ts)
- `findByEmail(email)`: Búsqueda insensible a mayúsculas/minúsculas normalizando el email con `.trim().toLowerCase()`.
- `findByPublicId(publicId)`: Busca por el identificador público legible (ej. `usr_01H...`).
- `linkProfessional()` y `unlinkProfessional()`: Conecta o desconecta a un atleta con su entrenador (`coachId`) o nutricionista (`nutritionistId`).
- `updateRole(userId, role)`: Cambia el rol de acceso de un usuario.
- `incrementFailedAttempts(userId)` / `resetFailedAttempts(userId)`: Mecanismo de defensa contra ataques de fuerza bruta.

### 3. [`src/lib/dao/workout.dao.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/dao/workout.dao.ts)
- Maneja 5 colecciones de entrenamiento: `exercise_library`, `training_programs`, `program_versions`, `program_assignments` y `workout_sessions`.
- `insertWorkoutSession(sessionData)`: Guarda una sesión de entrenamiento completa con sus series y métricas calculadas.
- `upsertPR(userId, exerciseId, prData)`: Si el 1RM o el peso levantado es superior al récord histórico del usuario, lo actualiza atómicamente con `$set` y `$max`.
- `getUserPRs(userId)`: Obtiene el salón de la fama de récords personales del usuario.

### 4. [`src/lib/dao/nutrition.dao.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/dao/nutrition.dao.ts)
- Maneja `nutrition_plans` y `meal_logs`.
- `getActivePlan(athleteId)`: Trae la pauta calórica y distribución de macros asignada por el nutricionista.
- `insertMealLog(mealData)`: Inserta un registro de comida en la bitácora del día.
- `getTodayLogs(userId)`: Agrupa los alimentos consumidos en la fecha actual para calcular los anillos de cumplimiento calórico.

### 5. [`src/lib/dao/profile.dao.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/dao/profile.dao.ts)
- Maneja `profiles` y `body_measurements`.
- Inserta y consulta el histórico antropométrico (peso en kg, circunferencia de cintura y cadera) para graficar la evolución temporal en Recharts.

### 6. [`src/lib/dao/audit.dao.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/dao/audit.dao.ts)
- Maneja la colección `audit_logs`.
- Registra eventos de seguridad inmutables con actor, acción, IP/entorno, fecha ISO y detalles del cambio.

---

## 5. Lógica de Negocio: Dominio Puro (`src/lib/domain/`)

> **Característica clave para la sustentación:** Estos archivos son **funciones puras** de TypeScript. No importan MongoDB, no importan HTTP, no importan React. Solo reciben parámetros matemáticos y devuelven respuestas exactas. Por eso son testeados al 100% con Vitest.

### 1. [`src/lib/domain/biomechanics.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/domain/biomechanics.ts)
- **Fórmula de Epley (1RM Estimado):**  
  $$\text{1RM} = \text{Peso} \times \left(1 + \frac{\text{Repeticiones}}{30}\right)$$
  - Si `reps === 1`, el 1RM es exactamente el peso levantado.
  - Si el peso o repeticiones son $\le 0$, retorna `0`.
- **Volumen de Carga (`calculateVolumeLoad`):**  
  Multiplica $\sum (\text{Series} \times \text{Reps} \times \text{Peso})$ para cuantificar el tonelaje total levantado en una sesión.
- **Zonas de Esfuerzo RPE (`evaluateRPE`):**  
  Clasifica la escala de Borg modificada (1 a 10) en zonas de esfuerzo: calentamiento, moderado, hipertrofia o fallo muscular.

### 2. [`src/lib/domain/biometrics.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/domain/biometrics.ts)
- **Ratio Cintura-Cadera (WHR - Waist-to-Hip Ratio):**  
  $$\text{WHR} = \frac{\text{Cintura (cm)}}{\text{Cadera (cm)}}$$
- **Clasificación de Riesgo Cardiovascular según la OMS:**
  - En Hombres: $\le 0.90$ (Bajo riesgo), $> 0.90$ (Riesgo elevado).
  - En Mujeres: $\le 0.85$ (Bajo riesgo), $> 0.85$ (Riesgo elevado).

### 3. [`src/lib/domain/metabolic.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/domain/metabolic.ts)
- **Tasa Metabólica Basal (BMR - Ecuación clínica de Mifflin-St Jeor):**
  - Hombres: $\text{BMR} = 10 \times \text{peso(kg)} + 6.25 \times \text{altura(cm)} - 5 \times \text{edad} + 5$
  - Mujeres: $\text{BMR} = 10 \times \text{peso(kg)} + 6.25 \times \text{altura(cm)} - 5 \times \text{edad} - 161$
- **Gasto Energético Total Diario (TDEE):**  
  Multiplica el BMR por el factor de actividad (1.2 sedentario, 1.375 ligero, 1.55 moderado, 1.725 muy activo, 1.9 extremo).
- **Reparto de Macronutrientes (`calculateMacroDistribution`):**  
  Desglosa calorías totales en gramos de proteína (4 kcal/g), carbohidratos (4 kcal/g) y grasas (9 kcal/g).

### 4. [`src/lib/domain/trainingLoad.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/domain/trainingLoad.ts)
- **`analyzeTrainingLoad(sessions30Days)`:**  
  Es el puente entre el Coach y el Nutricionista. Analiza todas las sesiones de los últimos 30 días del atleta:
  - Clasifica el estímulo acumulado en **`HEAVY`**, **`MODERATE`** o **`LIGHT`**.
  - Si la carga es `HEAVY`, emite recomendaciones clínicas automáticas para el nutricionista: aumentar carbohidratos de reposición glucogénica, incrementar hidratación a $\ge 3.5$ L/día y priorizar proteínas de rápida asimilación.

---

## 6. Validación de Entrada: Esquemas Zod (`src/lib/schemas/`)

Todos los datos que entran al sistema pasan por Zod. Si un campo no cumple las reglas, Zod lanza un error legible y frena la ejecución:

- **[`user.schema.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/schemas/user.schema.ts):** Valida registro y login. Exige email bien formado, contraseña de mínimo 8 caracteres con al menos una mayúscula y un número, y coincidencia exacta en la confirmación.
- **[`workout.schema.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/schemas/workout.schema.ts):** Valida ejercicios, series, repeticiones $>0$, pesos $>0$ y rangos de RPE de 1 a 10.
- **[`nutrition.schema.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/schemas/nutrition.schema.ts):** Valida planes nutricionales (calorías positivas, reparto de macros coherente) y registros de comida.
- **[`profile.schema.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/schemas/profile.schema.ts):** Valida datos biométricos (estatura en cm, peso en kg, circunferencias válidas).
- **[`routine.schema.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/schemas/routine.schema.ts):** Valida plantillas de rutinas y días asignados.
- **[`dashboard.schema.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/schemas/dashboard.schema.ts):** Valida respuestas serializadas del panel de control.
- **[`comment.schema.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/schemas/comment.schema.ts):** Valida comentarios y notas dejadas por atletas y profesionales.

---

## 7. Seguridad, Sesión y Utilidades

- **[`src/lib/auth/session.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/auth/session.ts):**
  - **JWT Nativo con Web Crypto API (`crypto.subtle`):** Firma tokens con algoritmo HMAC-SHA256 sin librerías externas vulnerables.
  - Genera y lee la cookie `ht_session` (con flags `HttpOnly`, `SameSite=Lax`, duración de 7 días).
  - Provee `createSession(publicId, role)`, `getSession()` y `destroySession()`.
- **[`src/lib/audit.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/audit.ts):**
  - Función centralizada `logSecurityAction(actorId, action, targetId, details)` para registrar cualquier cambio crítico en el sistema.
- **[`src/lib/db/mongodb.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/db/mongodb.ts):**
  - Inicializa el cliente nativo `MongoClient` de MongoDB con caché de conexión para desarrollo (`global._mongoClientPromise`) y reconexión automática.
- **[`src/lib/utils/id.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/utils/id.ts):**
  - Genera IDs públicos ordenables en el tiempo con formato ULID (ejemplo: `usr_01H...`, `prf_01H...`).
- **[`src/lib/utils/auto-progression.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/utils/auto-progression.ts):**
  - Algoritmo que calcula el incremento de sobrecarga progresiva sugerido para la siguiente semana de entrenamiento según el RPE y el cumplimiento de repeticiones.

---

## 8. Tipos del Sistema (`src/types/`)

El sistema cuenta con TypeScript estricto. Cada dominio tiene su archivo de tipos propio:
- **`user.ts`:** Define `UserDocument`, roles (`USER`, `COACH`, `NUTRITIONIST`, `ADMIN`), datos de sesión.
- **`workout.ts`:** Define tipos para ejercicios, series (`Set`), sesiones (`WorkoutSession`), plantillas y programas.
- **`nutrition.ts`:** Define `NutritionPlan`, `MealLog`, desglose de macronutrientes.
- **`profile.ts`:** Define `ProfileDocument`, medidas biométricas y metas del atleta.
- **`dashboard.ts`:** Define las estructuras agregadas de métricas que alimentan los gráficos.

---

## 9. Suites de Pruebas Unitarias (`src/__tests__/`)

HyperTrack cuenta con **22 pruebas automatizadas** que se ejecutan con `npm test`:

```
 ✓ src/__tests__/domain/biomechanics.test.ts (5 tests)
 ✓ src/__tests__/domain/trainingLoad.test.ts (3 tests)
 ✓ src/__tests__/domain/biometrics.test.ts (4 tests)
 ✓ src/__tests__/domain/metabolic.test.ts (5 tests)
 ✓ src/__tests__/schemas/user.schema.test.ts (5 tests)

 Test Files  5 passed (5)
      Tests  22 passed (22)
```

1. **`biomechanics.test.ts`:** Verifica cálculo de 1RM de Epley (incluyendo 1 repetición y valores negativos), cálculo de volumen y clasificación RPE.
2. **`biometrics.test.ts`:** Verifica cálculo de ratio WHR y clasificación de riesgo cardiovascular OMS en hombres y mujeres.
3. **`metabolic.test.ts`:** Verifica fórmula Mifflin-St Jeor para ambos sexos, factores de actividad física TDEE y reparto de macronutrientes.
4. **`trainingLoad.test.ts`:** Verifica clasificación de fatiga acumulada en 30 días y generación de consejos nutricionales adaptativos.
5. **`user.schema.test.ts`:** Verifica que Zod rechace contraseñas cortas (< 8 caracteres), contraseñas sin mayúsculas, confirmaciones diferentes y correos malformados.

---

## 10. Rutas de la Aplicación y Vistas (`src/app/`)

Next.js 16 organiza las vistas usando **Route Groups** (carpetas entre paréntesis que organizan sin alterar la URL):

### 1. Grupo `(auth)` — Autenticación Pública
- **`/login` (`src/app/(auth)/login/page.tsx`):** Inicio de sesión para Atletas.
- **`/register` (`src/app/(auth)/register/page.tsx`):** Registro de nuevos Atletas federados.
- **`/pro/login` (`src/app/(auth)/pro/login/page.tsx`):** Portal de inicio de sesión exclusivo para Entrenadores y Nutricionistas.
- **`/pro/register` (`src/app/(auth)/pro/register/page.tsx`):** Registro de profesionales con selección de rol (`COACH` o `NUTRITIONIST`).

### 2. Grupo `(dashboard)` — Rutas Protegidas por Rol
- **`/dashboard`:** Tablero principal del Atleta con racha de días, volumen acumulado, estado de recuperación, gráficos de peso y anillos de macronutrientes.
- **`/workout/live`:** Pantalla de entrenamiento en tiempo real con selector de ejercicios, cronómetro SVG reactivo de descanso y cálculo automático de volumen acumulado.
- **`/workout/history`:** Historial cronológico de sesiones completadas con métricas y RPE promedio.
- **`/workout/templates/new`:** Constructor de plantillas de entrenamiento para atletas independientes.
- **`/nutrition`:** Bitácora de nutrición diaria con registro de comidas y seguimiento de calorías frente a la meta.
- **`/routines`:** Gestión de rutinas semanales activas.
- **`/achievements`:** Salón de la fama con récords personales (1RM máximo en Sentadilla, Banca, Peso Muerto, etc.).
- **`/profile`:** Perfil del deportista y panel para **vincular o desvincular** a su Coach y Nutricionista ingresando su ID público.
- **`/coach`:** Portal del Entrenador con el roster de atletas a su cargo, volumen de carga de las últimas 4 semanas y 1RM estimados.
- **`/coach/programs/new`:** Constructor de programas de entrenamiento para clientes.
- **`/coach/assign-program/[clientId]`:** Vista de asignación de programa a un atleta específico con visualización de radar muscular.
- **`/nutritionist`:** Portal del Nutricionista con listado de atletas vinculados.
- **`/nutritionist/[clientId]`:** Ficha clínica del atleta: BMR, TDEE, análisis de carga de 30 días (`trainingLoad`), historial de peso y prescripción del protocolo dietético.
- **`/admin`:** Panel de comando administrativo con métricas globales, conmutación de roles de usuarios y visor de auditoría.
- **`/admin/exercises`:** Catálogo de ejercicios maestros para alta y baja de ejercicios.

### 3. Grupo `(onboarding)`
- **`/onboarding/profile`:** Asistente de 5 pasos para atletas nuevos (identidad, datos biológicos, medidas corporales iniciales, metas deportivas y hábitos de descanso).

### 4. Rutas API REST Internas (`src/app/api/`)
Endpoints JSON para llamadas asíncronas desde componentes de cliente:
- `api/auth/login`: Procesa credenciales con retardo anti-timing de 300 ms, verifica Argon2id y emite la cookie JWT.
- `api/auth/logout`: Elimina la cookie de sesión y redirige al login.
- `api/auth/register` y `api/auth/register-pro`: Registran usuarios con hash Argon2id y validación Zod.
- `api/analytics/volume` y `api/analytics/prs`: Datos agregados para las gráficas de Recharts.
- `api/nutrition/log` y `api/nutrition/plan`: Endpoints auxiliares para registro de alimentos y consulta de planes.

---

## 11. Componentes Visuales Clave (`src/components/`)

- **Telemetría y Gráficos (`src/components/telemetry/`):**
  - `MacroRings.tsx`: Anillos interactivos SVG que muestran el porcentaje completado de proteínas, carbohidratos y grasas del día.
  - `CaloriesChart.tsx` y `WeightChart.tsx`: Gráficos interactivos construidos con **Recharts** para visualizar la tendencia de peso y consumo calórico.
  - `MuscleHeatmap.tsx` / `StatRadar.tsx`: Gráfico de radar que muestra la distribución de fatiga muscular (Push, Pull, Legs, Core) para alertar al entrenador sobre sobreentrenamiento.
- **Seguimiento de Entrenamiento (`src/components/workout/`):**
  - `WorkoutTracker.tsx`: El corazón del entrenamiento en vivo con temporizador de descanso de 90 segundos y cálculo reactivo en pantalla.
- **Formularios con validación en cliente (`src/components/forms/`):**
  - Formularios conectados con `react-hook-form` y `@hookform/resolvers/zod` para validar antes de enviar.

---

## 12. Flujos de Interacción Paso a Paso (End-to-End)

Aquí puedes seguir el camino de la información de principio a fin en los 5 casos de uso más importantes:

### Flujo 1: Inicio de Sesión y Acceso Seguro
```
1. El usuario ingresa su correo y contraseña en /login y presiona "Ingresar".
2. La vista envía un POST a /api/auth/login con el payload validado.
3. El endpoint busca el usuario en la BD mediante UserDAO.findByEmail(email).
   - Si no existe: Espera un retardo deliberado de 300 ms (Anti-Timing Attack) y responde error genérico.
   - Si existe: Comprueba la contraseña con argon2.verify(user.passwordHash, password).
4. Si las credenciales son válidas, llama a createSession(user.publicId, user.role).
5. session.ts genera un JWT firmado con Web Crypto (HMAC-SHA256) y lo inyecta en la cookie ht_session (HttpOnly).
6. El navegador es redirigido a /dashboard.
7. Al navegar, src/proxy.ts intercepta la petición, verifica la cookie y permite el paso.
```

---

### Flujo 2: Atleta Registra un Entrenamiento en Vivo
```
1. El atleta entra a /workout/live, selecciona ejercicios y anota peso, repeticiones y RPE de cada serie.
2. Al presionar "Finalizar Sesión", se invoca la Server Action logWorkoutSession() en src/actions/workout.ts.
3. La acción verifica la identidad del usuario leyendo la sesión activa con getSession().
4. Se ejecutan las funciones del Dominio Puro:
   - calculateEpley1RM(weight, reps) calcula el 1RM estimado de cada serie.
   - calculateVolumeLoad(sets) calcula el tonelaje total de la sesión.
5. WorkoutDAO.insertWorkoutSession() persiste la sesión en MongoDB (workout_sessions).
6. Para cada ejercicio, WorkoutDAO.upsertPR() compara el nuevo 1RM contra el récord anterior; si es nuevo récord, lo actualiza.
7. Se registra el evento en AuditDAO y se suma experiencia (XP) al atleta.
8. revalidatePath() refresca el dashboard automáticamente con los nuevos datos y gráficas.
```

---

### Flujo 3: Vinculación Atleta - Entrenador o Nutricionista
```
1. El Atleta entra a /profile, copia el ID de su entrenador (ej. "usr_01JABC...") y presiona "Vincular Coach".
2. Se ejecuta la Server Action linkProfessional() en src/actions/profile.ts.
3. La acción busca al profesional usando UserDAO.findByPublicId("usr_01JABC...").
4. Valida que el usuario realmente tenga el rol "COACH" (evita que un atleta vincule a otro atleta como coach).
5. UserDAO.linkProfessional() actualiza el campo coachId en el documento del atleta.
6. logSecurityAction() guarda en audit_logs la constancia de vinculación.
7. A partir de este momento, cuando el Coach entra a su portal (/coach), la consulta en MongoDB incluye a este nuevo atleta en su roster.
```

---

### Flujo 4: Nutricionista Evalúa al Atleta y Prescribe Dieta
```
1. El Nutricionista entra a /nutritionist/[clientId] para ver la ficha del atleta vinculado.
2. El servidor carga las sesiones de los últimos 30 días del atleta desde WorkoutDAO.
3. Se invoca analyzeTrainingLoad(sessions) de src/lib/domain/trainingLoad.ts:
   - Determina si el atleta está en fatiga HEAVY, MODERATE o LIGHT.
   - Sugiere un ajuste adaptativo de carbohidratos y calorías.
4. Se calcula el BMR del atleta con Mifflin-St Jeor en metabolic.ts según su peso actual en ProfileDAO.
5. El nutricionista ajusta las calorías y macros y guarda el plan.
6. NutritionDAO guarda el protocolo activo en nutrition_plans.
7. Cuando el atleta abre su /dashboard o /nutrition, ve los nuevos objetivos y sus MacroRings sincronizados.
```

---

### Flujo 5: Administrador Modifica Roles y Audita el Sistema
```
1. El Administrador ingresa a /admin (si un atleta intentara entrar aquí, src/proxy.ts lo botaría al dashboard).
2. En la tabla de usuarios, selecciona a un usuario y le cambia el rol a "COACH".
3. Se dispara la Server Action updateUserRole() en src/actions/admin.ts.
4. La acción comprueba que session.role === "ADMIN".
5. UserDAO.updateRole() ejecuta un $set: { role: "COACH" } en MongoDB.
6. Inmediatamente se llama a logSecurityAction() y AuditDAO registra quién hizo el cambio, sobre qué usuario y la fecha exacta.
7. En el siguiente inicio de sesión, el usuario promovido tendrá acceso al portal /coach.
```

---

## 13. Torreta de Defensa: ¿Qué archivo abrir si el profesor te pide...?

Ten esta lista a la mano durante tu presentación para saber exactamente a dónde ir sin titubear:

| Si el profesor te dice... | Abre este archivo | Qué mostrar y decir |
| :--- | :--- | :--- |
| **"Muéstrame la fórmula de 1RM"** | [`src/lib/domain/biomechanics.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/domain/biomechanics.ts) | Muestra la función `calculateEpley1RM`. Explica que usa la ecuación de Epley y que es una función pura sin dependencias de base de datos (SRP). |
| **"¿Dónde evitas que entren a rutas que no les corresponden?"** | [`src/proxy.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/proxy.ts) | Muestra las validaciones `pathname.startsWith("/coach")` y `pathname.startsWith("/admin")`. Explica que es el Edge Proxy oficial de Next.js 16. |
| **"¿Dónde está el patrón DAO?"** | [`src/lib/dao/base.dao.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/dao/base.dao.ts) y [`user.dao.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/dao/user.dao.ts) | Muestra cómo `BaseDAO<T>` maneja la conexión Singleton y cómo `UserDAO` hereda de ella para encapsular las consultas BSON de MongoDB. |
| **"¿Cómo encriptan las contraseñas?"** | [`src/app/api/auth/login/route.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/app/api/auth/login/route.ts) | Muestra la importación `argon2` y la llamada `argon2.verify()`. Explica por qué Argon2id es superior a Bcrypt y SHA-256. |
| **"¿Cómo mitigan ataques de fuerza bruta o timing attacks?"** | [`src/app/api/auth/login/route.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/app/api/auth/login/route.ts) | Muestra el bloque `await new Promise(r => setTimeout(r, 300))` cuando un email no existe para igualar los tiempos de respuesta. |
| **"¿Cómo viaja la sesión y el token?"** | [`src/lib/auth/session.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/auth/session.ts) | Muestra cómo se usa `crypto.subtle` (Web Crypto nativo) para firmar HMAC-SHA256 y cómo se guarda en la cookie `ht_session` con `httpOnly: true`. |
| **"¿Dónde calculan la dieta o el metabolismo?"** | [`src/lib/domain/metabolic.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/domain/metabolic.ts) | Muestra la ecuación de Mifflin-St Jeor diferenciada por sexo para BMR, el factor de actividad para TDEE y el reparto de macronutrientes. |
| **"¿Dónde se comunican el Coach y el Nutricionista?"** | [`src/lib/domain/trainingLoad.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/domain/trainingLoad.ts) | Muestra `analyzeTrainingLoad`. Explica cómo las sesiones que planifica el coach son analizadas para recomendarle al nutricionista ajustes calóricos y de hidratación. |
| **"¿Dónde están las pruebas automatizadas?"** | Terminal: `npm test` o archivos en [`src/__tests__/`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/__tests__/) | Ejecuta `npm test` en vivo. Mostrará 5 suites y 22 pruebas aprobadas en menos de 1 segundo. |
| **"¿Dónde validan los datos que envía el usuario?"** | [`src/lib/schemas/workout.schema.ts`](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/src/lib/schemas/workout.schema.ts) | Muestra los esquemas Zod con validaciones de tipos, mínimos, máximos y mensajes de error. |

