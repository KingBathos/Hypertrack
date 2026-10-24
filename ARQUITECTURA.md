# Manual Técnico y de Arquitectura del Sistema - HyperTrack

## 1. Visión General de la Arquitectura
HyperTrack es una plataforma web moderna construida bajo el paradigma de renderizado mixto (Server-Side Rendering y Client-Side Rendering) utilizando el **App Router** de Next.js. La arquitectura sigue un modelo de monolito modular, donde tanto el frontend interactivo como las rutas de la API backend residen en el mismo repositorio, facilitando el desarrollo Full-Stack. 

El sistema utiliza una base de datos NoSQL (MongoDB) directamente conectada mediante el driver oficial de Node.js, apoyándose en validaciones estrictas en tiempo de ejecución a través de **Zod** para garantizar la integridad de los datos antes de persistirlos.

## 2. Stack Tecnológico
La plataforma hace uso de tecnologías de vanguardia. A continuación, se detallan las dependencias core y sus versiones exactas extraídas del `package.json`:

| Tecnología | Rol en el Sistema | Versión Exacta |
| --- | --- | --- |
| **Next.js** | Framework Full-Stack (App Router) | `16.2.10` |
| **React** | Librería de UI | `19.2.4` |
| **MongoDB** | Base de Datos NoSQL y Driver | `^7.4.0` |
| **Zod** | Validación de esquemas y tipos estandarizados | `^4.4.3` |
| **TailwindCSS** | Motor de estilos y utilidades CSS | `^4` (vía PostCSS) |
| **Recharts** | Biblioteca de visualización de datos / BI | `^3.9.2` |
| **Argon2 / Bcryptjs** | Algoritmos de Hash para contraseñas | `^0.44.0` / `^3.0.3` |
| **ULID** | Generador de identificadores únicos universales | `^3.0.2` |
| **React Hook Form** | Manejo del estado y validación de formularios | `^7.81.0` |
| **TypeScript** | Lenguaje y tipado estático | `^5` |

## 3. Seguridad y Autenticación
La arquitectura de seguridad de HyperTrack implementa un sistema JWT nativo apoyado en la Web Crypto API (`crypto.subtle`), evitando dependencias externas de terceros y asegurando compatibilidad con Edge Runtime.

**Flujo de Autenticación (Cookie HTTP-Only):**
1. **Firma:** Al autenticarse, el servidor genera un payload con la estructura `SessionPayload` (incluyendo el `sub` o `publicId`, `iat`, y `exp`). Este token se cifra usando HMAC-SHA256 (HS256) con la llave maestra alojada en `AUTH_SECRET`.
2. **Distribución:** El JWT resultante se inyecta en la respuesta HTTP bajo una cookie denominada `ht_session`.
3. **Restricciones de la Cookie:** 
   - `httpOnly: true` (Inaccesible desde JavaScript en el cliente, mitigando ataques XSS).
   - `secure: true` (Solo transmitida en canales encriptados HTTPS en Producción).
   - `sameSite: "lax"` (Protección contra CSRF estándar).
   - `maxAge`: Configurada a 7 días exactos.
4. **Validación:** En cada solicitud protegida (ya sea vía Server Components, API Routes o Middleware), el sistema lee la cookie y verifica la firma y fecha de expiración manualmente para autorizar el paso.

## 4. Estructura de Base de Datos y Tipos
El diseño de la base de datos aprovecha el modelo de documentos de MongoDB (`HyperTrackb`), con validaciones de esquema fuertemente tipadas en Zod antes de la inserción. Las colecciones clave mapean a las siguientes estructuras:

### `users`
Maneja las credenciales y el acceso base.
- **Registro/Login:** Recibe el `email` (máximo 254 caracteres) y el `password` (reglas estrictas: al menos 8 caracteres, conteniendo al menos una mayúscula y un número).

### `workout_sessions`
Registra el entrenamiento con un nivel de jerarquía profundo.
- `userId` (String): Mapeado al `publicId` del usuario.
- `type` (Enum): `"FREE"` o `"PROGRAM"`.
- `name` (String): Título de la sesión (máximo 200 caracteres).
- `exercises` (Array): Matriz de objetos que incluye:
  - `exerciseName` (String): Nombre del ejercicio.
  - `sets` (Array): Detalle por set con `setNumber`, `reps`, `weight`, `unit` (`"KG"` o `"LBS"`), `restSeconds`, y opcionalmente la escala de esfuerzo percibido (`rpe` de 1 a 10).
- Timestamps de control: `startedAt` y `finishedAt`.

