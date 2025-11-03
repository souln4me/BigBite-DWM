const mongoose = require('mongoose');

const perfilSchema = mongoose.Schema({
    nombre: String
});

module.exports = mongoose.model('perfil', perfilSchema)