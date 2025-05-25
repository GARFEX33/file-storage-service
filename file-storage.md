
---

### Documentación Técnica: Microservicio de Almacenamiento de Archivos (file-storage-service)

**Versión:** 1.0
**Fecha:** 2025-05-23

**Índice:**

1.  Introducción y Objetivos
2.  Alcance y Funcionalidades
3.  Arquitectura del Sistema
4.  Stack Tecnológico
5.  Estructura de Almacenamiento de Archivos (Sistema de Archivos)
    5.1. Definición de la Estructura de Carpetas
    5.2. Ejemplos de Rutas
6.  Modelo de Datos (PostgreSQL)
    6.1. Diagrama Entidad-Relación (Conceptual)
    6.2. Definición de Tablas
        6.2.1. Tabla `Clientes`
        6.2.2. Tabla `Lugares`
        6.2.3. Tabla `TiposServicio`
        6.2.4. Tabla `Archivos`
7.  API REST
    7.1. Principios Generales
    7.2. Endpoints
        7.2.1. Subir Archivo
        7.2.2. Listar Archivos
        7.2.3. Descargar Archivo
        7.2.4. Eliminar Archivo
    7.3. Documentación OpenAPI (Swagger)
8.  Lógica de Negocio Clave
    8.1. Proceso de Carga de Archivos
    8.2. Manejo de Duplicados
    8.3. Generación de Rutas de Almacenamiento
9.  Consideraciones de Seguridad (Básicas)
10. Despliegue y Contenerización
11. Futuras Mejoras y Consideraciones

---

#### 1. Introducción y Objetivos

Este documento describe la arquitectura y el diseño técnico del `file-storage-service`. El propósito principal de este microservicio es proporcionar una solución centralizada y organizada para el almacenamiento y la gestión de archivos diversos (fotos, PDFs, reportes, etc.) generados en el contexto de los servicios prestados por la empresa, tales como mantenimientos, levantamientos y obras.

**Objetivos Clave:**

*   **Almacenamiento Centralizado:** Guardar archivos de manera segura y estructurada.
*   **Acceso Programático:** Exponer una API REST para la interacción con los archivos (subir, listar, descargar, eliminar).
*   **Gestión de Metadatos:** Almacenar y consultar metadatos relevantes de los archivos en una base de datos PostgreSQL.
*   **Organización Lógica:** Implementar una estructura de carpetas intuitiva y adaptable a los diferentes tipos de servicios y contextos (cliente, lugar, periodicidad, equipo, tarea).
*   **Facilitar la Integración:** Servir como un servicio de apoyo para otras aplicaciones o sistemas que necesiten gestionar archivos.

Este documento está dirigido a desarrolladores, arquitectos de software y cualquier miembro del equipo técnico involucrado en el desarrollo, mantenimiento o integración con este servicio.

#### 2. Alcance y Funcionalidades

**Funcionalidades Incluidas:**

*   **Carga de Archivos:** Permitir la subida de archivos individuales a través de la API.
*   **Descarga de Archivos:** Permitir la descarga de archivos individuales a través de la API mediante un identificador único o ruta.
*   **Listado de Archivos:** Proveer la capacidad de listar archivos y sus metadatos, con opciones de filtrado (por cliente, lugar, tipo de servicio, fecha de realización, etc.).
*   **Eliminación de Archivos:** Permitir la eliminación de archivos y sus metadatos correspondientes.
*   **Almacenamiento de Metadatos:** Guardar información contextual sobre cada archivo (cliente, lugar, tipo de servicio, fecha de carga, fecha de realización del servicio, etc.) en PostgreSQL.
*   **Estructura de Carpetas Dinámica:** Crear y organizar archivos en el sistema de ficheros siguiendo una lógica predefinida basada en el tipo de servicio y otros parámetros.

**Funcionalidades Excluidas (en esta versión):**

