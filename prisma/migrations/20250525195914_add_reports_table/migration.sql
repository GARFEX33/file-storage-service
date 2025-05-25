-- CreateTable
CREATE TABLE "Reportes" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "reporte_url" TEXT NOT NULL,
    "foto_antes_url" TEXT NOT NULL,
    "foto_despues_url" TEXT NOT NULL,
    "termo_antes_url" TEXT NOT NULL,
    "termo_despues_url" TEXT NOT NULL,
    "reporte" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reportes_pkey" PRIMARY KEY ("id")
);
