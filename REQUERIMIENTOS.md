# Requerimientos de Software - HyperTrack

## 1. Requerimientos Funcionales (RF)
Los Requerimientos Funcionales describen el comportamiento, las acciones y los servicios que el sistema debe realizar.

### 1.1. Gestión de Usuarios y Roles
- **RF-01 (Autenticación y Registro):** El sistema debe permitir el registro y autenticación de usuarios mediante credenciales encriptadas (correo y contraseña).
- **RF-02 (Perfiles y Roles):** El sistema debe soportar tres tipos de roles: `USER` (Atleta), `PRO` (Coach/Nutricionista) y `ADMIN`.
- **RF-03 (Onboarding Completo):** Los usuarios de tipo `USER` deben poder completar un formulario de ingreso detallado, que recopile información sobre datos personales, métricas biométricas iniciales (peso, altura, % de grasa), objetivo (ej: hipertrofia, pérdida de grasa) y estilo de vida (nivel de estrés, experiencia, frecuencia de entrenamiento).

### 1.2. Módulo de Entrenamiento (Workouts)
- **RF-04 (Creación de Rutinas):** Los entrenadores y atletas deben poder crear y almacenar rutinas personalizadas.
- **RF-05 (Registro de Sesiones):** Los usuarios deben poder iniciar y registrar sus sesiones de entrenamiento, incluyendo los ejercicios, repeticiones, peso utilizado (KG o LBS) y Tiempo de descanso.
- **RF-06 (Tracking de Récords Personales - PR):** El sistema debe identificar, registrar y mostrar automáticamente cuando el atleta supere su peso máximo histórico en un ejercicio.
- **RF-07 (Programas Asignados):** El sistema debe permitir a los roles `PRO` (Coach) asignar programas de entrenamiento semanales a los `USER`.

### 1.3. Módulo de Biometría y Salud
- **RF-08 (Registro de Medidas):** Los usuarios deben poder ingresar y consultar el historial de su peso corporal y opcionalmente, medidas circunferenciales (cintura, cadera, pecho, bíceps, etc.).
- **RF-09 (Cálculo de Indicadores Clínicos):** El sistema debe calcular y mostrar indicadores de salud como el Ratio Cintura-Cadera y advertir sobre los riesgos de salud basándose en el sexo.
- **RF-10 (Historial Visual):** El sistema debe generar gráficas y estadísticas del historial de peso y adherencia.

### 1.4. Módulo de Nutrición
- **RF-11 (Registro de Alimentos):** El usuario debe poder registrar sus comidas (Desayuno, Almuerzo, Cena, Snack) detallando las calorías y los macronutrientes (Proteínas, Carbohidratos, Grasas, Fibra) y nivel de hidratación.
- **RF-12 (Estimación Calórica):** El sistema (especialmente en la vista de nutricionista) debe calcular el TDEE (Gasto Energético Diario Total) real basándose en el peso, altura, edad, sexo y aplicando el multiplicador del nivel de actividad física (Mifflin-St Jeor).
- **RF-13 (Planes Nutricionales):** Los nutricionistas deben poder configurar requerimientos calóricos (Superávit, Déficit o Mantenimiento) y objetivos de macronutrientes para los clientes.

### 1.5. Dashboard y Vistas de Profesionales
- **RF-14 (Panel de Nutricionista):** El rol de Nutricionista debe poder ver un resumen del estado del cliente, incluyendo TDEE real estimado, nivel de actividad física, historial de medidas y adherencia nutricional.

---

## 2. Requerimientos No Funcionales (RNF)
Los Requerimientos No Funcionales determinan las condiciones de calidad, rendimiento y restricciones tecnológicas bajo las que debe operar el sistema.

### 2.1. Arquitectura y Stack Tecnológico
- **RNF-01 (Framework):** El sistema debe ser construido como una aplicación web Fullstack sobre **Next.js** (App Router).
- **RNF-02 (Base de Datos):** Los datos deben almacenarse en un clúster NoSQL utilizando **MongoDB**.
- **RNF-03 (Lenguaje):** Todo el código backend y frontend debe ser desarrollado de manera estricta bajo **TypeScript**.

### 2.2. Rendimiento y Usabilidad
- **RNF-04 (PWA - Progressive Web App):** El sistema debe ser capaz de funcionar como una aplicación web instalable en dispositivos móviles (PWA) mediante Service Workers, permitiendo una experiencia "App-Like".
- **RNF-05 (Diseño Responsivo):** La interfaz debe adaptarse dinámicamente tanto a dispositivos de escritorio (Monitores/Laptops) como a teléfonos móviles.
- **RNF-06 (Interfaz de Usuario Moderna):** El diseño debe tener un aspecto premium, utilizando una paleta de colores oscuro/Brutalista, tipografía moderna y micro-animaciones.

### 2.3. Seguridad y Privacidad
- **RNF-07 (Autenticación sin estado):** Las sesiones de usuario deben gestionarse mediante Json Web Tokens (JWT) guardados de forma segura en las cookies (HttpOnly).
- **RNF-08 (Validación Estricta):** Toda entrada de datos tanto del lado del cliente como del servidor debe ser filtrada y validada estrictamente usando la librería **Zod** para evitar inyecciones.
- **RNF-09 (Encriptación):** Las contraseñas en la base de datos deben estar hasheadas utilizando algoritmos fuertes (Argon2id/Bcrypt).

### 2.4. Mantenibilidad
- **RNF-10 (Control de Versiones):** El sistema debe manejarse y versionarse bajo **Git**.
- **RNF-11 (Estandarización):** El proyecto mantendrá reglas de formateo y validación de tipos estrictas.