### `nutrition_plans` & Meal Logs (Esquema Estricto)
Maneja la progresión dietética y el registro diario.
- **Macros (`macrosSchema`):** Objeto compuesto por `protein`, `carbs`, `fats` (numéricos mínimos 0).
- **Registro de Comidas (`mealLogSchema`):** `mealType` restringido a `"Desayuno", "Almuerzo", "Cena", "Snack"`. Cada alimento requiere nombre, calorías positivas (máx 5000), y sus respectivos macros.
- **Plan Nutricional (`nutritionPlanSchema`):** `dailyCalories` (entre 1000 y 10000 kcal) acompañado de sus proporciones en `macros`.

## 5. Flujo de Datos y Business Intelligence
La plataforma extrae métricas de negocio y progresión física utilizando el poderoso motor de **Aggregation Pipeline** de MongoDB para descargar el procesamiento al motor de base de datos. 

**Gráfico de Sobrecarga Progresiva (Volumen):**
El cálculo del volumen de carga por día (peso levantado total = peso × repeticiones) sigue este flujo:
1. **`$match`**: Filtra los documentos de la colección `workout_sessions` por el `clientId` y restringe las fechas a los últimos 30 días (`startedAt`).
2. **`$unwind` múltiple**: Descompone primero el arreglo de `exercises` y luego los `sets` internos para obtener un documento por cada set realizado.
3. **`$project`**: Multiplica el `weight` por las `reps` de cada set y formatea la fecha del set truncándola a su valor diario (`%Y-%m-%d`).
4. **`$group`**: Agrupa todos los resultados por el día truncado, aplicando un acumulador `$sum` para calcular el `totalVolume` diario y el número total de sets (`totalSets`).
5. **`$sort` y `$project` final**: Ordena el resultado de manera cronológica ascendente y redondea los valores volumétricos para inyectarlos limpiamente en las gráficas de Recharts en el frontend.

## 6. Endpoints de la API
La comunicación Backend/Frontend es gestionada por manejadores de ruta del Next.js App Router (ubicados en `src/app/api`).

| Ruta HTTP | Método | Propósito / Dominio |
| --- | --- | --- |
| `/api/auth/register` | `POST` | Creación de cuenta, validación de contraseñas y alta en DB. |
| `/api/auth/login` | `POST` | Validación de credenciales y generación de la cookie `ht_session`. |
| `/api/auth/logout` | `POST` | Destrucción de la sesión en curso (invalida la cookie). |
| `/api/analytics/volume`| `GET` | Recupera y procesa el pipeline de agregación para BI y gráficas. |
| `/api/dashboard/cache` | `GET` | Recuperación optimizada de datos estadísticos para el Dashboard. |
| `/api/nutrition/log` | `POST` | Inserción de nuevas comidas (macros, calorías) al diario. |
| `/api/nutrition/plan` | `POST` | Configuración del esquema de calorías base y distribución de macros. |
| `/api/onboarding/profile`| `POST` | Finalización del perfil de usuario y setup inicial post-registro. |
| `/api/workouts/session`| `POST` | Guardado exhaustivo del registro de la sesión y todos sus sets. |

## 7. Árbol de Directorios Principal
La arquitectura del proyecto fomenta el aislamiento de la lógica de negocio y la reutilización de componentes visuales, organizados como se muestra en la estructura actual:

