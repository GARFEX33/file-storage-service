import request from 'supertest';
import { app } from '../server'; // Solo importar app
// La instancia de prisma usada por 'app' vendrá del mock de dbClient
import { prisma as prismaMock } from '../dbClient'; // Importar el prisma mockeado
// No necesitamos importar PrismaClient de generated/prisma aquí directamente para el mock
import { DeepMockProxy, mockReset } from 'jest-mock-extended'; // mockDeep no es necesario aquí
// import fs from 'fs/promises'; // Comentado ya que usamos actualFsPromises y mocks específicos
import { v4 as uuidv4 } from 'uuid'; // Añadir importación para uuidv4
import { join as pathJoin } from 'path'; // Para construir rutas de forma segura

// Jest usará automáticamente src/__mocks__/dbClient.ts
jest.mock('../dbClient');

const UPLOAD_DIR_TEST = 'uploads_test_temp'; // Directorio temporal para pruebas de descarga
const TEMP_DOWNLOAD_DIR = pathJoin(UPLOAD_DIR_TEST, 'download_tests');

// Declarar estas constantes ANTES de jest.mock para evitar ReferenceError debido al hoisting
const actualFsPromises = jest.requireActual('fs/promises');
const fsAccessMock = jest.fn();
const fsStatMock = jest.fn();

// Mock de fs/promises, pero permitiendo que algunas funciones operen realmente para archivos temporales
jest.mock('fs/promises', () => ({
  ...actualFsPromises, // Ahora actualFsPromises está definida
  access: fsAccessMock,
  stat: fsStatMock,
  // Dejar que mkdir, writeFile, unlink usen la implementación real para manejar archivos temporales
}));


beforeAll(async () => {
  // Crear directorio temporal para archivos de prueba de descarga
  try {
    await actualFsPromises.mkdir(TEMP_DOWNLOAD_DIR, { recursive: true });
  } catch (e) {
    console.error("Error creating temp dir for tests", e);
  }
});

// Helper para resetear mocks entre pruebas
beforeEach(() => {
  mockReset(prismaMock);
  fsAccessMock.mockClear();
  fsStatMock.mockClear();
});

afterAll(async () => {
  if (prismaMock && typeof prismaMock.$disconnect === 'function') {
    await prismaMock.$disconnect();
  }
  // Limpiar directorio temporal de pruebas de descarga
  try {
    await actualFsPromises.rm(UPLOAD_DIR_TEST, { recursive: true, force: true });
  } catch (e) {
    console.error("Error removing temp dir for tests", e);
  }
});

describe('File Download Endpoint (/api/v1/files/download/:fileId)', () => {
  it('should download a file successfully', async () => {
    const fileId = 1;
    const tempFileName = `test-download-${uuidv4()}.txt`;
    const tempFilePath = pathJoin(TEMP_DOWNLOAD_DIR, tempFileName);
    const fileContent = 'Este es el contenido del archivo de prueba.';
    const fileSize = Buffer.from(fileContent).length;

    // Crear el archivo temporal
    await actualFsPromises.writeFile(tempFilePath, fileContent);

    const mockFileRecord = {
      id: fileId,
      nombre_original_archivo: 'test-file.txt',
      nombre_archivo_almacenado: tempFileName, // Usar el nombre del archivo temporal
      mime_type: 'text/plain',
      tamano_bytes: fileSize,
      ruta_almacenamiento_fisico: tempFilePath, // Usar la ruta del archivo temporal real
      cliente_id: 1,
      lugar_id: 1,
      tipo_servicio_id: 1,
      periodicidad: null,
      nombre_equipo: null,
      identificador_tarea: null,
      fecha_realizacion_servicio: null,
      hash_contenido: null,
      metadatos_adicionales: null, // Prisma.JsonNull, o un objeto JSON válido
      subido_por_usuario_id: null,
      fecha_subida: new Date(),
      updated_at: new Date(),
    };

    (prismaMock.file.findUnique as jest.Mock).mockResolvedValue(mockFileRecord as any);
    
    // Para esta prueba, fs.access en el controlador debe pasar para la ruta real.
    // No necesitamos mockearlo aquí si la ruta es real y accesible por el proceso de prueba.
    // Sin embargo, si la lógica del controlador *siempre* usa el fs.access mockeado,
    // debemos asegurarnos de que resuelva.
    fsAccessMock.mockResolvedValue(undefined); // Simula que el chequeo de acceso pasa

    // fs.stat no necesita ser mockeado para esta prueba específica si res.download usa el real.
    // Pero si nuestra lógica de controlador lo llama ANTES de res.download, podría necesitar un mock.
    // Por ahora, lo dejamos sin mock específico para esta prueba, confiando en que res.download
    // usará el fs real para el tempFilePath.

    let response;
    try {
      response = await request(app).get(`/api/v1/files/download/${fileId}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-disposition']).toBe(`attachment; filename="${mockFileRecord.nombre_original_archivo}"`);
      expect(response.headers['content-type']).toContain(mockFileRecord.mime_type);
      expect(response.text).toBe(fileContent); // Verificar el contenido del archivo
    } finally {
      // Limpiar el archivo temporal
      await actualFsPromises.unlink(tempFilePath).catch((err: Error) => console.error(`Error unlinking temp file ${tempFilePath}`, err.message));
    }
  });

  it('should return 400 if fileId is not a number', async () => {
    const response = await request(app).get('/api/v1/files/download/not-a-number');
    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ msg: 'El fileId debe ser un entero positivo.' })
      ])
    );
  });

  it('should return 404 if file record is not found in DB', async () => {
    const fileId = 999;
    (prismaMock.file.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await request(app).get(`/api/v1/files/download/${fileId}`);
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Archivo no encontrado.');
  });

  it('should return 404 if file is not found in filesystem', async () => {
    const fileId = 2;
    const mockFileRecord = {
      id: fileId,
      nombre_original_archivo: 'another-file.txt',
      nombre_archivo_almacenado: 'another-file_uuid.txt',
      mime_type: 'text/plain',
      tamano_bytes: 123,
      ruta_almacenamiento_fisico: '/fake/path/to/another-file.txt',
      cliente_id: 1,
      lugar_id: 1,
      tipo_servicio_id: 1,
      periodicidad: null,
      nombre_equipo: null,
      identificador_tarea: null,
      fecha_realizacion_servicio: null,
      hash_contenido: null,
      metadatos_adicionales: null,
      subido_por_usuario_id: null,
      fecha_subida: new Date(),
      updated_at: new Date(),
    };

    (prismaMock.file.findUnique as jest.Mock).mockResolvedValue(mockFileRecord as any);
    fsAccessMock.mockRejectedValue(new Error('ENOENT: file not found')); // Simula que el archivo no existe

    const response = await request(app).get(`/api/v1/files/download/${fileId}`);
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Archivo no encontrado en el almacenamiento físico.');
  });
});

// La importación de DeepMockProxy ya está hecha arriba.
// El placeholder type DeepMockProxy<T> = T; ya no es necesario.