import request from 'supertest';
import { app } from '../server';
import { prisma as prismaMock } from '../dbClient';
import { mockReset } from 'jest-mock-extended';
import fs from 'fs/promises'; // Usaremos el mock de fs/promises

jest.mock('../dbClient'); // Utiliza el mock automático de dbClient

// Mock de fs/promises
// Las funciones mock se definen directamente en la fábrica del mock.
jest.mock('fs/promises', () => {
  const originalFsPromises = jest.requireActual('fs/promises');
  return {
    ...originalFsPromises,
    unlink: jest.fn(), // Mockeamos unlink directamente
    access: jest.fn(), // Mockeamos access directamente
    // stat: jest.fn(), // Si se necesitara stat, se mockearía aquí también
  };
});

// fs ya está importado en la línea 5 y ahora se refiere al módulo mockeado.
// Para usar los métodos de jest.Mock (mockClear, mockResolvedValue, etc.),
// necesitamos castear las funciones mockeadas.

beforeEach(() => {
  mockReset(prismaMock);
  // Acceder a los mocks a través del módulo 'fs' importado y castear
  (fs.unlink as jest.Mock).mockClear();
  (fs.access as jest.Mock).mockClear();
});

afterAll(async () => {
  if (prismaMock && typeof prismaMock.$disconnect === 'function') {
    await prismaMock.$disconnect();
  }
});

describe('File Deletion Endpoint (DELETE /api/v1/files/:fileId)', () => {
  const fileId = 1;
  const mockFileRecord = {
    id: fileId,
    nombre_original_archivo: 'delete-me.txt',
    nombre_archivo_almacenado: 'delete-me_uuid.txt',
    mime_type: 'text/plain',
    tamano_bytes: 123,
    ruta_almacenamiento_fisico: '/fake/uploads/delete-me_uuid.txt',
    cliente_id: 1,
    lugar_id: 1,
    tipo_servicio_id: 1,
    fecha_subida: new Date(),
    updated_at: new Date(),
  };

  it('should delete a file successfully (from DB and filesystem)', async () => {
    (prismaMock.file.findUnique as jest.Mock).mockResolvedValue(mockFileRecord);
    (prismaMock.file.delete as jest.Mock).mockResolvedValue(mockFileRecord);
    (fs.unlink as jest.Mock).mockResolvedValue(undefined); // Simula que fs.unlink tiene éxito

    const response = await request(app).delete(`/api/v1/files/${fileId}`);

    expect(response.status).toBe(200); // O 204 No Content, dependiendo de la implementación
    expect(response.body.message).toBe('Archivo eliminado exitosamente.');
    expect(prismaMock.file.findUnique).toHaveBeenCalledWith({ where: { id: fileId } });
    expect(prismaMock.file.delete).toHaveBeenCalledWith({ where: { id: fileId } });
    expect(fs.unlink as jest.Mock).toHaveBeenCalledWith(mockFileRecord.ruta_almacenamiento_fisico);
  });

  it('should return 404 if file record is not found in DB', async () => {
    (prismaMock.file.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await request(app).delete(`/api/v1/files/${fileId + 99}`);
    
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Archivo no encontrado.');
    expect(prismaMock.file.delete).not.toHaveBeenCalled();
    expect(fs.unlink as jest.Mock).not.toHaveBeenCalled();
  });

  it('should return 400 if fileId is not a number', async () => {
    const response = await request(app).delete('/api/v1/files/not-a-number');
    
    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ msg: 'El fileId debe ser un entero positivo.' })
      ])
    );
    expect(prismaMock.file.delete).not.toHaveBeenCalled();
    expect(fs.unlink as jest.Mock).not.toHaveBeenCalled();
  });

  it('should still delete from DB if file unlink fails, but log error', async () => {
    (prismaMock.file.findUnique as jest.Mock).mockResolvedValue(mockFileRecord);
    (prismaMock.file.delete as jest.Mock).mockResolvedValue(mockFileRecord);
    const unlinkError = new Error('unlink failed');
    (fs.unlink as jest.Mock).mockRejectedValue(unlinkError);
    
    // Espiar console.error o el logger si se usa para el error de unlink
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // O si usas un logger específico:
    // const loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});


    const response = await request(app).delete(`/api/v1/files/${fileId}`);

    expect(response.status).toBe(200); // Asumiendo que la eliminación de la BD es el éxito primario
    expect(response.body.message).toBe('Archivo eliminado de la base de datos. Error al eliminar del sistema de archivos.');
    expect(prismaMock.file.delete).toHaveBeenCalledWith({ where: { id: fileId } });
    expect(fs.unlink as jest.Mock).toHaveBeenCalledWith(mockFileRecord.ruta_almacenamiento_fisico);
    // Verificar que el error de unlink fue logueado
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error al eliminar el archivo físico tras borrar registro de BD:'), unlinkError);
    // O con el logger:
    // expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error al eliminar el archivo físico'), expect.objectContaining({ error: unlinkError }));
    
    consoleErrorSpy.mockRestore();
    // loggerErrorSpy.mockRestore();
  });

  // Podríamos añadir una prueba para el caso en que el archivo no exista en el FS pero sí en la BD.
  // La lógica actual del endpoint de borrado podría necesitar ajustes para manejar esto explícitamente.
  // Por ahora, nos enfocamos en los casos principales.
});