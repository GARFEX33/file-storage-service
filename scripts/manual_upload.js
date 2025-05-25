const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Asegúrate de que FormData y fetch estén disponibles.
// En Node.js v18+ fetch es global. Para FormData, necesitamos importarlo si no es global.
// Por simplicidad, asumimos que 'fetch' es global. Si da error, instala 'node-fetch'.
// const fetch = require('node-fetch'); // Descomenta si 'fetch is not defined'
// const FormData = require('form-data'); // Descomenta si 'FormData is not defined'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, ans => {
    resolve(ans);
  }));
}

async function manualUpload() {
  console.log('--- Script de Subida Manual de Archivos ---');

  const filePath = await askQuestion('Ruta completa del archivo a subir: ');
  if (!fs.existsSync(filePath)) {
    console.error('Error: El archivo no existe en la ruta proporcionada.');
    rl.close();
    return;
  }

  const clienteNombre = await askQuestion('Nombre del Cliente: ');
  const lugarNombre = await askQuestion('Nombre del Lugar: ');
  const tipoServicioNombre = await askQuestion('Tipo de Servicio (Mantenimientos, Levantamientos, Obras): ');

  // Campos opcionales (puedes añadir más si los necesitas para tus pruebas)
  const periodicidad = await askQuestion('Periodicidad (opcional, ej: Mensual): ');
  const nombreEquipo = await askQuestion('Nombre del Equipo (opcional): ');
  const identificadorTarea = await askQuestion('Identificador de Tarea (opcional): ');
  const fechaRealizacionServicio = await askQuestion('Fecha de Realización del Servicio (opcional, YYYY-MM-DDTHH:MM:SSZ): '); // ISO 8601
  const subidoPorUsuarioId = await askQuestion('ID del Usuario que sube (opcional): ');
  const metadatosAdicionales = await askQuestion('Metadatos Adicionales (JSON string, opcional, ej: {"clave":"valor"}): ');


  const formData = new FormData();
  const fileStream = fs.createReadStream(filePath);
  
  // Para que 'fetch' con FormData funcione correctamente con streams de archivo en Node.js,
  // necesitamos pasar un objeto Blob o un objeto con propiedades específicas.
  // La forma más robusta es leer el buffer del archivo.
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  // Añadir campos de texto ANTES del archivo
  formData.append('clienteNombre', clienteNombre);
  formData.append('lugarNombre', lugarNombre);
  formData.append('tipoServicioNombre', tipoServicioNombre);

  if (periodicidad) formData.append('periodicidad', periodicidad);
  if (nombreEquipo) formData.append('nombreEquipo', nombreEquipo);
  if (identificadorTarea) formData.append('identificadorTarea', identificadorTarea);
  if (fechaRealizacionServicio) formData.append('fechaRealizacionServicio', fechaRealizacionServicio);
  if (subidoPorUsuarioId) formData.append('subidoPorUsuarioId', subidoPorUsuarioId);
  if (metadatosAdicionales) formData.append('metadatosAdicionales', metadatosAdicionales);
  
  // Añadir el archivo DESPUÉS de los campos de texto
  formData.append('file', new Blob([fileBuffer]), fileName); // Usar Blob para compatibilidad con fetch


  const serverUrl = 'http://localhost:3000/api/v1/files/upload';
  // Los campos opcionales ya se añadieron antes.
  // Las siguientes líneas son duplicadas y se eliminan:
  // if (nombreEquipo) formData.append('nombreEquipo', nombreEquipo);
  // if (identificadorTarea) formData.append('identificadorTarea', identificadorTarea);
  // if (fechaRealizacionServicio) formData.append('fechaRealizacionServicio', fechaRealizacionServicio);
  // if (subidoPorUsuarioId) formData.append('subidoPorUsuarioId', subidoPorUsuarioId);
  // if (metadatosAdicionales) formData.append('metadatosAdicionales', metadatosAdicionales);

  // La siguiente declaración de serverUrl también es duplicada y se elimina.
  // const serverUrl = 'http://localhost:3000/api/v1/files/upload';
  console.log(`\nEnviando archivo a ${serverUrl}...`); // Esta línea usa la serverUrl de la línea 70

  try {
    const response = await fetch(serverUrl, {
      method: 'POST',
      body: formData,
      // Los headers para multipart/form-data son establecidos automáticamente por fetch con FormData
    });

    const responseData = await response.json();

    if (response.ok) {
      console.log('\n¡Archivo subido exitosamente!');
      console.log('Respuesta del servidor:');
      console.log(JSON.stringify(responseData, null, 2));
    } else {
      console.error(`\nError al subir el archivo. Estado: ${response.status}`);
      console.error('Respuesta del servidor:');
      console.error(JSON.stringify(responseData, null, 2));
    }
  } catch (error) {
    console.error('\nError en la petición de subida:', error);
  } finally {
    rl.close();
  }
}

manualUpload();