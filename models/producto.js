const mongoose = require('mongoose');

const productoSchema = mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    descripcion: {
        type: String,
        required: false
    },
    precio: {
        type: Number,
        required: true,
        min: 0
    },
    stock: {
        type: Number,
        required: true,
        default: 0
    },
    img: {
        type: String,
        required: false
    },
    esta_activo: {
        type: Boolean,
        default: true
    },
    es_destacado: {
        type: Boolean,
        default: false
    },
    categoria: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Categoria',
        required: true
    }
});

module.exports = mongoose.model('Producto', productoSchema);