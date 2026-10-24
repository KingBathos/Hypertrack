# 🗺️ HyperTrack OS: Onboarding & Learning Roadmap

¡Bienvenido al núcleo de HyperTrack OS! Como nuevo integrante del equipo de ingeniería, estás entrando a una plataforma Full-Stack de alto rendimiento construida sobre el ecosistema moderno de **Next.js (App Router)** y respaldada por la flexibilidad absoluta y la velocidad de **MongoDB**.

Este documento es tu plan de estudio y mapa del tesoro. Ha sido diseñado para que comprendas rápidamente nuestra arquitectura, sepas exactamente por qué tomamos ciertas decisiones técnicas y descubras dónde viven estas piezas en nuestro código. Tómatelo con calma, estudia cada fase a tu ritmo y úsalo como referencia constante.

¡Manos a la obra!

---

## 🎯 FASE 0: Visión del Producto y Perfiles de Usuario

Antes de tocar una sola línea de código, debes entender **qué** estamos construyendo y **para quién**. HyperTrack OS no es solo una app de fitness, es un sistema operativo integral que conecta a múltiples actores. Cada perfil tiene su propia vista, sus propios permisos y herramientas exclusivas:

1. **🧑‍💻 El Usuario / Atleta (Client View):**
   - **El Objetivo:** Registrar su progreso diario sin fricción y ver resultados.
   - **Funciones Principales:**
     - **Dashboard Biométrica:** Gráficas de peso, 1RM (Repetición Máxima), volumen de carga y mapa de calor muscular (`MuscleHeatmap`).
     - **Logs Diarios:** Registro rápido e interactivo de sesiones de entrenamiento (`workout_sessions`) y comidas (`meal_logs`).
     - **Recepción de Planes:** Visualización de la rutina exacta o dieta asignada por su Coach/Nutricionista.

2. **🏋️‍♂️ El Entrenador (Coach View):**
   - **El Objetivo:** Gestionar atletas a escala y prescribir hipertrofia.
   - **Funciones Principales:**
     - **Panel de Clientes:** Ver un listado de los usuarios bajo su tutela.
     - **Asignación de Programas:** Crear y enviar bloques de entrenamiento personalizados (`/coach/assign-program/[clientId]`).
     - **Telemetría:** Acceso de lectura a las métricas del atleta para detectar estancamientos y ajustar las variables del entrenamiento.

3. **🍎 El Nutricionista (Nutritionist View):**
   - **El Objetivo:** Monitorear el balance energético y distribución de macros.
   - **Funciones Principales:**
     - **Auditoría de Comidas:** Revisión de los logs nutricionales del cliente.
     - **Planes Dietéticos:** Asignación de metas de macronutrientes (Proteínas, Carbos, Grasas) semanales según la fase del atleta (Volumen/Definición).

4. **👑 El Administrador (Admin View):**
   - **El Objetivo:** Mantener la plataforma segura y estructurada.
   - **Funciones Principales:** 
     - **Gestión de Catálogos:** Mantener el diccionario maestro de ejercicios (`exercise_catalog`) para evitar basura en la base de datos (ej. que alguien cree "Press Banca" y otro "Press de Banco").
     - **Gestión de Accesos:** Promover usuarios normales a roles de `COACH` o `NUTRITIONIST`.

---
## 🟢 FASE 1: El Motor Frontend (React & Next.js App Router)

Esta es la capa donde ocurre la magia visible. HyperTrack no usa React de la forma tradicional (Single Page Application). Usamos el **App Router de Next.js**, lo que cambia las reglas del juego sobre *dónde* se ejecuta el código.

- **Conceptos a dominar a fondo:** 
  1. **Server Components vs Client Components:** 
     - **Server Components (Por defecto):** Se renderizan *exclusivamente* en el servidor. Nunca envían JavaScript al navegador. Son perfectos para consultar la base de datos (MongoDB) directamente, ya que tienen acceso a secretos y son increíblemente rápidos. **Regla de oro:** No pueden usar `useState`, `useEffect` ni eventos del DOM (`onClick`, `onChange`).
     - **Client Components (`"use client"`):** Se ejecutan en el navegador (y se pre-renderizan en el servidor). Se usan **estrictamente** cuando necesitas interactividad: modales, formularios, animaciones o estado local.
  
  2. **Manejo del estado y formularios (React Hook Form):**
     - HyperTrack es una app intensiva en entrada de datos (logs de comida, entrenamientos, telemetría). Usar estados de React básicos para cada *input* colapsaría el rendimiento. **React Hook Form** nos permite manejar formularios complejos sin re-renderizar todo el componente con cada pulsación de tecla (arquitectura *Uncontrolled Components*).

  3. **Mutaciones Híbridas (Server Actions):**
     - Olvídate de los viejos tiempos donde creabas una ruta `/api/usuarios`, le enviabas un `fetch()`, configurabas *headers* y parseabas JSON. Los **Server Actions** (`"use server"`) son funciones que viven y se ejecutan en el servidor, pero que puedes llamar *directamente* desde un botón o formulario en el cliente como si fueran funciones locales.