*   **Control de Versiones de Archivos:** Si un archivo con el mismo nombre y en la misma ruta ya existe, la subida será rechazada. No se almacenarán versiones anteriores.
*   **Transformación de Archivos:** El servicio no modificará el contenido de los archivos.
*   **Interfaz de Usuario (UI):** Este servicio es puramente backend y expone una API. Cualquier UI será desarrollada por un servicio consumidor.
*   **Autenticación/Autorización Avanzada:** Se asume un mecanismo de autenticación/autorización a nivel de gateway o manejado por el cliente de la API. Se pueden añadir hooks básicos si es necesario.

#### 3. Arquitectura del Sistema

El `file-storage-service` es un microservicio autocontenido que consta de los siguientes componentes principales:

1.  **API REST (Node.js + Express):** Punto de entrada para todas las interacciones. Maneja las solicitudes HTTP, valida entradas y orquesta las operaciones.
2.  **Lógica de Negocio:** Implementa las reglas para la gestión de archivos, incluyendo la creación de la estructura de carpetas, la interacción con la base de datos y el manejo de archivos.
3.  **Manejo de Archivos (Multer):** Middleware para procesar los archivos subidos (multipart/form-data).
4.  **Almacenamiento Físico de Archivos:** Un volumen o directorio en el sistema de archivos del servidor (o un servicio de almacenamiento de objetos como S3 en el futuro) donde se guardan los archivos físicos.
5.  **ORM (Prisma):** Capa de abstracción para interactuar con la base de datos PostgreSQL.
6.  **Base de Datos de Metadatos (PostgreSQL):** Almacena toda la información descriptiva y contextual de los archivos.

```mermaid
graph TD
    ClienteAPI[Cliente de la API / Otra Aplicación] -->|HTTP Request| APIGateway(API Gateway / Load Balancer);
    APIGateway -->|HTTP Request| FileStorageService[file-storage-service];

    subgraph FileStorageService
        APIRest[API REST (Express.js)]
        LogicaNegocio[Lógica de Negocio]
        MulterMiddleware[Multer (Manejo de Archivos)]
        PrismaORM[Prisma ORM]

        APIRest -- Procesa Petición --> MulterMiddleware;
        MulterMiddleware -- Archivo --> LogicaNegocio;
        APIRest -- Datos Petición --> LogicaNegocio;
        LogicaNegocio -- CRUD Metadatos --> PrismaORM;
        LogicaNegocio -- Guarda/Lee Archivo --> SistemaArchivos[Sistema de Archivos / Volumen];
        PrismaORM -- SQL --> PostgreSQL[Base de Datos PostgreSQL];
    end

    style FileStorageService fill:#f9f,stroke:#333,stroke-width:2px
```

#### 4. Stack Tecnológico

*   **Lenguaje de Programación y Framework Backend:** Node.js con Express.js  exclusivamente Typescrips
*   **Manejo de Carga de Archivos:** Multer
*   **ORM (Object-Relational Mapper):** Prisma
*   **Base de Datos:** PostgreSQL (instancia ya existente y gestionada)
*   **Contenerización:** Docker
*   **Documentación de API:** OpenAPI Specification (anteriormente Swagger)
*   **Control de Versiones (Código Fuente):** Git (alojado en Github)

#### 5. Estructura de Almacenamiento de Archivos (Sistema de Archivos)

La organización de los archivos en el sistema de ficheros es crucial para la mantenibilidad y la fácil recuperación. La estructura se basará en el tipo de servicio y la información contextual proporcionada durante la carga del archivo.

##### 5.1. Definición de la Estructura de Carpetas

La ruta base para todos los archivos será una carpeta configurable (e.g., `/mnt/file_storage/`). Dentro de esta, la estructura será:

`{CarpetaPrincipal}/{Cliente}/{Lugar}/{SubNivel_1}/{SubNivel_2_Opcional}/{NombreArchivoConExtension}`

Donde:

*   **`{CarpetaPrincipal}`:** Define la categoría general del servicio. Valores posibles:
    *   `Mantenimientos`
    *   `Levantamientos`
    *   `Obras`
*   **`{Cliente}`:** Nombre del cliente asociado al archivo/servicio. (e.g., "Dalinde", "ClienteX"). Este nombre debe ser sanitizado para ser compatible con nombres de directorio.
*   **`{Lugar}`:** Nombre del lugar, edificio o sitio específico del servicio. (e.g., "Quintana Roo", "Tuxpan 27", "SitioY"). Sanitizado.
*   **`{SubNivel_1}`:** Varía según la `CarpetaPrincipal`:
    *   Si `CarpetaPrincipal` es `Mantenimientos`:
        *   `{SubNivel_1}` será la **`Periocidad`** del servicio. Este campo debe ser lo suficientemente descriptivo para reflejar el periodo del mantenimiento.
            *   Ejemplos: "Primer semestre 2024", "Anual 2023", "Mensual 05-2024", "Visita 2024-05-15".
            *   Se recomienda un formato consistente, por ejemplo, `YYYY-MM` para mensual, `YYYY-QX` para trimestral, `YYYY-SemestreX` para semestral, o `YYYY-MM-DD` para fechas específicas si la periodicidad es por visita puntual. Sanitizado.
    *   Si `CarpetaPrincipal` es `Levantamientos` u `Obras`:
        *   `{SubNivel_1}` será el **`IdentificadorTarea`** o nombre del proyecto/trabajo específico (e.g., "Instalacion nueva", "Revision Estructural", "Proyecto Alpha"). La fecha específica de realización del levantamiento o de la fase de la obra se almacenará como metadato en la base de datos para permitir búsquedas y filtros precisos, sin sobrecargar la estructura de directorios. Sanitizado.
*   **`{SubNivel_2_Opcional}`:**
    *   Si `CarpetaPrincipal` es `Mantenimientos`:
        *   `{SubNivel_2_Opcional}` será el **`Equipo`** o activo específico al que se le dio servicio (e.g., "Tablero A", "Unidad HVAC 01"). Sanitizado.
    *   Si `CarpetaPrincipal` es `Levantamientos` u `Obras`:
        *   Este nivel generalmente no se usa, pero la estructura podría permitirlo si se identifica una necesidad futura. Por ahora, se omite para estos tipos.
*   **`{NombreArchivoConExtension}`:** El nombre original del archivo subido (e.g., "reporte_final.pdf", "foto_evidencia_01.jpg").

**Nota sobre la Fecha de Realización del Servicio:**
Si bien la `Periocidad` en Mantenimientos puede implicar una fecha, para todos los tipos de servicio (Mantenimientos, Levantamientos, Obras), se almacenará una **`fecha_realizacion_servicio`** explícita en la base de datos (ver Sección 6.2.4). Esto permite una mayor precisión para el seguimiento y la búsqueda, independientemente de la fecha de subida del archivo o la granularidad de la `Periocidad` en la estructura de carpetas.

##### 5.2. Ejemplos de Rutas

Suponiendo una ruta base de `/srv/storage/`:

1.  **Mantenimiento (con periodicidad mensual):**
    *   Input: Cliente="Dalinde", Lugar="Quintana Roo", Periocidad="2024-05", Equipo="Tablero A", Archivo="diagnostico.pdf", FechaRealizacionServicio="2024-05-15"
    *   Ruta: `/srv/storage/Mantenimientos/Dalinde/Quintana_Roo/2024-05/Tablero_A/diagnostico.pdf`
    *   Metadato Adicional en BD: `fecha_realizacion_servicio = '2024-05-15'`

2.  **Levantamiento:**
    *   Input: Cliente="Dalinde", Lugar="Tuxpan 27", Tarea="Instalacion nueva", Archivo="plano_electrico.dwg", FechaRealizacionServicio="2024-04-20"
    *   Ruta: `/srv/storage/Levantamientos/Dalinde/Tuxpan_27/Instalacion_nueva/plano_electrico.dwg`
    *   Metadato Adicional en BD: `fecha_realizacion_servicio = '2024-04-20'`

