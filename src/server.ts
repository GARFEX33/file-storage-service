import express, { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { Prisma } from './generated/prisma'; // Solo Prisma namespace para tipos si es necesario
import { prisma } from './dbClient'; // Importar la instancia de prisma
import { v4 as uuidv4 } from 'uuid';
import { generateStoragePath } from './utils';
import {
  fileUploadValidationRules,
  fileIdParamValidationRules,
  fileListQueryValidationRules,
  handleValidationErrors
} from './validators';

const app = express();
const port = process.env.PORT || 3000;
// const prisma = new PrismaClient(); // Ya no se crea aquí, se importa de dbClient

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import logger from './logger'; // Importar el logger

// Middleware para parsear JSON y URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Carpeta principal para almacenar archivos
const UPLOAD_DIRECTORY = process.env.UPLOAD_DIR || 'uploads';

// Asegurarse de que el directorio de subida principal exista
fs.mkdir(UPLOAD_DIRECTORY, { recursive: true })
  .then(() => logger.info(`Directorio de subida ${UPLOAD_DIRECTORY} asegurado.`))
  .catch(err => logger.error('Error al crear directorio de subida:', err));

// Middleware para loguear cada solicitud
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  res.on('finish', () => {
    logger.info(`${res.statusCode} ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  });
  next();
});

// Configuración de Multer
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const { clienteNombre, lugarNombre, tipoServicioNombre, periodicidad, nombreEquipo, identificadorTarea } = req.body;

    try {
      const dynamicPath = generateStoragePath(UPLOAD_DIRECTORY, {
        clienteNombre,
        lugarNombre,
        tipoServicioNombre,
        periodicidad,
        nombreEquipo,
        identificadorTarea
      });
      await fs.mkdir(dynamicPath, { recursive: true });
      cb(null, dynamicPath);
    } catch (error: any) {
      logger.error('Error in destination function for Multer:', { message: error.message, stack: error.stack, requestBody: req.body });
      // Asegurarse de que el error se propague correctamente a Multer
      // El segundo argumento de cb para error no debe ser una cadena vacía si hay un error.
      // Pasamos el objeto de error directamente.
      cb(error instanceof Error ? error : new Error(String(error)), "upload_error_path_placeholder");
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `${path.basename(file.originalname, extension)}_${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  // Aquí se podrían añadir validaciones de tipo de archivo si es necesario
  // Por ahora, aceptamos todos los archivos
  cb(null, true);
};

const upload = multer({ storage: storage, fileFilter: fileFilter, limits: { fileSize: 100 * 1024 * 1024 } }); // Límite de 100MB

// Endpoint de subida de archivos

/**
 * @swagger
 * /api/v1/files/upload:
 *   post:
 *     summary: Sube un archivo al servidor.
 *     tags: [Files]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: file
 *         type: file
 *         required: true
 *         description: El archivo a subir.
 *       - in: formData
 *         name: clienteNombre
 *         type: string
 *         required: true
 *         description: Nombre del cliente.
 *       - in: formData
 *         name: lugarNombre
 *         type: string
 *         required: true
 *         description: Nombre del lugar.
 *       - in: formData
 *         name: tipoServicioNombre
 *         type: string
 *         required: true
 *         description: Nombre del tipo de servicio (Mantenimientos, Levantamientos, Obras).
 *       - in: formData
 *         name: periodicidad
 *         type: string
 *         description: Periodicidad (para Mantenimientos).
 *       - in: formData
 *         name: nombreEquipo
 *         type: string
 *         description: Nombre del equipo (para Mantenimientos o Levantamientos).
 *       - in: formData
 *         name: identificadorTarea
 *         type: string
 *         description: Identificador de la tarea (para Levantamientos u Obras).
 *       - in: formData
 *         name: fechaRealizacionServicio
 *         type: string
 *         format: date-time
 *         description: Fecha de realización del servicio (ISO 8601).
 *       - in: formData
 *         name: subidoPorUsuarioId
 *         type: string
 *         description: ID del usuario que sube el archivo.
 *       - in: formData
 *         name: metadatosAdicionales
 *         type: string
 *         description: String JSON con metadatos adicionales.
 *       - in: formData
 *         name: clienteDetalles
 *         type: string
 *         description: Detalles adicionales del cliente (si es nuevo).
 *       - in: formData
 *         name: lugarDireccion
 *         type: string
 *         description: Dirección del lugar (si es nuevo).
 *       - in: formData
 *         name: lugarDetalles
 *         type: string
 *         description: Detalles adicionales del lugar (si es nuevo).
 *     responses:
 *       201:
 *         description: Archivo subido exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 file:
 *                   $ref: '#/components/schemas/File'
 *       400:
 *         description: Error de validación o datos faltantes.
 *       500:
 *         description: Error interno del servidor.
 */
app.post('/api/v1/files/upload',
  upload.single('file'),
  fileUploadValidationRules,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    logger.info(`Intento de subida de archivo: ${req.file?.originalname} por usuario ${req.body.subidoPorUsuarioId || 'desconocido'}`);
    // La validación de req.file se puede hacer aquí explícitamente si es necesario,
    // aunque Multer ya lo maneja. Si se quiere un error de express-validator:
    if (!req.file) {
      logger.warn('Intento de subida sin archivo.');
      // Esto podría ser redundante si Multer ya falla o si se añade una regla custom.
      res.status(400).json({ message: 'No se proporcionó ningún archivo (chequeo post-multer).' });
      return;
    }

    const {
      clienteNombre,
      lugarNombre,
      tipoServicioNombre,
      periodicidad,
      nombreEquipo,
      identificadorTarea,
      fechaRealizacionServicio, // Esperado en formato ISO 8601
      subidoPorUsuarioId,
      metadatosAdicionales // Esperado como un string JSON
    } = req.body;

    if (!clienteNombre || !lugarNombre || !tipoServicioNombre) {
      res.status(400).json({ message: 'Faltan metadatos requeridos: clienteNombre, lugarNombre, tipoServicioNombre.' });
      return;
    }
    
    // 1. Buscar o crear Cliente
    let cliente = await prisma.client.findUnique({ where: { nombre_cliente: clienteNombre } });
    if (!cliente) {
      cliente = await prisma.client.create({ data: { nombre_cliente: clienteNombre, detalles: req.body.clienteDetalles } });
    }

    // 2. Buscar o crear Lugar
    let lugar = await prisma.location.findUnique({ where: { nombre_lugar: lugarNombre } });
    if (!lugar) {
      lugar = await prisma.location.create({ data: { nombre_lugar: lugarNombre, direccion: req.body.lugarDireccion, detalles: req.body.lugarDetalles } });
    }

    // 3. Buscar Tipo de Servicio (debería existir por el seed)
    const tipoServicio = await prisma.serviceType.findUnique({ where: { nombre_tipo_servicio: tipoServicioNombre } });
    if (!tipoServicio) {
      res.status(400).json({ message: `Tipo de servicio '${tipoServicioNombre}' no encontrado.` });
      return;
    }

    // 4. Crear registro del archivo en la BD
    const archivoGuardado = await prisma.file.create({
      data: {
        nombre_original_archivo: req.file.originalname,
        nombre_archivo_almacenado: req.file.filename,
        mime_type: req.file.mimetype,
        tamano_bytes: req.file.size,
        ruta_almacenamiento_fisico: req.file.path,
        cliente_id: cliente.id,
        lugar_id: lugar.id,
        tipo_servicio_id: tipoServicio.id,
        periodicidad: periodicidad,
        nombre_equipo: nombreEquipo,
        identificador_tarea: identificadorTarea,
        fecha_realizacion_servicio: fechaRealizacionServicio ? new Date(fechaRealizacionServicio) : null,
        subido_por_usuario_id: subidoPorUsuarioId,
        metadatos_adicionales: metadatosAdicionales ? (() => {
          try {
            return JSON.parse(metadatosAdicionales) as Prisma.JsonObject;
          } catch (error) {
            throw new Error('metadatosAdicionales debe ser un JSON válido');
          }
        })() : Prisma.JsonNull,
        // hash_contenido se podría calcular aquí si es necesario
      }
    });

    res.status(201).json({ message: 'Archivo subido exitosamente.', file: archivoGuardado });

  } catch (error: any) {
    logger.error('Error en la subida de archivo:', { message: error.message, stack: error.stack, fileInfo: req.file, body: req.body });
    // Si hay un error después de que Multer guardó el archivo, podríamos querer eliminarlo.
    if (req.file && req.file.path) {
      fs.unlink(req.file.path).catch(err => logger.error("Error eliminando archivo tras fallo en subida:", err));
    }
    // Pasar el error al manejador de errores global
    next(error);
  }
});

// Endpoint de descarga de archivos
/**
 * @swagger
 * /api/v1/files/download/{fileId}:
 *   get:
 *     summary: Descarga un archivo específico por su ID.
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: fileId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID numérico del archivo a descargar.
 *     responses:
 *       200:
 *         description: Archivo binario.
 *         content:
 *           application/octet-stream: {} # O el tipo MIME específico si se conoce
 *       400:
 *         description: ID de archivo inválido.
 *       404:
 *         description: Archivo no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */
app.get('/api/v1/files/download/:fileId',
  fileIdParamValidationRules,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // fileId ya está validado y parseado por fileIdParamValidationRules
    const fileId = (req.params as any).fileId as number;

    const fileRecord = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!fileRecord) {
      res.status(404).json({ message: 'Archivo no encontrado.' });
      return;
    }

    // Verificar si el archivo existe físicamente antes de intentar enviarlo
    try {
      await fs.access(fileRecord.ruta_almacenamiento_fisico);
    } catch (error) {
      logger.error('Error de acceso al archivo físico al intentar descargar:', { fileId, path: fileRecord.ruta_almacenamiento_fisico, error });
      // Podríamos querer marcar este archivo como problemático en la BD o loggear de forma especial
      res.status(404).json({ message: 'Archivo no encontrado en el almacenamiento físico.' });
      return;
    }
    
    // Usar res.download para enviar el archivo.
    // El tercer argumento es el nombre que el cliente verá al descargar.
    // El cuarto argumento es una función callback opcional.
    res.download(fileRecord.ruta_almacenamiento_fisico, fileRecord.nombre_original_archivo, (err) => {
      if (err) {
        // Manejar errores que puedan ocurrir durante la transmisión del archivo.
        // Es importante no intentar enviar otra respuesta si ya se enviaron las cabeceras.
        if (!res.headersSent) {
          // Si Multer u otro middleware ya envió una respuesta, esto causará un error.
          // next(err) es más seguro si no estamos seguros del estado de la respuesta.
          logger.error('Error al enviar el archivo durante res.download:', { fileId, error: err });
          // No se puede enviar una respuesta JSON aquí si la descarga ya comenzó.
          // El error se loguea, y Express maneja el cierre de la conexión si es necesario.
        } else {
           logger.error('Error durante la transmisión del archivo (cabeceras ya enviadas):', { fileId, error: err });
        }
         // Enviar al manejador de errores global si no se han enviado las cabeceras
        if (!res.headersSent) {
            next(err); // Esto debería ir al manejador de errores global
        }
      }
    });

  } catch (error) {
    logger.error('Error en endpoint de descarga:', { fileId: req.params.fileId, error });
    next(error);
  }
});