```text
HyperTrack/
├── Mongo/                                 # Almacenamiento local de la estructura MongoDB
│   ├── HyperTrackb.audit_logs.json
│   ├── HyperTrackb.roles.json
│   ├── HyperTrackb.users.json
│   ├── HyperTrackb.workout_sessions.json
│   └── (Otras colecciones físicas exportadas en JSON)
├── public/                                # Assets estáticos (Imágenes, íconos)
├── src/
│   ├── app/                               # App Router de Next.js
│   │   ├── api/                           # Handlers de las rutas Backend
│   │   │   ├── analytics/volume/route.ts
│   │   │   ├── auth/ (login, logout, register)
│   │   │   ├── dashboard/cache/route.ts
│   │   │   ├── nutrition/ (log, plan)
│   │   │   ├── onboarding/profile/route.ts
│   │   │   └── workouts/session/route.ts
│   │   └── (Rutas de UI Frontend)
│   ├── components/                        # Componentes UI de React reutilizables
│   ├── lib/                               # Lógica de Negocio y Utilidades Core
│   │   ├── auth/
│   │   │   └── session.ts                 # Implementación de JWT (Edge Crypto API)
│   │   ├── db/
│   │   │   └── mongodb.ts                 # Instancia y conexión al cluster Mongo
│   │   ├── schemas/                       # Validadores Zod 
│   │   │   ├── dashboard.schema.ts
│   │   │   ├── nutrition.schema.ts
│   │   │   ├── profile.schema.ts
│   │   │   ├── user.schema.ts
│   │   │   └── workout.schema.ts
│   │   └── utils/
│   ├── types/                             # Tipos e Interfaces globales de TypeScript
│   │   ├── dashboard.ts
│   │   ├── nutrition.ts
│   │   ├── profile.ts
│   │   ├── user.ts
│   │   └── workout.ts
```text
HyperTrack/
├── .env.example                               # Plantilla de variables de entorno
├── .env.local                                 # Variables de Entorno y Configuración (DB/Secretos)
├── public/                                    # Assets estáticos (Imágenes, íconos)
├── src/
│   ├── proxy.ts                               # Edge Proxy RBAC (Next.js 16 standard)
│   ├── actions/                               # Controladores / Server Actions desacopladas
│   │   ├── admin.ts
│   │   ├── nutrition.ts
│   │   ├── onboarding.ts
│   │   ├── profile.ts
│   │   └── workout.ts
│   ├── app/                                   # App Router de Next.js 16
│   │   ├── (auth)/                            # /login, /register, /register-pro
│   │   ├── (dashboard)/                       # /dashboard, /workout, /nutrition, /coach, /nutritionist, /admin
│   │   └── api/                               # Handlers de las rutas Backend REST
│   ├── components/                            # Componentes UI de React 19 reutilizables
│   ├── lib/
│   │   ├── auth/                              # Autenticación y JWT (Web Crypto API)
│   │   ├── dao/                               # Capa de Acceso a Datos (DAO Pattern)
│   │   │   ├── base.dao.ts                    # DAO base abstracto y helpers BSON
│   │   │   ├── user.dao.ts                    # Persistencia de usuarios y RBAC
│   │   │   ├── workout.dao.ts                 # Sesiones, rutinas, biblioteca de ejercicios
│   │   │   ├── nutrition.dao.ts               # Protocolos y registros de comida
│   │   │   ├── profile.dao.ts                 # Expedientes y medidas biométricas físicas
│   │   │   └── audit.dao.ts                   # Registro y consulta de auditoría forense
│   │   ├── domain/                            # Servicios puros de dominio (SOLID)
│   │   │   ├── biomechanics.ts                # Epley 1RM, volumen de carga, RPE
│   │   │   ├── metabolic.ts                   # Mifflin-St Jeor, TDEE real, macros
│   │   │   ├── biometrics.ts                  # Ratio cintura/cadera WHR, riesgo OMS
│   │   │   └── trainingLoad.ts                # Analizador de fatiga/carga y nutrición adaptativa
│   │   ├── db/
│   │   │   ├── mongodb.ts                     # Instancia singleton de conexión a MongoDB
│   │   │   └── seeder.ts                      # Sembrador de datos de prueba
│   │   └── schemas/                           # Validadores Zod en tiempo de ejecución
│   └── __tests__/                             # Suite de pruebas unitarias TDD (Vitest)
│       ├── domain/
│       │   ├── biomechanics.test.ts
│       │   ├── biometrics.test.ts
│       │   ├── metabolic.test.ts
│       │   └── trainingLoad.test.ts
│       └── schemas/
│           └── user.schema.test.ts
├── next.config.ts                             # Configuración principal de Next.js
├── package.json                               # Manifiesto de Dependencias Node
├── tsconfig.json                              # Configuración estricta de TypeScript
└── vitest.config.ts                           # Configuración del motor de pruebas Vitest
```

---

## 8. Arquitectura Limpia y Capa DAO (Data Access Object)

Para cumplir con altos estándares de mantenibilidad y desacoplar completamente la lógica de negocio de las consultas directas al driver de base de datos, HyperTrack implementa el **Patrón DAO**:

```
[ Vista / UI ] 
      │ (Invoca)
[ Server Action / Controlador ] 
      │ (Valida con Zod)
      ├──────────────────────────────┐
      │                              │
[ Servicio de Dominio Puro ]   [ Capa DAO Tipada ]
 (Cálculos matemáticos/clínicos) (BaseDAO, UserDAO, WorkoutDAO, ...)
                                     │
                               [ MongoDB Driver ]
