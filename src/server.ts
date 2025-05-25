import express, { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { PrismaClient, Prisma } from './generated/prisma';
import { v4 as uuidv4 } from 'uuid';
import { generateStoragePath } from './utils';

const app = express();
const port = process.env.PORT || 3000;
const prisma = new PrismaClient();

// Middleware para parsear JSON y URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Carpeta principal para almacenar archivos
const UPLOAD_DIRECTORY = process.env.UPLOAD_DIR || 'uploads';

// Asegurarse de que el directorio de subida principal exista
fs.mkdir(UPLOAD_DIRECTORY, { recursive: true }).catch(console.error);

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
      console.error('Error in destination function:', error);
      // Asegurarse de que el error se propague correctamente a Multer
      // El segundo argumento de cb para error no debe ser una cadena vacía si hay un error.
      // Pasamos el objeto de error directamente.
      cb(error instanceof Error ? error : new Error(String(error)), '');
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
app.post('/api/v1/files/upload', upload.single('file'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No se proporcionó ningún archivo.' });
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
        metadatos_adicionales: metadatosAdicionales ? JSON.parse(metadatosAdicionales) as Prisma.JsonObject : Prisma.JsonNull,
        // hash_contenido se podría calcular aquí si es necesario
      }
    });

    res.status(201).json({ message: 'Archivo subido exitosamente.', file: archivoGuardado });

  } catch (error: any) {
    console.error('Error en la subida de archivo:', error);
    // Si hay un error después de que Multer guardó el archivo, podríamos querer eliminarlo.
    if (req.file && req.file.path) {
      fs.unlink(req.file.path).catch(err => console.error("Error eliminando archivo tras fallo:", err));
    }
    // Pasar el error al manejador de errores global
    next(error);
  }
});

// Endpoint de descarga de archivos
app.get('/api/v1/files/download/:fileId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const fileId = parseInt(req.params.fileId, 10);
    if (isNaN(fileId)) {
      res.status(400).json({ message: 'El ID del archivo debe ser un número.' });
      return;
    }

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
      console.error('Error de acceso al archivo físico:', error);
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
          console.error('Error al enviar el archivo:', err);
          // No se puede enviar una respuesta JSON aquí si la descarga ya comenzó.
          // El error se loguea, y Express maneja el cierre de la conexión si es necesario.
        } else {
           console.error('Error durante la transmisión del archivo (cabeceras ya enviadas):', err);
        }
         // Enviar al manejador de errores global si no se han enviado las cabeceras
        if (!res.headersSent) {
            next(err);
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Ruta de prueba
app.get('/', (req: Request, res: Response) => {
  res.send('File Storage Service is running!');
});

// Manejador de errores global (simple)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Ocurrió un error en el servidor.', error: err.message });
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Manejo de cierre elegante
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});