- **Por qué es crítico para nuestra arquitectura:** 
  En HyperTrack, el performance en dispositivos móviles no es negociable. Al mantener el 80% de nuestra UI como *Server Components*, el "bundle" de JavaScript que el usuario descarga es mínimo, logrando tiempos de carga instantáneos. Los *Server Actions* nos permiten centralizar la lógica de negocio y la seguridad, reduciendo a la mitad la cantidad de código y puntos de falla comparado con una API REST tradicional.

- **Dónde mirarlo en el código actual:** 
  - **Componentes de Servidor:** Ve a cualquier página (los archivos `page.tsx`) dentro de `src/app/(dashboard)`. Verás que hacemos llamados a base de datos o utilidades asíncronas de manera directa, sin usar `useEffect`.
  - **Componentes de Cliente:** Revisa archivos como `src/components/forms/onboarding-form.tsx` o `src/components/telemetry/MuscleHeatmap.tsx`. Verás la directiva `"use client"` en la línea 1 y el uso intensivo de *hooks*.
  - **Server Actions:** Explora la carpeta `src/app/api/` o busca archivos que exporten funciones con `"use server"`. Aquí es donde validamos y guardamos datos en la base.


---

## 🟡 FASE 2: El Cerebro de Datos (MongoDB Avanzado)

Nuestra base de datos no es solo un "almacén pasivo" donde guardamos cosas. En HyperTrack, tratamos a MongoDB como un motor de procesamiento analítico y matemático.

- **Conceptos a dominar a fondo:** 
  1. **El Paradigma Documental y el poder de BSON:** 
     - A diferencia de SQL (donde rompes la información en múltiples tablas que luego unes), aquí almacenamos datos relacionados en **documentos autocontenidos**.
     - MongoDB no guarda texto plano; usa **BSON (Binary JSON)**. Esto es crucial porque BSON soporta de forma nativa tipos de datos que JSON no entiende (como fechas exactas `Date`, identificadores binarios `ObjectId` y números decimales de alta precisión para nuestras métricas biométricas).

  2. **Datos No Estructurados y el Framework de Agregación para BI (Business Intelligence):**
     - HyperTrack recolecta volúmenes masivos de datos de telemetría y sensores (frecuencia cardíaca, métricas musculares). Estos datos suelen ser **no estructurados o semi-estructurados** (distintos dispositivos envían payloads distintos). MongoDB nos permite ingerir estos datos crudos sin un esquema rígido.
     - Luego, usamos el **Framework de Agregación** como nuestro motor nativo de **Business Intelligence (BI)**. Un *pipeline* funciona como una cadena de montaje: entran miles de documentos brutos y pasan por "tubos" (etapas). Primero filtras (`$match`), luego "desenrollas" arrays internos (`$unwind`), luego agrupas para extraer métricas complejas (`$group`), y finalmente cruzas datos (`$lookup`). Esto nos permite renderizar gráficas y analíticas avanzadas en tiempo real.

  3. **Rendimiento e Índices (Indexing):**
     - Buscar un entrenamiento específico entre millones de registros escaneando la base de datos documento por documento (*CollScan*) derrumbaría nuestra plataforma. Entender cómo y por qué creamos índices en los campos más usados (como `userId` y `date`) es obligatorio para el escalado.

- **Por qué es crítico para nuestra arquitectura:** 
  HyperTrack calcula métricas serias: volumen de carga acumulado mensual, el 1RM (Repetición Máxima) histórico, y déficits calóricos semanales. 
  Si trajéramos 10,000 registros a la memoria de Node.js/Next.js para sumarlos con `.map()` y `.reduce()`, el servidor colapsaría (*Out of Memory*). **La regla es delegar el cómputo pesado**. Al enviarle un *Aggregation Pipeline* a MongoDB (que está escrito en C++ y ultra-optimizado), la base de datos hace las matemáticas por nosotros y nos devuelve únicamente el resultado final resumido en milisegundos.

