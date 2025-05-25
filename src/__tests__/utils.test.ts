import path from 'path';
import { generateStoragePath, sanitizePathPart } from '../utils';

describe('utils', () => {
  describe('sanitizePathPart', () => {
    it('should return empty string for null or undefined input', () => {
      expect(sanitizePathPart(null)).toBe('');
      expect(sanitizePathPart(undefined)).toBe('');
    });

    it('should keep valid characters', () => {
      expect(sanitizePathPart('Valid-Name_1.23')).toBe('Valid-Name_1.23');
    });

    it('should replace invalid characters with underscores', () => {
      expect(sanitizePathPart('Invalid Name/\\:*?"<>|')).toBe('Invalid_Name_________');
    });

    it('should handle empty string input', () => {
      expect(sanitizePathPart('')).toBe('');
    });
  });

  describe('generateStoragePath', () => {
    const basePath = 'uploads';

    it('should generate correct path for Mantenimientos', () => {
      const metadata = {
        clienteNombre: 'Cliente Alpha',
        lugarNombre: 'Lugar Beta',
        tipoServicioNombre: 'Mantenimientos',
        periodicidad: 'Mensual',
        nombreEquipo: 'Equipo Gamma',
      };
      const expectedPath = path.join(basePath, 'Cliente_Alpha', 'Lugar_Beta', 'Mantenimientos', 'Mensual', 'Equipo_Gamma');
      expect(generateStoragePath(basePath, metadata)).toBe(expectedPath);
    });

    it('should generate correct path for Levantamientos', () => {
      const metadata = {
        clienteNombre: 'Cliente Delta',
        lugarNombre: 'Lugar Epsilon',
        tipoServicioNombre: 'Levantamientos',
        nombreEquipo: 'Equipo Zeta',
        identificadorTarea: 'Tarea-001',
      };
      const expectedPath = path.join(basePath, 'Cliente_Delta', 'Lugar_Epsilon', 'Levantamientos', 'Equipo_Zeta', 'Tarea-001');
      expect(generateStoragePath(basePath, metadata)).toBe(expectedPath);
    });

    it('should generate correct path for Obras', () => {
      const metadata = {
        clienteNombre: 'Cliente Eta',
        lugarNombre: 'Lugar Theta',
        tipoServicioNombre: 'Obras',
        identificadorTarea: 'Obra-XYZ',
      };
      const expectedPath = path.join(basePath, 'Cliente_Eta', 'Lugar_Theta', 'Obras', 'Obra-XYZ');
      expect(generateStoragePath(basePath, metadata)).toBe(expectedPath);
    });

    it('should handle missing optional fields gracefully', () => {
      const metadata = {
        clienteNombre: 'Cliente Iota',
        lugarNombre: 'Lugar Kappa',
        tipoServicioNombre: 'Mantenimientos',
        // periodicidad y nombreEquipo faltantes
      };
      const expectedPath = path.join(basePath, 'Cliente_Iota', 'Lugar_Kappa', 'Mantenimientos');
      expect(generateStoragePath(basePath, metadata)).toBe(expectedPath);
    });
    
    it('should use sanitized names for path parts', () => {
        const metadata = {
          clienteNombre: 'Cliente con /斜線/',
          lugarNombre: 'Lugar con *asteriscos*',
          tipoServicioNombre: 'Obras', // Corregido para que coincida con la lógica de 'Obras'
          identificadorTarea: 'Tarea:Con:Colons',
        };
        // Corregido para reflejar la sanitización actual: /斜線*?: se convierten en _
        const expectedPath = path.join(basePath, 'Cliente_con_____', 'Lugar_con__asteriscos_', 'Obras', 'Tarea_Con_Colons');
        expect(generateStoragePath(basePath, metadata)).toBe(expectedPath);
      });

    it('should throw error if required metadata is missing', () => {
      const metadata = {
        clienteNombre: 'Cliente Lambda',
        // lugarNombre falta
        tipoServicioNombre: 'Levantamientos',
      } as any; // Castear a any para simular la falta de un campo requerido
      expect(() => generateStoragePath(basePath, metadata)).toThrow('Faltan metadatos requeridos para generar la ruta: clienteNombre, lugarNombre, tipoServicioNombre');
    });
  });
});