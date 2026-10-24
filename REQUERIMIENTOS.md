# Requerimientos de Software — HyperTrack

## 1. Requerimientos Funcionales (RF)
Los Requerimientos Funcionales describen el comportamiento, las acciones y los servicios que el sistema realiza.

### 1.1. Gestión de Usuarios y Roles
- **RF-01 (Autenticación y Registro):** El sistema debe permitir el registro y autenticación de usuarios mediante credenciales encriptadas (correo y contraseña) utilizando el algoritmo criptográfico **Argon2id**.
- **RF-02 (Perfiles y Roles - RBAC):** El sistema debe soportar cuatro tipos de roles: `USER` (Atleta), `COACH` (Entrenador), `NUTRITIONIST` (Nutricionista) y `ADMIN` (Administrador).
- **RF-03 (Onboarding Completo):** Los usuarios de tipo `USER` deben poder completar un formulario de ingreso guiado de 5 pasos, que recopile datos personales, métricas biométricas iniciales (peso, altura, % de grasa), objetivo (hipertrofia, pérdida de grasa) y estilo de vida (nivel de actividad PAL, experiencia, frecuencia de entrenamiento, horas de sueño).

### 1.2. Módulo de Entrenamiento (Workouts)
- **RF-04 (Creación de Rutinas y Programas):** Los entrenadores y atletas deben poder crear y almacenar rutinas y programas semanales personalizados.
- **RF-05 (Registro de Sesiones en Vivo):** Los usuarios deben poder iniciar y registrar sus sesiones de entrenamiento en tiempo real, registrando ejercicios, repeticiones, peso utilizado (KG o LBS), escala de esfuerzo percibido (RPE de 1 a 10) y cronómetro circular interactivo de descanso (90 segundos).
- **RF-06 (Tracking de Récords Personales - PR):** El sistema debe identificar, registrar y mostrar automáticamente cuando el atleta supere su peso máximo histórico en un ejercicio, calculando el 1RM estimado mediante la fórmula de Epley.
- **RF-07 (Programas Asignados y Auto-Progresión):** El sistema debe permitir a los roles `COACH` asignar programas de entrenamiento semanales a los `USER`, con ajuste dinámico de sobrecarga progresiva (`OVERLOAD` / `DELOAD`) basado en el RPE previo.

### 1.3. Módulo de Biometría y Salud
- **RF-08 (Registro Estricto de Medidas Corporales):** Los usuarios deben poder ingresar y consultar el historial de su peso corporal y medidas circunferenciales (cintura, cadera, pecho, bíceps, muslo, pantorrilla) cumpliendo con el validador físico `$jsonSchema` de MongoDB en `body_measurements`.
- **RF-09 (Cálculo de Indicadores Clínicos y Riesgo OMS):** El sistema debe calcular y mostrar indicadores de salud como el Ratio Cintura-Cadera (WHR) y advertir sobre los riesgos de salud cardiovascular basándose en las tablas clínicas de la Organización Mundial de la Salud (OMS).
- **RF-10 (Historial Visual):** El sistema debe generar gráficas reactivas y estadísticas del historial de peso y adherencia.

### 1.4. Módulo de Nutrición y Telemetría Metabólica
- **RF-11 (Registro de Alimentos):** El usuario debe poder registrar sus comidas (Desayuno, Almuerzo, Cena, Snack) detallando las calorías y los macronutrientes (Proteínas, Carbohidratos, Grasas) y nivel de hidratación.
- **RF-12 (Estimación Calórica Clínica):** El sistema (especialmente en la vista de nutricionista) debe calcular la Tasa Metabólica Basal (BMR) mediante la ecuación de Mifflin-St Jeor y el TDEE (Gasto Energético Diario Total) real aplicando el multiplicador del nivel de actividad física (PAL de 1.2 a 1.9).
- **RF-13 (Telemetría de Carga de Entrenamiento para Nutricionistas):** El sistema debe analizar automáticamente las sesiones de gimnasio de los últimos 30 días del cliente (`analyzeTrainingLoad`), clasificando el estímulo en **HEAVY**, **MODERATE** o **LIGHT** basándose en frecuencia semanal, volumen acumulado (en Toneladas/Kg), RPE medio y duración de sesión.
- **RF-14 (Prescripción y Calibración Adaptativa de Macros):** El sistema debe proporcionar recomendaciones adaptativas al nutricionista (ajuste de carbohidratos en g/kg, hidratación y proteínas para recuperación deportiva) y permitir la formulación y activación atómica de protocolos nutricionales en `nutrition_plans`.

