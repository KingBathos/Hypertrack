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
│   └── proxy.ts
├── .env.local                             # Variables de Entorno y Configuración (DB/Secretos)
├── next.config.ts                         # Configuración principal de Next.js
├── package.json                           # Manifiesto de Dependencias Node
└── tsconfig.json                          # Configuración estricta de TypeScript
```
// Problema dashboard ususario,
Problema actual, en el dashboard principal tenemos un modulo de entrenamiento esta confuso, deberia de 