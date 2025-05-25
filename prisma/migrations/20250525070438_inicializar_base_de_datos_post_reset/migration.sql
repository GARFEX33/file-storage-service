-- CreateTable
CREATE TABLE "Clientes" (
    "id" SERIAL NOT NULL,
    "nombre_cliente" TEXT NOT NULL,
    "detalles" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lugares" (
    "id" SERIAL NOT NULL,
    "nombre_lugar" TEXT NOT NULL,
    "direccion" TEXT,
    "detalles" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lugares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TiposServicio" (
    "id" SERIAL NOT NULL,
    "nombre_tipo_servicio" TEXT NOT NULL,
    "descripcion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TiposServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Archivos" (
    "id" SERIAL NOT NULL,
    "nombre_original_archivo" TEXT NOT NULL,
    "nombre_archivo_almacenado" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "tamano_bytes" INTEGER NOT NULL,
    "ruta_almacenamiento_fisico" TEXT NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "lugar_id" INTEGER NOT NULL,
    "tipo_servicio_id" INTEGER NOT NULL,
    "analizado_con_ia" BOOLEAN NOT NULL DEFAULT false,
    "es_reporte" BOOLEAN NOT NULL DEFAULT false,
    "periodicidad" TEXT NOT NULL,
    "nombre_equipo" TEXT NOT NULL,
    "fecha_realizacion_servicio" TIMESTAMP(3),
    "hash_contenido" TEXT,
    "metadatos_adicionales" JSONB,
    "subido_por_usuario_id" TEXT,
    "fecha_subida" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Archivos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Clientes_nombre_cliente_key" ON "Clientes"("nombre_cliente");

-- CreateIndex
CREATE UNIQUE INDEX "Lugares_nombre_lugar_key" ON "Lugares"("nombre_lugar");

-- CreateIndex
CREATE UNIQUE INDEX "TiposServicio_nombre_tipo_servicio_key" ON "TiposServicio"("nombre_tipo_servicio");

-- CreateIndex
CREATE UNIQUE INDEX "Archivos_nombre_archivo_almacenado_key" ON "Archivos"("nombre_archivo_almacenado");

-- CreateIndex
CREATE UNIQUE INDEX "Archivos_ruta_almacenamiento_fisico_key" ON "Archivos"("ruta_almacenamiento_fisico");

-- CreateIndex
CREATE UNIQUE INDEX "Archivos_hash_contenido_key" ON "Archivos"("hash_contenido");

-- AddForeignKey
ALTER TABLE "Archivos" ADD CONSTRAINT "Archivos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Archivos" ADD CONSTRAINT "Archivos_lugar_id_fkey" FOREIGN KEY ("lugar_id") REFERENCES "Lugares"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Archivos" ADD CONSTRAINT "Archivos_tipo_servicio_id_fkey" FOREIGN KEY ("tipo_servicio_id") REFERENCES "TiposServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