3.  **Obra:**
    *   Input: Cliente="ConstructoraXYZ", Lugar="Edificio Central", Tarea="Fase 1 - Cimentacion", Archivo="informe_avance.docx", FechaRealizacionServicio="2024-03-10"
    *   Ruta: `/srv/storage/Obras/ConstructoraXYZ/Edificio_Central/Fase_1_-_Cimentacion/informe_avance.docx`
    *   Metadato Adicional en BD: `fecha_realizacion_servicio = '2024-03-10'`

**Nota sobre sanitización:** Los valores de `Cliente`, `Lugar`, `Periocidad`, `Equipo`, `IdentificadorTarea` deben ser sanitizados para crear nombres de directorio válidos (e.g., reemplazar espacios con guiones bajos, eliminar caracteres especiales).

#### 6. Modelo de Datos (PostgreSQL)

La base de datos PostgreSQL almacenará los metadatos de los archivos y las entidades relacionadas que ayudan a contextualizarlos y organizarlos.

##### 6.1. Diagrama Entidad-Relación (Conceptual)

```mermaid
erDiagram
    CLIENTES ||--o{ ARCHIVOS : "tiene"
    LUGARES ||--o{ ARCHIVOS : "ubicado_en"
    TIPOS_SERVICIO ||--o{ ARCHIVOS : "es_de_tipo"

    CLIENTES {
        UUID id PK
        String nombre_cliente UK
        String detalles
        DateTime created_at
        DateTime updated_at
    }

    LUGARES {
        UUID id PK
        String nombre_lugar UK
        String direccion
        String detalles
        DateTime created_at
        DateTime updated_at
    }

    TIPOS_SERVICIO {
        UUID id PK
        String nombre_tipo_servicio UK ("Mantenimientos", "Levantamientos", "Obras")
        String descripcion
        DateTime created_at
        DateTime updated_at
    }

    ARCHIVOS {
        UUID id PK
        String nombre_original_archivo
        String nombre_archivo_almacenado  // Podría ser un UUID o el mismo nombre original
        String mime_type
        BIGINT tamano_bytes
        String ruta_almacenamiento_fisico UK // Ruta completa en el sistema de archivos
        UUID cliente_id FK
        UUID lugar_id FK
        UUID tipo_servicio_id FK
        String periodicidad NULL // Para Mantenimientos (e.g., "2024-05", "Primer Semestre 2024")
        String nombre_equipo NULL // Para Mantenimientos
        String identificador_tarea NULL // Para Levantamientos/Obras
        Date fecha_realizacion_servicio NULL // Fecha efectiva del servicio/levantamiento/fase de obra
        String hash_contenido NULL // Opcional, para detectar duplicados exactos
        JSONB metadatos_adicionales NULL // Para flexibilidad
        UUID subido_por_usuario_id NULL // Si se integra con sistema de usuarios
        DateTime fecha_subida
        DateTime updated_at
    }
```
*Nota: `UK` significa Unique Key. `FK` significa Foreign Key.*

##### 6.2. Definición de Tablas

###### 6.2.1. Tabla `Clientes`
Almacena información sobre los clientes.

*   `id` (UUID, PK): Identificador único del cliente.
*   `nombre_cliente` (VARCHAR, UNIQUE, NOT NULL): Nombre del cliente.
*   `detalles` (TEXT, NULLABLE): Información adicional sobre el cliente.
*   `created_at` (TIMESTAMP, DEFAULT NOW()): Fecha de creación.
*   `updated_at` (TIMESTAMP, DEFAULT NOW()): Fecha de última actualización.

###### 6.2.2. Tabla `Lugares`
Almacena información sobre los lugares, edificios o sitios.

*   `id` (UUID, PK): Identificador único del lugar.
*   `nombre_lugar` (VARCHAR, UNIQUE, NOT NULL): Nombre del lugar/edificio.
*   `direccion` (VARCHAR, NULLABLE): Dirección del lugar.
*   `detalles` (TEXT, NULLABLE): Información adicional sobre el lugar.
*   `created_at` (TIMESTAMP, DEFAULT NOW()): Fecha de creación.
*   `updated_at` (TIMESTAMP, DEFAULT NOW()): Fecha de última actualización.

###### 6.2.3. Tabla `TiposServicio`
Define los tipos principales de servicio que generan archivos.

