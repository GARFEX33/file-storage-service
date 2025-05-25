# Etapa de construcción
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copiar package.json y package-lock.json (o yarn.lock)
COPY package*.json ./

# Instalar dependencias de producción y desarrollo (para compilar TypeScript y Prisma)
RUN npm install

# Copiar el resto del código fuente
COPY . .

# Generar cliente Prisma (necesario si no se incluye en el repositorio)
RUN npx prisma generate

# Compilar TypeScript
RUN npm run tsc -- --outDir dist 
# O si 'tsc' está en scripts: RUN npm run build (asumiendo que 'build' ejecuta 'tsc')

# Etapa de producción
FROM node:18-alpine

WORKDIR /usr/src/app

# Copiar solo las dependencias de producción desde la etapa de builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package*.json ./

# Copiar los artefactos de construcción (código JS compilado)
COPY --from=builder /usr/src/app/dist ./dist

# Copiar el schema de Prisma para que pueda ser encontrado en tiempo de ejecución si es necesario
# y el directorio de migraciones para referencia o si se ejecutan migraciones en el arranque.
COPY --from=builder /usr/src/app/prisma ./prisma

# Exponer el puerto que la aplicación usa
EXPOSE 3000

# Variable de entorno para el directorio de subida (puede ser un volumen en docker-compose)
ENV UPLOAD_DIR=/usr/src/app/uploads
ENV DATABASE_URL=${DATABASE_URL}
ENV PORT=3000

# Crear el directorio de subidas dentro del contenedor
RUN mkdir -p /usr/src/app/uploads

# Comando para ejecutar la aplicación
CMD [ "node", "dist/server.js" ]