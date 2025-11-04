const mongoose = require('mongoose');

const anulacionPedidoSchema = mongoose.Schema({
    pedido: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pedido',
        required: true
    },
    motivo: {
        type: String,
        required: true
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('AnulacionPedido', anulacionPedidoSchema);