### 1.5. Centro de Comando y Administración
- **RF-15 (Consola Administrativa y RBAC):** El rol `ADMIN` debe poder visualizar métricas globales de la plataforma, gestionar y cambiar roles de usuarios en caliente (`updateUserRole`) y mantener la biblioteca global de ejercicios (`exercise_library`).
- **RF-16 (Auditoría Forense de Seguridad):** El sistema debe registrar de forma inmutable cada acción crítica o de seguridad en la colección `audit_logs` con actor, target, acción y timestamp UTC.

### 1.6. Arquitectura Limpia y Pruebas
- **RF-17 (Capa de Acceso a Datos - Patrón DAO):** Todas las consultas y mutaciones a la base de datos deben estar encapsuladas en clases DAO tipadas (`UserDAO`, `WorkoutDAO`, `NutritionDAO`, `ProfileDAO`, `AuditDAO`) desacopladas de los controladores y Server Actions.
- **RF-18 (Pruebas Unitarias Automatizadas - TDD):** Toda la lógica matemática, biomecánica y clínica debe estar respaldada por una suite de pruebas unitarias automatizadas con Vitest (22 tests pasando con 0 errores).

---

## 2. Requerimientos No Funcionales (RNF)

### 2.1. Arquitectura y Stack Tecnológico
- **RNF-01 (Framework):** El sistema debe ser construido como una aplicación web Fullstack sobre **Next.js 16** (App Router) y **React 19**.
- **RNF-02 (Base de Datos):** Los datos deben almacenarse en un clúster NoSQL utilizando **MongoDB 7.4** con driver nativo.
- **RNF-03 (Lenguaje):** Todo el código backend y frontend debe ser desarrollado de manera estricta bajo **TypeScript 5**.
- **RNF-04 (Arquitectura Limpia / SOLID):** Separación estricta de responsabilidades entre Capa de Presentación, Controladores/Server Actions, Servicios de Dominio Puro (SRP) y Capa DAO.

### 2.2. Rendimiento y Usabilidad
- **RNF-05 (PWA - Progressive Web App):** El sistema debe ser capaz de funcionar como una aplicación web instalable en dispositivos móviles (PWA) mediante Service Workers.
- **RNF-06 (Diseño Responsivo):** La interfaz debe adaptarse dinámicamente tanto a dispositivos de escritorio como a teléfonos móviles en el gimnasio.
- **RNF-07 (Interfaz Brutalista Premium):** Diseño de alto impacto con paleta oscura/industrial (`zinc-950`, acentos rojo sangre `#dc2626` y dorado), micro-animaciones y tipografía monoespaciada para datos numéricos.

### 2.3. Seguridad y Privacidad
- **RNF-08 (Edge Proxy RBAC):** Control de acceso perimetral en Edge Runtime implementado mediante `src/proxy.ts` (convención estándar de Next.js 16).
- **RNF-09 (Autenticación sin estado):** Sesiones gestionadas mediante Json Web Tokens (JWT HS256) nativos con Web Crypto API, protegidos en cookies `HttpOnly`, `SameSite: Lax` y `Secure` en producción.
- **RNF-10 (Validación Estricta en Doble Capa):** Filtrado y tipado de entrada con **Zod** y restricciones físicas con `$jsonSchema` en MongoDB.
- **RNF-11 (Protección Criptográfica y Anti-Timing Attacks):** Hashing de contraseñas con **Argon2id** e introducción de retardo artificial de 300 ms en accesos fallidos para prevenir enumeración de usuarios.

### 2.4. Mantenibilidad y Calidad
- **RNF-12 (Testing TDD Continuo):** Cobertura de pruebas unitarias ejecutadas mediante `npm test` con Vitest.
- **RNF-13 (Control de Versiones en Git/GitHub):** El sistema debe mantener trazabilidad completa de commits y ramas organizadas (`master`, `refactor/dao-solid-tdd`) reflejadas al 100% en GitHub.