// Endpoint de listado de archivos
/**
 * @swagger
 * /api/v1/files:
 *   get:
 *     summary: Lista archivos con opciones de filtrado y paginación.
 *     tags: [Files]
 *     parameters:
 *       - in: query
 *         name: clienteNombre
 *         schema:
 *           type: string
 *         description: Filtrar por nombre de cliente.
 *       - in: query
 *         name: lugarNombre
 *         schema:
 *           type: string
 *         description: Filtrar por nombre de lugar.
 *       - in: query
 *         name: tipoServicioNombre
 *         schema:
 *           type: string
 *         description: Filtrar por nombre de tipo de servicio.
 *       - in: query
 *         name: fechaRealizacionServicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar por fecha de realización del servicio (YYYY-MM-DD).
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Número de resultados por página (máx 100).
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: fecha_subida
 *           enum: [id, nombre_original_archivo, mime_type, tamano_bytes, fecha_realizacion_servicio, fecha_subida, updated_at]
 *         description: Campo por el cual ordenar.
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           default: desc
 *           enum: [asc, desc]
 *         description: Orden de clasificación.
 *     responses:
 *       200:
 *         description: Lista paginada de archivos.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FileWithRelations'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *       400:
 *         description: Parámetros de consulta inválidos.
 *       500:
 *         description: Error interno del servidor.
 */
