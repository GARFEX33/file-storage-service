import request from 'supertest';
import { app } from '../server';
import { prisma as prismaMock } from '../dbClient';
import { mockReset } from 'jest-mock-extended';

jest.mock('../dbClient'); // Utiliza el mock automático de dbClient

beforeEach(() => {
  mockReset(prismaMock);
});

afterAll(async () => {
  if (prismaMock && typeof prismaMock.$disconnect === 'function') {
    await prismaMock.$disconnect();
  }
});

describe('File Listing Endpoint (/api/v1/files)', () => {
  it('should list files successfully without any filters', async () => {
    const mockFiles = [
      { id: 1, nombre_original_archivo: 'file1.txt', cliente_id: 1, lugar_id: 1, tipo_servicio_id: 1, fecha_subida: new Date() },
      { id: 2, nombre_original_archivo: 'file2.pdf', cliente_id: 2, lugar_id: 2, tipo_servicio_id: 2, fecha_subida: new Date() },
    ];
    (prismaMock.file.findMany as jest.Mock).mockResolvedValue(mockFiles);
    (prismaMock.file.count as jest.Mock).mockResolvedValue(mockFiles.length);

    const response = await request(app).get('/api/v1/files');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.arrayContaining(
        mockFiles.map(file => expect.objectContaining({ id: file.id, nombre_original_archivo: file.nombre_original_archivo }))
      )
    );
    expect(response.body.pagination.totalItems).toBe(mockFiles.length);
    expect(response.body.pagination.totalPages).toBe(1); // Asumiendo default page size > 2
    expect(response.body.pagination.currentPage).toBe(1);
  });

  it('should return 400 if cliente_id is not a number', async () => {
    const response = await request(app).get('/api/v1/files?cliente_id=abc');
    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ msg: 'cliente_id debe ser un entero positivo.' })
      ])
    );
  });

  it('should return 400 if lugar_id is not a number', async () => {
    const response = await request(app).get('/api/v1/files?lugar_id=abc');
    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ msg: 'lugar_id debe ser un entero positivo.' })
      ])
    );
  });

  it('should return 400 if tipo_servicio_id is not a number', async () => {
    const response = await request(app).get('/api/v1/files?tipo_servicio_id=abc');
    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ msg: 'tipo_servicio_id debe ser un entero positivo.' })
      ])
    );
  });

  it('should filter files by cliente_id', async () => {
    const clienteId = 1;
    const mockFiles = [
      { id: 1, nombre_original_archivo: 'file1.txt', cliente_id: clienteId, lugar_id: 1, tipo_servicio_id: 1, fecha_subida: new Date() },
    ];
    (prismaMock.file.findMany as jest.Mock).mockResolvedValue(mockFiles);
    (prismaMock.file.count as jest.Mock).mockResolvedValue(mockFiles.length);

    const response = await request(app).get(`/api/v1/files?cliente_id=${clienteId}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(1);
    expect(response.body.data[0]).toEqual(expect.objectContaining({ id: 1, cliente_id: clienteId }));
    expect(prismaMock.file.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { cliente_id: clienteId }
    }));
  });

  it('should filter files by lugar_id', async () => {
    const lugarId = 2;
    const mockFiles = [
      { id: 2, nombre_original_archivo: 'file2.pdf', cliente_id: 2, lugar_id: lugarId, tipo_servicio_id: 2, fecha_subida: new Date() },
    ];
    (prismaMock.file.findMany as jest.Mock).mockResolvedValue(mockFiles);
    (prismaMock.file.count as jest.Mock).mockResolvedValue(mockFiles.length);

    const response = await request(app).get(`/api/v1/files?lugar_id=${lugarId}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(1);
    expect(response.body.data[0]).toEqual(expect.objectContaining({ id: 2, lugar_id: lugarId }));
    expect(prismaMock.file.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { lugar_id: lugarId }
    }));
  });

  it('should filter files by tipo_servicio_id', async () => {
    const tipoServicioId = 3;
    const mockFiles = [
      { id: 3, nombre_original_archivo: 'file3.jpg', cliente_id: 3, lugar_id: 3, tipo_servicio_id: tipoServicioId, fecha_subida: new Date() },
    ];
    (prismaMock.file.findMany as jest.Mock).mockResolvedValue(mockFiles);
    (prismaMock.file.count as jest.Mock).mockResolvedValue(mockFiles.length);

    const response = await request(app).get(`/api/v1/files?tipo_servicio_id=${tipoServicioId}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(1);
    expect(response.body.data[0]).toEqual(expect.objectContaining({ id: 3, tipo_servicio_id: tipoServicioId }));
    expect(prismaMock.file.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { tipo_servicio_id: tipoServicioId }
    }));
  });

  it('should filter files by a combination of cliente_id, lugar_id, and tipo_servicio_id', async () => {
    const clienteId = 1;
    const lugarId = 1;
    const tipoServicioId = 1;
    const mockFiles = [
      { id: 1, nombre_original_archivo: 'file1.txt', cliente_id: clienteId, lugar_id: lugarId, tipo_servicio_id: tipoServicioId, fecha_subida: new Date() },
    ];
    (prismaMock.file.findMany as jest.Mock).mockResolvedValue(mockFiles);
    (prismaMock.file.count as jest.Mock).mockResolvedValue(mockFiles.length);

    const response = await request(app).get(`/api/v1/files?cliente_id=${clienteId}&lugar_id=${lugarId}&tipo_servicio_id=${tipoServicioId}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(1);
    expect(response.body.data[0]).toEqual(expect.objectContaining({ id: 1, cliente_id: clienteId, lugar_id: lugarId, tipo_servicio_id: tipoServicioId }));
    expect(prismaMock.file.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { 
        cliente_id: clienteId,
        lugar_id: lugarId,
        tipo_servicio_id: tipoServicioId
      }
    }));
  });

  it('should handle pagination correctly (page and limit)', async () => {
    const page = 2;
    const limit = 1;
    const mockFilesPage2 = [
      { id: 2, nombre_original_archivo: 'file2.pdf', cliente_id: 2, lugar_id: 2, tipo_servicio_id: 2, fecha_subida: new Date() },
    ];
    (prismaMock.file.findMany as jest.Mock).mockResolvedValue(mockFilesPage2);
    (prismaMock.file.count as jest.Mock).mockResolvedValue(5); // Total de 5 items en la DB

    const response = await request(app).get(`/api/v1/files?page=${page}&limit=${limit}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(1);
    expect(response.body.data[0]).toEqual(expect.objectContaining({ id: 2 }));
    expect(response.body.pagination).toEqual({
      totalItems: 5,
      totalPages: 5, // 5 items / 1 por pagina = 5 paginas
      currentPage: page,
      itemsPerPage: limit,
    });
    expect(prismaMock.file.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: (page - 1) * limit,
      take: limit,
    }));
  });

  it('should return empty data if no files match filters', async () => {
    (prismaMock.file.findMany as jest.Mock).mockResolvedValue([]);
    (prismaMock.file.count as jest.Mock).mockResolvedValue(0);

    const response = await request(app).get('/api/v1/files?cliente_id=999');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.pagination.totalItems).toBe(0);
  });

});