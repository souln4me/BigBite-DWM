const mongoose = require('mongoose');

const usuarioSchema = mongoose.Schema({
    nombre: String,
    pass: String,
    rol: {type: mongoose.Schema.ObjectId, ref: 'rol'}
});

module.exports = mongoose.model('Usuario', usuarioSchema);