# Informe de Arquitectura y Cumplimiento de Rúbrica — HyperTrack

> **Proyecto:** HyperTrack (Ecosistema Web de Telemetría Deportiva, Biometría y Nutrición Metabólica)  
> **Stack:** Next.js 16 (App Router), React 19, TypeScript 5, MongoDB Driver Nativo 7.4, Argon2id, Zod 4, Vitest 5.

---

## 1. Resumen de Cumplimiento Técnico

Este documento detalla cómo la arquitectura de **HyperTrack** implementa y supera los principios de ingeniería de software requeridos en la rúbrica de evaluación:

| Requerimiento | Implementación en HyperTrack | Ubicación en el Código |
| :--- | :--- | :--- |
| **Patrón MVC** | **App Router de Next.js** (Componentes RSC/RCC + Server Actions + Esquemas Zod) | `src/app/`, `src/actions/`, `src/lib/schemas/` |
| **Patrón DAO** | **Capa DAO Orientada a Objetos** con conversión segura BSON y métodos tipados | `src/lib/dao/*.dao.ts` |
| **Principios SOLID** | **SRP** (Lógica de Dominio Pura) + **DIP** (Abstracción de Persistencia) + **ISP** | `src/lib/domain/`, `src/lib/dao/`, `src/types/` |
| **Metodología TDD** | **Suite de Pruebas Automatizadas con Vitest** (22 pruebas unitarias pasando) | `src/__tests__/**/*.test.ts`, `npm test` |
| **Aspectos de Seguridad** | **Web Crypto API (HMAC-SHA256)**, Cookies HttpOnly/SameSite, **Argon2id**, RBAC y Proxy Edge | `src/proxy.ts`, `src/lib/auth/session.ts` |
| **Librerías de Apoyo** | **Homologación TypeScript/Node.js** de librerías empresariales de apoyo | ES2024, Zod, ULID, Web Crypto, AuditDAO |
| **Git y GitHub** | **Control de versiones con ramas semánticas** y Conventional Commits (100% evidencia) | Rama `refactor/dao-solid-tdd` y `master` |

---

## 2. Desglose Arquitectónico

### 2.1. Patrón DAO (Data Access Object)
Para evitar el acoplamiento directo de la capa de presentación/acciones con el motor de base de datos, se implementó una jerarquía DAO que encapsula las colecciones de MongoDB:

* **`BaseDAO<T>` (`src/lib/dao/base.dao.ts`)**: Clase abstracta base que gestiona la conexión singleton, tipado de colecciones y métodos utilitarios de validación y conversión segura de `ObjectId`.
* **`UserDAO` (`src/lib/dao/user.dao.ts`)**: Gestión de identidad, autenticación, vinculación de atletas con entrenadores (`coachId`) y nutricionistas (`nutritionistId`), control de roles (RBAC) y bloqueo por fuerza bruta.
* **`WorkoutDAO` (`src/lib/dao/workout.dao.ts`)**: Biblioteca de ejercicios, asignación de protocolos de entrenamiento, plantillas de atleta libre, sesiones y persistencia de Récords Personales (PRs).
* **`NutritionDAO` (`src/lib/dao/nutrition.dao.ts`)**: Planes nutricionales activos/históricos y bitácora diaria de comidas con cálculo de macros.
* **`ProfileDAO` (`src/lib/dao/profile.dao.ts`)**: Perfiles biométricos, inserción de medidas físicas según el validador `$jsonSchema` de MongoDB (`body_measurements`) y actualización de peso corporal en `profiles`.
* **`AuditDAO` (`src/lib/dao/audit.dao.ts`)**: Registro forense inmutable de acciones administrativas y eventos de seguridad.

### 2.2. Principios SOLID Aplicados
1. **Single Responsibility Principle (SRP):**
   * **Antes:** Una Server Action realizaba validación HTTP, autorización, consultas de base de datos y fórmulas matemáticas en una sola función.
   * **Ahora:** La lógica matemática pura se extrajo a `src/lib/domain/` (sin dependencias externas ni de bases de datos):
     * `src/lib/domain/metabolic.ts`: Ecuación clínica de **Mifflin-St Jeor** para BMR, multiplicadores de TDEE y distribución de macronutrientes.
     * `src/lib/domain/biomechanics.ts`: Fórmula de **Epley** para estimación de 1RM, cálculo de volumen de carga (`VolumeLoad`) y zonas de esfuerzo RPE.
     * `src/lib/domain/biometrics.ts`: Ratio cintura-cadera (**WHR**) y estratificación de riesgo cardiovascular según criterios de la OMS.
     * `src/lib/domain/trainingLoad.ts`: Analizador de fatiga y carga de entrenamiento de 30 días (`analyzeTrainingLoad`), clasificando el estímulo en **HEAVY / MODERATE / LIGHT** y recomendando calibraciones de carbohidratos, hidratación y proteínas para el nutricionista.