```

### Componentes de la Capa DAO:
1. **`BaseDAO` (`src/lib/dao/base.dao.ts`):** 
   - Provee el método protegido `getCollection<T>(name)` que garantiza una conexión activa al cluster singleton.
   - Provee funciones de conversión segura `toObjectId(id)` y `isValidObjectId(id)` para prevenir inyecciones o excepciones de casteo de BSON.
2. **`UserDAO` (`src/lib/dao/user.dao.ts`):**
   - Búsqueda por correo normalizado (`email.normalized`), `publicId` o `_id`.
   - Vinculación atómica de profesionales (`coachId`, `nutritionistId`).
   - Modificación dinámica de roles RBAC (`updateRole`).
   - Manejo de seguridad en autenticación: incremento de `failedAttempts` y actualización de `lastLoginAt`.
3. **`WorkoutDAO` (`src/lib/dao/workout.dao.ts`):**
   - Consultas sobre `exercise_library`, programas de entrenamiento (`workout_programs`), asignaciones activas (`program_assignments`), sesiones completadas (`workout_sessions`) y récords personales (`personal_records`).
4. **`NutritionDAO` (`src/lib/dao/nutrition.dao.ts`):**
   - Gestión del protocolo activo, cancelación en lote (`updateMany`) de planes caducados y registro cronológico en `meal_logs`.
5. **`ProfileDAO` (`src/lib/dao/profile.dao.ts`):**
   - Inserción estricta en `body_measurements` según el validador `$jsonSchema` de MongoDB y sincronización atómica en `profiles`.
6. **`AuditDAO` (`src/lib/dao/audit.dao.ts`):**
   - Registro estructurado de eventos de seguridad y transacciones críticas en la colección `audit_logs`.

---

## 9. Servicios de Dominio Puro (SOLID - SRP)

La lógica matemática, de física mecánica y médica reside en funciones puras sin efectos secundarios en `src/lib/domain/`, satisfaciendo el Principio de Responsabilidad Única (SRP):

1. **`metabolic.ts`:**
   - Ecuación de Mifflin-St Jeor para Tasa Metabólica Basal (BMR).
   - Cálculo de Gasto Energético Total Diario (TDEE Real) indexado al factor de actividad física (PAL).
   - Generación de metas calóricas y distribución estequiométrica de macronutrientes (Proteínas, Carbohidratos, Grasas).
2. **`biomechanics.ts`:**
   - Estimación de 1RM mediante la fórmula de Epley ($1RM = w \times (1 + r/30)$).
   - Cómputo de volumen de carga total ($\sum w \times r$).
   - Evaluación del Esfuerzo Percibido (RPE) y recomendaciones de sobrecarga progresiva (`OVERLOAD` / `DELOAD`).
3. **`biometrics.ts`:**
   - Ratio Cintura/Cadera (WHR) y estratificación de riesgo cardiovascular según los estándares clínicos de la OMS.
4. **`trainingLoad.ts`:**
   - Análisis de fatiga y carga de entrenamiento en ventanas de 30 días (`analyzeTrainingLoad`).
   - Clasificación heurística de estímulo: `HEAVY` (Fuerte), `MODERATE` (Moderado), `LIGHT` (Suave / Descarga).
   - Prescripción metabólica adaptativa: sugerencia dinámica de carbohidratos (g/kg), hidratación y proteínas para el nutricionista.

---

## 10. Metodología TDD y Suite de Pruebas Unitarias (Vitest)

El sistema integra **Vitest** como motor de pruebas de ultra-baja latencia y compatibilidad nativa con TypeScript:

```bash
# Ejecutar todas las pruebas unitarias
npm test

# Modo interactivo en caliente
npm run test:watch
```

- **5 Suites de Pruebas Automatizadas:**
  1. `src/__tests__/domain/metabolic.test.ts` (5 pruebas)
  2. `src/__tests__/domain/biomechanics.test.ts` (5 pruebas)
  3. `src/__tests__/domain/biometrics.test.ts` (4 pruebas)
  4. `src/__tests__/domain/trainingLoad.test.ts` (3 pruebas)
  5. `src/__tests__/schemas/user.schema.test.ts` (5 pruebas)
- **Total:** 22 pruebas unitarias ejecutadas al 100% de éxito con 0 fallos.

---

## 11. Seguridad y Edge Runtime en Next.js 16

1. **Convención `proxy.ts` de Next.js 16:**
   - Next.js 16 deprecó `middleware.ts` en favor de `proxy.ts`. HyperTrack implementa el control de acceso perimetral directamente en `src/proxy.ts`, garantizando compatibilidad total con la última versión del framework y eliminando conflictos de runtime.
2. **Prevención de Ataques de Temporización (Anti-Timing Attacks):**
   - En el endpoint de inicio de sesión (`/api/auth/login`), ante intentos de acceso con correos no existentes, el servidor introduce un retardo artificial de 300 ms antes de responder con `INVALID_CREDENTIALS`, impidiendo a un atacante inferir si una cuenta existe midiendo los tiempos de respuesta de la red.
3. **Criptografía Robusta:**
   - Hashing con **Argon2id** (resistente a ataques acelerados por GPU/ASIC).
   - Tokens JWT firmados nativamente con la Web Crypto API (`crypto.subtle`) mediante HS256, transportados en cookies `HttpOnly`, `SameSite: Lax` y `Secure`.
 