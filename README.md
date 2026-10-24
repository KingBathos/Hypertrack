# ⚡ HyperTrack — High-Performance Athletic & Metabolic Telemetry Platform

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.2.10-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7.4.0-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-TDD_Suite-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Argon2id](https://img.shields.io/badge/Security-Argon2id-red?style=for-the-badge&logo=auth0)

**Plataforma Fullstack de acondicionamiento físico, sobrecarga progresiva, análisis biomecánico, telemetría metabólica y gestión multidisciplinaria (Atleta, Coach, Nutricionista y Administrador).**

</div>

---

## 📋 Tabla de Contenidos

1. [Descripción General](#-descripción-general)
2. [Arquitectura e Ingeniería de Software](#-arquitectura-e-ingeniería-de-software)
3. [Requisitos Previos](#-requisitos-previos)
4. [Guía de Instalación y Ejecución Paso a Paso](#-guía-de-instalación-y-ejecución-paso-a-paso)
5. [Credenciales y Cuentas de Demostración](#-credenciales-y-cuentas-de-demostración)
6. [Flujo de Usuarios y Portales por Rol](#-flujo-de-usuarios-y-portales-por-rol)
7. [Suite de Pruebas Unitarias (TDD)](#-suite-de-pruebas-unitarias-tdd)
8. [Estructura del Proyecto](#-estructura-del-proyecto)
9. [Documentación Técnica Adicional](#-documentación-técnica-adicional)

---

## 🚀 Descripción General

**HyperTrack** es un SaaS de alto rendimiento diseñado para cerrar la brecha entre el entrenamiento de fuerza, la nutrición clínica y la supervisión profesional multidisciplinaria:

- **Para el Atleta:** Bitácora en vivo con cronómetro reactivo SVG de descanso, cálculo holográfico de volumen acumulado, estimación automática de 1RM (Epley), detección de récords personales (PRs), gamificación RPG (XP y racha de fuego), y seguimiento antropométrico (WHR / Ratio Cintura-Cadera).
- **Para el Nutricionista:** Telemetría de fatiga y carga de entrenamiento (`analyzeTrainingLoad`) que clasifica el estímulo en **HEAVY / MODERATE / LIGHT**, sugiriendo calibraciones automáticas de carbohidratos, hidratación y calorías según la intensidad real del atleta en los últimos 30 días. Cálculo clínico de BMR (Mifflin-St Jeor), TDEE real y adherencia a macros.
- **Para el Entrenador (Coach):** Roster de atletas asignados, radar muscular de fatiga (Push/Pull/Legs/Core), constructor de programas maestros y asignación de rutinas con auto-progresión de sobrecarga.
- **Para el Administrador:** Centro de comando de seguridad, auditoría forense en tiempo real (`audit_logs`), conmutación de roles en caliente (RBAC) y mantenimiento de la biblioteca de ejercicios.

---

## 🏛 Arquitectura e Ingeniería de Software

HyperTrack implementa una **Arquitectura Limpia / Hexagonal** modular, orientada a principios de alta mantenibilidad:

```
┌─────────────────────────────────────────────────────────────────┐
│               PRESENTACIÓN (Next.js 16 App Router)              │
│    Server Components + Client Components (React 19)             │
└────────────────────────────────┬────────────────────────────────┘
                                 │ Invoca
┌────────────────────────────────▼────────────────────────────────┐
│             CONTROLADORES & ACTIONS (src/actions/*)             │
│    Validación de esquemas Zod + Control de Sesión               │
└──────────────────┬─────────────────────────────┬────────────────┘
                   │                             │
    Invoca Reglas  │                             │ Persiste
┌──────────────────▼─────────────┐ ┌─────────────▼────────────────┐
│   DOMINIO PURO / SOLID (TDD)   │ │  CAPA DE ACCESO A DATOS DAO  │
│  - metabolic.ts                │ │  - UserDAO                   │
│  - biomechanics.ts             │ │  - WorkoutDAO                │
│  - biometrics.ts               │ │  - NutritionDAO              │
│  - trainingLoad.ts             │ │  - ProfileDAO / AuditDAO     │
└────────────────────────────────┘ └─────────────┬────────────────┘
                                                 │
                                   ┌─────────────▼────────────────┐
                                   │  BASE DE DATOS (MongoDB 7.4) │
                                   │  Driver Nativo + Validación  │
                                   └──────────────────────────────┘
```

- **Patrón DAO (Data Access Object):** Desacopla la lógica de negocio y las Server Actions de las consultas directas al driver de base de datos.
- **Principios SOLID:** Servicios de cálculo puro desacoplados (SRP), extensibles (OCP) y sin efectos secundarios.
- **TDD (Test-Driven Development):** 5 suites de pruebas unitarias implementadas con Vitest con 22 pruebas automatizadas.
- **Seguridad Perimetral:** Edge Proxy (`src/proxy.ts` estándar de Next.js 16), mitigación de ataques de temporización (Anti-Timing Attacks), hashing criptográfico con **Argon2id** y tokens JWT nativos en cookies `HttpOnly`.

---

## 💻 Requisitos Previos

Asegúrate de contar con las siguientes herramientas en tu entorno local:

1. **Node.js:** Versión `20.x` o superior recomendada (compatible con `18.x`+).
   ```bash
   node -v
   ```
2. **NPM:** Gestor de paquetes incluido con Node.js (`npm -v >= 10.x`).
3. **MongoDB:** Instancia local de MongoDB Community Server (puerto `27017`) o clúster en la nube con **MongoDB Atlas**.
4. **Git:** Para control de versiones.

---

## 🛠 Guía de Instalación y Ejecución Paso a Paso

Sigue esta guía paso a paso para poner en marcha el proyecto desde cero:

### Paso 1: Clonar el Repositorio
```bash
git clone https://github.com/TU_USUARIO/hypertrack-mongodb.git
cd "HyperTrack - mongoDB"
```

### Paso 2: Configurar las Variables de Entorno
Copia el archivo de plantilla `.env.example` para generar tu archivo `.env.local`:

```bash
# En Windows (PowerShell)
Copy-Item .env.example .env.local

# En Linux / macOS
cp .env.example .env.local
```

Abre `.env.local` y verifica que los valores coincidan con tu entorno:
```env
# Conexión a MongoDB (Local o Atlas)
MONGODB_URI=mongodb://localhost:27017/HyperTrackb
MONGODB_DB=HyperTrackb

# Clave secreta para tokens JWT (mínimo 32 caracteres)
AUTH_SECRET=F987768440a$super_secret_jwt_hypertrack_production_key_2026

# Factor de costo de hashing
BCRYPT_SALT_ROUNDS=12
```

> [!IMPORTANT]
> Respeta exactamente las mayúsculas y minúsculas en el nombre de la base de datos (`HyperTrackb`).

### Paso 3: Instalar Dependencias
Instala los paquetes del proyecto. Debido a la integración con React 19 y Next.js 16, utiliza el flag `--legacy-peer-deps`:

```bash
npm install --legacy-peer-deps
```

### Paso 4: Sembrar Datos de Prueba (Seed Database)
El proyecto incluye un seeder automatizado que inicializa la base de datos con atletas de prueba, historiales de entrenamiento, biometría y comidas:

```bash
npx ts-node run-seed.ts
```

*Salida esperada:*
```text
Starting Auto-Seeder...
Created test athlete: testathlete1@hypertrack.com
Database successfully seeded!
```

### Paso 5: Ejecutar la Suite de Pruebas Unitarias (TDD)
Ejecuta la suite completa de pruebas unitarias automatizadas con Vitest para validar los cálculos metabólicos, biomecánicos, de biometría y esquemas Zod:

```bash
npm test
```

*Salida esperada:*
```text
 ✓ src/__tests__/domain/metabolic.test.ts (5 tests)
 ✓ src/__tests__/domain/biomechanics.test.ts (5 tests)
 ✓ src/__tests__/domain/biometrics.test.ts (4 tests)
 ✓ src/__tests__/domain/trainingLoad.test.ts (3 tests)
 ✓ src/__tests__/schemas/user.schema.test.ts (5 tests)

 Test Files  5 passed (5)
      Tests  22 passed (22)
```

Para mantener las pruebas corriendo en modo interactivo:
```bash
npm run test:watch
```

### Paso 6: Verificación Estática de Tipos (TypeScript)
Valida que no existan errores de compilación estricta en el código:

```bash
npx tsc --noEmit
```
*(Debe terminar con código de salida 0 sin advertencias).*

### Paso 7: Iniciar el Servidor de Desarrollo
Inicia la aplicación en modo desarrollo:

```bash
npm run dev
```

Abre tu navegador en:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Credenciales y Cuentas de Demostración

Puedes ingresar registrándote directamente en la plataforma o utilizando las credenciales sembradas:

| Rol | Correo de Acceso | Contraseña | Portal de Destino |
| :--- | :--- | :--- | :--- |
| **Atleta / Usuario** | `testathlete1@hypertrack.com` | `Atleta123!` *(o registro libre)* | `/dashboard` |
| **Nutricionista** | `nutri@hypertrack.com` | `Nutri123!` *(vía /register-pro)* | `/nutritionist` |
| **Entrenador (Coach)** | `coach@hypertrack.com` | `Coach123!` *(vía /register-pro)* | `/coach` |
| **Administrador** | `admin@hypertrack.com` | `Admin123!` *(o configurado en DB)* | `/admin` |

> [!TIP]
> **Creación Libre de Cuentas:**
> - Atleta: Regístrate en `/register` y completa el stepper de 5 pasos de `/onboarding`.
> - Profesionales: Regístrate en `/register-pro` seleccionando rol `COACH` o `NUTRITIONIST`.
> - Para elevar cualquier cuenta a `ADMIN`, conéctate a tu MongoDB y actualiza el campo `role: "ADMIN"` en la colección `users`, o hazlo desde el centro de comando si ya posees una cuenta administradora.

---

## 🧭 Flujo de Usuarios y Portales por Rol

### 1. Portal del Atleta (`/dashboard`)
- **HUD Central:** Racha activa, toneladas mensuales acumuladas, sesiones completadas en 30 días y porcentaje de recuperación.
- **Biometría (`BiometricsUpdater`):** Actualización de peso corporal, porcentaje graso y circunferencias corporales. Calcula automáticamente el ratio cintura/cadera (WHR) y riesgo cardiovascular.
- **Entrenamiento en Vivo (`/workout/live`):** Modo programa o libre, temporizador circular de 90 segundos de recuperación con alertas sonoras y visuales, bitácora serie a serie con RPE y cálculo automático de volumen.
- **Nutrición (`/nutrition`):** Bitácora diaria de comidas (Desayuno, Almuerzo, Cena, Snacks), anillos concéntricos interactivos de macronutrientes y control de hidratación.

### 2. Portal del Nutricionista (`/nutritionist` y `/nutritionist/[clientId]`)
- **Roster de Clientes:** Visualización de atletas vinculados mediante ID público.
- **Telemetría de Carga de Entrenamiento (`analyzeTrainingLoad`):**
  - Clasificación del volumen y fatiga de los últimos 30 días en **HEAVY**, **MODERATE** o **LIGHT**.
  - 5 métricas clave: frecuencia semanal, volumen acumulado (Tn/Kg), RPE medio y duración media de sesión.
  - Recomendación metabólica adaptativa: sugerencia clínica de carbohidratos (g/kg), hidratación (ml) y proteínas para sostener el esfuerzo y evitar el sobreentrenamiento.
- **Motor Clínico BMR/TDEE:** Cálculo de Tasa Metabólica Basal (Mifflin-St Jeor), TDEE real ajustado por factor PAL y adherencia a macros de 7 días.
- **Formulación de Protocolos:** Formulario de establecimiento de objetivos calóricos y distribución de macros con autocalibración inteligente.

### 3. Portal del Entrenador (`/coach` y `/coach/programs`)
- **Roster de Atletas:** Monitoreo del volumen de 4 semanas y récords de 1RM estimados en Press de Banca, Sentadilla y Peso Muerto.
- **Constructor de Programas:** Creación de rutinas por días de la semana con ejercicios de la biblioteca, series objetivo y repeticiones.
- **Asignación:** Vinculación directa de programas con atletas.

### 4. Centro de Comando del Administrador (`/admin`)
- **Métricas Globales:** Conteo de atletas activos, kilos acumulados en la plataforma y planes nutricionales activos.
- **Gestión de Personal y Roles:** Modificación en caliente de roles de usuario (`USER`, `COACH`, `NUTRITIONIST`, `ADMIN`) sin reiniciar el servidor.
- **Radar de Auditoría Forense:** Registro inmutable de eventos de seguridad y transacciones críticas en la colección `audit_logs`.
- **Biblioteca de Ejercicios (`/admin/exercises`):** CRUD maestro de ejercicios con asignación de grupo muscular, equipo y mecánica.

---

## 🧪 Suite de Pruebas Unitarias (TDD)

El proyecto cuenta con cobertura exhaustiva de pruebas unitarias sobre la lógica de dominio y validación:

```bash
npm test
```

### Detalle de las Suites de Pruebas:
1. **`metabolic.test.ts` (5 pruebas):**
   - Ecuación de Mifflin-St Jeor para hombres y mujeres.
   - Cálculo de TDEE real multiplicando BMR por factores PAL (sedentario, activo, muy activo).
   - Generación de metas calóricas proyectadas (déficit -500 kcal, superávit +300 kcal).
   - Distribución de macronutrientes asegurando la suma calórica exacta (4 kcal/g de proteína y carbos, 9 kcal/g de grasas).
2. **`biomechanics.test.ts` (5 pruebas):**
   - Estimación de 1RM con fórmula de Epley ($1RM = Peso \times (1 + Reps / 30)$).
   - Casos borde de 1 sola repetición (1RM = Peso levantado).
   - Cálculo de volumen total de carga ($\sum Peso \times Reps$).
   - Detección de esfuerzos máximos (RPE $\ge 9.5$) y recomendaciones de progresión/descarga.
3. **`biometrics.test.ts` (4 pruebas):**
   - Cálculo del Ratio Cintura-Cadera ($WHR = Cintura / Cadera$).
   - Clasificación de riesgo cardiovascular de la OMS para hombres ($> 0.90$ alto riesgo).
   - Clasificación de riesgo cardiovascular de la OMS para mujeres ($> 0.85$ alto riesgo).
4. **`trainingLoad.test.ts` (3 pruebas):**
   - Detección y clasificación de carga `HEAVY` para entrenamientos de alto volumen o frecuencia intensa.
   - Prescripción metabólica adaptativa con recomendación incrementada de carbohidratos (6 a 8 g/kg) e hidratación.
   - Clasificación de carga `LIGHT` con directrices metabólicas de recuperación y mantenimiento.
5. **`user.schema.test.ts` (5 pruebas):**
   - Validación estricta de formato de correo y límites de caracteres.
   - Validación de contraseñas seguras (mínimo 8 caracteres, al menos una mayúscula y un número).
   - Detección de discrepancias en confirmación de contraseña.

---

## 📂 Estructura del Proyecto

```text
HyperTrack - mongoDB/
├── .env.example                     # Plantilla de variables de entorno
├── .env.local                       # Variables de entorno locales (ignorado en git)
├── docs/                            # Documentación técnica, requerimientos y diagramas
│   ├── README.md                    # Índice general y guía de la documentación
│   ├── architecture/                # Arquitectura técnica, BD y evaluación de rúbrica
│   │   ├── ARQUITECTURA.md          # Arquitectura Clean/Hexagonal, DAO y SOLID
│   │   ├── DOCUMENTACION_RUBRICA.md # Informe formal de rúbrica (MVC, TDD, DAO, SOLID, Git)
│   │   ├── DIAGRAMA_ER.md           # Diccionario de datos y diseño físico MongoDB
│   │   └── db-structure.json        # Esquemas y muestras de documentos BSON
│   ├── requirements/                # Requerimientos de software y análisis de negocio
│   │   ├── REQUERIMIENTOS.md        # Catálogo consolidado oficial de requerimientos RF/RNF
│   │   ├── CASOS_DE_USO.md          # Casos de uso de negocio y diagramas de actores
│   │   └── PESTEL.md                # Análisis de macroentorno estratégico
│   ├── guides/                      # Guías de despliegue y producto
│   │   ├── GUIA_EJECUCION.md        # Guía paso a paso de instalación y ejecución local
│   │   └── ONBOARDING_ROADMAP.md    # Hoja de ruta del producto y flujo de onboarding
│   └── diagrams/                    # Modelado visual y diagramas
│       ├── DIAGRAMAS.md             # Especificación de diagramas y visualización Mermaid
│       ├── activity/                # Diagramas de actividad (Auth, Entrenamiento, Nutrición)
│       ├── logical/                 # Diagramas lógicos, diseño físico y de clases
│       └── workflows/               # Diagramas de flujo por rol (PlantUML + PNG)
│           ├── Flujo_Usuario.puml (.png)
│           ├── Flujo_Nutricionista.puml (.png)
│           ├── Flujo_Entrenador.puml (.png)
│           └── Flujo_Administrador.puml (.png)
├── scripts/                         # Scripts de automatización y base de datos
│   ├── database/                    # Diagnóstico e inspección física de colecciones
│   ├── fixValidation.ts
│   ├── migrateRoutines.ts
│   └── seedData.ts
├── src/                             # Código fuente de la aplicación (Next.js 16)
│   ├── proxy.ts                     # Edge Proxy RBAC (Next.js 16 standard)
│   ├── actions/                     # Server Actions desacopladas (Controladores)
│   ├── app/                         # App Router (Vistas Server/Client Components)
│   ├── components/                  # Componentes de UI reactivos reutilizables
│   ├── lib/
│   │   ├── dao/                     # Capa de Acceso a Datos (DAO Pattern)
│   │   ├── domain/                  # Lógica de Dominio Puro (SOLID - SRP)
│   │   ├── db/                      # Conexión nativa a MongoDB y seeder
│   │   └── schemas/                 # Validación en tiempo de ejecución con Zod
│   └── __tests__/                   # Suite de pruebas unitarias TDD con Vitest (22 tests)
├── package.json
└── tsconfig.json
```

---

## 📚 Documentación Técnica Adicional

Para profundizar en el diseño e ingeniería del sistema, consulta los siguientes documentos organizados en la carpeta `docs/`:

- 🚀 [docs/guides/GUIA_EJECUCION.md](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/docs/guides/GUIA_EJECUCION.md): Guía paso a paso para clonar, configurar, sembrar y correr el proyecto.
- 📄 [docs/architecture/DOCUMENTACION_RUBRICA.md](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/docs/architecture/DOCUMENTACION_RUBRICA.md): Mapeo punto por punto de MVC, DAO, SOLID, TDD, Seguridad y equivalencias con librerías Java.
- 📐 [docs/architecture/ARQUITECTURA.md](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/docs/architecture/ARQUITECTURA.md): Especificación arquitectónica técnica y diseño modular.
- 📋 [docs/requirements/REQUERIMIENTOS.md](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/docs/requirements/REQUERIMIENTOS.md): Especificación formal completa de requerimientos funcionales y no funcionales.
- 🗄 [docs/architecture/DIAGRAMA_ER.md](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/docs/architecture/DIAGRAMA_ER.md): Diccionario de colecciones, índices y esquemas de MongoDB.
- 📊 [docs/diagrams/workflows/](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/docs/diagrams/workflows/): Diagramas de flujo PlantUML y renderizados PNG de todos los roles del sistema.
- 📑 [docs/diagrams/DIAGRAMAS.md](file:///c:/Users/Usuario/Documents/Proyectos/Base%20de%20Datos/HyperTrack%20-%20mongoDB/docs/diagrams/DIAGRAMAS.md): Modelado de procesos en diagramas Mermaid interactivos.

