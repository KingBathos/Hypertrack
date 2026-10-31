# Guía de Ejecución Paso a Paso — HyperTrack

Esta guía proporciona el procedimiento exacto y verificado para clonar, configurar, poblar, probar y ejecutar **HyperTrack** en un entorno de desarrollo local desde cero.

---

## 1. Prerrequisitos del Sistema

Asegúrate de contar con los siguientes programas instalados en tu computadora:

1. **Node.js (LTS recomendado 20.x o superior):**
   ```bash
   node -v
   # Salida esperada: v20.x.x o v22.x.x
   ```
2. **NPM (incluido con Node.js):**
   ```bash
   npm -v
   # Salida esperada: 10.x.x o superior
   ```
3. **MongoDB:**
   - Opción A: **MongoDB Community Server** instalado y corriendo localmente en el puerto `27017`.
   - Opción B: Un clúster gratuito en la nube con **MongoDB Atlas** (necesitarás el string de conexión URI).
4. **Git:**
   ```bash
   git --version
   ```

---

## 2. Clonación y Configuración del Entorno

### Paso 2.1: Clonar el repositorio
Abre una terminal (PowerShell en Windows o Bash en macOS/Linux):

```bash
git clone https://github.com/TU_USUARIO/hypertrack-mongodb.git
cd "hypertrack-mongodb"
```

### Paso 2.2: Crear el archivo de Variables de Entorno `.env.local`
Copia la plantilla `.env.example` para crear tu configuración local:

```powershell
# En Windows (PowerShell):
Copy-Item .env.example .env.local

# En Linux o macOS:
cp .env.example .env.local
```

### Paso 2.3: Revisar el archivo `.env.local`
Abre `.env.local` con cualquier editor de texto y asegúrate de que contenga:

```env
# Conexión local a MongoDB (respetar la mayúscula 'HyperTrackb')
MONGODB_URI=mongodb://localhost:27017/HyperTrackb
MONGODB_DB=HyperTrackb

# Secreto para firma de tokens JWT (HS256)
AUTH_SECRET=F987768440a$super_secret_jwt_hypertrack_production_key_2026

# Factor de costo para Argon2/Bcrypt
BCRYPT_SALT_ROUNDS=12
```

> [!NOTE]
> Si estás usando MongoDB Atlas en lugar de MongoDB local, reemplaza `MONGODB_URI` con tu cadena de conexión que empieza con `mongodb+srv://...` asegurándote de incluir el nombre de la base de datos `HyperTrackb`.

---

## 3. Instalación de Dependencias

Instala los módulos de Node.js requeridos. **Importante:** Debido a que el proyecto utiliza React 19 y Next.js 16 con librerías del ecosistema React, se debe usar la bandera `--legacy-peer-deps`:

```bash
npm install --legacy-peer-deps
```

---

## 4. Poblado de la Base de Datos (Database Seeding)

Para poder probar de inmediato la plataforma con atletas, historiales de levantamiento, bitácoras de comidas y biometría, ejecuta el script de siembra automática:

```bash
npx ts-node run-seed.ts
```

*Verificación de éxito:* La terminal mostrará mensajes confirmando la creación de atletas de prueba y perfiles.

---

## 5. Ejecución de Pruebas Unitarias (TDD)

HyperTrack cuenta con una suite completa de pruebas unitarias desarrolladas bajo la metodología TDD con **Vitest**. Para ejecutarlas y comprobar que todos los cálculos matemáticos, clínicos y esquemas Zod funcionan al 100%:

```bash
npm test
```

### Resultados esperados:
- `metabolic.test.ts`: Valida ecuaciones BMR de Mifflin-St Jeor, TDEE real y distribución calórica de macros.
- `biomechanics.test.ts`: Valida fórmula de 1RM de Epley, volumen total de series y evaluación de RPE.
- `biometrics.test.ts`: Valida ratio cintura/cadera (WHR) y estratificación de riesgo cardiovascular según la OMS.
- `trainingLoad.test.ts`: Valida clasificación de carga de 30 días (`HEAVY`, `MODERATE`, `LIGHT`) y recomendaciones adaptativas de carbohidratos.
- `user.schema.test.ts`: Valida reglas de negocio para emails, contraseñas y unicidad.

**Total:** 5 suites de prueba, 22 tests ejecutados y pasando (0 fallos).

---

## 6. Comprobación Estática de Tipos (TypeScript)

Para asegurar que no existen incompatibilidades ni errores de tipado estricto:

```bash
npx tsc --noEmit
```

*El comando debe terminar en silencio con código de salida 0.*

---

## 7. Iniciar la Aplicación en Modo Desarrollo

Levanta el servidor local con soporte Webpack optimizado:

```bash
npm run dev
```

La consola indicará:
```text
  ▲ Next.js 16.2.10
  - Local:        http://localhost:3000
  - Experiments:  webpack
```

