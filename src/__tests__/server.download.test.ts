import request from 'supertest';
import { app } from '../server'; // Solo importar app
// La instancia de prisma usada por 'app' vendrá del mock de dbClient
import { prisma as prismaMock } from '../dbClient'; // Importar el prisma mockeado
// No necesitamos importar PrismaClient de generated/prisma aquí directamente para el mock
import { DeepMockProxy, mockReset } from 'jest-mock-extended'; // mockDeep no es necesario aquí
import fs from 'fs/promises';

// Jest usará automáticamente src/__mocks__/dbClient.ts
jest.mock('../dbClient');

// Mock de fs/promises (sin cambios)
jest.mock('fs/promises', () => {
  const originalFsPromises = jest.requireActual('fs/promises');
  return {
    ...originalFsPromises,
    access: jest.fn(),
    stat: jest.fn(), // Añadir mock para stat
    // No necesitamos mockear unlink o mkdir para estas pruebas específicas
  };
});

// Helper para resetear mocks entre pruebas
beforeEach(() => {
  // prismaMock es la instancia exportada desde src/__mocks__/dbClient.ts
  // y es una DeepMockProxy<PrismaClientType>
  mockReset(prismaMock);
  (fs.access as jest.Mock).mockClear();
  (fs.stat as jest.Mock).mockClear(); // Limpiar mock de stat
});

afterAll(async () => {
  // La instancia prismaMock es la que usa la app en el entorno de prueba.
  // Su $disconnect es un jest.fn() debido a mockDeep.
  if (prismaMock && typeof prismaMock.$disconnect === 'function') {
    await prismaMock.$disconnect();
  }
  // No hay necesidad de actualPrismaInstanceFromApp si el mock funciona correctamente.
});

describe('File Download Endpoint (/api/v1/files/download/:fileId)', () => {
  it('should download a file successfully', async () => {
    const fileId = 1;
    const mockFileRecord = {
      id: fileId,
      nombre_original_archivo: 'test-file.txt',
      nombre_archivo_almacenado: 'test-file_uuid.txt',
      mime_type: 'text/plain',
      tamano_bytes: 123,
      ruta_almacenamiento_fisico: '/fake/path/to/test-file.txt',
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

    // Configurar el mock para esta prueba específica
    // Ahora usamos prismaMock directamente, que es la instancia de __mocks__/dbClient.ts
    (prismaMock.file.findUnique as jest.Mock).mockResolvedValue(mockFileRecord as any);
    (fs.access as jest.Mock).mockResolvedValue(undefined); // Simula que el chequeo de acceso pasa
    // Simular que fs.stat tiene éxito y devuelve un objeto con isFile() como true y el tamaño
    (fs.stat as jest.Mock).mockResolvedValue({
      isFile: () => true,
      size: mockFileRecord.tamano_bytes
      // Añadir otras propiedades de fs.Stats si son necesarias por la librería 'send'
    });


    const response = await request(app).get(`/api/v1/files/download/${fileId}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-disposition']).toBe(`attachment; filename="${mockFileRecord.nombre_original_archivo}"`);
    expect(response.headers['content-type']).toContain(mockFileRecord.mime_type); 
    // No podemos verificar el contenido fácilmente aquí sin leer el archivo real,
    // pero las cabeceras indican una descarga exitosa.
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
    (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT: file not found')); // Simula que el archivo no existe

    const response = await request(app).get(`/api/v1/files/download/${fileId}`);
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Archivo no encontrado en el almacenamiento físico.');
  });
});

// La importación de DeepMockProxy ya está hecha arriba.
// El placeholder type DeepMockProxy<T> = T; ya no es necesario.