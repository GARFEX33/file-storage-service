import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  const serviceTypesData = [
    { nombre_tipo_servicio: 'Mantenimientos', descripcion: 'Servicios de mantenimiento preventivo y correctivo.' },
    { nombre_tipo_servicio: 'Levantamientos', descripcion: 'Servicios de levantamiento de información y diagnóstico.' },
    { nombre_tipo_servicio: 'Obras', descripcion: 'Servicios relacionados con la ejecución de obras y proyectos.' },
  ];

  for (const st of serviceTypesData) {
    const serviceType = await prisma.serviceType.create({
      data: st,
    });
    console.log(`Created service type with id: ${serviceType.id} (${serviceType.nombre_tipo_servicio})`);
  }

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });