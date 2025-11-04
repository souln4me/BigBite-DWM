const mongoose = require('mongoose');

const tokenConfirmacionSchema = mongoose.Schema({
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    valor_token: {
        type: String,
        required: true,
        unique: true
    },
    tipo_token: {
        type: String,
        required: true,
        enum: ['EMAIL_CONFIRMACION', 'RESETEO_PASSWORD']
    },
    ha_sido_usado: {
        type: Boolean,
        required: true,
        default: false
    },
    fecha_expiracion: {
        type: Date,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('TokenConfirmacion', tokenConfirmacionSchema);