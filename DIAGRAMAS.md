# Diagramas de Uso del Sistema - HyperTrack

A continuación se presentan los flujos principales de la plataforma HyperTrack, explicados de forma sencilla y orientada a la experiencia del usuario final.

## 1. Inicio de Sesión de Usuarios

Este diagrama muestra cómo un usuario accede a la plataforma de forma segura para ver su información personal.

```mermaid
flowchart LR
    classDef startEnd fill:#00695c,stroke:#004d40,stroke-width:2px,color:#fff,font-weight:bold;
    classDef process fill:#26a69a,stroke:#00796b,stroke-width:2px,color:#fff;
    classDef condition fill:#fff,stroke:#26a69a,stroke-width:2px,color:#333;

    subgraph Usuario
        A([INICIO DEL<br/>PROCESO]):::startEnd
        B[Ingresa Correo y Contraseña]:::process
        H[Recibe mensaje de error]:::process
        I[Accede al Panel Principal]:::process
    end

    subgraph Plataforma
        C[Solicita validación]:::process
        F{¿Datos<br/>Correctos?}:::condition
    end

    subgraph BaseDeDatos [Base de Datos]
        D[Consulta información]:::process
        E[Confirma identidad]:::process
    end

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F -- No --> H
    F -- Sí --> I
    H --> A
    I --> J([FIN DEL<br/>PROCESO]):::startEnd
```

## 2. Registro de una Sesión de Entrenamiento

Así es como un usuario guarda sus rutinas de ejercicio diario para llevar el control de su progreso.

```mermaid
flowchart LR
    classDef startEnd fill:#00695c,stroke:#004d40,stroke-width:2px,color:#fff,font-weight:bold;
    classDef process fill:#26a69a,stroke:#00796b,stroke-width:2px,color:#fff;
    classDef condition fill:#fff,stroke:#26a69a,stroke-width:2px,color:#333;

    subgraph Usuario
        A([INICIO DEL<br/>PROCESO]):::startEnd
        B[Selecciona tipo de rutina]:::process
        C[Agrega un ejercicio]:::process
        D[Registra detalle de la serie]:::process
        E{¿Terminó el<br/>ejercicio?}:::condition
        F{¿Añadir otro<br/>ejercicio?}:::condition
        G[Finaliza la sesión]:::process
    end

    subgraph Plataforma
        H[Guarda el entrenamiento<br/>en el historial]:::process
        I([FIN DEL<br/>PROCESO]):::startEnd
    end

    A --> B
    B --> C
    C --> D
    D --> E
    E -- No --> D
    E -- Sí --> F
    F -- Sí --> C
    F -- No --> G
    G --> H
    H --> I
```

## 3. Generación de Gráficas de Progreso (Sobrecarga Progresiva)

Este proceso explica cómo el sistema analiza automáticamente los entrenamientos pasados para mostrarle al usuario cuánto ha mejorado.

```mermaid
flowchart LR
    classDef startEnd fill:#00695c,stroke:#004d40,stroke-width:2px,color:#fff,font-weight:bold;
    classDef process fill:#26a69a,stroke:#00796b,stroke-width:2px,color:#fff;
    classDef condition fill:#fff,stroke:#26a69a,stroke-width:2px,color:#333;

    subgraph Plataforma
        A([INICIO DEL<br/>PROCESO]):::startEnd
        B[Recopila entrenamientos<br/>del último mes]:::process
        C[Extrae ejercicios y series]:::process
        D[Calcula volumen total]:::process
        E[Organiza información]:::process
        F[Genera Gráfica de Progreso]:::process
    end

    subgraph Usuario
        G[Visualiza gráfica en el panel]:::process
        H([FIN DEL<br/>PROCESO]):::startEnd
    end

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
```

## 4. Registro Diario de Comidas y Nutrición

Flujo de cómo un usuario registra lo que come para llevar el control de sus calorías y nutrientes (proteínas, carbohidratos, grasas).

```mermaid
flowchart LR
    classDef startEnd fill:#00695c,stroke:#004d40,stroke-width:2px,color:#fff,font-weight:bold;
    classDef process fill:#26a69a,stroke:#00796b,stroke-width:2px,color:#fff;
    classDef condition fill:#fff,stroke:#26a69a,stroke-width:2px,color:#333;

    subgraph Usuario
        A([INICIO DEL<br/>PROCESO]):::startEnd
        B[Selecciona el momento del día]:::process
        C[Ingresa alimento y<br/>valores nutricionales]:::process
        E[Revisa los campos]:::process
    end

    subgraph Plataforma
        D{¿Información<br/>completa?}:::condition
        F[Suma calorías y nutrientes]:::process
        G[Actualiza barra de progreso]:::process
        H([FIN DEL<br/>PROCESO]):::startEnd
    end

    A --> B
    B --> C
    C --> D
    D -- No --> E
    E --> C
    D -- Sí --> F
    F --> G
    G --> H
```