*   `id` (UUID, PK): Identificador único del tipo de servicio.
*   `nombre_tipo_servicio` (VARCHAR, UNIQUE, NOT NULL): Nombre del tipo ("Mantenimientos", "Levantamientos", "Obras").
*   `descripcion` (TEXT, NULLABLE): Descripción del tipo de servicio.
*   `created_at` (TIMESTAMP, DEFAULT NOW()): Fecha de creación.
*   `updated_at` (TIMESTAMP, DEFAULT NOW()): Fecha de última actualización.
    *   *Poblar inicialmente con: ('Mantenimientos', 'Servicios de mantenimiento preventivo y correctivo'), ('Levantamientos', 'Levantamientos técnicos para cotizaciones o estudios'), ('Obras', 'Documentación relacionada con ejecución de obras').*

###### 6.2.4. Tabla `Archivos`
Tabla central que almacena los metadatos de cada archivo.

*   `id` (UUID, PK): Identificador único del archivo.
*   `nombre_original_archivo` (VARCHAR, NOT NULL): Nombre del archivo tal como fue subido por el usuario.
*   `nombre_archivo_almacenado` (VARCHAR, NOT NULL): Nombre del archivo como se guarda en el disco (puede ser el mismo que el original o uno sanitizado/único si es necesario).
*   `mime_type` (VARCHAR, NOT NULL): Tipo MIME del archivo (e.g., "application/pdf", "image/jpeg").
*   `tamano_bytes` (BIGINT, NOT NULL): Tamaño del archivo en bytes.
*   `ruta_almacenamiento_fisico` (VARCHAR, UNIQUE, NOT NULL): Ruta completa y absoluta donde el archivo está guardado en el sistema de archivos. Esta ruta debe ser única.
*   `cliente_id` (UUID, FK, NOT NULL): Referencia a `Clientes.id`.
*   `lugar_id` (UUID, FK, NOT NULL): Referencia a `Lugares.id`.
*   `tipo_servicio_id` (UUID, FK, NOT NULL): Referencia a `TiposServicio.id`.
*   `periodicidad` (VARCHAR, NULLABLE): Periodicidad del servicio (principalmente para tipo "Mantenimientos", e.g., "2024-05", "Primer Semestre 2024", "Visita 2024-05-15").
*   `nombre_equipo` (VARCHAR, NULLABLE): Nombre del equipo (solo para tipo "Mantenimientos").
*   `identificador_tarea` (VARCHAR, NULLABLE): Identificador de la tarea/proyecto (solo para tipos "Levantamientos" y "Obras").
*   **`fecha_realizacion_servicio` (DATE, NULLABLE): Fecha en que se realizó efectivamente el servicio, levantamiento o la fase de la obra. Este campo es crucial para el seguimiento y la búsqueda precisa del contexto temporal del archivo.**
*   `hash_contenido` (VARCHAR, NULLABLE): Hash (e.g., SHA256) del contenido del archivo. Útil para detectar duplicados exactos si se desea implementar.
*   `metadatos_adicionales` (JSONB, NULLABLE): Campo flexible para cualquier otro metadato relevante.
*   `subido_por_usuario_id` (UUID, NULLABLE): ID del usuario que subió el archivo (si se integra con un sistema de usuarios).
*   `fecha_subida` (TIMESTAMP, DEFAULT NOW()): Fecha y hora de subida del archivo.
*   `updated_at` (TIMESTAMP, DEFAULT NOW()): Fecha de última actualización del registro.

#### 7. API REST

La API REST será la interfaz para interactuar con el servicio. Se utilizarán métodos HTTP estándar y códigos de estado.

##### 7.1. Principios Generales

*   **Formato de Datos:** JSON para solicitudes y respuestas.
*   **Manejo de Errores:** Se utilizarán códigos de estado HTTP apropiados (4xx para errores del cliente, 5xx para errores del servidor) y cuerpos de respuesta JSON con un mensaje de error descriptivo.
    ```json
    {
      "error": {
        "code": "RESOURCE_NOT_FOUND",
        "message": "El archivo solicitado no existe."
      }
    }
    ```
