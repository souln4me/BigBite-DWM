const mongoose = require('mongoose');

const ordenCocinaSchema = mongoose.Schema ({
    pedido: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pedido',
        required: true
    },
    estado_cocina: {
        type: String,
        required: true,
        enum: ['NUEVA', 'EN_PREPARACION', 'LISTA'],
        default: 'NUEVA'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('OrdenCocina', ordenCocinaSchema);