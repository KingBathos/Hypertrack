# 📘 Informe de Arquitectura y Cumplimiento de Rúbrica — HyperTrack

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
| **Metodología TDD** | **Suite de Pruebas Automatizadas con Vitest** (19 pruebas unitarias pasando) | `src/__tests__/**/*.test.ts`, `npm test` |
| **Aspectos de Seguridad** | **Web Crypto API (HMAC-SHA256)**, Cookies HttpOnly/SameSite, **Argon2id**, RBAC y Middleware | `src/middleware.ts`, `src/lib/auth/session.ts` |
| **Librerías de Apoyo** | **Homologación TypeScript/Node.js** de librerías empresariales de apoyo | ES2024, Zod, ULID, Web Crypto, AuditDAO |
| **Git y GitHub** | **Control de versiones con ramas semánticas** y Conventional Commits | Rama `refactor/dao-solid-tdd` |

---

## 2. Desglose Arquitectónico

### 2.1. Patrón DAO (Data Access Object)
Para evitar el acoplamiento directo de la capa de presentación/acciones con el motor de base de datos, se implementó una jerarquía DAO que encapsula las colecciones de MongoDB:

* **`BaseDAO<T>` (`src/lib/dao/base.dao.ts`)**: Clase abstracta base que gestiona la conexión singleton, tipado de colecciones y métodos utilitarios de validación y conversión segura de `ObjectId`.
* **`UserDAO` (`src/lib/dao/user.dao.ts`)**: Gestión de identidad, autenticación, vinculación de atletas con entrenadores (`coachId`) y nutricionistas (`nutritionistId`), control de roles (RBAC) y bloqueo por fuerza bruta.
* **`WorkoutDAO` (`src/lib/dao/workout.dao.ts`)**: Biblioteca de ejercicios, asignación de protocolos de entrenamiento, plantillas de atleta libre, sesiones y persistencia de Récords Personales (PRs).
* **`NutritionDAO` (`src/lib/dao/nutrition.dao.ts`)**: Planes nutricionales activos/históricos y bitácora diaria de comidas con cálculo de macros.
* **`ProfileDAO` (`src/lib/dao/profile.dao.ts`)**: Perfiles biométricos, medidas circunferenciales y fotos de evolución física.
* **`AuditDAO` (`src/lib/dao/audit.dao.ts`)**: Registro forense de acciones administrativas y de seguridad.

### 2.2. Principios SOLID Aplicados
1. **Single Responsibility Principle (SRP):**
   * **Antes:** Una Server Action realizaba validación HTTP, autorización, consultas de base de datos y fórmulas matemáticas en una sola función.
   * **Ahora:** La lógica matemática pura se extrajo a `src/lib/domain/` (sin dependencias externas ni de bases de datos):
     * `src/lib/domain/metabolic.ts`: Ecuación clínica de **Mifflin-St Jeor** para BMR, multiplicadores de TDEE y distribución de macronutrientes.
     * `src/lib/domain/biomechanics.ts`: Fórmula de **Epley** para estimación de 1RM, cálculo de volumen de carga (`VolumeLoad`) y zonas de esfuerzo RPE.
     * `src/lib/domain/biometrics.ts`: Ratio cintura-cadera (**WHR**) y estratificación de riesgo cardiovascular según criterios de la OMS.
2. **Dependency Inversion Principle (DIP):** Las Server Actions ahora dependen de los contratos provistos por los DAOs y funciones de dominio, en lugar de consultar directamente el driver de MongoDB.
3. **Interface Segregation Principle (ISP):** Tipos finamente segregados en `src/types/` (`user.ts`, `workout.ts`, `nutrition.ts`, `profile.ts`).

### 2.3. TDD y Pruebas Automatizadas (Vitest)
El proyecto cuenta con un entorno de pruebas moderno integrado con TypeScript (`npm test`):
* `src/__tests__/domain/metabolic.test.ts`: Validación de BMR en hombres y mujeres, validación de inputs erróneos y cálculo de TDEE por factor de actividad.
* `src/__tests__/domain/biomechanics.test.ts`: Precisión de la fórmula de Epley para 1 repetición y múltiples repeticiones, y agregación de volumen de carga.
* `src/__tests__/domain/biometrics.test.ts`: Cálculo de ratio WHR y tablas de clasificación de riesgo cardiovascular para ambos sexos.
* `src/__tests__/schemas/user.schema.test.ts`: Validación de seguridad y sanitización de credenciales con Zod (mínimo 8 caracteres, mayúsculas, números y validación de emails).

**Resultado de ejecución:**
```text
✓ src/__tests__/domain/metabolic.test.ts (5 tests)
✓ src/__tests__/domain/biometrics.test.ts (4 tests)
✓ src/__tests__/domain/biomechanics.test.ts (5 tests)
✓ src/__tests__/schemas/user.schema.test.ts (5 tests)

Test Files  4 passed (4)
     Tests  19 passed (19)
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
4. **Protección Perimetral:** `src/middleware.ts` intercepta todas las rutas protegidas (`/dashboard`, `/coach`, `/nutritionist`, `/admin`) validando roles antes de renderizar la vista.
5. **Sanitización de Datos:** Esquemas **Zod** en todas las fronteras de entrada para prevenir inyecciones NoSQL.