*   **Content-Type:** `application/json` para la mayoría de las respuestas, `multipart/form-data` para la subida de archivos.

##### 7.2. Endpoints

###### 7.2.1. Subir Archivo

*   **Endpoint:** `POST /api/v1/files/upload`
*   **Descripción:** Sube un nuevo archivo al sistema.
*   **Content-Type:** `multipart/form-data`
*   **Form Data:**
    *   `file` (File, Requerido): El archivo a subir.
    *   `clienteNombre` (String, Requerido): Nombre del cliente.
    *   `lugarNombre` (String, Requerido): Nombre del lugar/edificio.
    *   `tipoServicioNombre` (String, Requerido): Nombre del tipo de servicio ("Mantenimientos", "Levantamientos", "Obras").
    *   `periodicidad` (String, Opcional): Periodicidad (especialmente para "Mantenimientos", e.g., "2024-05", "Primer Semestre 2024").
    *   `equipoNombre` (String, Opcional): Nombre del equipo (si `tipoServicioNombre` es "Mantenimientos").
    *   `tareaIdentificador` (String, Opcional): Identificador de la tarea (si `tipoServicioNombre` es "Levantamientos" u "Obras").
    *   **`fechaRealizacionServicio` (String, Opcional, formato YYYY-MM-DD): Fecha en que se realizó el servicio/levantamiento/obra.**
    *   `metadatosAdicionales` (JSON String, Opcional): String JSON con metadatos extra.
*   **Respuesta Exitosa (201 Created):**
    ```json
    {
      "data": {
        "id": "uuid-del-archivo",
        "nombreOriginalArchivo": "reporte.pdf",
        "rutaAlmacenamientoFisico": "/srv/storage/Mantenimientos/ClienteX/LugarY/PerZ/EqW/reporte.pdf",
        "urlDescarga": "/api/v1/files/download/uuid-del-archivo", // o por ruta
        "fechaRealizacionServicio": "2024-05-15"
        // ...otros metadatos del archivo
      }
    }
    ```
*   **Errores Comunes:**
    *   `400 Bad Request`: Faltan parámetros requeridos, tipo de servicio no válido, formato de fecha incorrecto, etc.
    *   `409 Conflict`: El archivo (misma ruta y nombre) ya existe.
    *   `500 Internal Server Error`: Error al guardar el archivo o los metadatos.

###### 7.2.2. Listar Archivos

*   **Endpoint:** `GET /api/v1/files`
*   **Descripción:** Lista archivos con opción de filtrado.
*   **Query Parameters (Opcionales):**
    *   `clienteId` (UUID)
    *   `lugarId` (UUID)
    *   `tipoServicioId` (UUID)
    *   `clienteNombre` (String)
    *   `lugarNombre` (String)
    *   `tipoServicioNombre` (String)
    *   `periodicidad` (String)
    *   `equipoNombre` (String)
    *   `tareaIdentificador` (String)
    *   **`fechaRealizacionDesde` (ISO8601 Date, YYYY-MM-DD): Para filtrar por `fecha_realizacion_servicio` >= este valor.**
    *   **`fechaRealizacionHasta` (ISO8601 Date, YYYY-MM-DD): Para filtrar por `fecha_realizacion_servicio` <= este valor.**
    *   `fechaSubidaDesde` (ISO8601 Date, YYYY-MM-DD)
    *   `fechaSubidaHasta` (ISO8601 Date, YYYY-MM-DD)
    *   `limit` (Integer, default: 20)
    *   `offset` (Integer, default: 0)
    *   `sortBy` (String, e.g., "fecha_subida", "fecha_realizacion_servicio", "nombre_original_archivo")
    *   `sortOrder` (String, "asc" | "desc")
