// index.js Este es el archivo principal que se conecta a PostgreSQL (Supabase) y expone un endpoint para obtener los datos de la tabla Jugadores.
const express = require('express');
require('dotenv').config(); // Carga las variables de entorno locales (si existen)
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

// Configuración de la conexión a Supabase usando la variable de entorno
// Render inyectará el valor de DATABASE_URL que configuraste en su dashboard.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase requiere SSL para conexiones externas, que se habilita con este flag
  // (a menos que ya esté en la URL de conexión, pero es buena práctica asegurarlo).
  ssl: {
    rejectUnauthorized: false
  }
});

// Middleware básico
app.use(express.json());

// Ruta de prueba 
app.get('/', (req, res) => {
  res.send('API de Jugadores conectada. Prueba /api/jugadores para los datos.');
});

// Ruta principal: Obtener todos los jugadores
app.get('/api/jugadores', async (req, res) => {
  try {
    const client = await pool.connect();
    // Consulta SQL simple
    const result = await client.query('SELECT jugador_id, nombre, apellidos, fecha_nacimiento FROM Jugadores ORDER BY jugador_id ASC');
    client.release(); // Libera la conexión

    res.json(result.rows);
  } catch (err) {
    console.error('Error al ejecutar la consulta:', err);
    res.status(500).json({ error: 'Error interno del servidor al acceder a la BD.' });
  }
});
//--------------------------------------------------------------
// POST: Crear un nuevo jugador
app.post('/api/jugadores', async (req, res) => {
  // 1. Desestructurar los datos del cuerpo de la solicitud
  // Asumimos que estos son los campos requeridos para crear un jugador.
  const { nombre, apellidos, fecha_nacimiento, categoria_principal_id, email } = req.body;

  // 2. Validación básica (Asegurarse de que al menos los campos clave existan)
  if (!nombre || !apellidos || !fecha_nacimiento || !categoria_principal_id) {
    return res.status(400).json({ error: 'Faltan campos requeridos (nombre, apellidos, fecha_nacimiento, categoria_principal_id).' });
  }

  try {
    const client = await pool.connect();
    
    // 3. Consulta SQL para la inserción
    const sql = `
      INSERT INTO Jugadores 
      (nombre, apellidos, fecha_nacimiento, categoria_principal_id, email) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING jugador_id, nombre;`; // RETURNING devuelve el ID generado y el nombre

    const result = await client.query(sql, [nombre, apellidos, fecha_nacimiento, categoria_principal_id, email]);
    
    client.release(); // Libera la conexión

    // 4. Respuesta de éxito
    res.status(201).json({ 
      mensaje: 'Jugador creado exitosamente.',
      jugador: result.rows[0] // Devuelve el jugador recién creado con su ID
    });

  } catch (err) {
    console.error('Error al insertar el jugador:', err);
    // 5. Respuesta de error detallada
    res.status(500).json({ 
      error: 'Error interno del servidor al crear el jugador.',
      detalle: err.message
    });
  }
});
//--------------------------






// Inicia el servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
  // Intento de conexión al iniciar para verificar que la DB_URL es válida
  pool.query('SELECT NOW()')
    .then(() => console.log('¡Conexión a Supabase exitosa!'))
    .catch(err => console.error('Fallo al conectar a Supabase:', err.message));
});
