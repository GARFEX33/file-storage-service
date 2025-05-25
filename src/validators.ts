import { body, query, param, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Middleware para manejar los errores de validación
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    // No se llama a next() si hay errores, la respuesta ya se envió.
  } else {
    next();
  }
};

// Esquemas de validación
export const fileUploadValidationRules: ValidationChain[] = [
  body('clienteNombre').notEmpty().withMessage('clienteNombre es requerido.').isString().trim(),
  body('lugarNombre').notEmpty().withMessage('lugarNombre es requerido.').isString().trim(),
  body('tipoServicioNombre').notEmpty().withMessage('tipoServicioNombre es requerido.').isString().trim(),
  body('periodicidad').optional().isString().trim(),
  body('nombreEquipo').optional().isString().trim(),
  body('identificadorTarea').optional().isString().trim(),
  body('fechaRealizacionServicio').optional().isISO8601().toDate().withMessage('fechaRealizacionServicio debe ser una fecha válida en formato ISO 8601.'),
  body('subidoPorUsuarioId').optional().isString().trim(),
  body('metadatosAdicionales').optional().custom((value) => {
    if (value) {
      try {
        JSON.parse(value);
      } catch (e) {
        throw new Error('metadatosAdicionales debe ser un string JSON válido.');
      }
    }
    return true;
  }),
  // La validación del archivo 'file' la maneja Multer, pero podríamos añadir aquí
  // una validación custom si 'req.file' no está presente después de Multer.
  // body('file').custom((value, { req }) => {
  //   if (!req.file) {
  //     throw new Error('El archivo es requerido.');
  //   }
  //   return true;
  // })
];

export const fileIdParamValidationRules: ValidationChain[] = [
  param('fileId').isInt({ min: 1 }).withMessage('El fileId debe ser un entero positivo.').toInt()
];

export const fileListQueryValidationRules: ValidationChain[] = [
  query('clienteNombre').optional().isString().trim(),
  query('lugarNombre').optional().isString().trim(),
  query('tipoServicioNombre').optional().isString().trim(),
  // Validaciones para los IDs numéricos
  query('cliente_id').optional().isInt({ min: 1 }).withMessage('cliente_id debe ser un entero positivo.').toInt(),
  query('lugar_id').optional().isInt({ min: 1 }).withMessage('lugar_id debe ser un entero positivo.').toInt(),
  query('tipo_servicio_id').optional().isInt({ min: 1 }).withMessage('tipo_servicio_id debe ser un entero positivo.').toInt(),
  query('fechaRealizacionServicio').optional().isISO8601().toDate().withMessage('fechaRealizacionServicio debe ser una fecha válida en formato ISO 8601.'),
  query('page').optional().isInt({ min: 1 }).withMessage('El parámetro "page" debe ser un entero positivo.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El parámetro "limit" debe ser un entero positivo, máximo 100.').toInt(),
  query('sortBy').optional().isString().trim().isIn(['id', 'nombre_original_archivo', 'mime_type', 'tamano_bytes', 'fecha_realizacion_servicio', 'fecha_subida', 'updated_at']).withMessage('sortBy debe ser uno de los campos válidos.'),
  query('sortOrder').optional().isString().trim().isIn(['asc', 'desc']).withMessage('sortOrder debe ser "asc" o "desc".')
];