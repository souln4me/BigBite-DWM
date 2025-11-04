const mongoose = require('mongoose');
const { Schema } = mongoose;

const CarritoItemSchema = new Schema({
    producto: {
        type: Schema.Types.ObjectId,
        ref: 'Producto',
        required: true
    },
    cantidad: {
        type: Number,
        required: true,
        min: [1, 'La cantidad no puede ser menor a 1'],
        default: 1
    }
}, { _id: false });

const carritoComprasSchema = new Schema({
    usuario: {
        type: Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true,
        unique: true
    },
    items: [CarritoItemSchema],
}, {
    timestamps: true
});

module.exports = mongoose.model('CarritoCompras', carritoComprasSchema);