- **Dónde mirarlo en el código actual:** 
  - **Pipelines en acción:** Busca el uso del método `.aggregate([...])` en los archivos que se comunican con las colecciones `workout_sessions` o `meal_logs`.
  - **Cruces de datos:** Revisa cómo usamos `$lookup` para cruzar las métricas de un entrenamiento con el `exercise_catalog` maestro.
  - **Cuidado con la serialización:** Observa que en el backend trabajamos con `ObjectId` y `Date`, pero antes de pasarlos a nuestros *Client Components* (Fase 1), debemos convertirlos a *strings* planos, ya que React y el navegador no entienden objetos BSON.

---

## 🟠 FASE 3: Seguridad y Barreras (JWT y RBAC)

Nuestra plataforma maneja datos médicos y de salud sensibles. Un error de permisos aquí no es un simple "bug", es una brecha de seguridad grave.

- **Conceptos a dominar a fondo:** 
  1. **Criptografía Web y JWT Stateless:**
     - Utilizamos la API estándar de la web (`crypto.subtle`) para firmar y verificar **JSON Web Tokens (JWT)**. No guardamos "sesiones" en la base de datos (stateless); toda la identidad del usuario viaja encriptada en el propio token, lo que nos permite escalar sin consultar la base de datos para saber quién está logueado.
  
  2. **Defensa perimetral (Cookies HTTP-Only):**
     - El JWT jamás debe tocar el `localStorage`. Lo inyectamos en una Cookie **HTTP-Only** y **Secure**. Esto hace que el token sea invisible para el JavaScript del navegador, mitigando al 100% los ataques XSS (Cross-Site Scripting).

  3. **Configuraciones de Seguridad RBAC (Role-Based Access Control):**
     - Tenemos jerarquías de usuarios estrictas: `ADMIN`, `COACH`, `NUTRITIONIST`, `CLIENT`. 
     - **RBAC** no es solo ocultar un botón en la interfaz. Consiste en configurar matrices de permisos que el servidor valida en cada petición. Un cliente nunca debe poder asignar rutinas (POST) y un nutricionista no debe poder acceder al panel de administración.

- **Por qué es crítico para nuestra arquitectura:** 
  El sistema lee el token y aplica las configuraciones RBAC directamente en el borde (*Edge* de Next.js) antes de que la página siquiera empiece a renderizarse o consuma recursos de base de datos. Esto nos permite expulsar instantáneamente a los intrusos que intentan forzar rutas restringidas (como `/coach/[id]`), ahorrando ancho de banda y protegiendo la integridad absoluta del sistema.

- **Dónde mirarlo en el código actual:** 
  - **El Guardián (Middleware):** El archivo sagrado es el `middleware.ts` en la raíz de `src/`. Aquí ocurre la interceptación, validación del JWT y la aplicación estricta de las reglas RBAC según la ruta solicitada y el rol desencriptado.
  - **Servicios de Sesión:** Observa las utilidades de sesión para entender cómo se crea, encripta y renueva el token JWT (usualmente en utilidades dentro de `src/lib/`).

---

## 🔴 FASE 4: Blindaje de Datos (TypeScript & Zod)

MongoDB nos da la libertad de no tener esquemas rígidos (*schemaless*), pero en una aplicación de nivel empresarial, la libertad sin control es un desastre. Aquí es donde entra nuestra capa de blindaje End-to-End.

- **Conceptos a dominar a fondo:** 
  1. **Tipado Estricto (TypeScript):**
     - No usamos TypeScript solo para que el editor nos autocomplete palabras. Lo usamos para crear un contrato irrompible entre el Frontend, el Backend y la Base de Datos. Si alguien cambia el nombre de una propiedad en un modelo, el proyecto entero debe gritar y fallar en compilación antes de llegar a producción.
  
  2. **Validación en Tiempo de Ejecución (Zod):**
     - TypeScript solo nos protege mientras escribimos código (compilación). Una vez que la app está corriendo, no puede evitar que un usuario altere una petición HTTP e inyecte un *string* donde iba un *number*. **Zod** es nuestra muralla activa: toma cualquier dato externo (formularios, peticiones, Server Actions), lo inspecciona, lo limpia y verifica si cumple exactamente con nuestras reglas matemáticas antes de dejarlo pasar.
  
  3. **La Fuente Única de Verdad (Single Source of Truth):**
     - En HyperTrack no duplicamos trabajo. No escribimos interfaces de TypeScript por un lado y reglas de validación por otro (eso generaría inconsistencias). Escribimos un **único esquema central en Zod**, y usamos la función mágica `z.infer<typeof MiEsquema>` para que TypeScript extraiga y entienda los tipos automáticamente.

