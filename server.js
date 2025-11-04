const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const { ApolloServer, gql, UserInputError } = require('apollo-server-express');
const { Types } = require('mongoose');

// --- 1. IMPORTAR MODELOS ---
const Usuario = require('./models/usuario');
const Rol = require('./models/rol');
const Producto = require('./models/producto');
const Categoria = require('./models/categoria');
const CarritoCompras = require('./models/carritoCompras');
const Pedido = require('./models/pedido');
const Transaccion = require('./models/transaccion');
const Boleta = require('./models/boleta');
const AnulacionPedido = require('./models/anulacionPedido');
const TokenConfirmacion = require('./models/tokenConfirmacion');
const Sesion = require('./models/sesion');

const JWT_SECRET = "1234"; // ¡Recuerda cambiar esto por algo seguro!

mongoose.connect('mongodb://localhost:27017/bd-bigbite');

// --------------------
// --- 2. SCHEMAS (TypeDefs) ---
// --------------------

const typeDefs = gql`
# --- (Tipos de Usuario y Rol) ---
type Rol {
    id: ID!
    nombre: String!
}
type Usuario {
    id: ID!
    email: String!
    rut: String
    nombre_completo: String
    direccion: String
    region: String
    provincia: String
    comuna: String
    fecha_nacimiento: String
    telefono: String
    sexo: String
    email_confirmado: Boolean!
    intentos_fallidos: Int!
    fecha_bloqueo: String
    fecha_registro: String!
    rol: Rol!
}
input UsuarioInput {
    email: String!
    pass: String!
    rut: String
    nombre_completo: String
    direccion: String
    region: String
    provincia: String
    comuna: String
    fecha_nacimiento: String
    telefono: String
    sexo: String
    rolId: String
}
input UpdateUsuarioInput {
    email: String
    pass: String
    rut: String
    nombre_completo: String
    direccion: String
    region: String
    provincia: String
    comuna: String
    fecha_nacimiento: String
    telefono: String
    sexo: String
    rolId: String
}
input RolInput {
    nombre: String!
}
type Response {
    status: String
    message: String
}

# --- (Tipos de Categoria y Producto) ---
type Categoria {
    id: ID!
    nombre: String!
}
type Producto {
    id: ID!
    nombre: String!
    descripcion: String
    precio: Float!
    stock: Int!
    img: String
    esta_activo: Boolean!
    es_destacado: Boolean
    categoria: Categoria!
}
input CategoriaInput {
    nombre: String!
}
input ProductoInput {
    nombre: String!
    descripcion: String
    precio: Float!
    stock: Int!
    img: String
    esta_activo: Boolean
    es_destacado: Boolean
    categoriaId: ID!
}

# --- (Tipos de Carrito) ---
type CarritoItem {
    producto: Producto!
    cantidad: Int!
}
type CarritoCompras {
    id: ID!
    usuario: Usuario!
    items: [CarritoItem!]!
    createdAt: String!
    updatedAt: String!
}

# --- (Tipos de Pedido) ---
type PedidoItem {
    producto: Producto!
    cantidad: Int!
    precio_unit_pagado: Float!
}
type Pedido {
    id: ID!
    usuario: Usuario!
    items: [PedidoItem!]!
    total_pagado: Float!
    estado_pedido: String!
    createdAt: String!
    updatedAt: String!
}
input PedidoInput {
    usuarioId: ID!
}

# --- (Tipos de Transaccion) ---
type Transaccion {
    id: ID!
    pedido: Pedido!
    id_pasarela: String!
    monto: Float!
    estado_transaccion: String!
    mensaje_pasarela: String
    createdAt: String!
}
input TransaccionInput {
    pedidoId: ID!
    id_pasarela: String!
    monto: Float!
    estado_transaccion: String!
    mensaje_pasarela: String
}

# --- (Tipos de Boleta) ---
type Boleta {
    id: ID!
    pedido: Pedido!
    transaccion: Transaccion!
    subtotal: Float!
    iva: Float!
    total: Float!
    metodo_de_pago: String!
    createdAt: String!
}
input BoletaInput {
    pedidoId: ID!
    transaccionId: ID!
    metodo_de_pago: String!
}

# --- (Tipos de Anulacion) ---
type AnulacionPedido {
    id: ID!
    pedido: Pedido!
    motivo: String!
    createdAt: String!
}

input AnulacionInput {
    pedidoId: ID!
    motivo: String!
}

# --- (Tipos de Autenticación) ---
type AuthPayload {
    token: String!
    usuario: Usuario!
}


# --- QUERY ---
type Query {
    # Usuarios y Roles
    getUsuarios: [Usuario]
    getUsuariosRol: [Usuario]
    getUsuarioById(id: ID!): Usuario
    getUsuarioByIdRol(id: ID!): Usuario
    getRoles: [Rol]
    getRolById(id: ID!): Rol

    # Categorias y Productos
    getCategorias: [Categoria]
    getCategoriaById(id: ID!): Categoria
    getProductos: [Producto]
    getProductoById(id: ID!): Producto
    getProductosPorCategoria(categoriaId: ID!): [Producto]

    # Carrito
    getCarritoPorUsuario(usuarioId: ID!): CarritoCompras

    # Pedidos
    getPedidosPorUsuario(usuarioId: ID!): [Pedido]
    getPedidoById(id: ID!): Pedido
    getPedidos(estado: String): [Pedido]

    # Transacciones
    getTransaccionesPorPedido(pedidoId: ID!): [Transaccion]
    getTransacciones(estado: String): [Transaccion]

    # Boletas
    getBoletaPorPedido(pedidoId: ID!): Boleta
    getBoletas: [Boleta]

    # Anulaciones
    getAnulacionesPorPedido(pedidoId: ID!): AnulacionPedido
    getAnulaciones: [AnulacionPedido]
}

# --- MUTATION ---
type Mutation {
    # Usuarios y Roles
    addUsuario(input: UsuarioInput): Usuario
    updUsuario(id: ID!, input: UpdateUsuarioInput): Usuario
    delUsuario(id: ID!): Response
    addRol(input: RolInput): Rol
    updRol(id: ID!, input: RolInput): Rol
    delRol(id: ID!): Response

    # Categorias y Productos
    addCategoria(input: CategoriaInput): Categoria
    updCategoria(id: ID!, input: CategoriaInput): Categoria
    delCategoria(id: ID!): Response
    addProducto(input: ProductoInput): Producto
    updProducto(id: ID!, input: ProductoInput): Producto
    delProducto(id: ID!): Response

    # Carrito
    agregarAlCarrito(usuarioId: ID!, productoId: ID!, cantidad: Int!): CarritoCompras
    eliminarDelCarrito(usuarioId: ID!, productoId: ID!): CarritoCompras
    vaciarCarrito(usuarioId: ID!): CarritoCompras
    
    # Pedidos
    crearPedidoDesdeCarrito(input: PedidoInput!): Pedido
    actualizarEstadoPedido(id: ID!, estado: String!): Pedido
    
    # Transacciones
    crearTransaccion(input: TransaccionInput!): Transaccion

    # Boletas
    crearBoleta(input: BoletaInput!): Boleta

    # Anulaciones
    crearAnulacionPedido(input: AnulacionInput!): AnulacionPedido

    # Autenticación
    login(email: String!, pass: String!): AuthPayload
    confirmarEmail(token: String!): Response
    reenviarConfirmacion(email: String!): Response
}
`;