*   **Respuesta Exitosa (200 OK):**
    ```json
    {
      "data": [
        {
          "id": "uuid-archivo-1",
          "nombreOriginalArchivo": "reporte1.pdf",
          "fechaRealizacionServicio": "2024-05-15",
          // ...otros metadatos
        },
        {
          "id": "uuid-archivo-2",
          "nombreOriginalArchivo": "foto1.jpg",
          "fechaRealizacionServicio": "2024-04-20",
          // ...otros metadatos
        }
      ],
      "pagination": {
        "totalItems": 100,
        "limit": 20,
        "offset": 0,
        "totalPages": 5,
        "currentPage": 1
      }
    }
    ```

###### 7.2.3. Descargar Archivo

*   **Endpoint:** `GET /api/v1/files/download/{fileId}`
    *   Alternativa: `GET /api/v1/files/download-by-path?path={encodedPath}` (si se prefiere descargar por ruta, aunque ID es más robusto a cambios de estructura).
*   **Descripción:** Descarga un archivo específico por su ID.
*   **Path Parameters:**
    *   `fileId` (UUID, Requerido): ID del archivo a descargar.
*   **Respuesta Exitosa (200 OK):**
    *   El cuerpo de la respuesta es el contenido binario del archivo.
    *   Headers:
        *   `Content-Type`: (MIME type del archivo)
        *   `Content-Disposition`: `attachment; filename="nombre_original_archivo.ext"`
*   **Errores Comunes:**
    *   `404 Not Found`: Archivo no encontrado.

###### 7.2.4. Eliminar Archivo

*   **Endpoint:** `DELETE /api/v1/files/{fileId}`
*   **Descripción:** Elimina un archivo y sus metadatos.
*   **Path Parameters:**
    *   `fileId` (UUID, Requerido): ID del archivo a eliminar.
*   **Respuesta Exitosa (204 No Content):**
    *   Cuerpo vacío.
*   **Errores Comunes:**
    *   `404 Not Found`: Archivo no encontrado.
    *   `500 Internal Server Error`: Error al eliminar el archivo del disco o los metadatos.

##### 7.3. Documentación OpenAPI (Swagger)

Se generará y mantendrá un archivo `openapi.yaml` (o `swagger.json`) que describa detalladamente todos los endpoints, modelos de datos, parámetros y respuestas. Este archivo se utilizará para generar documentación interactiva de la API (e.g., con Swagger UI o ReDoc).

#### 8. Lógica de Negocio Clave

##### 8.1. Proceso de Carga de Archivos

1.  **Recepción de Solicitud:** La API recibe la solicitud `multipart/form-data`. Multer procesa el archivo y los campos de texto.
2.  **Validación de Parámetros:**
    *   Verificar que todos los campos requeridos estén presentes (`clienteNombre`, `lugarNombre`, `tipoServicioNombre`, y los condicionales según `tipoServicioNombre`).
    *   Validar que `tipoServicioNombre` sea uno de los valores permitidos.
    *   Validar el formato de `fechaRealizacionServicio` si se proporciona.
3.  **Resolución de Entidades:**
    *   Buscar o crear (`UPSERT`) registros en las tablas `Clientes`, `Lugares`, `TiposServicio` basados en los nombres proporcionados. Obtener sus IDs.
    *   Sanitizar los nombres para usarlos en rutas de directorios.
4.  **Construcción de Ruta de Almacenamiento:**
    *   Basado en `tipoServicioNombre` y los demás parámetros (`periodicidad`, `equipoNombre`, `tareaIdentificador`), construir la ruta de directorio completa según la estructura definida en la Sección 5.1.
    *   La ruta completa del archivo será `{rutaBase}/{estructuraDinamica}/{nombreOriginalArchivo}`.
5.  **Verificación de Duplicados:**
    *   Comprobar si ya existe un archivo en la `ruta_almacenamiento_fisico` calculada.
    *   Si existe, rechazar la subida con un error `409 Conflict`.
6.  **Creación de Directorios:**
    *   Asegurarse de que la estructura de directorios exista en el sistema de archivos. Si no, crearla recursivamente.
7.  **Almacenamiento Físico:**
    *   Guardar el archivo subido en la `ruta_almacenamiento_fisico` calculada.