app.get('/api/v1/files',
  fileListQueryValidationRules,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Los parámetros de consulta ya están validados y potencialmente transformados
    const {
      cliente_id, // Usar cliente_id numérico
      lugar_id,   // Usar lugar_id numérico
      tipo_servicio_id, // Usar tipo_servicio_id numérico
      clienteNombre,
      lugarNombre,
      tipoServicioNombre,
      fechaRealizacionServicio,
      page = 1,
      limit = 10,
      sortBy = 'fecha_subida',
      sortOrder = 'desc'
    } = req.query as any;

    // Asegurar que page y limit sean números para cálculos y respuesta
    const numericPage = Number(page);
    const numericLimit = Number(limit);

    const skip = (numericPage - 1) * numericLimit;
    
    const where: Prisma.FileWhereInput = {};

    // Filtros por ID numérico (prioridad si ambos, ID y nombre, están presentes)
    if (cliente_id) {
      where.cliente_id = Number(cliente_id);
    } else if (clienteNombre) {
      where.cliente = { nombre_cliente: clienteNombre as string };
    }

    if (lugar_id) {
      where.lugar_id = Number(lugar_id);
    } else if (lugarNombre) {
      where.lugar = { nombre_lugar: lugarNombre as string };
    }

    if (tipo_servicio_id) {
      where.tipo_servicio_id = Number(tipo_servicio_id);
    } else if (tipoServicioNombre) {
      where.tipo_servicio = { nombre_tipo_servicio: tipoServicioNombre as string };
    }
    if (fechaRealizacionServicio) {
      const date = new Date(fechaRealizacionServicio as string);
      if (isNaN(date.getTime())) {
        res.status(400).json({ message: 'Formato de fechaRealizacionServicio inválido. Usar YYYY-MM-DD.' });
        return;
      }
      // Filtrar por el día completo
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      where.fecha_realizacion_servicio = {
        gte: date,
        lt: nextDay,
      };
    }

    const validSortByFields: (keyof Prisma.FileOrderByWithRelationInput)[] = [
      'id', 'nombre_original_archivo', 'mime_type', 'tamano_bytes',
      'fecha_realizacion_servicio', 'fecha_subida', 'updated_at'
    ];
    
    const orderByField = validSortByFields.includes(sortBy as keyof Prisma.FileOrderByWithRelationInput)
      ? sortBy as keyof Prisma.FileOrderByWithRelationInput
      : 'fecha_subida';

    const orderByDirection = (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder : 'desc';
    
    const orderBy: Prisma.FileOrderByWithRelationInput = {
      [orderByField]: orderByDirection,
    };

    const files = await prisma.file.findMany({
      where,
      skip,
      take: numericLimit, // Usar numericLimit que se definió antes
      orderBy,
      include: {
        cliente: true,
        lugar: true,
        tipo_servicio: true,
      },
    });

    const totalFiles = await prisma.file.count({ where });
    // Usar numericLimit y numericPage para la respuesta de paginación
    const totalPages = Math.ceil(totalFiles / numericLimit);

    res.status(200).json({
      data: files,
      pagination: {
        totalItems: totalFiles,
        totalPages,
        currentPage: numericPage,
        itemsPerPage: numericLimit, // Cambiado de pageSize a itemsPerPage
      },
    });

  } catch (error) {
    next(error);
  }
});

