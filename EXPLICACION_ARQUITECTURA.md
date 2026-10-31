# Arquitectura Técnica y Flujo de Ejecución — HyperTrack

Este documento describe la arquitectura de software, los patrones de diseño y el ciclo de vida de ejecución técnica de **HyperTrack** sobre el stack **Next.js 16 (App Router)**, **React 19**, **TypeScript 5** y **MongoDB 7.4 (Driver Nativo)**.

---

## 1. El Ciclo de Vida de una Petición (Request Lifecycle)

El siguiente diagrama detalla la ruta exacta que sigue una petición desde la interacción del usuario en el navegador hasta la persistencia en base de datos y la actualización de la interfaz:

```
[ Navegador del Usuario ]
  │  1. Evento de UI (Click en botón, envío de formulario o navegación por URL)
  ▼
[ Next.js 16 Edge Proxy (src/proxy.ts) ]
  │  2. Intercepción perimetral HTTP antes de renderizar o ejecutar código
  │     • Extrae la cookie "ht_session"
  │     • Verifica firma criptográfica HMAC-SHA256 con Web Crypto API nativa
  │     • Valida tiempo de expiración (exp)
  │     • Evalúa política RBAC: pathname vs session.role
  │       ├─ Inválido / Sin sesión ──► NextResponse.redirect("/login?from=...")
  │       ├─ Rol no autorizado     ──► NextResponse.redirect("/dashboard")
  │       └─ Autorizado            ──► NextResponse.next()
  ▼
[ Capa de Controladores (src/actions/*.ts  ó  src/app/api/**/route.ts) ]
  │  3. Recepción de la petición en el entorno de servidor (Node.js Runtime)
  │     • Re-verificación de sesión con getSession() (Defensa en profundidad)
  │     • Validación de esquema de entrada con Zod (parse / safeParse)
  │       └─ Datos corruptos o inyección ──► Lanza Error / HTTP 400
  ▼
[ Capa de Dominio Puro (src/lib/domain/*.ts) ]
  │  4. Ejecución de lógica matemática de negocio (Funciones puras sin I/O ni BD)
  │     • biomechanics.ts  ──► Epley 1RM, tonelaje de volumen, zonas RPE
  │     • metabolic.ts     ──► Ecuación Mifflin-St Jeor (BMR), TDEE, macronutrientes
  │     • biometrics.ts    ──► Ratio WHR, riesgo cardiovascular OMS
  │     • trainingLoad.ts  ──► Análisis de carga de 30 días (HEAVY/MODERATE/LIGHT)
  ▼
[ Capa de Acceso a Datos DAO (src/lib/dao/*.dao.ts) ]
  │  5. Abstracción y persistencia orientada a objetos
  │     • Hereda de BaseDAO<T> (conexión Singleton a MongoClient)
  │     • Conversión y sanitización BSON: toObjectId(id), isValidObjectId(id)
  │     • Construcción y ejecución de consultas tipadas ($set, $max, pipelines de agregación)
  ▼
[ Motor de Base de Datos (MongoDB 7.4) ]
  │  6. Persistencia física en colecciones tipadas (users, workout_sessions, nutrition_plans, etc.)
  ▼
[ Retorno y Revalidación de Caché ]
     7. revalidatePath() invalida la caché de Server Components en Next.js
     8. Se retorna un DTO tipado al cliente para actualizar el estado de React 19
```

---

### Guion de Exposición Técnica: Cómo Explicar este Flujo ante el Jurado

> **Instrucciones para la presentación:** Utiliza este guion paso a paso mientras proyectas el diagrama o señalas el archivo `Ciclo_Vida_Peticion.puml`. La explicación sigue un orden secuencial riguroso que demuestra dominio de arquitectura, seguridad y persistencia.

#### 1. Frase de Apertura (Marco General)
> *"Profesor / Jurado, este diagrama representa el ciclo de vida completo de una petición en HyperTrack. Muestra cómo desacoplamos la aplicación en capas independientes de alta cohesión y bajo acoplamiento: desde la interacción del usuario en el navegador hasta la persistencia física en MongoDB, pasando por un filtro perimetral en el Edge, controladores seguros, lógica matemática pura y una capa DAO."*

---

#### 2. Paso a Paso Técnico (Lo que debes decir señalando cada bloque)

