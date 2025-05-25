const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api/v1';

async function deleteFile(fileId) {
  if (!fileId) {
    console.error('Error: Se requiere un fileId.');
    console.log('Uso: node scripts/manual_delete.js <fileId>');
    return;
  }

  // Confirmación antes de borrar
  // (Considera añadir una librería para prompts más robustos si es necesario para otros scripts)
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.warn(`ADVERTENCIA: Estás a punto de eliminar el archivo con ID: ${fileId}`);
  const answer = await new Promise(resolve => 
    readline.question('¿Estás seguro de que deseas continuar? (s/N): ', resolve)
  );
  readline.close();

  if (answer.toLowerCase() !== 's') {
    console.log('Operación de eliminación cancelada por el usuario.');
    return;
  }

  try {
    const deleteUrl = `${API_BASE_URL}/files/${fileId}`;
    console.log(`\nIntentando eliminar archivo desde: ${deleteUrl}`);

    const response = await axios({
      method: 'DELETE',
      url: deleteUrl,
    });

    if (response.data) {
      console.log('\nRespuesta del servidor (Eliminación de Archivo):');
      console.log(JSON.stringify(response.data, null, 2));
    } else {
      // Para respuestas 204 No Content, response.data puede ser undefined o vacío.
      // El status 200 o 204 indica éxito.
      if (response.status === 200 || response.status === 204) {
        console.log(`\nArchivo con ID ${fileId} eliminado exitosamente (Status: ${response.status}).`);
      } else {
        console.log(`Respuesta inesperada del servidor (Status: ${response.status}).`);
      }
    }

  } catch (error) {
    if (error.response) {
      console.error(`\nError al eliminar el archivo. Status: ${error.response.status}`);
      console.error('Respuesta del servidor:');
      try {
        console.error(JSON.stringify(error.response.data, null, 2));
      } catch (e) {
        console.error(error.response.data);
      }
    } else if (error.request) {
      console.error('\nError al eliminar el archivo: No se recibió respuesta del servidor.', error.message);
    } else {
      console.error('\nError inesperado al configurar la solicitud de eliminación:', error.message);
    }
  }
}

const fileIdArg = process.argv[2];
if (fileIdArg) {
  deleteFile(fileIdArg);
} else {
  console.error('Error: Se requiere un fileId.');
  console.log('Uso: node scripts/manual_delete.js <fileId>');
}