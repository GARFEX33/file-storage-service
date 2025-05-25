import { PrismaClient as PrismaClientType } from '../generated/prisma'; // Para el tipado de mockDeep
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

// Esta es la instancia mockeada que se exportará y usará en las pruebas
// y también por la aplicación cuando importe desde 'src/dbClient' en el entorno de prueba.
export const prisma: DeepMockProxy<PrismaClientType> = mockDeep<PrismaClientType>();