* **Paso 1: Capa Cliente (Navegador / React 19)**
  > *"Todo inicia en el cliente. Cuando el usuario interactúa con la vista —por ejemplo, un atleta que hace clic en 'Finalizar Entrenamiento' tras registrar sus series—, el evento es capturado por un formulario gestionado con **React Hook Form**. En este punto se aplica una primera validación con **Zod** para dar retroalimentación visual inmediata. Al enviarse, Next.js despacha una petición asíncrona RPC o HTTP hacia el servidor."*

* **Paso 2: Perímetro de Seguridad (Edge Proxy en `src/proxy.ts`)**
  > *"Antes de que la petición toque el servidor central de Node.js o intente renderizar cualquier vista, es interceptada en el **Edge Runtime** por nuestro proxy perimetral (`src/proxy.ts`). Aquí se lee la cabecera `Cookie` buscando `ht_session`. Utilizando la API nativa **Web Crypto** (`crypto.subtle`), se verifica matemáticamente la firma HMAC-SHA256 del JWT y se evalúa la política **RBAC**:
  > - Si no hay token o la firma es inválida, se aborta el ciclo y se emite una redirección inmediata `307` al `/login`.
  > - Si un atleta intenta acceder a una ruta protegida de `/coach` o `/admin`, el proxy lo expulsa hacia el `/dashboard`.
  > - Si las credenciales y el rol son válidos, se ejecuta `NextResponse.next()`, cediendo el paso al servidor. Esto ahorra procesamiento de CPU y conexiones de base de datos."*

* **Paso 3: Capa de Controladores (Server Actions en `src/actions/*.ts`)**
  > *"Superado el perímetro, la petición entra al entorno de servidor y es atendida por una **Server Action**, como `logWorkoutSession` en `src/actions/workout.ts`. Aplicando el principio de **defensa en profundidad**, la acción vuelve a verificar la sesión con `getSession()`. Acto seguido, los datos entrantes son validados estrictamente con el esquema Zod del servidor (`workoutSessionSchema`). Si el payload contiene tipos incorrectos, valores negativos o estructuras anómalas, se rechaza la petición inmediatamente antes de interactuar con la lógica interna."*

* **Paso 4: Dominio Puro y Principio de Responsabilidad Única (SRP en `src/lib/domain/*.ts`)**
  > *"Con los datos saneados, el controlador no realiza cálculos matemáticos por su cuenta ni consulta la base de datos; delega al **Dominio Puro**. En `src/lib/domain/biomechanics.ts`, la función pura `calculateEpley1RM` estima la repetición máxima a partir del peso y repeticiones, y `calculateVolumeLoad` calcula el tonelaje acumulado de la sesión. Al ser funciones puras sin I/O, sin dependencias de red ni de base de datos, garantizamos que las reglas de negocio estén aisladas y cubiertas al 100% por nuestra suite de pruebas unitarias en Vitest."*

* **Paso 5: Capa de Acceso a Datos (Patrón DAO en `src/lib/dao/*.dao.ts`)**
  > *"Una vez computadas las métricas, el controlador invoca a la **Capa DAO**, específicamente a `WorkoutDAO`. Toda la jerarquía DAO hereda de `BaseDAO<T>`, la cual centraliza el Singleton de conexión a MongoDB. Antes de cualquier consulta, el método `toObjectId()` sanitiza los identificadores para evitar caídas por BSON inválido. Luego, el DAO estructura las operaciones de persistencia mediante operadores nativos atómicos, como `$max` para actualizar récords personales (PRs) solo si la nueva marca supera el registro histórico."*

* **Paso 6: Motor de Base de Datos (MongoDB 7.4 Driver Nativo)**
  > *"El driver oficial ejecuta la operación en el motor de base de datos MongoDB. La colección aplica a nivel de base de datos las reglas físicas de validación **`$jsonSchema`**. El documento de la sesión se guarda en `workout_sessions`, el récord personal se actualiza atómicamente en `personal_records` y, en paralelo, `AuditDAO` inserta un registro inmutable en `audit_logs` para garantizar la trazabilidad forense de la acción."*

* **Paso 7: Revalidación de Caché y Retorno a la Vista**
  > *"Finalizada la escritura, el controlador ejecuta `revalidatePath('/dashboard')`. Esto purga la caché de Server Components de Next.js, forzando la sincronización de las métricas. La Server Action retorna un DTO tipado al cliente con el ID de la sesión generada. En el navegador, **React 19** actualiza el estado local y los componentes de telemetría basados en **Recharts** (como el gráfico de volumen acumulado y los anillos de macronutrientes) se vuelven a renderizar con los datos persistidos."*

---

