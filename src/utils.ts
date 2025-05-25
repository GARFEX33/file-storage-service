import path from 'path';

/**
 * Sanitiza un nombre de cadena para ser utilizado como parte de una ruta de directorio.
 * Reemplaza caracteres no alfanuméricos (excepto _, ., -) con guiones bajos.
 * @param name El nombre a sanitizar.
 * @returns El nombre sanitizado.
 */
export function sanitizePathPart(name: string | undefined | null): string {
  if (!name) return '';
  return name.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

interface PathMetadata {
  clienteNombre: string;
  lugarNombre: string;
  tipoServicioNombre: string;
  periodicidad?: string;
  nombreEquipo?: string;
  identificadorTarea?: string;
}

/**
 * Genera una ruta de almacenamiento dinámica basada en metadatos.
 * Sigue la estructura: {CarpetaPrincipal}/{Cliente}/{Lugar}/{TipoServicio}/{SubNivel_1}/{SubNivel_2_Opcional}
 * @param basePath La carpeta principal de subida (e.g., 'uploads').
 * @param metadata Los metadatos para construir la ruta.
 * @returns La ruta de almacenamiento generada.
 */
export function generateStoragePath(basePath: string, metadata: PathMetadata): string {
  const {
    clienteNombre,
    lugarNombre,
    tipoServicioNombre,
    periodicidad,
    nombreEquipo,
    identificadorTarea
  } = metadata;

  if (!clienteNombre || !lugarNombre || !tipoServicioNombre) {
    throw new Error('Faltan metadatos requeridos para generar la ruta: clienteNombre, lugarNombre, tipoServicioNombre');
  }

  const clienteDir = sanitizePathPart(clienteNombre);
  const lugarDir = sanitizePathPart(lugarNombre);
  const tipoServicioDir = sanitizePathPart(tipoServicioNombre);

  let subNivel1 = '';
  let subNivel2Opcional = '';

  // Lógica de estructura de carpetas basada en el PRD (línea 47)
  if (tipoServicioNombre === 'Mantenimientos' && periodicidad && nombreEquipo) {
    subNivel1 = sanitizePathPart(periodicidad);
    subNivel2Opcional = sanitizePathPart(nombreEquipo);
  } else if (tipoServicioNombre === 'Levantamientos' && nombreEquipo && identificadorTarea) {
    subNivel1 = sanitizePathPart(nombreEquipo);
    subNivel2Opcional = sanitizePathPart(identificadorTarea);
  } else if (tipoServicioNombre === 'Obras' && identificadorTarea) {
    subNivel1 = sanitizePathPart(identificadorTarea);
  }

  let dynamicPath = path.join(basePath, clienteDir, lugarDir, tipoServicioDir);
  if (subNivel1) dynamicPath = path.join(dynamicPath, subNivel1);
  if (subNivel2Opcional) dynamicPath = path.join(dynamicPath, subNivel2Opcional);
  
  return dynamicPath;
}