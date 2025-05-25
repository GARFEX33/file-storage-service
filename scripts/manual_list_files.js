const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api/v1';

async function listFiles() {
  try {
    const listUrl = `${API_BASE_URL}/files`;
    console.log(`Intentando listar archivos desde: ${listUrl}`);
    console.log('Este script actualmente no toma parámetros de filtro, lista todos los archivos con paginación por defecto.');
    console.log('Puedes extenderlo para pasar query params como: ?cliente_id=1&page=2&limit=5\n');

    // TODO: Permitir pasar query params desde la línea de comandos si es necesario.
    // Ejemplo: const queryParams = process.argv[2] || ''; // node scripts/manual_list_files.js "cliente_id=1&limit=5"
    // const fullUrl = `${listUrl}${queryParams ? '?' + queryParams : ''}`;
    
    const response = await axios({
      method: 'GET',
      url: listUrl, // Usar listUrl por ahora para la prueba inicial sin filtros
    });

    if (response.data) {
      console.log('\nRespuesta del servidor (Listado de Archivos):');
      console.log(JSON.stringify(response.data, null, 2));
      
      if (response.data.data && response.data.data.length > 0) {
        console.log(`\n--- ${response.data.data.length} Archivo(s) en esta página ---`);
        response.data.data.forEach(file => {
          console.log(`ID: ${file.id}, Nombre: ${file.nombre_original_archivo}, Cliente ID: ${file.cliente_id}, Subido: ${file.fecha_subida}`);
        });
      } else {
        console.log('\nNo se encontraron archivos con los filtros aplicados (o no hay archivos).');
      }

      if (response.data.pagination) {
        console.log('\n--- Paginación ---');
        console.log(`Total de Items: ${response.data.pagination.totalItems}`);
        console.log(`Total de Páginas: ${response.data.pagination.totalPages}`);
        console.log(`Página Actual: ${response.data.pagination.currentPage}`);
        console.log(`Items por Página: ${response.data.pagination.itemsPerPage}`);
      }

    } else {
      console.log('No se recibieron datos en la respuesta.');
    }

  } catch (error) {
    if (error.response) {
      console.error(`\nError al listar archivos. Status: ${error.response.status}`);
      console.error('Respuesta del servidor:');
      try {
        // Si la respuesta de error es JSON, imprimirla formateada
        console.error(JSON.stringify(error.response.data, null, 2));
      } catch (e) {
        // Si no es JSON, imprimir como texto
        console.error(error.response.data);
      }
    } else if (error.request) {
      console.error('\nError al listar archivos: No se recibió respuesta del servidor.', error.message);
    } else {
      console.error('\nError inesperado al configurar la solicitud de listado:', error.message);
    }
  }
}

listFiles();