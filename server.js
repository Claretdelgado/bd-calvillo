const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Configuración de aplicación
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

// Modelo de datos para usuarios
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model('User', UserSchema);

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

// Ruta para registrar nuevos usuarios (POST)
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  // Verificar si el usuario ya existe
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(400).json({ message: 'Usuario ya existe' });
  }

  // Encriptar la contraseña
  const hashedPassword = await bcrypt.hash(password, 10);

  // Crear un nuevo usuario
  const user = new User({ username, password: hashedPassword });
  await user.save();

  res.status(201).json({ message: 'Usuario creado' });
});

// Ruta para iniciar sesión (POST)
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Buscar el usuario
  const user = await User.findOne({ username });
  if (!user) {
    return res.status(400).json({ message: 'Credenciales inválidas' });
  }

  // Verificar la contraseña
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(400).json({ message: 'Credenciales inválidas' });
  }

  // Crear un token JWT
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  res.json({ token });
});

// Middleware para proteger rutas
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).send('Token es requerido');

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).send('Token inválido');
    req.userId = decoded.id;
    next();
  });
};

// Ruta protegida de ejemplo
app.get('/protected', verifyToken, (req, res) => {
  res.json({ message: 'Ruta protegida, acceso permitido' });
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
