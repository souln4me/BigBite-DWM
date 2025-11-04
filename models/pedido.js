const mongoose = require('mongoose');
const { Schema } = mongoose;

const pedidoItemSchema = new Schema({
    producto: {
        type: Schema.Types.ObjectId,
        ref: 'Producto',
        required: true
    },
    cantidad: {
        type: Number,
        required: true,
        min: 1
    },
    precio_unit_pagado: {
        type: Number,
        required: true
    }
}, { _id: false });

const pedidoSchema = new Schema({
    usuario: {
        type: Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },

    items: [pedidoItemSchema],

    total_pagado: {
        type: Number,
        required: true
    },

    estado_pedido: {
        type: String,
        required: true,
        enum: ['NUEVO', 'EN_PREPARACION', 'LISTA', 'EN_DESPACHO', 'PAGADO', 'PAGO_CANCELADO', 'PAGO_FALLIDO'],
        default: 'NUEVO' 
    }
}, { 
    timestamps: true
});

module.exports = mongoose.model('Pedido', pedidoSchema);