// ---------------------
// --- 3. RESOLVERS ---
// ---------------------

// --- Funciones Helper para Popular ---
const popularCarrito = (carritoDocument) => {
    return carritoDocument.populate([
        { path: 'usuario' },
        { path: 'items.producto' }
    ]);
};

const popularPedido = (pedidoDocument) => {
    return pedidoDocument.populate([
        { path: 'usuario' },
        { path: 'items.producto' }
    ]);
};

const popularTransaccion = (transaccionDocument) => {
    return transaccionDocument.populate({
        path: 'pedido',
        populate: [
            { path: 'usuario' },
            { path: 'items.producto' }
        ]
    });
};

const popularBoleta = (boletaDocument) => {
    return boletaDocument.populate([
        { 
            path: 'pedido',
            populate: { path: 'usuario' } // <-- CORREGIDO
        },
        { path: 'transaccion' }
    ]);
};

const popularAnulacion = (anulacionDocument) => {
    return anulacionDocument.populate({
        path: 'pedido',
        populate: { path: 'usuario' }
    });
};

// Constante para el IVA (19% en Chile)
const IVA_PERCENT = 0.19;

const crearYEnviarTokenConfirmacion = async (usuario) => {
    const valorToken = crypto.randomBytes(32).toString('hex');
    const fechaExpiracion = new Date();
    fechaExpiracion.setHours(fechaExpiracion.getHours() + 24); // TEST
    const nuevoToken = new TokenConfirmacion({
        usuario: usuario._id,
        valor_token: valorToken,
        tipo_token: 'EMAIL_CONFIRMACION',
        fecha_expiracion: fechaExpiracion
    });
    await nuevoToken.save();

    console.log('---------------------------------')
    console.log(`Simulando envío de email a: ${usuario.email}`)
    console.log(`Token: ${valorToken}`)
    console.log(`Link: http://localhost:8157/confirmar-email?token=${valorToken}`)
    console.log('---------------------------------');

    return true
}

