// Importa las dependencias
const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Configuración de la aplicación
const app = express();
const PORT = process.env.PORT || 5000;

// Conexión a PostgreSQL usando Sequelize
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
});

// Verificación de la conexión
sequelize.authenticate()
  .then(() => console.log('Conectado a PostgreSQL'))
  .catch(err => console.error('Error al conectar a PostgreSQL:', err));

// Modelo de datos para los sensores
const SensorData = sequelize.define('SensorData', {
  tds: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  ph: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  oxygen: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

// Modelo de datos para los usuarios
const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

// Sincronizar los modelos con la base de datos
sequelize.sync()
  .then(() => console.log('Modelos sincronizados con la base de datos'))
  .catch(err => console.error('Error al sincronizar los modelos:', err));

// Middlewares
app.use(cors());
app.use(express.json());

// Ruta para registrar un nuevo usuario (POST)
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashedPassword });
    res.status(201).json({ message: 'Usuario creado', userId: user.id });
  } catch (err) {
    console.error('Error al registrar usuario:', err);
    res.status(500).send('Error al registrar usuario');
  }
});

// Ruta para iniciar sesión (POST)
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).send('Credenciales inválidas');
    }
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Inicio de sesión exitoso', token });
  } catch (err) {
    console.error('Error al iniciar sesión:', err);
    res.status(500).send('Error al iniciar sesión');
  }
});

// Ruta para recibir datos del Arduino (POST)
app.post('/submit', async (req, res) => {
  try {
    const data = await SensorData.create(req.body);
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
    const sensors = await SensorData.findAll();
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