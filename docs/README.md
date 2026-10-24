# 📚 Centro de Documentación Técnica — HyperTrack

Bienvenido al centro de documentación de **HyperTrack**. Toda la documentación del proyecto ha sido organizada en módulos temáticos para facilitar su consulta y evaluación.

---

## 🧭 Mapa de Navegación de la Documentación

```text
docs/
├── architecture/                     # 1. Arquitectura de Software y Base de Datos
│   ├── ARQUITECTURA.md               # Especificación técnica (Clean Architecture, DAO, SOLID, Proxy)
│   ├── DOCUMENTACION_RUBRICA.md      # Informe de evaluación de rúbrica (MVC, TDD, DAO, SOLID, Git)
│   ├── DIAGRAMA_ER.md                # Diccionario de datos, índices y modelado de colecciones
│   └── db-structure.json             # Estructura física y tipos BSON de MongoDB
│
├── requirements/                     # 2. Requerimientos de Software y Negocio
│   ├── REQUERIMIENTOS.md             # Catálogo oficial exhaustivo de requerimientos RF y RNF
│   ├── CASOS_DE_USO.md               # Casos de uso de negocio y diagramas de actores
│   └── PESTEL.md                     # Análisis del macroentorno estratégico
│
├── guides/                           # 3. Guías Operativas y de Despliegue
│   ├── GUIA_EJECUCION.md             # Guía paso a paso para clonar, configurar, sembrar y ejecutar
│   └── ONBOARDING_ROADMAP.md         # Hoja de ruta del producto y flujo de onboarding
│
└── diagrams/                         # 4. Modelado Visual y Diagramas
    ├── DIAGRAMAS.md                  # Especificación de diagramas y visualización Mermaid
    ├── activity/                     # Diagramas de actividad por módulo (PlantUML)
    │   ├── DiagramaActividad_Auth.puml
    │   ├── DiagramaActividad_Entrenamiento.puml
    │   ├── DiagramaActividad_Nutricion.puml
    │   └── DiagramaActividad_Vinculacion.puml
    ├── logical/                      # Diagramas lógicos y de clases (PlantUML)
    │   ├── DiagramaLogico.puml
    │   ├── DiagramaClases.puml
    │   └── DISENO_FISICO_BD.puml
    └── workflows/                    # Flujos completos por rol (.puml + .svg)
        ├── Flujo_Usuario.puml / .svg       # Flujo de actividades del Atleta
        ├── Flujo_Nutricionista.puml / .svg # Flujo del Nutricionista y telemetría de carga
        ├── Flujo_Entrenador.puml / .svg    # Flujo del Entrenador y asignación de rutinas
        └── Flujo_Administrador.puml / .svg # Flujo del Administrador y auditoría forense
```

---

## 📑 Índice de Contenidos

### 1. Arquitectura y Rúbrica
- **[architecture/ARQUITECTURA.md](architecture/ARQUITECTURA.md):** Detalla la arquitectura hexagonal, la separación de capas (Presentación $\to$ Server Actions $\to$ Dominio Puro $\to$ Capa DAO $\to$ MongoDB), el Edge Proxy (`src/proxy.ts`), y la suite Vitest de pruebas unitarias.
- **[architecture/DOCUMENTACION_RUBRICA.md](architecture/DOCUMENTACION_RUBRICA.md):** Sustentación punto por punto de los requerimientos de la rúbrica de evaluación: MVC, Patrón DAO, Principios SOLID, TDD con 22 pruebas pasando, Criptografía Argon2id, mitigación de Timing Attacks, equivalencias con librerías Java (Guava, Commons, POI, Logback) y evidencia en Git/GitHub.
- **[architecture/DIAGRAMA_ER.md](architecture/DIAGRAMA_ER.md):** Diccionario completo de colecciones MongoDB, esquemas de validación `$jsonSchema`, índices y relaciones lógicas.
- **[architecture/db-structure.json](architecture/db-structure.json):** Muestra de tipos de datos BSON y estructura de las colecciones activas.

### 2. Requerimientos del Sistema
- **[requirements/REQUERIMIENTOS.md](requirements/REQUERIMIENTOS.md):** Catálogo consolidado oficial con 14 módulos funcionales detallados (fórmulas de Mifflin-St Jeor, Epley, WHR/OMS, telemetría de carga de 30 días, etc.) y tabla de trazabilidad hacia el código fuente.
- **[requirements/CASOS_DE_USO.md](requirements/CASOS_DE_USO.md):** Definición formal de casos de uso y actores del ecosistema HyperTrack.
- **[requirements/PESTEL.md](requirements/PESTEL.md):** Análisis de viabilidad estratégica del entorno Político, Económico, Social, Tecnológico, Ecológico y Legal.

### 3. Guías Operativas
- **[guides/GUIA_EJECUCION.md](guides/GUIA_EJECUCION.md):** Guía paso a paso para levantar el proyecto desde cero: requisitos previos, variables de entorno `.env.local`, `--legacy-peer-deps`, seeders, pruebas TDD y credenciales de prueba.
- **[guides/ONBOARDING_ROADMAP.md](guides/ONBOARDING_ROADMAP.md):** Roadmap funcional y experiencia guiada de registro para nuevos atletas.

### 4. Diagramas de Procesos
- **[diagrams/DIAGRAMAS.md](diagrams/DIAGRAMAS.md):** Resumen visual de flujos en diagramas Mermaid integrados en Markdown.
- **[diagrams/workflows/](diagrams/workflows/):** Diagramas de flujo PlantUML oficiales con sus correspondientes archivos vectoriales **SVG** actualizados en alta resolución para cada uno de los 4 roles del sistema.
- **[diagrams/activity/](diagrams/activity/):** Diagramas de actividad PlantUML y **SVG** para Autenticación, Entrenamiento, Nutrición y Vinculación.
- **[diagrams/logical/](diagrams/logical/):** Diagrama lógico general, diagrama de clases del dominio y diseño físico de base de datos en PlantUML y **SVG**.
