const mongoose = require('mongoose');

const rolSchema = mongoose.Schema({
    nombre: String
});

module.exports = mongoose.model('rol', rolSchema)