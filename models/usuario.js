const mongoose = require('mongoose');

const usuarioSchema = mongoose.Schema({
    // --- Atributos de Registro Obligatorios ---
    email: {
        type: String,
        required: true,
        unique: true
    },
    hash_pass: {
        type: String,
        required: true
    },

    // --- Atributos de Perfil ---
    rut: {
        type: String,
        unique: true,
        sparse: true
    },
    nombre_completo: String,

    direccion: String,
    region: String,
    provincia: String,
    comuna: String,

    fecha_nacimiento: Date,
    telefono: String,
    sexo: String,

    // --- Atributos de estado y seguridad ---
    email_confirmado: {
        type: Boolean,
        default: false
    },
    intentos_fallidos: {
        type: Number,
        default: 0
    },
    fecha_bloqueo: Date,
    fecha_registro: {
        type: Date,
        default: Date.now
    },

    // --- Relación ---
    rol: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Rol',
        required: true
    }
});

module.exports = mongoose.model('Usuario', usuarioSchema);