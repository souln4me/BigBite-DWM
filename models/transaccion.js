const mongoose = require('mongoose');

const transaccionSchema = mongoose.Schema({
    pedido: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pedido',
        required: true
    },
    id_pasarela: {
        type: String,
        required: true,
        index: true
    },
    monto: {
        type: Number,
        required: true
    },
    estado_transaccion: {
        type: String,
        required: true,
        enum: ['PENDIENTE', 'APROBADA', 'RECHAZADA', 'ANULADA'],
        default: 'PENDIENTE'
    },
    mensaje_pasarela: {
        type: String
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('Transaccion', transaccionSchema);