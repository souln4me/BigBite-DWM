const mongoose = require('mongoose');

const usuarioSchema = mongoose.Schema({
    nombre: String,
    pass: String,
    perfil: {type: mongoose.Schema.ObjectId, ref: 'perfil'}
});

module.exports = mongoose.model('Usuario', usuarioSchema);