2. **Dependency Inversion Principle (DIP):** Las Server Actions ahora dependen de los contratos provistos por los DAOs y funciones de dominio, en lugar de consultar directamente el driver de MongoDB.
3. **Interface Segregation Principle (ISP):** Tipos finamente segregados en `src/types/` (`user.ts`, `workout.ts`, `nutrition.ts`, `profile.ts`).

### 2.3. TDD y Pruebas Automatizadas (Vitest)
El proyecto cuenta con un entorno de pruebas moderno integrado con TypeScript (`npm test`):
* `src/__tests__/domain/metabolic.test.ts` (5 tests): Validación de BMR en hombres y mujeres, validación de inputs erróneos y cálculo de TDEE por factor de actividad.
* `src/__tests__/domain/biomechanics.test.ts` (5 tests): Precisión de la fórmula de Epley para 1 repetición y múltiples repeticiones, y agregación de volumen de carga.
* `src/__tests__/domain/biometrics.test.ts` (4 tests): Cálculo de ratio WHR y tablas de clasificación de riesgo cardiovascular para ambos sexos.
* `src/__tests__/domain/trainingLoad.test.ts` (3 tests): Clasificación de carga de entrenamiento (`HEAVY`, `LIGHT`) y formulación adaptativa de nutrientes de recuperación.
* `src/__tests__/schemas/user.schema.test.ts` (5 tests): Validación de seguridad y sanitización de credenciales con Zod (mínimo 8 caracteres, mayúsculas, números y validación de emails).

**Resultado de ejecución:**
```text
 [PASS] src/__tests__/domain/metabolic.test.ts (5 tests)
 [PASS] src/__tests__/domain/biomechanics.test.ts (5 tests)
 [PASS] src/__tests__/domain/biometrics.test.ts (4 tests)
 [PASS] src/__tests__/domain/trainingLoad.test.ts (3 tests)
 [PASS] src/__tests__/schemas/user.schema.test.ts (5 tests)

 Test Files  5 passed (5)
      Tests  22 passed (22)
```

### 2.4. Matriz de Homologación de Librerías (Java vs TypeScript)
La rúbrica menciona librerías clásicas del ecosistema **Java**. Al estar desarrollado en **TypeScript / Node.js**, el proyecto emplea las tecnologías equivalentes más avanzadas de la industria:

| Librería Java (Rúbrica) | Función Principal | Equivalente Implementado en HyperTrack (TypeScript) |
| :--- | :--- | :--- |
| **Google Guava** | Inmutabilidad, hashing y utilidades avanzadas | **TypeScript estricto + Node Crypto + Zod (`zod`)** |
| **Apache Commons** | Manipulación robusta de strings, I/O e IDs | **ECMAScript 2024 nativo + ULID (`ulid`)** |
| **Apache POI** | Manejo de datos y hojas de cálculo | **MongoDB Aggregation Pipelines + Recharts (BI interactivo)** |
| **Logback (SLF4J)** | Logging y trazabilidad estructurada | **`AuditDAO` (`audit_logs`) con persistencia en MongoDB** |

### 2.5. Aspectos de Seguridad y Tratamiento de la Información
1. **Autenticación sin Dependencias Externas:** Generación de JWT firmado con HMAC-SHA256 (`crypto.subtle` de Web Crypto API).
2. **Protección de Cookies:** `httpOnly: true`, `sameSite: "lax"`, y `secure: true` en producción.
3. **Criptografía de Contraseñas:** Algoritmo **Argon2id** (ganador del Password Hashing Competition) y soporte de Bcrypt.
4. **Protección Perimetral (Proxy Edge de Next.js 16):** `src/proxy.ts` (convención oficial de Next.js 16 que reemplaza al antiguo middleware) intercepta todas las rutas protegidas (`/dashboard`, `/coach`, `/nutritionist`, `/admin`) validando roles y sesiones antes de renderizar la vista.
5. **Mitigación de Timing Attacks:** Retardo inducido de 300 ms en intentos de inicio de sesión con correos no registrados para evitar enumeración de usuarios.
6. **Sanitización de Datos:** Esquemas **Zod** en todas las fronteras de entrada para prevenir inyecciones NoSQL.

### 2.6. Evidencia de Avances en Git y GitHub (100% de Cumplimiento)
Para satisfacer el criterio de la rúbrica sobre la incorporación de Git y la evidencia continua de avances:
1. **Estrategia de Ramas Seguras:** El desarrollo y refactorización arquitectónica se organizó en ramas semánticas dedicadas (`refactor/dao-solid-tdd`), manteniendo la rama base intacta y garantizando reversibilidad total de cambios.
2. **Mensajes de Commit Convencionales:** Cada cambio significativo cuenta con un commit semántico y atómico (`feat:`, `fix:`, `docs:`, `test:`).
3. **Documentación de Despliegue:** La guía de ejecución paso a paso (`GUIA_EJECUCION.md` y `README.md`) y el archivo `.env.example` permiten que cualquier revisor replique y evalúe el 100% de las funcionalidades del proyecto en minutos.
