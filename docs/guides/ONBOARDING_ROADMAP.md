# HyperTrack OS: Guia de Arquitectura y Manual de Integracion Tecnica

El presente documento constituye la guia tecnica de induccion para ingenieros de software e integrantes del equipo de desarrollo de HyperTrack. Detalla las decisiones de arquitectura, la organizacion de capas del sistema, los contratos de datos y la ubicacion en el codigo fuente de cada modulo funcional.

---

## FASE 0: Arquitectura Funcional y Perfiles de Usuario

HyperTrack es una plataforma distribuida para la gestion del rendimiento atletico y la prescripcion metabolico-nutricional, estructurada en torno a cuatro perfiles con responsabilidades y fronteras de acceso estrictamente delimitadas:

1. **Atleta (Client View):**
   - **Objetivo:** Registro continuo de telemetria deportiva y seguimiento del plan prescripto.
   - **Modulos asociados:**
     - **Metricas antropometricas y de rendimiento:** Visualizacion grafica de evolucion de peso, 1RM estimado (formula Epley), volumen de carga semanal y mapa de densidad muscular (`MuscleHeatmap`).
     - **Registro de actividad:** Ingestion transaccional de sesiones de entrenamiento (`workout_sessions`) y bitacoras de ingesta nutricional (`meal_logs`).
     - **Planes asignados:** Consulta del microciclo de entrenamiento y distribucion de macronutrientes asignados por el equipo profesional.

2. **Entrenador (Coach View):**
   - **Objetivo:** Diseno, periodizacion y monitoreo de programas de fuerza e hipertrofia.
   - **Modulos asociados:**
     - **Gestion de roster:** Listado de atletas vinculados mediante relacion formal en base de datos.
     - **Prescripcion de programas:** Constructor tecnico de bloques de entrenamiento (`/coach/programs/new` y `/coach/assign-program/[clientId]`).
     - **Telemetria de rendimiento:** Acceso en modo lectura al tonelaje acumulado de 4 semanas, RPE medio y estimaciones de fuerza maxima.

3. **Nutricionista (Nutritionist View):**
   - **Objetivo:** Balance energetico, tasa metabolica y ajuste de macronutrientes.
   - **Modulos asociados:**
     - **Auditoria nutricional:** Revision cronologica de los registros de comidas reportados por el atleta.
     - **Modelado metabolico:** Calculo automatizado de Tasa Metabolica Basal (BMR) mediante Mifflin-St Jeor, Gasto Energetico Diario Total (TDEE) y prescripcion de gramos objetivo de proteinas, carbohidratos y lipidos.

4. **Administrador (Admin View):**
   - **Objetivo:** Integridad del catalogo central y gobierno de identidades.
   - **Modulos asociados:**
     - **Catalogo maestro de ejercicios:** Administracion del diccionario normalizado (`exercise_catalog`) para prevenir duplicidades e inconsistencias en la nomenclatura anatomica.
     - **Gestion de roles:** Asignacion de privilegios `COACH`, `NUTRITIONIST` o `ADMIN` sobre cuentas registradas.

---

## FASE 1: Capa de Presentacion y Ejecucion en Servidor (React & Next.js App Router)

La arquitectura de interfaz adopta el modelo de componentes de servidor de React 19 sobre Next.js App Router.

- **Principios tecnicos fundamentales:**
  1. **Server Components vs Client Components:**
     - **Server Components (predeterminados):** Se compilan y ejecutan exclusivamente en el entorno Node.js del servidor. No transmiten dependencias JavaScript adicionales al cliente. Acceden de forma directa a la capa de persistencia y a variables de entorno confidenciales. No admiten hooks de estado del cliente (`useState`, `useEffect`) ni escuchadores de eventos del DOM.
     - **Client Components (`"use client"`):** Se pre-renderizan en servidor y se hidratan en el navegador. Se reservan para componentes que requieren interactividad dinamica, manejo de formularios, temporizadores o animaciones.
  2. **Manejo de formularios mediante React Hook Form:**
     - La captura intensiva de telemetria (series de levantamiento, ingestas alimentarias) se gestiona mediante componentes no controlados (*uncontrolled components*), evitando re-renderizados innecesarios del arbol de componentes en cada evento de entrada.
  3. **Mutaciones de datos mediante Server Actions:**
     - Las mutaciones de estado se implementan mediante funciones asincronas tipadas (`"use server"`). Estas funciones eliminan la necesidad de intermediarios REST redundantes cuando la interaccion ocurre internamente dentro de la aplicacion Next.js, ejecutando la logica directamente en el servidor con validacion de sesion y de esquema.

