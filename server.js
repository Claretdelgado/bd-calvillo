// Importa las dependencias
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Configuración de la aplicación
const app = express();
const PORT = process.env.PORT || 5000;

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Conectado a MongoDB'))
.catch((err) => console.error('Error al conectar a MongoDB:', err));

// Modelo de datos para los sensores
const sensorDataSchema = new mongoose.Schema({
  tds: Number,
  ph: Number,
  oxygen: Number,
  timestamp: { type: Date, default: Date.now },
});

const SensorData = mongoose.model('SensorData', sensorDataSchema);

// Middlewares
app.use(cors());
app.use(express.json());

// Ruta para recibir datos del Arduino (POST)
app.post('/submit', async (req, res) => {
  try {
    const data = new SensorData(req.body);
    await data.save();
    console.log('Datos guardados:', data);
    res.status(200).send('Datos recibidos correctamente');
  } catch (err) {
    console.error('Error al guardar los datos:', err);
    res.status(500).send('Error al guardar los datos');
  }
});

// Ruta para obtener los datos de los sensores (GET)
app.get('/sensors', async (req, res) => {
  try {
    const sensors = await SensorData.find();
    res.status(200).json(sensors);
  } catch (err) {
    console.error('Error al obtener los datos:', err);
    res.status(500).send('Error al obtener los datos');
  }
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