Abre tu navegador web en: **[http://localhost:3000](http://localhost:3000)**

---

## 8. Cuentas y Roles de Demostración para Pruebas

El sistema cuenta con un Control de Acceso Basado en Roles (RBAC) estricto administrado por el Edge Proxy (`src/proxy.ts`). Puedes probar cada uno de los roles:

### A. Rol Atleta / Usuario (`USER`)
- **Ruta principal:** `/dashboard`
- **Funcionalidades para probar:**
  1. **Actualizar Medidas:** En el Dashboard, tarjeta "Biometría", presiona *"Actualizar medidas"*, ingresa peso (ej. `78`), grasa y circunferencias, y pulsa *"Guardar"*. Observa el cálculo inmediato de WHR y el feedback visual.
  2. **Entrenamiento en Vivo:** Ve a `/workout/live`, agrega ejercicios, registra series con peso y RPE, y observa el cronómetro circular SVG de 90 segundos de descanso con audio/flash.
  3. **Nutrición:** Ve a `/nutrition`, registra alimentos y visualiza los anillos concéntricos interactivos de macronutrientes.

### B. Rol Nutricionista (`NUTRITIONIST`)
- **Ruta principal:** `/nutritionist`
- **Acceso:** Inicia sesión con credenciales profesionales o regístrate en `/register-pro` seleccionando el rol *Nutricionista*.
- **Funcionalidades para probar:**
  1. En `/nutritionist`, verás el roster de atletas y tu ID Público para vinculación.
  2. Haz clic en *"ESTABLECER MACROS"* de un atleta para abrir su ficha médica `/nutritionist/[clientId]`.
  3. **Telemetría de Carga de Entrenamiento:** Observa la tarjeta superior que clasifica el entrenamiento del atleta en **HEAVY / MODERATE / LIGHT** basándose en sus últimos 30 días de gimnasio.
  4. Lee las directrices clínicas de carbohidratos y nutrición adaptativa según el estímulo real del atleta.
  5. Ajusta el formulario de protocolo calórico y macronutrientes y pulsa *"Establecer Protocolo Nutricional"*.

### C. Rol Entrenador / Coach (`COACH`)
- **Ruta principal:** `/coach`
- **Acceso:** Inicia sesión con credenciales de entrenador o regístrate en `/register-pro` seleccionando el rol *Coach*.
- **Funcionalidades para probar:**
  1. Revisa el roster de atletas con su tonelaje acumulado en 4 semanas y sus récords estimados de 1RM (Banca, Sentadilla, Peso Muerto).
  2. Accede a `/coach/programs/new` para diseñar un nuevo programa de entrenamiento semanal por días.
  3. Asigna el programa a un atleta vinculado.

### D. Rol Administrador (`ADMIN`)
- **Ruta principal:** `/admin`
- **Acceso:** Conéctate a tu MongoDB y edita tu usuario en la colección `users`, cambiando `role: "USER"` por `role: "ADMIN"`.
- **Funcionalidades para probar:**
  1. Visualiza las métricas globales de la plataforma (usuarios activos, kilos levantados, planes vigentes).
  2. Cambia roles de usuarios en caliente mediante el menú desplegable y el botón *"Aplicar"*.
  3. Consulta la consola de **Auditoría Forense en Vivo**, alimentada por la colección `audit_logs` a través de `AuditDAO`.
  4. Accede a `/admin/exercises` para crear, editar y categorizar ejercicios en la biblioteca global.

---

## 9. Compilación y Ejecución para Producción

Para compilar el proyecto para un entorno de producción optimizado:

```bash
# 1. Generar el bundle de producción
npm run build

# 2. Iniciar el servidor productivo
npm start
```

---

## 10. Preguntas Frecuentes y Solución de Problemas

### 1. Error de instalación con npm: `ERESOLVE could not resolve`
- **Causa:** Conflicto de versiones peer dependencies entre React 19 y librerías auxiliares.
- **Solución:** Utiliza siempre la bandera `--legacy-peer-deps`:
  ```bash
  npm install --legacy-peer-deps
  ```

### 2. Error al guardar biometría: `Document failed validation`
- **Causa:** La base de datos MongoDB posee validadores `$jsonSchema` estrictos en la colección `body_measurements`.
- **Solución:** Ya está resuelto en el código mediante `ProfileDAO.insertMeasurement`, el cual garantiza que todos los campos requeridos (`clientId`, `logDate`, `metrics`, `audit`) cumplan al 100% con el esquema BSON.

### 3. Advertencia de Next.js sobre `middleware` deprecado
- **Causa:** Next.js 16 introdujo la convención `proxy.ts` y deprecó `middleware.ts`.
- **Solución:** El proyecto utiliza exclusivamente `src/proxy.ts` garantizando compatibilidad total con la última versión de Next.js.