#### 3. Frase de Conclusión de Impacto
> *"En resumen: la arquitectura garantiza que un atacante sea bloqueado en el Edge en menos de 5 milisegundos, que los datos corruptos mueran en Zod antes de persistirse, que las fórmulas de rendimiento se ejecuten en funciones matemáticas puras testeadas y que el motor de base de datos esté totalmente desacoplado tras una capa DAO tipada."*


---

## 2. Implementación del Patrón MVC en Next.js 16

El proyecto desacopla las responsabilidades del sistema en tres capas estrictas sin mezclar persistencia en la vista:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ARQUITECTURA MVC REAL                            │
├───────────────┬──────────────────────────────────┬──────────────────────────┤
│ Capa          │ Ubicación en el Código           │ Responsabilidad Técnica  │
├───────────────┼──────────────────────────────────┼──────────────────────────┤
│ VISTA         │ • src/app/**/page.tsx            │ Renderizado en servidor  │
│ (View)        │ • src/components/**/*.tsx        │ (RSC) y componentes de   │
│               │                                  │ cliente (RCC). Gráficas  │
│               │                                  │ Recharts, telemetría SVG.│
├───────────────┼──────────────────────────────────┼──────────────────────────┤
│ CONTROLADOR   │ • src/proxy.ts                   │ Control de acceso        │
│ (Controller)  │ • src/actions/*.ts               │ perimetral (Edge).       │
│               │ • src/app/api/**/route.ts        │ Orquestación de casos de │
│               │                                  │ uso mediante RPC/HTTP.   │
├───────────────┼──────────────────────────────────┼──────────────────────────┤
│ MODELO        │ • src/lib/schemas/*.schema.ts    │ Validación de datos,     │
│ (Model)       │ • src/lib/domain/*.ts            │ algoritmos de dominio,   │
│               │ • src/lib/dao/*.dao.ts           │ persistencia BSON y      │
│               │ • src/types/*.ts                 │ tipado TypeScript.       │
└───────────────┴──────────────────────────────────┴──────────────────────────┘
```

### 1. Vista (View)
- Implementada con **React Server Components (RSC)** por defecto para reducir el bundle de JavaScript que se envía al navegador y optimizar el FCP (First Contentful Paint).
- Los componentes interactivos (cronómetro en vivo, selectores dinámicos, formularios) usan la directiva `"use client"` y gestionan el estado local antes de delegar las mutaciones a las Server Actions.
- Visualización de telemetría mediante **Recharts** (`VolumeChart.tsx`, `WeightChart.tsx`, `CaloriesChart.tsx`) y componentes vectoriales SVG para anillos de macronutrientes (`MacroRings.tsx`) y radar de fatiga muscular (`StatRadar.tsx`).

### 2. Controlador (Controller)
- **`src/proxy.ts` (Proxy perimetral):** Ejecutado en Edge Runtime antes de resolver cualquier ruta. Realiza la inspección de cabeceras, valida la firma del JWT y aplica las restricciones del sistema RBAC.
- **Server Actions (`src/actions/*.ts`):** Métodos asíncronos marcados con `"use server"`. Reciben peticiones RPC desde los componentes de cliente, ejecutan la autorización de la sesión, validan esquemas con Zod, delegan los cálculos al dominio puro y orquestan las operaciones sobre los DAOs.
- **API Route Handlers (`src/app/api/**/route.ts`):** Endpoints REST para autenticación (`/api/auth/login`, `/api/auth/register`) y consumo de agregaciones analíticas serializadas.

### 3. Modelo (Model)
- **Dominio (`src/lib/domain/`):** Algoritmos de cálculo puro sin efectos secundarios.
- **Validación (`src/lib/schemas/`):** Contratos de datos tipados mediante esquemas Zod.
- **Persistencia (`src/lib/dao/`):** Clases DAO que encapsulan el driver nativo de MongoDB.
- **Definiciones de Tipo (`src/types/`):** Interfaces estructurales del modelo de dominio.

---

## 3. Capa de Acceso a Datos: Patrón DAO (Data Access Object)

### Justificación Técnica
La capa DAO aísla por completo el código de los controladores de la sintaxis y especificidades del driver de MongoDB. Esto previene la dispersión de llamadas `db.collection(...)`, centraliza el manejo de tipos BSON y permite modificar la base de datos o introducir dobles de prueba (mocks) sin tocar la lógica de negocio.

```
                      ┌─────────────────────────┐
                      │       BaseDAO<T>        │ (Clase Abstracta)
                      │  src/lib/dao/base.dao   │
                      └────────────┬────────────┘
                                   │  extends
         ┌────────────────┬────────┴────────┬────────────────┬──────────────┐
         ▼                ▼                 ▼                ▼              ▼
   ┌───────────┐    ┌───────────┐     ┌────────────┐   ┌───────────┐  ┌───────────┐
   │  UserDAO  │    │WorkoutDAO │     │NutritionDAO│   │ProfileDAO │  │ AuditDAO  │
   └───────────┘    └───────────┘     └────────────┘   └───────────┘  └───────────┘