- **Localizacion en el codigo fuente:**
  - `src/app/`: Estructura jerarquica de rutas y paginas divididas por grupos de captura `(auth)`, `(dashboard)` y perfiles especializados (`coach`, `nutritionist`, `admin`).
  - `src/actions/`: Controladores de mutacion asincrona del servidor (`workout.ts`, `auth.ts`, `profile.ts`, `nutrition.ts`).
  - `src/components/forms/`: Formularios interactivos construidos sobre React Hook Form y vinculados a validadores Zod.

---

## FASE 2: Capa de Persistencia y Modelado de Datos (MongoDB Atlas)

HyperTrack utiliza MongoDB como base de datos orientada a documentos BSON, estructurada mediante colecciones desnormalizadas estrategicamente para optimizar lecturas de alto volumen.

- **Principios tecnicos fundamentales:**
  1. **Patron Documento Embebido vs Referencia:**
     - **Documentos embebidos:** Los elementos con ciclo de vida dependiente y alta cohesion (por ejemplo, las series ejecutadas dentro de un ejercicio en una sesion de entrenamiento) se almacenan embebidos en el documento principal, garantizando atomicidad a nivel de documento sin requerir operaciones de union (*joins*).
     - **Referencias foraneas:** Las entidades independientes con cardinalidad 1:N o N:M (usuarios, programas asignados, catalogo general de ejercicios) mantienen identificadores de referencia (`ObjectId`).
  2. **Aggregation Pipelines:**
     - Las consultas analiticas complejas (tonelaje acumulado, racha de dias consecutivos, promedios moviles de peso) se delegan al motor de agregacion de MongoDB (`$match`, `$unwind`, `$group`, `$project`), minimizando la sobrecarga computacional y la transferencia de datos hacia la memoria del servidor de aplicaciones.
  3. **Estrategia de Indexacion:**
     - Las colecciones criticas incorporan indices compuestos (por ejemplo, `{ userId: 1, date: -1 }` en `workout_sessions` y `meal_logs`) para asegurar tiempos de respuesta logaritmicos $O(\log n)$ en consultas cronologicas por atleta.

- **Localizacion en el codigo fuente:**
  - `src/lib/db.ts`: Gestor de conexion singleton reutilizable para entornos serverless, con cache de conexion para prevenir el agotamiento de sockets.
  - `src/lib/dao/`: Implementacion formal del patron Data Access Object, separando las operaciones directas sobre colecciones (`UserDAO.ts`, `WorkoutDAO.ts`, `MetricsDAO.ts`).

---

## FASE 3: Seguridad, Autenticacion y Control de Acceso (RBAC)

El control de acceso protege la integridad de los datos clinicos y deportivos mediante politicas estrictas en el borde (*edge*) y en las capas de aplicacion.

- **Principios tecnicos fundamentales:**
  1. **Derivacion de claves criptograficas (Argon2id):**
     - El almacenamiento de contraseñas se implementa con el algoritmo Argon2id, resistente a ataques de canal lateral y computacion acelerada por hardware (GPU/ASIC), superando las garantias de seguridad de implementaciones tradicionales basadas en bcrypt o PBKDF2.
  2. **Autenticacion basada en tokens JWT sobre Cookies HttpOnly:**
     - La sesion se modela mediante JSON Web Tokens (JWT) firmados con algoritmo criptografico HMAC-SHA256 (`HS256`). Los tokens se transmiten exclusivamente a traves de cabeceras `Set-Cookie` con las directivas `HttpOnly`, `Secure` (en produccion) y `SameSite=Lax`, mitigando vulnerabilidades de Cross-Site Scripting (XSS).
  3. **Middleware de Enrutamiento y Control de Acceso Basado en Roles (RBAC):**
     - El archivo `src/middleware.ts` intercepta toda solicitud HTTP entrante antes de alcanzar la capa de renderizado. Valida la firma del token de sesion y verifica que el rol del usuario (`USER`, `COACH`, `NUTRITIONIST`, `ADMIN`) cuente con autorizacion para el prefijo de ruta solicitado. Las solicitudes no autorizadas se redirigen inmediatamente a las pantallas de autenticacion correspondientes.