- **Por qué es crítico para nuestra arquitectura:** 
  Si un usuario envía un peso de `"ochenta"` (string) en vez del número `80` para calcular sus macros, MongoDB lo guardaría felizmente. Esto causaría una reacción en cadena catastrófica: nuestras fórmulas biométricas fallarían devolviendo `NaN`, las gráficas de rendimiento colapsarían y corromperíamos el *Dataset*.
  Al integrar **Zod con React Hook Form**, logramos una "Defensa en Profundidad":
  1. Validamos en el navegador (*Client-side*) para dar *feedback* instantáneo al usuario (UI en rojo).
  2. Volvemos a validar en el servidor (*Server-side*) dentro del *Server Action* para asegurar que nadie burló al cliente usando herramientas como Postman.

- **Dónde mirarlo en el código actual:** 
  - **Los Contratos Base:** Abre la carpeta `src/lib/schemas/` (por ejemplo, `profile.schema.ts`). Allí verás cómo definimos reglas complejas (`peso: z.number().min(30).max(300)`).
  - **El Escudo Frontend:** Revisa cómo le inyectamos `zodResolver(MiEsquema)` al hook genérico `useForm` dentro de nuestros formularios en `src/components/forms/`.
  - **El Escudo Backend:** Observa cómo en los Server Actions (en `src/actions/` o `src/app/api/`) usamos la instrucción `MiEsquema.safeParse(datosBrutos)` para validar de manera segura cualquier parámetro antes de hacer la inserción final en MongoDB.

---

## 🟣 FASE 5: UI/UX y Sistema de Diseño (Tailwind CSS)

El código limpio no sirve de nada si la aplicación se ve amateur o se rompe en un teléfono móvil. El sistema de diseño es la cara de nuestro producto y exige el mismo nivel de rigor que nuestra base de datos.

- **Conceptos a dominar a fondo:** 
  1. **El Paradigma Utility-First (Tailwind CSS v4):**
     - Olvídate de crear archivos separados con clases CSS semánticas (ej. `.card-profile { ... }`). Escribimos estilos directamente en el HTML usando utilidades atómicas (`bg-zinc-900 border-2 p-4`). Esto nos permite iterar increíblemente rápido y asegura que el peso de nuestro CSS nunca crezca al infinito, sin importar cuantas páginas añadamos.
  
  2. **Composición Dinámica de Clases:**
     - En React, la interfaz cambia según el estado (ej: un botón que pasa a estado "cargando"). Debes dominar utilidades de fusión de clases (como `clsx` + `tailwind-merge`, usualmente empaquetados en una función llamada `cn()`) para aplicar estilos condicionales sin que haya conflictos en la cascada de CSS.
  
  3. **Patrón de Componentes Base (UI Library):**
     - Nunca escribimos `<button className="bg-red-600 text-white font-bold...">` directamente en las vistas. Encapsulamos esa brutalidad visual en un componente puro y reutilizable (`<Button>`). Si mañana el negocio decide cambiar el color principal, lo modificamos en un solo archivo y el cambio se propaga a toda la plataforma.

- **Por qué es crítico para nuestra arquitectura:** 
  HyperTrack compite en un mercado saturado de aplicaciones genéricas. Nos diferenciamos a través de nuestra filosofía estética única: **"Premium Fitness Brutalism"**.
  - **Lo que evitamos:** Bordes curvos amigables (`rounded-xl`), sombras difuminadas (`shadow-lg`) y colores pastel.
  - **Lo que abrazamos:** Geometría estricta (`rounded-none`), alto contraste (fondo oscuro contra textos puros), bordes gruesos y marcados (`border-zinc-800`), tipografía imponente (fuentes como Oswald o Inter) y colores de acento absolutos (rojo primario).
  Esta identidad visual proyecta energía, disciplina y fuerza. Insertar estilos aleatorios o "bonitos" rompe por completo la cohesión del producto.

- **Dónde mirarlo en el código actual:** 
  - **El Corazón Estético:** Examina el archivo `src/app/globals.css`. Allí utilizamos la nueva sintaxis de Tailwind v4 (`@theme inline`) para registrar nuestras variables CSS fundacionales (colores de marca, animaciones como `pulseGlow` y tipografías).
  - **El Motor Dinámico:** Busca nuestra utilidad de fusión de clases (usualmente exportada como `cn` en `src/lib/utils.ts`).
  - **La Armería de Componentes:** Sumérgete en `src/components/ui/` (abre por ejemplo `button.tsx`). Observa cómo usamos *class-variance-authority* (`cva`) para definir las distintas variantes visuales de nuestro diseño brutalista.
