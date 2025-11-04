const mongoose = require('mongoose');

const categoriaSchema = mongoose.Schema({
    nombre: String
});

module.exports = mongoose.model('Categoria', categoriaSchema);