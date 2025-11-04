const mongoose = require('mongoose')

const boletaSchema = mongoose.Schema({
    pedido: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pedido',
        required: true
    },
    transaccion: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaccion',
        required: true
    },
    subtotal: {
        type: Number,
        required: true
    },
    iva: {
        type: Number,
        required: true
    },
    total: {
        type: Number,
        required: true
    },
    metodo_de_pago: {
        type: String,
        required: true
    }

}, {
    timestamps: true
});

module.exports = mongoose.model('Boleta', boletaSchema);