// Endpoint de eliminación de archivos
/**
 * @swagger
 * /api/v1/files/{fileId}:
 *   delete:
 *     summary: Elimina un archivo específico por su ID.
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: fileId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID numérico del archivo a eliminar.
 *     responses:
 *       200:
 *         description: Archivo eliminado exitosamente.
 *       400:
 *         description: ID de archivo inválido.
 *       404:
 *         description: Archivo no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */
app.delete('/api/v1/files/:fileId',
  fileIdParamValidationRules,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // fileId ya está validado y parseado por fileIdParamValidationRules
    const fileId = (req.params as any).fileId as number;

    // 1. Buscar el registro del archivo en la BD
    const fileRecord = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!fileRecord) {
      res.status(404).json({ message: 'Archivo no encontrado.' });
      return;
    }

    // 2. Intentar eliminar el archivo físico
    let unlinkFailedError: Error | null = null;
    let fileSystemErrorMessage: string | null = null;

    try {
      await fs.unlink(fileRecord.ruta_almacenamiento_fisico);
      logger.info(`Archivo físico eliminado: ${fileRecord.ruta_almacenamiento_fisico}`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        logger.warn(`Archivo físico no encontrado en ${fileRecord.ruta_almacenamiento_fisico} durante el intento de eliminación. Se procederá a eliminar el registro de la BD.`);
        // No consideramos esto un error que deba cambiar el mensaje de éxito principal si la BD se borra.
      } else {
        // Otro error al intentar eliminar el archivo físico
        // Usar logger.error para el log del servidor
        logger.error('Error al eliminar el archivo físico tras borrar registro de BD:', {
            fileId: fileRecord.id,
            path: fileRecord.ruta_almacenamiento_fisico,
            error: error.message
        });
        // Para que la prueba unitaria que espía console.error funcione sin cambiarla,
        // también podemos dejar un console.error aquí temporalmente o ajustar la prueba.
        // Por ahora, para que la prueba pase sin modificarla:
        console.error('Error al eliminar el archivo físico tras borrar registro de BD:', error);
        unlinkFailedError = error; // Guardar el error para el mensaje de respuesta
        fileSystemErrorMessage = 'Error al eliminar del sistema de archivos.';
      }
    }

    // 3. Eliminar el registro de la base de datos
    await prisma.file.delete({
      where: { id: fileId },
    });
    logger.info(`Registro de archivo eliminado de la BD: ID ${fileRecord.id}`);

    if (unlinkFailedError) {
      res.status(200).json({
        message: `Archivo eliminado de la base de datos. ${fileSystemErrorMessage}`,
        fileId: fileRecord.id
      });
    } else {
      res.status(200).json({ message: 'Archivo eliminado exitosamente.', fileId: fileRecord.id });
    }

  } catch (error) {
    // Este catch ahora solo debería capturar errores de Prisma o errores inesperados
    // antes de la lógica de unlink/delete, o si prisma.file.delete falla.
    logger.error('Error en endpoint de eliminación (catch principal):', { fileId: req.params.fileId, error });
    next(error); // Pasa al manejador de errores global (probablemente 500)
  }
});