8.  **Almacenamiento de Metadatos:**
    *   Crear un nuevo registro en la tabla `Archivos` con toda la información relevante: IDs de las entidades relacionadas, nombres, ruta, tamaño, MIME type, `periodicidad`, `nombre_equipo`, `identificador_tarea`, `fecha_realizacion_servicio` (según aplique), etc.
9.  **Respuesta:** Devolver una respuesta exitosa con los detalles del archivo subido.

##### 8.2. Manejo de Duplicados

Como se especificó, "si un archivo ya existe, la subida será rechazada". Esto se interpreta como: si ya existe un archivo con el **mismo nombre en la misma ruta de almacenamiento calculada**, la nueva subida se rechaza.
La unicidad se fuerza a nivel de la columna `ruta_almacenamiento_fisico` en la tabla `Archivos`.

##### 8.3. Generación de Rutas de Almacenamiento

La lógica para construir las rutas debe ser robusta y centralizada. Se recomienda una función auxiliar que tome los parámetros relevantes (`tipoServicio`, `cliente`, `lugar`, `periodicidad`, `equipoNombre`, `tareaIdentificador`, etc.) y devuelva la ruta de directorio sanitizada y normalizada.

#### 9. Consideraciones de Seguridad (Básicas)

*   **Validación de Entradas:** Todas las entradas de la API (parámetros, nombres de archivo) deben ser validadas y sanitizadas para prevenir ataques como Path Traversal.
*   **Límites de Tamaño de Archivo:** Configurar Multer y el servidor web para limitar el tamaño máximo de los archivos subidos.
*   **Tipos de Archivo Permitidos:** Considerar si se debe restringir la subida a ciertos tipos de archivo (MIME types) por seguridad.
*   **Permisos del Sistema de Archivos:** Asegurar que el servicio Node.js corra con los mínimos privilegios necesarios para acceder a la carpeta de almacenamiento.
*   **Autenticación/Autorización:** Aunque no se detalla aquí, este servicio debería estar protegido. La autenticación y autorización podrían ser manejadas por un API Gateway o un middleware dedicado en la aplicación Express. Se debe registrar quién sube/modifica archivos (`subido_por_usuario_id`).

#### 10. Despliegue y Contenerización

*   **Docker:** El servicio se empaquetará en una imagen Docker para facilitar el despliegue y la consistencia entre entornos. Se proveerá un `Dockerfile`.
*   **Variables de Entorno:** Configuración crítica (conexión a BD, ruta base de almacenamiento, límites) se gestionará mediante variables de entorno.
*   **Volúmenes:** La carpeta de almacenamiento de archivos debe ser un volumen persistente en Docker para que los datos no se pierdan si el contenedor se reinicia.

#### 11. Futuras Mejoras y Consideraciones

*   **Integración con Almacenamiento en la Nube:** Migrar el almacenamiento físico a servicios como AWS S3, Google Cloud Storage, o Azure Blob Storage para mayor escalabilidad, durabilidad y funcionalidades.
*   **Procesamiento Asíncrono:** Para archivos muy grandes o tareas post-subida (generación de thumbnails, escaneo de virus), considerar colas de mensajes y workers.
*   **Control de Versiones (Opcional):** Si la necesidad surge, implementar un sistema de versionado de archivos.
*   **Búsqueda de Texto Completo:** Integrar con motores de búsqueda (e.g., Elasticsearch) si se necesita buscar dentro del contenido de los archivos (para tipos soportados).
*   **Políticas de Retención y Archivado:** Definir e implementar políticas para el ciclo de vida de los archivos.

---

Este documento técnico detallado debería proporcionar una base sólida para tu equipo. Los puntos clave son:

1.  **Claridad en la estructura de carpetas:** Cómo se forma y qué información la compone.
2.  **Modelo de datos bien definido:** Qué se guarda en la base de datos y cómo se relaciona, incluyendo la `fecha_realizacion_servicio`.
3.  **API REST específica:** Qué endpoints existen y cómo interactuar con ellos, incluyendo los nuevos parámetros de fecha.
4.  **Lógica de negocio explícita:** Cómo se manejan las operaciones clave como la subida de archivos.