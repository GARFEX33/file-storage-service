const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DOWNLOAD_DIR = path.join(__dirname, 'manual_downloads');
const API_BASE_URL = 'http://localhost:3000/api/v1';

async function downloadFile(fileId) {
  if (!fileId) {
    console.error('Error: Se requiere un fileId.');
    console.log('Uso: node scripts/manual_download.js <fileId>');
    return;
  }

  try {
    // Asegurar que el directorio de descargas exista
    if (!fs.existsSync(DOWNLOAD_DIR)) {
      fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
      console.log(`Directorio creado: ${DOWNLOAD_DIR}`);
    }

    const downloadUrl = `${API_BASE_URL}/files/download/${fileId}`;
    console.log(`Intentando descargar archivo desde: ${downloadUrl}`);

    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'stream',
    });

    // Obtener el nombre del archivo de la cabecera Content-Disposition
    let fileName = `downloaded_file_${fileId}`; // Nombre por defecto
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (fileNameMatch && fileNameMatch[1]) {
        fileName = fileNameMatch[1];
      }
    }
    
    // Sanitizar el nombre del archivo por si acaso
    fileName = path.basename(fileName); 
    const filePath = path.join(DOWNLOAD_DIR, fileName);

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`Archivo descargado exitosamente: ${filePath}`);
        resolve(filePath);
      });
      writer.on('error', (err) => {
        console.error('Error al escribir el archivo en el disco:', err);
        // Intentar eliminar archivo parcial si la escritura falla
        fs.unlink(filePath, () => {}); // Ignorar error de unlink si no existe
        reject(err);
      });
      response.data.on('error', (err) => {
        console.error('Error en el stream de respuesta:', err);
        writer.close();
        fs.unlink(filePath, () => {});
        reject(err);
      });
    });

  } catch (error) {
    if (error.response) {
      console.error(`Error al descargar el archivo. Status: ${error.response.status}`);
      console.error('Respuesta del servidor:', error.response.data ? (await streamToString(error.response.data) || error.message) : error.message);
    } else if (error.request) {
      console.error('Error al descargar el archivo: No se recibió respuesta del servidor.', error.message);
    } else {
      console.error('Error inesperado al configurar la descarga:', error.message);
    }
  }
}

// Helper para convertir stream a string en caso de error con cuerpo de stream
async function streamToString(stream) {
    if (typeof stream.pipe !== 'function') return stream; // Si no es un stream, devolver tal cual
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
}

const fileIdArg = process.argv[2];
downloadFile(fileIdArg);