```

### Estructura de `BaseDAO<T>`
- **Conexión Singleton:** Administra una única instancia de `Db` a través de `getDb()`, evitando la degradación del pool de conexiones.
- **Manejo Seguro de Identificadores BSON:**
  - `toObjectId(id: string | ObjectId): ObjectId | null`: Convierte strings hexadecimales de 24 caracteres en `ObjectId`. Si el formato es inválido o nulo, retorna `null` de forma controlada en lugar de propagar una excepción no controlada (`BSONError`).
  - `isValidObjectId(id: string): boolean`: Valida la estructura mediante regex y tamaño antes de interactuar con el motor.

### Responsabilidad de los DAOs Especializados
- **`UserDAO`:** Búsqueda por email normalizado (`$toLower`), búsqueda por `publicId` (ULID), actualización atómica de roles (`updateRole`), vinculación y desvinculación de profesionales (`linkProfessional`, `unlinkProfessional`), incremento y reseteo de contador de intentos fallidos (`failedAttempts`).
- **`WorkoutDAO`:** Gestión transaccional de programas de entrenamiento (`training_programs`, `program_versions`, `program_assignments`), inserción de sesiones en vivo (`workout_sessions`), actualización de récords personales mediante operaciones atómicas `$max` (`upsertPR`) y lectura de catálogos (`exercise_library`).
- **`NutritionDAO`:** Consulta de protocolos dietéticos activos e históricos (`nutrition_plans`) y persistencia de ingestas diarias (`meal_logs`).
- **`ProfileDAO`:** Creación y actualización de perfiles antropométricos (`profiles`) e inserción de series temporales de mediciones corporales (`body_measurements`).
- **`AuditDAO`:** Inserción inmutable de eventos de auditoría y seguridad (`audit_logs`).

---

## 4. Principios SOLID en la Arquitectura

### S — Single Responsibility Principle (Responsabilidad Única)
- **Separación estricta entre Controlador, Dominio y Persistencia:**
  - El controlador (`src/actions/workout.ts`) no ejecuta fórmulas matemáticas ni genera queries de MongoDB; se limita a coordinar la petición.
  - La lógica matemática (`src/lib/domain/biomechanics.ts`) no conoce la existencia de HTTP, cookies ni bases de datos. Es una función pura `(weight, reps) => 1RM`.
  - La persistencia (`src/lib/dao/workout.dao.ts`) solo ejecuta operaciones sobre colecciones de MongoDB.

### O — Open / Closed Principle (Abierto / Cerrado)
- La clase `BaseDAO<T>` define el comportamiento genérico de persistencia. Para integrar una nueva entidad (por ejemplo, fisioterapia o suplementación), se extiende `BaseDAO` creando un nuevo DAO especializado sin alterar el código existente en la clase base.

### L — Liskov Substitution Principle (Sustitución de Liskov)
- Todas las clases derivadas de `BaseDAO<T>` respetan el contrato de tipos de la clase abstracta. Los métodos base que operan sobre `ObjectId` y colecciones funcionan de forma idéntica en cualquier DAO derivado.

### I — Interface Segregation Principle (Segregación de Interfaces)
- El sistema no expone un modelo monolítico compartido. En `src/types/` las interfaces están particionadas en contratos específicos de entidad y DTOs de operación:
  - `UserDocument`, `AuthSession` en `user.ts`.
  - `WorkoutSession`, `Exercise`, `PersonalRecord` en `workout.ts`.
  - `NutritionPlan`, `MealLog` en `nutrition.ts`.
  - `ProfileDocument`, `BodyMeasurement` en `profile.ts`.

### D — Dependency Inversion Principle (Inversión de Dependencias)
- Los controladores de alto nivel (`src/actions/*`) interactúan con abstracciones estáticas provistas por la capa DAO en lugar de depender directamente del cliente de bajo nivel `MongoClient` o de llamadas dispersas a la base de datos.

---

## 5. Arquitectura de Seguridad y Control de Acceso

```
[ Cliente ]
    │
    ▼
[ 1. Zod Client Validation ] ──► Previene envío de datos inválidos desde React Hook Form
    │
    ▼
[ 2. Edge Proxy (src/proxy.ts) ] ──► Verificación perimetral de JWT y rol (RBAC)
    │
    ▼
[ 3. Anti-Timing Delay ] ──► Retardo de 300 ms en intentos de login inexistentes
    │
    ▼
[ 4. Argon2id Hash Verification ] ──► Algoritmo criptográfico memory-hard
    │
    ▼
[ 5. Web Crypto JWT Signing ] ──► Firma HMAC-SHA256 nativa de Node/Edge
    │
    ▼
[ 6. HttpOnly Cookie Storage ] ──► ht_session inaccesible desde scripts del navegador (Anti-XSS)
    │
    ▼
[ 7. AuditDAO Forensic Logging ] ──► Registro inmutable de operaciones críticas en audit_logs
```

### 1. Hashing de Contraseñas con Argon2id
- **Algoritmo:** `Argon2id` (híbrido entre Argon2d y Argon2i).
- **Ventaja técnica frente a Bcrypt y SHA:** Es resistente a ataques de canal lateral (side-channel) y mitiga ataques por fuerza bruta basados en hardware masivo (ASICs y GPUs) mediante la parametrización de costo de memoria RAM y tiempo de CPU.

### 2. Gestión de Sesión Stateless y Criptografía Web
- **Generación de JWT:** Construido con la API estándar **Web Crypto** (`crypto.subtle`), utilizando **HMAC-SHA256 (HS256)**.
- **Sin dependencias externas:** Al usar la API nativa del motor V8, es totalmente compatible con el **Edge Runtime** de Next.js sin requerir módulos pesados de Node.js.
- **Atributos de la Cookie `ht_session`:**
  - `httpOnly: true`: Bloquea el acceso a la cookie mediante `document.cookie`, mitigando el robo de sesión por ataques XSS.
  - `sameSite: "lax"`: Previene el envío involuntario de la cookie en peticiones cruzadas, mitigando ataques CSRF.
  - `secure: true` (en producción): Restringe la transmisión exclusivamente a canales HTTPS.
  - `maxAge: 7 días`: Expiración absoluta controlada por cabecera `Set-Cookie`.

### 3. Control de Acceso Basado en Roles (RBAC)
Las reglas de acceso están centralizadas en `src/proxy.ts` antes del renderizado de componentes:

| Ruta | Roles Permitidos | Acción si no Autorizado |
| :--- | :--- | :--- |
| `/dashboard`, `/workout/*`, `/nutrition/*`, `/profile` | `USER`, `COACH`, `NUTRITIONIST`, `ADMIN` | Redirección a `/login?from=[ruta]` |
| `/coach/*` | `COACH`, `ADMIN` | Redirección forzada a `/dashboard` |
| `/admin/*` | `ADMIN` | Redirección forzada a `/dashboard` |
| `/login`, `/register`, `/pro/*` | Público (sin sesión) | Si ya tiene sesión, redirige al panel |

### 4. Mitigación de Ataques de Temporización (Anti-Timing Attacks)
En el endpoint `/api/auth/login`, cuando un atacante envía un correo que no existe en la colección `users`, el sistema ejecuta un retardo artificial de `300 ms` antes de retornar el error genérico `INVALID_CREDENTIALS`. Esto homogeniza los tiempos de respuesta del servidor frente a intentos válidos e inválidos, impidiendo que el atacante deduzca qué usuarios existen analizando la latencia de red.

---

## 6. Metodología TDD y Pruebas Automatizadas (Vitest)

Las pruebas están estructuradas bajo la metodología **TDD (Test-Driven Development)** utilizando **Vitest 5**. Todas las suites corresponden a pruebas unitarias puras: validan reglas de negocio deterministas sin realizar I/O de red ni conectarse a MongoDB.

```bash
npm test
```

```
 ✓ src/__tests__/domain/biomechanics.test.ts (5 tests)
 ✓ src/__tests__/domain/trainingLoad.test.ts (3 tests)
 ✓ src/__tests__/domain/biometrics.test.ts (4 tests)
 ✓ src/__tests__/domain/metabolic.test.ts (5 tests)
 ✓ src/__tests__/schemas/user.schema.test.ts (5 tests)

 Test Files  5 passed (5)
      Tests  22 passed (22)
   Duration  755ms
```

### Cobertura de las 5 Suites
1. **`biomechanics.test.ts` (5 pruebas):**
   - Validación del 1RM de Epley: para 1 repetición estricta (`weight * (1 + 1/30) = weight`), para series múltiples y control de bordes (peso $\le 0$ o repeticiones $\le 0$ retornan 0).
   - Acumulación de volumen total de carga ($\sum \text{series} \times \text{reps} \times \text{peso}$).
   - Clasificación de zonas de esfuerzo RPE.
2. **`biometrics.test.ts` (4 pruebas):**
   - Precisión matemática del ratio cintura-cadera ($\text{WHR} = \text{cintura} / \text{cadera}$).
   - Control de excepciones con dimensiones negativas o nulas.
   - Clasificación de umbrales de riesgo cardiovascular de la OMS para hombres ($>0.90$) y mujeres ($>0.85$).
3. **`metabolic.test.ts` (5 pruebas):**
   - Ecuación clínica de Mifflin-St Jeor diferenciada por sexo para BMR.
   - Multiplicadores de actividad física sobre el BMR para el cálculo de TDEE.
   - Distribución calórica y gramaje de macronutrientes (proteínas, carbohidratos, grasas).
4. **`trainingLoad.test.ts` (3 pruebas):**
   - Clasificación de sobrecarga en 30 días (`HEAVY`, `MODERATE`, `LIGHT`).
   - Comportamiento ante historiales vacíos (valores seguros por defecto).
   - Formulación de recomendaciones nutricionales adaptativas según el volumen detectado.
5. **`user.schema.test.ts` (5 pruebas):**
   - Validación de esquema Zod para credenciales: longitud mínima de 8 caracteres, exigencia de mayúscula, exigencia de número, rechazo de correos inválidos y verificación de coincidencia de contraseña.

---

## 7. Modelo de Datos y Colecciones en MongoDB

La persistencia se organiza en un esquema relacional-documental optimizado para lecturas rápidas y registros históricos:

```
┌─────────────────┐       1:1       ┌──────────────────┐
│     PROFILES    ├─────────────────┤      USERS       │
└─────────────────┘                 └───┬────────────┬─┘
                                        │            │
                         1:N ┌──────────┘            └──────────┐ 1:N
                             ▼                                  ▼
                   ┌──────────────────┐               ┌──────────────────┐
                   │ WORKOUT_SESSIONS │               │    MEAL_LOGS     │
                   └─────────┬────────┘               └──────────────────┘
                             │
                             ▼ 1:N
                   ┌──────────────────┐
                   │ PERSONAL_RECORDS │
                   └──────────────────┘
```

| Colección | Rol y Propósito | Índices / Claves Principales |
| :--- | :--- | :--- |
| **`users`** | Identidad, autenticación, roles RBAC y punteros de vinculación (`coachId`, `nutritionistId`). | `_id`, `publicId` (único), `email` (único, normalizado) |
| **`profiles`** | Datos antropométricos base, metas deportivas y demografía del atleta. | `_id`, `publicId`, `userId` |
| **`body_measurements`** | Historial de mediciones corporales periódicas (peso, cintura, cadera). | `userId`, `date` |
| **`exercise_library`** | Catálogo de ejercicios clasificados por patrón de movimiento y grupo muscular. | `_id`, `publicId`, `category` |
| **`training_programs`** | Definición de programas maestros diseñados por entrenadores. | `_id`, `publicId`, `authorId` |
| **`program_versions`** | Versiones inmutables de los programas para garantizar trazabilidad. | `programId`, `version` |
| **`program_assignments`** | Asignación activa e histórica de un programa a un atleta específico. | `clientId`, `programVersionId`, `status` |
| **`workout_sessions`** | Bitácora de entrenamientos ejecutados con detalle de series, cargas y RPE. | `userId`, `startedAt`, `publicId` |
| **`personal_records`** | Récords máximos históricos (1RM y peso) por ejercicio y por atleta. | `userId`, `exerciseId` (índice compuesto) |
| **`nutrition_plans`** | Protocolos nutricionales asignados por el nutricionista con metas calóricas y macros. | `athleteId`, `nutritionistId`, `status` |
| **`meal_logs`** | Registro diario de ingesta de alimentos desagregado por tipo de comida. | `userId`, `loggedAt` |
| **`audit_logs`** | Bitácora forense de auditoría de seguridad del sistema. | `actorId`, `action`, `timestamp` |
