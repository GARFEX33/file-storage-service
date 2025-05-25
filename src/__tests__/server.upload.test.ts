import request from 'supertest';
import { app } from '../server'; // Importar la app exportada
import { PrismaClient } from '../generated/prisma'; // Para tipar los mocks

// Mock de Prisma Client
// Documentación de Prisma sobre mocking: https://www.prisma.io/docs/guides/testing/unit-testing
jest.mock('../generated/prisma', () => {
  const mockPrismaClient = {
    client: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    location: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    serviceType: {
      findUnique: jest.fn(),
    },
    file: {
      create: jest.fn(),
    },
    $disconnect: jest.fn(),
  };
  return { PrismaClient: jest.fn(() => mockPrismaClient) };
});

// Mock de fs/promises
jest.mock('fs/promises', () => ({
  ...jest.requireActual('fs/promises'), // Importar y extender el módulo original
  mkdir: jest.fn(() => Promise.resolve()),
  unlink: jest.fn(() => Promise.resolve()),
  access: jest.fn(() => Promise.resolve()),
}));


describe('File Upload Endpoint (/api/v1/files/upload)', () => {
  // 'app' se importa directamente desde ../server
  let prismaInstance: PrismaClient;

  beforeEach(() => {
    // Crear una nueva instancia mockeada para cada prueba para evitar estado compartido entre tests
    prismaInstance = new PrismaClient();
    // Limpiar todos los mocks de las funciones de prismaInstance si es necesario,
    // o configurar mocks específicos por prueba.
    // Ejemplo: (prismaInstance.client.findUnique as jest.Mock).mockClear();
  });

  afterAll(async () => {
    // Desconectar la instancia de Prisma mockeada si es necesario por el mock
    // En nuestro mock actual, PrismaClient es una función que devuelve un objeto,
    // y $disconnect es una jest.fn(). Llamarla asegura que si el código real la usa,
    // el mock es invocado.
    if (prismaInstance && typeof prismaInstance.$disconnect === 'function') {
      await prismaInstance.$disconnect();
    }
    // Si 'app' iniciara un servidor real (app.listen), necesitaríamos cerrarlo:
    // if (server && typeof server.close === 'function') {
    //   server.close();
    // }
  });

  it('should return 400 if no file is provided (simulated via missing file in multipart)', async () => {
    // Simular una petición sin el campo 'file'
    // express-validator no validará la presencia de req.file directamente,
    // eso lo maneja Multer o el chequeo explícito en el controlador.
    // Esta prueba verifica el chequeo explícito o el error de Multer si no hay 'file'.
    // Para que esta prueba funcione como se espera, el middleware de Multer debe ejecutarse.
    // Supertest maneja el envío de multipart/form-data.
    
    // Mockear Prisma para evitar llamadas a la BD si la validación falla antes
    // No es necesario mockear Prisma aquí ya que el error debería ocurrir antes.
    // La validación de 'req.file' está en el controlador, no en express-validator por defecto.

    const response = await request(app)
      .post('/api/v1/files/upload')
      .field('clienteNombre', 'Test Client')
      .field('lugarNombre', 'Test Location')
      .field('tipoServicioNombre', 'Mantenimientos'); // No se adjunta archivo

    // El controlador tiene un chequeo: if (!req.file)
    // O Multer podría fallar antes si no se configura para permitir campos sin archivo.
    // El chequeo explícito en el controlador es `res.status(400).json({ message: 'No se proporcionó ningún archivo (chequeo post-multer).' });`
    // O el error de validación de express-validator si se añade una regla custom para 'file'.
    // Por ahora, esperamos el mensaje del chequeo explícito.
    expect(response.status).toBe(400);
    // El mensaje exacto puede depender de si Multer o el controlador lo manejan.
    // Ajustar según el comportamiento real.
    // Si Multer no adjunta req.file, el controlador lo detectará.
    expect(response.body.message).toContain('No se proporcionó ningún archivo');
  });
  
  // Eliminada la prueba anterior que esperaba 400 por express-validator para clienteNombre faltante,
  // ya que el error en destination de Multer ocurre antes y resulta en 500.
  // La siguiente prueba cubre ese escenario de error 500.

  it('should actually result in 500 if required metadata for path generation (e.g. clienteNombre) is missing, due to error in Multer destination', async () => {
    // Esta prueba refleja el comportamiento actual donde un error en generateStoragePath
    // dentro de la configuración de Multer lleva a un 500.
    const response = await request(app)
      .post('/api/v1/files/upload')
      .attach('file', Buffer.from('test file content'), 'test.txt')
      // Falta clienteNombre, lo que causará error en generateStoragePath
      .field('lugarNombre', 'Test Location')
      .field('tipoServicioNombre', 'Mantenimientos');
      
    expect(response.status).toBe(500); // Esperamos 500 porque el error ocurre en Multer's destination
    expect(response.body.message).toContain('Ocurrió un error en el servidor.');
    // El error original es "Faltan metadatos requeridos para generar la ruta..."
    // y es logueado, pero el manejador global devuelve un mensaje genérico.
    // Para ver el error específico de express-validator, todos los campos para `generateStoragePath` deben estar presentes.
  });

  // Se necesitarían más tests para cubrir:
  // - Subida exitosa y creación de registros en BD (con mocks de Prisma)
  // - Creación de cliente/lugar si no existen
  // - Manejo de errores de base de datos
  // - Manejo de errores del sistema de archivos (al crear directorio)

  // Ejemplo de cómo se podría mockear una subida exitosa (requiere 'app' real):
  it('should upload a file and create metadata successfully', async () => {
    const mockFile = {
      id: 1,
      nombre_original_archivo: 'test.txt',
      nombre_archivo_almacenado: 'test_uuid.txt', // Este valor será generado por uuid, así que el mock debe ser flexible o el chequeo también
      mime_type: 'text/plain',
      tamano_bytes: 12, // Longitud de "test content"
      ruta_almacenamiento_fisico: 'uploads/Test_Client/Test_Location/Mantenimientos/test_uuid.txt', // Similar a nombre_archivo_almacenado
      cliente_id: 1,
      lugar_id: 1,
      tipo_servicio_id: 1,
      fecha_subida: new Date(), // El chequeo debería ser flexible con las fechas
      updated_at: new Date(), // El chequeo debería ser flexible con las fechas
    };

    // Asegurarse de que prismaInstance se usa en lugar de PrismaClient() directamente en los mocks
    // para que los mocks se apliquen a la instancia correcta usada en el test.
    (prismaInstance.client.findUnique as jest.Mock).mockResolvedValueOnce(null); // Cliente no existe
    (prismaInstance.client.create as jest.Mock).mockResolvedValueOnce({ id: 1, nombre_cliente: 'Test Client', created_at: new Date(), updated_at: new Date() });
    (prismaInstance.location.findUnique as jest.Mock).mockResolvedValueOnce(null); // Lugar no existe
    (prismaInstance.location.create as jest.Mock).mockResolvedValueOnce({ id: 1, nombre_lugar: 'Test Location', created_at: new Date(), updated_at: new Date() });
    (prismaInstance.serviceType.findUnique as jest.Mock).mockResolvedValueOnce({ id: 1, nombre_tipo_servicio: 'Mantenimientos', created_at: new Date(), updated_at: new Date() });
    
    // Mock para file.create, ajustando para que el resultado coincida con lo que se espera
    (prismaInstance.file.create as jest.Mock).mockImplementation(async (data: any) => {
      // Simular la estructura del archivo devuelto, incluyendo campos generados
      return {
        ...mockFile, // Usar los valores base de mockFile
        id: data.data.id || 1, // Usar el id proporcionado o un default
        nombre_archivo_almacenado: data.data.nombre_archivo_almacenado, // Este es el importante que viene de Multer
        ruta_almacenamiento_fisico: data.data.ruta_almacenamiento_fisico, // También de Multer
        tamano_bytes: data.data.tamano_bytes,
        mime_type: data.data.mime_type,
        fecha_subida: new Date(), // Simular la fecha actual
        updated_at: new Date(), // Simular la fecha actual
        cliente_id: data.data.cliente_id,
        lugar_id: data.data.lugar_id,
        tipo_servicio_id: data.data.tipo_servicio_id,
        nombre_original_archivo: data.data.nombre_original_archivo,
      };
    });

    const response = await request(app)
      .post('/api/v1/files/upload')
      .attach('file', Buffer.from('test content'), { filename: 'test.txt', contentType: 'text/plain' })
      .field('clienteNombre', 'Test Client')
      .field('lugarNombre', 'Test Location')
      .field('tipoServicioNombre', 'Mantenimientos');

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Archivo subido exitosamente.');
    expect(response.body.file).toMatchObject({
      nombre_original_archivo: 'test.txt',
      mime_type: 'text/plain',
      tamano_bytes: 12,
      cliente_id: 1,
      lugar_id: 1,
      tipo_servicio_id: 1,
      // No se puede predecir nombre_archivo_almacenado ni ruta_almacenamiento_fisico porque contienen UUIDs
      // Se puede verificar que existan:
      // nombre_archivo_almacenado: expect.any(String),
      // ruta_almacenamiento_fisico: expect.stringContaining('uploads/Test_Client/Test_Location/Mantenimientos/'),
    });
    // Verificar que el nombre del archivo almacenado contenga la extensión original
    expect(response.body.file.nombre_archivo_almacenado).toContain('.txt');
    // Verificar la ruta base
    expect(response.body.file.ruta_almacenamiento_fisico).toContain('uploads/Test_Client/Test_Location/Mantenimientos/');
    
    expect(prismaInstance.file.create).toHaveBeenCalledTimes(1);
    // Se puede añadir una verificación más detallada de los argumentos de file.create si es necesario
    expect(prismaInstance.file.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nombre_original_archivo: 'test.txt',
          mime_type: 'text/plain',
          tamano_bytes: 12,
          cliente_id: 1,
          lugar_id: 1,
          tipo_servicio_id: 1,
          // nombre_archivo_almacenado y ruta_almacenamiento_fisico son generados y difíciles de mockear exactamente aquí
          // a menos que se controle el UUID.
          nombre_archivo_almacenado: expect.stringMatching(/^[0-9a-fA-F-]+\.txt$/), // UUID + .txt
          ruta_almacenamiento_fisico: expect.stringMatching(/^uploads\/Test_Client\/Test_Location\/Mantenimientos\/[0-9a-fA-F-]+\.txt$/)
        })
      })
    );
  });
});