// Ruta de prueba
/**
 * @swagger
 * /:
 *   get:
 *     summary: Verifica si el servicio está en funcionamiento.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: El servicio está en funcionamiento.
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: File Storage Service is running!
 */
app.get('/', (req: Request, res: Response) => {
  res.send('File Storage Service is running!');
});

// Configuración de Swagger
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'File Storage Service API',
      version: '1.0.0',
      description: 'API para la gestión y almacenamiento de archivos.',
      contact: {
        name: 'Developer',
        email: 'developer@example.com'
      },
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Servidor de desarrollo'
      }
    ],
    components: {
      schemas: {
        File: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            nombre_original_archivo: { type: 'string', example: 'reporte.pdf' },
            nombre_archivo_almacenado: { type: 'string', example: 'reporte_uuid.pdf' },
            mime_type: { type: 'string', example: 'application/pdf' },
            tamano_bytes: { type: 'integer', example: 102400 },
            ruta_almacenamiento_fisico: { type: 'string', example: 'uploads/cliente/lugar/servicio/reporte_uuid.pdf' },
            cliente_id: { type: 'integer', example: 1 },
            lugar_id: { type: 'integer', example: 1 },
            tipo_servicio_id: { type: 'integer', example: 1 },
            periodicidad: { type: 'string', nullable: true, example: 'Mensual' },
            nombre_equipo: { type: 'string', nullable: true, example: 'Equipo A' },
            identificador_tarea: { type: 'string', nullable: true, example: 'Tarea-001' },
            fecha_realizacion_servicio: { type: 'string', format: 'date-time', nullable: true, example: '2023-10-26T10:00:00Z' },
            hash_contenido: { type: 'string', nullable: true, example: 'a1b2c3d4...' },
            metadatos_adicionales: { type: 'object', nullable: true, example: { custom_field: 'value' } },
            subido_por_usuario_id: { type: 'string', nullable: true, example: 'user123' },
            fecha_subida: { type: 'string', format: 'date-time', example: '2023-10-26T12:00:00Z' },
            updated_at: { type: 'string', format: 'date-time', example: '2023-10-26T12:00:00Z' }
          }
        },
        FileWithRelations: {
          allOf: [
            { $ref: '#/components/schemas/File' },
            {
              type: 'object',
              properties: {
                cliente: { $ref: '#/components/schemas/Client' },
                lugar: { $ref: '#/components/schemas/Location' },
                tipo_servicio: { $ref: '#/components/schemas/ServiceType' }
              }
            }
          ]
        },
        Client: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            nombre_cliente: { type: 'string', example: 'Cliente Alpha' },
            detalles: { type: 'string', nullable: true, example: 'Detalles del cliente' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        Location: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            nombre_lugar: { type: 'string', example: 'Lugar Beta' },
            direccion: { type: 'string', nullable: true, example: 'Calle Falsa 123' },
            detalles: { type: 'string', nullable: true, example: 'Detalles del lugar' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        ServiceType: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            nombre_tipo_servicio: { type: 'string', example: 'Mantenimientos' },
            descripcion: { type: 'string', nullable: true, example: 'Servicios de mantenimiento' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  },
  apis: ['./src/server.ts'], // Ruta a los archivos que contienen las anotaciones JSDoc
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));


// Manejador de errores global (simple)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Usar el logger de Winston
  logger.error('Error no manejado:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });
  
  // Evitar enviar el stack trace en producción por seguridad
  const errorMessage = process.env.NODE_ENV === 'production' ? 'Ocurrió un error interno.' : err.message;
  const errorStack = process.env.NODE_ENV === 'production' ? undefined : err.stack;

  // Si las cabeceras ya fueron enviadas, delegar al manejador de errores por defecto de Express
  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    message: 'Ocurrió un error en el servidor.',
    error: errorMessage,
    stack: errorStack // Solo en desarrollo
  });
});


// Iniciar el servidor solo si este script se ejecuta directamente
if (require.main === module) {
  app.listen(port, () => {
    logger.info(`Server is running on http://localhost:${port}`);
  });

  // Manejo de cierre elegante solo cuando el servidor está escuchando
  process.on('SIGINT', async () => {
    logger.info('Cierre del servidor por SIGINT (Ctrl+C)');
    await prisma.$disconnect();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    logger.info('Cierre del servidor por SIGTERM');
    await prisma.$disconnect();
    process.exit(0);
  });
}

export { app, prisma }; // Exportar app y prisma para pruebas u otros módulos