- **Localizacion en el codigo fuente:**
  - `src/middleware.ts`: Evaluador perimetral de rutas protegidas y politicas RBAC.
  - `src/lib/auth.ts`: Funciones de firma, decodificacion y verificacion de credenciales JWT.
  - `src/lib/password.ts`: Utilitarios de generacion de hashes y comprobacion con Argon2id.

---

## FASE 4: Validacion de Esquemas e Integridad de Datos (TypeScript & Zod)

La consistencia de los modelos de datos se garantiza mediante una arquitectura de validacion defensiva en dos niveles, utilizando esquemas Zod compartidos como fuente unica de verdad tipada.

- **Principios tecnicos fundamentales:**
  1. **Inferencia estatica de tipos:**
     - En lugar de mantener de forma duplicada interfaces de TypeScript y reglas de validacion en tiempo de ejecucion, los contratos de datos se definen exclusivamente como esquemas Zod. Los tipos del lenguaje se derivan estaticamente mediante `z.infer<typeof Schema>`, eliminando desfases entre el tipado del compilador y la validacion en ejecucion.
  2. **Validacion defensiva en dos niveles:**
     - **Nivel de cliente:** El resolvedor de esquemas (`zodResolver`) valida los datos en el navegador antes de iniciar cualquier peticion de red, informando anomalías en la interfaz de usuario en tiempo real.
     - **Nivel de servidor:** Toda accion de servidor (`Server Action`) o punto de entrada de API (`Route Handler`) ejecuta `schema.safeParse(data)` sobre la carga util entrante. Los datos no conformes son rechazados antes de alcanzar el dominio o la base de datos, garantizando que ningun dato corrupto ingrese a las colecciones de MongoDB.

- **Localizacion en el codigo fuente:**
  - `src/lib/schemas/`: Definicion de esquemas formales del sistema (`user.schema.ts`, `workout.schema.ts`, `profile.schema.ts`, `nutrition.schema.ts`).
  - `src/__tests__/schemas/`: Pruebas unitarias de integridad que verifican los criterios de aceptacion y rechazo de cada esquema.

---

## FASE 5: Sistema de Diseno e Interfaz de Usuario (Tailwind CSS v4)

La capa de interfaz de usuario se rige por un sistema de diseno determinista con enfoque utilitario, optimizado para interfaces de monitoreo de alta densidad de datos.

- **Principios tecnicos fundamentales:**
  1. **Diseno utilitario y encapsulamiento de estilos:**
     - La construccion visual emplea utilidades atomicas de Tailwind CSS v4, compiladas estaticamente para mantener una huella de transferencia minima y predecible.
  2. **Composicion dinamica de clases:**
     - La combinacion condicional de clases CSS se centraliza en la funcion utilitaria `cn()`, integrando `clsx` y `tailwind-merge` para evitar conflictos en la cascada de estilos al alternar estados de componentes.
  3. **Biblioteca de componentes reutilizables con CVA:**
     - Los elementos base de interfaz (botones, tarjetas, campos de entrada, insignias de estado) se encapsulan utilizando *Class Variance Authority* (`cva`), garantizando coherencia visual en tipografia, espaciado y niveles de contraste en toda la aplicacion.

- **Localizacion en el codigo fuente:**
  - `src/app/globals.css`: Definicion de tokens de diseno, paleta de colores del sistema y variables base mediante la directiva `@theme inline` de Tailwind v4.
  - `src/lib/utils.ts`: Funcion de composicion `cn()`.
  - `src/components/ui/`: Biblioteca de componentes primitivos (`button.tsx`, `card.tsx`, `input.tsx`, `badge.tsx`).