const resolvers = {
    Query: {
        // --- Resolvers de Usuario y Rol ---
        async getUsuarios(obj) {
            const usuarios = await Usuario.find();
            return usuarios;
        },
        async getUsuariosRol(obj) {
            const usuarios = await Usuario.find().populate('rol');
            return usuarios;
        },
        async getUsuarioById(obj, { id }) {
            const usuarioBus = await Usuario.findById(id);
            if (!usuarioBus) throw new UserInputError('Usuario no encontrado');
            return usuarioBus;
        },
        async getUsuarioByIdRol(obj, { id }) {
            const usuarioBus = await Usuario.findById(id).populate('rol');
            if (!usuarioBus) throw new UserInputError('Usuario no encontrado');
            return usuarioBus;
        },
        async getRoles(obj) {
            const roles = await Rol.find();
            return roles;
        },
        async getRolById(obj, { id }) {
            const rolBus = await Rol.findById(id);
            if (!rolBus) throw new UserInputError('Rol no encontrado');
            return rolBus;
        },
        // --- Resolvers de Categoria y Producto ---
        async getCategorias(obj) {
            const categorias = await Categoria.find();
            return categorias;
        },
        async getCategoriaById(obj, { id }) {
            const categoriaBus = await Categoria.findById(id);
            if (!categoriaBus) throw new UserInputError('Categoría no encontrada');
            return categoriaBus;
        },
        async getProductos(obj) {
            const productos = await Producto.find().populate('categoria');
            return productos;
        },
        async getProductoById(obj, { id }) {
            const productoBus = await Producto.findById(id).populate('categoria');
            if (!productoBus) throw new UserInputError('Producto no encontrado');
            return productoBus;
        },
        async getProductosPorCategoria(obj, { categoriaId }) {
            const productos = await Producto.find({ categoria: categoriaId }).populate('categoria');
            return productos;
        },
        // --- Resolver de Carrito ---
        async getCarritoPorUsuario(obj, { usuarioId }) {
            if (!Types.ObjectId.isValid(usuarioId)) {
                throw new UserInputError(`El ID de usuario ${usuarioId} no es válido.`);
            }
            const carrito = await CarritoCompras.findOne({ usuario: usuarioId });
            
            if (!carrito) {
                const usuario = await Usuario.findById(usuarioId);
                if (!usuario) throw new UserInputError('Usuario no encontrado');
                return { id: new Types.ObjectId(), usuario: usuario, items: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
            }
            return popularCarrito(carrito);
        },
        // --- Resolvers de Pedido ---
        async getPedidosPorUsuario(obj, { usuarioId }) {
            if (!Types.ObjectId.isValid(usuarioId)) {
                throw new UserInputError(`El ID de usuario ${usuarioId} no es válido.`);
            }
            const pedidos = await Pedido.find({ usuario: usuarioId }).sort({ createdAt: -1 });
            const pedidosPopulados = await Promise.all(
                pedidos.map(pedido => popularPedido(pedido))
            );
            return pedidosPopulados;
        },
        async getPedidoById(obj, { id }) {
            if (!Types.ObjectId.isValid(id)) {
                throw new UserInputError(`El ID de pedido ${id} no es válido.`);
            }
            const pedido = await Pedido.findById(id);
            if (!pedido) throw new UserInputError('Pedido no encontrado');
            return popularPedido(pedido);
        },
        async getPedidos(obj, { estado }) {
            const filtro = {};
            if (estado) {
                filtro.estado_pedido = estado;
            }
            const pedidos = await Pedido.find(filtro).sort({ createdAt: -1 });
            const pedidosPopulados = await Promise.all(
                pedidos.map(pedido => popularPedido(pedido))
            );
            return pedidosPopulados;
        },
        // --- Resolvers de Transaccion ---
        async getTransaccionesPorPedido(obj, { pedidoId }) {
            if (!Types.ObjectId.isValid(pedidoId)) {
                throw new UserInputError(`El ID de pedido ${pedidoId} no es válido.`);
            }
            const transacciones = await Transaccion.find({ pedido: pedidoId }).sort({ createdAt: -1 });
            const transaccionesPopuladas = await Promise.all(
                transacciones.map(transaccion => popularTransaccion(transaccion))
            );
            return transaccionesPopuladas;
        },
        async getTransacciones(obj, { estado }) {
            const filtro = {};
            if (estado) {
                filtro.estado_transaccion = estado;
            }
            const transacciones = await Transaccion.find(filtro).sort({ createdAt: -1 });
            const transaccionesPopuladas = await Promise.all(
                transacciones.map(transaccion => popularTransaccion(transaccion))
            );
            return transaccionesPopuladas;
        },
        // --- Resolvers de Boleta ---
        async getBoletaPorPedido(obj, { pedidoId }) {
            if (!Types.ObjectId.isValid(pedidoId)) {
                throw new UserInputError(`El ID de pedido ${pedidoId} no es válido.`);
            }
            const boleta = await Boleta.findOne({ pedido: pedidoId });
            if (!boleta) {
                throw new UserInputError('No se encontró una boleta para este pedido.');
            }
            return popularBoleta(boleta);
        },
        async getBoletas(obj) {
            const boletas = await Boleta.find().sort({ createdAt: -1 });
            const boletasPopuladas = await Promise.all(
                boletas.map(boleta => popularBoleta(boleta))
            );
            return boletasPopuladas;
        },
        
        // --- Resolvers de Anulacion ---
        async getAnulacionesPorPedido(obj, { pedidoId }) {
            if (!Types.ObjectId.isValid(pedidoId)) {
                throw new UserInputError(`El ID de pedido ${pedidoId} no es válido.`);
            }
            const anulacion = await AnulacionPedido.findOne({ pedido: pedidoId });
            if (!anulacion) {
                 throw new UserInputError('No se encontró una anulación para este pedido.');
            }
            return popularAnulacion(anulacion);
        },
        async getAnulaciones(obj) {
            const anulaciones = await AnulacionPedido.find().sort({ createdAt: -1 });
            const anulacionesPopuladas = await Promise.all(
                anulaciones.map(anulacion => popularAnulacion(anulacion))
            );
            return anulacionesPopuladas;
        }
    },
    Mutation: {
        // --- Resolvers de Usuario y Rol ---
        async addUsuario(obj, { input }) {
            const existeEmail = await Usuario.findOne({ email: input.email });
            if (existeEmail) throw new UserInputError('El email ya está registrado.');
            if (input.rut) {
                const existeRut = await Usuario.findOne({ rut: input.rut });
                if (existeRut) throw new UserInputError('El RUT ya está registrado.');
            }
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(input.pass, salt);
            let rolAsignadoId;
            if (input.rolId) {
                rolAsignadoId = input.rolId;
                if (!Types.ObjectId.isValid(rolAsignadoId) || !(await Rol.findById(rolAsignadoId))) {
                    throw new UserInputError('El ID de Rol proporcionado no es válido o no existe.');
                }
            } else {
                const rolCliente = await Rol.findOne({ nombre: 'Cliente' });
                if (!rolCliente) throw new Error("Error crítico del servidor: El rol 'Cliente' no existe.");
                rolAsignadoId = rolCliente._id;
            }
            const usuario = new Usuario({
                email: input.email,
                hash_pass: hashedPassword,
                rut: input.rut,
                nombre_completo: input.nombre_completo,
                direccion: input.direccion,
                region: input.region,
                provincia: input.provincia,
                comuna: input.comuna,
                fecha_nacimiento: input.fecha_nacimiento,
                telefono: input.telefono,
                sexo: input.sexo,
                rol: rolAsignadoId
            });
            await usuario.save();
            
            // Lógica de Token de Email
            await crearYEnviarTokenConfirmacion(usuario);
            
            return usuario.populate('rol');
        },
        async addRol(obj, { input }) {
            const existe = await Rol.findOne({ nombre: input.nombre });
            if (existe) throw new UserInputError('Ya existe un rol con ese nombre.');
            const rol = new Rol(input);
            await rol.save();
            return rol;
        },
        async updRol(obj, { id, input }) {
             if (!Types.ObjectId.isValid(id)) {
                 throw new UserInputError(`El ID ${id} no es válido.`);
            }
            const rol = await Rol.findByIdAndUpdate(id, { $set: input }, { new: true });
            if (!rol) throw new UserInputError('Rol no encontrado');
            return rol;
        },
        async updUsuario(obj, { id, input }) {
            const updates = {};
            if (input.email) updates.email = input.email;
            if (input.rut) updates.rut = input.rut;
            if (input.nombre_completo) updates.nombre_completo = input.nombre_completo;
            if (input.direccion) updates.direccion = input.direccion;
            if (input.region) updates.region = input.region;
            if (input.provincia) updates.provincia = input.provincia;
            if (input.comuna) updates.comuna = input.comuna;
            if (input.fecha_nacimiento) updates.fecha_nacimiento = input.fecha_nacimiento;
            if (input.telefono) updates.telefono = input.telefono;
            if (input.sexo) updates.sexo = input.sexo;
            if (input.pass) {
                const salt = await bcrypt.genSalt(10);
                updates.hash_pass = await bcrypt.hash(input.pass, salt);
            }
            if (input.rolId) {
                if (!Types.ObjectId.isValid(input.rolId) || !(await Rol.findById(input.rolId))) {
                    throw new UserInputError('El ID de Rol proporcionado no es válido o no existe.');
                }
                updates.rol = input.rolId;
            }
            const usuario = await Usuario.findByIdAndUpdate(
                id,
                { $set: updates },
                { new: true }
            ).populate('rol');
            if (!usuario) throw new UserInputError('Usuario no encontrado');
            return usuario;
        },
        async delUsuario(obj, { id }) {
            if (!Types.ObjectId.isValid(id)) {
                throw new UserInputError(`El ID ${id} no es válido.`);
            }
            const res = await Usuario.deleteOne({ _id: id });
            if (res.deletedCount === 0) throw new UserInputError(`Usuario con ID ${id} no encontrado.`);
            return { status: "200", message: "Usuario eliminado" }
        },
        async delRol(obj, { id }) {
            if (!Types.ObjectId.isValid(id)) {
                throw new UserInputError(`El ID ${id} no es válido.`);
            }
            const usuarioUsandoRol = await Usuario.findOne({ rol: id });
            if (usuarioUsandoRol) {
                throw new UserInputError(`No se puede borrar el rol, está asignado al usuario ${usuarioUsandoRol.email}.`);
            }
            const res = await Rol.deleteOne({ _id: id });
            if (res.deletedCount === 0) throw new UserInputError(`Rol con ID ${id} no encontrado.`);
            return { status: "200", message: "Rol eliminado" }
        },
        
        // --- Resolvers de Categoria y Producto ---
        async addCategoria(obj, { input }) {
            const existe = await Categoria.findOne({ nombre: input.nombre });
            if (existe) throw new UserInputError('Ya existe una categoría con ese nombre.');
            const categoria = new Categoria(input);
            await categoria.save();
            return categoria;
        },
        async updCategoria(obj, { id, input }) {
            if (!Types.ObjectId.isValid(id)) {
                throw new UserInputError(`El ID ${id} no es válido`);
            }
            const categoria = await Categoria.findByIdAndUpdate(id, { $set: input }, { new: true });
            if (!categoria) throw new UserInputError('Categoría no encontrada');
            return categoria;
        },
        async delCategoria(obj, { id }) {
            if (!Types.ObjectId.isValid(id)) {
                throw new UserInputError(`El ID ${id} no es válido`);
            }
            const productoUsandoCategoria = await Producto.findOne({ categoria: id });
            if (productoUsandoCategoria) throw new UserInputError(`No se puede borrar, la categoría está en uso por el producto: ${productoUsandoCategoria.nombre}.`);
            const res = await Categoria.deleteOne({ _id: id });
            if (res.deletedCount === 0) throw new UserInputError(`Categoría con ID ${id} no encontrada.`);
            return { status: "200", message: "Categoría eliminada" }
        },
        async addProducto(obj, { input }) {
            const { categoriaId, ...restoDelInput } = input;
            if (!Types.ObjectId.isValid(categoriaId)) {
                throw new UserInputError(`El ID de categoría ${categoriaId} no es válido.`);
            }
            const categoriaExiste = await Categoria.findById(categoriaId);
            if (!categoriaExiste) throw new UserInputError('La categoría asignada no existe.');
            const producto = new Producto({
                ...restoDelInput,
                categoria: categoriaId
            });
            await producto.save();
            return producto.populate('categoria');
        },
        async updProducto(obj, { id, input }) {
            if (!Types.ObjectId.isValid(id)) {
                throw new UserInputError(`El ID del producto ${id} no es válido.`);
            }
            const { categoriaId, ...restoDelInput } = input;
            const updates = { ...restoDelInput };
            if (categoriaId) {
                if (!Types.ObjectId.isValid(categoriaId) || !(await Categoria.findById(categoriaId))) {
                    throw new UserInputError('El nuevo ID de Categoría proporcionado no es válido o no existe.');
                }
                updates.categoria = categoriaId;
            }
            const producto = await Producto.findByIdAndUpdate(
                id,
                { $set: updates },
                { new: true }
            ).populate('categoria');
            if (!producto) throw new UserInputError('Producto no encontrado');
            return producto;
        },
        async delProducto(obj, { id }) {
            if (!Types.ObjectId.isValid(id)) {
                throw new UserInputError(`El ID ${id} no es válido.`);
            }
            const res = await Producto.deleteOne({ _id: id });
            if (res.deletedCount === 0) throw new UserInputError(`Producto con ID ${id} no encontrado.`);
            return { status: "200", message: "Producto eliminado" }
        },

        // --- Resolvers de Carrito ---
        async agregarAlCarrito(obj, { usuarioId, productoId, cantidad }) {
            if (cantidad <= 0) {
                throw new UserInputError('La cantidad debe ser un número positivo.');
            }
            let carrito = await CarritoCompras.findOne({ usuario: usuarioId });
            if (!carrito) {
                carrito = new CarritoCompras({ usuario: usuarioId, items: [] });
            }
            const itemIndex = carrito.items.findIndex(item => item.producto.toString() === productoId);
            if (itemIndex > -1) {
                carrito.items[itemIndex].cantidad = cantidad;
            } else {
                carrito.items.push({ producto: productoId, cantidad: cantidad });
            }
            await carrito.save();
            return popularCarrito(carrito);
        },
        async eliminarDelCarrito(obj, { usuarioId, productoId }) {
            const carrito = await CarritoCompras.findOne({ usuario: usuarioId });
            if (!carrito) {
                throw new UserInputError('No se encontró un carrito para este usuario.');
            }
            carrito.items = carrito.items.filter(item => item.producto.toString() !== productoId);
            await carrito.save();
            return popularCarrito(carrito);
        },
        async vaciarCarrito(obj, { usuarioId }) {
            const carrito = await CarritoCompras.findOne({ usuario: usuarioId });
            if (!carrito) {
                throw new UserInputError('No se encontró un carrito para este usuario.');
            }
            carrito.items = [];
            await carrito.save();
            return popularCarrito(carrito);
        },
        
        // --- Resolvers de Pedido ---
        async crearPedidoDesdeCarrito(obj, { input }) {
            const { usuarioId } = input;
            const carrito = await CarritoCompras.findOne({ usuario: usuarioId }).populate('items.producto');
            if (!carrito || !carrito.items || carrito.items.length === 0) {
                throw new UserInputError('El carrito está vacío. No se puede crear un pedido.');
            }
            let totalPedido = 0;
            const itemsPedido = carrito.items.map(item => {
                if (!item.producto) {
                    throw new Error('Producto en el carrito no encontrado. Datos corruptos.');
                }
                // --- Validar Stock ---
                if (item.producto.stock < item.cantidad) {
                    throw new UserInputError(`Stock insuficiente para ${item.producto.nombre}. Quedan ${item.producto.stock}.`);
                }
                const subtotal = item.producto.precio * item.cantidad;
                totalPedido += subtotal;
                return {
                    producto: item.producto._id,
                    cantidad: item.cantidad,
                    precio_unit_pagado: item.producto.precio
                };
            });
            
            // --- Descontar Stock (¡Importante!) ---
            for (const item of carrito.items) {
                await Producto.findByIdAndUpdate(item.producto._id, {
                    $inc: { stock: -item.cantidad }
                });
            }

            const nuevoPedido = new Pedido({
                usuario: usuarioId,
                items: itemsPedido,
                total_pagado: totalPedido,
                estado_pedido: 'NUEVO'
            });
            await nuevoPedido.save();
            carrito.items = [];
            await carrito.save();
            return popularPedido(nuevoPedido);
        },
        async actualizarEstadoPedido(obj, { id, estado }) {
            if (!Types.ObjectId.isValid(id)) {
                throw new UserInputError(`El ID de pedido ${id} no es válido.`);
            }
            const estadosPermitidos = Pedido.schema.path('estado_pedido').enumValues;
            if (!estadosPermitidos.includes(estado)) {
                throw new UserInputError(`El estado "${estado}" no es válido.`);
            }
            const pedido = await Pedido.findByIdAndUpdate(
                id,
                { $set: { estado_pedido: estado } },
                { new: true }
            );
            if (!pedido) {
                throw new UserInputError('Pedido no encontrado.');
            }
            return popularPedido(pedido);
        },
        
        // --- Resolvers de Transaccion ---
        async crearTransaccion(obj, { input }) {
            if (!Types.ObjectId.isValid(input.pedidoId)) {
                throw new UserInputError('El ID de Pedido no es válido.');
            }
            const pedido = await Pedido.findById(input.pedidoId);
            if (!pedido) {
                throw new UserInputError('El Pedido asociado no existe.');
            }
            if (pedido.total_pagado !== input.monto) {
                console.warn(`Alerta: Monto de transacción (${input.monto}) no coincide con total del pedido (${pedido.total_pagado}).`);
            }
            const nuevaTransaccion = new Transaccion({
                pedido: input.pedidoId,
                id_pasarela: input.id_pasarela,
                monto: input.monto,
                estado_transaccion: input.estado_transaccion,
                mensaje_pasarela: input.mensaje_pasarela
            });
            await nuevaTransaccion.save();
            if (input.estado_transaccion === 'APROBADA') {
                pedido.estado_pedido = 'PAGADO';
                await pedido.save();
            } else if (input.estado_transaccion === 'RECHAZADA') {
                pedido.estado_pedido = 'PAGO_FALLIDO';
                await pedido.save();
            }
            return popularTransaccion(nuevaTransaccion);
        },

        // --- Resolver de Boleta ---
        async crearBoleta(obj, { input }) {
            const { pedidoId, transaccionId, metodo_de_pago } = input;

            if (!Types.ObjectId.isValid(pedidoId)) throw new UserInputError(`ID de Pedido no válido.`);
            if (!Types.ObjectId.isValid(transaccionId)) throw new UserInputError(`ID de Transacción no válido`);

            const pedido = await Pedido.findById(pedidoId);
            if (!pedido) throw new UserInputError('Pedido no encontrado.');
            
            const transaccion = await Transaccion.findById(transaccionId);
            if (!transaccion) throw new UserInputError('Transacción no encontrada.');

            const boletaExiste = await Boleta.findOne({ pedido: pedidoId });
            if (boletaExiste) {
                throw new UserInputError('Ya existe una boleta para este pedido.')
            }

            const total = pedido.total_pagado;
            const subtotal = Math.round(total / (1 + IVA_PERCENT));
            const iva = total - subtotal;

            const nuevaBoleta = new Boleta({
                pedido: pedidoId,
                transaccion: transaccionId,
                subtotal: subtotal,
                iva: iva,
                total: total,
                metodo_de_pago: metodo_de_pago
            });

            await nuevaBoleta.save();
            return popularBoleta(nuevaBoleta);
        },

        // --- Resolver de Anulacion ---
        async crearAnulacionPedido(obj, { input }) {
            const { pedidoId, motivo } = input;

            if (!Types.ObjectId.isValid(pedidoId)) {
                throw new UserInputError('El ID de Pedido no es válido.');
            }
            
            const pedido = await Pedido.findById(pedidoId);
            if (!pedido) {
                throw new UserInputError('Pedido no encontrado.');
            }

            if (pedido.estado_pedido === 'ANULADO') {
                throw new UserInputError('Este pedido ya ha sido anulado.');
            }
            
            // Devolver Stock
            await pedido.populate('items.producto');
            for (const item of pedido.items) {
                await Producto.findByIdAndUpdate(item.producto._id, {
                    $inc: { stock: item.cantidad }
                });
            }

            const anulacion = new AnulacionPedido({
                pedido: pedidoId,
                motivo: motivo
            });
            await anulacion.save();
            
            pedido.estado_pedido = 'ANULADO';
            await pedido.save();
            
            return popularAnulacion(anulacion);
        },
        
        // --- Resolvers de Autenticación ---
        async login(obj, { email, pass }) {
            const usuario = await Usuario.findOne({ email: email }).populate('rol');
            if (!usuario) throw new UserInputError('Email o contraseña incorrectos.');

            const esValida = await bcrypt.compare(pass, usuario.hash_pass);
            if (!esValida) throw new UserInputError('Email o contraseña incorrectos.')

            if (!usuario.email_confirmado) {
                throw new UserInputError('Tu email no ha sido confirmado.')
            }

            const tokenPayLoad = {
                id: usuario._id,
                email: usuario.email,
                rol: usuario.rol.nombre
            };

            const token = jwt.sign(tokenPayLoad, JWT_SECRET, {expiresIn: '30min'});

            await Sesion.findOneAndUpdate(
                { usuario: usuario._id },
                { token_sesion: token, updatedAt: new Date() },
                { upsert: true, new: true }
            );

            return {
                token: token,
                usuario: usuario
            };
        },
        async confirmarEmail(obj, { token }) {
            const tokenDoc = await TokenConfirmacion.findOne({
                valor_token: token,
                tipo_token: 'EMAIL_CONFIRMACION'
            });

            if (!tokenDoc) throw new UserInputError('Token no válido.');
            
            if (tokenDoc.fecha_expiracion < new Date()) {
                throw new UserInputError('El token ha expirado. Por favor, solicita uno nuevo.');
            }

            if (tokenDoc.ha_sido_usado) {
                throw new UserInputError('Este token ya ha sido utilizado.');
            }

            await Usuario.findByIdAndUpdate(tokenDoc.usuario, {
                $set: { email_confirmado: true }
            });

            tokenDoc.ha_sido_usado = true;
            await tokenDoc.save();

            return {
                status: "200",
                message: "Email confirmado exitosamente."
            };
        },
        async reenviarConfirmacion(obj, { email }) {
            const usuario = await Usuario.findOne({ email: email });
            if (!usuario) {
                return {
                    status: "200",
                    message: "Si el email existe, se ha enviado un nuevo correo."
                };
            }
            if (usuario.email_confirmado) {
                return {
                    status: "400",
                    message: "Este email ya ha sido confirmado."
                };
            }
            await crearYEnviarTokenConfirmacion(usuario);
            return {
                status: "200",
                message: "Se ha enviado un nuevo correo de confirmación."
            };
        }
    }
}

// -----------------------------------------------------
// --- INICIO DEL SERVIDOR ---
// -----------------------------------------------------
const app = express();
app.use(cors());

async function startServer() {
    const apolloServer = new ApolloServer({
        typeDefs,
        resolvers,
    });

    await apolloServer.start();

    apolloServer.applyMiddleware({ app, path: '/graphql', cors: false });

    app.listen(8157, () => {
        console.log("Servidor Iniciado en http://localhost:8157/graphql");
    });
}

startServer();