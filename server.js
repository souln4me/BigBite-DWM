const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');

const { ApolloServer, gql, UserInputError } = require('apollo-server-express');
const { Types } = require('mongoose');

// --- 1. IMPORTAR MODELOS (AÑADIDO Pedido) ---
const Usuario = require('./models/usuario');
const Rol = require('./models/rol');
const Producto = require('./models/producto');
const Categoria = require('./models/categoria');
const CarritoCompras = require('./models/carritoCompras');
const Pedido = require('./models/pedido');

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

# --- ¡NUEVOS TIPOS DE PEDIDO! ---
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

# --- ¡NUEVO INPUT PARA CREAR PEDIDO! ---
# Esto es lo que se envía al iniciar el checkout.
input PedidoInput {
    usuarioId: ID!
    # El resto de datos (items, total) los calculamos en el backend
    # a partir del carrito del usuario.
}


# --- QUERY (Actualizada) ---
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

    # --- ¡NUEVAS QUERIES DE PEDIDO! ---
    getPedidosPorUsuario(usuarioId: ID!): [Pedido]
    getPedidoById(id: ID!): Pedido
    getPedidos(estado: String): [Pedido]
}

# --- MUTATION (Actualizada) ---
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
    
    # --- ¡NUEVAS MUTACIONES DE PEDIDO! ---
    crearPedidoDesdeCarrito(input: PedidoInput!): Pedido
    actualizarEstadoPedido(id: ID!, estado: String!): Pedido
    # (Tu 'AnulacionPedido' es un estado, así que lo manejamos con 'actualizarEstadoPedido')
}
`;

// ---------------------
// --- 3. RESOLVERS (Actualizados) ---
// ---------------------

// --- Funciones Helper para Popular ---
const popularCarrito = (carritoDocument) => {
    return carritoDocument.populate([
        { path: 'usuario' },
        { path: 'items.producto' }
    ]);
};

// ¡NUEVO HELPER PARA PEDIDO!
const popularPedido = (pedidoDocument) => {
    return pedidoDocument.populate([
        { path: 'usuario' },
        { path: 'items.producto' }
    ]);
};


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

        // --- ¡NUEVOS RESOLVERS DE PEDIDO! ---
        async getPedidosPorUsuario(obj, { usuarioId }) {
            if (!Types.ObjectId.isValid(usuarioId)) {
                throw new UserInputError(`El ID de usuario ${usuarioId} no es válido.`);
            }
            const pedidos = await Pedido.find({ usuario: usuarioId }).sort({ createdAt: -1 }); // Ordena por más reciente
            
            // Populamos cada pedido en la lista
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
        
        // --- ¡NUEVAS MUTACIONES DE PEDIDO! ---
        async crearPedidoDesdeCarrito(obj, { input }) {
            const { usuarioId } = input;

            // 1. Buscar el carrito del usuario y populamos los productos
            const carrito = await CarritoCompras.findOne({ usuario: usuarioId }).populate('items.producto');
            if (!carrito || !carrito.items || carrito.items.length === 0) {
                throw new UserInputError('El carrito está vacío. No se puede crear un pedido.');
            }

            // 2. Transformar items del carrito en items de pedido (congelando el precio)
            let totalPedido = 0;
            const itemsPedido = carrito.items.map(item => {
                if (!item.producto) {
                    throw new Error('Producto en el carrito no encontrado. Datos corruptos.');
                }
                const subtotal = item.producto.precio * item.cantidad;
                totalPedido += subtotal;
                
                return {
                    producto: item.producto._id,
                    cantidad: item.cantidad,
                    precio_unit_pagado: item.producto.precio
                };
            });

            // 3. Crear el nuevo pedido con el estado 'NUEVO'
            const nuevoPedido = new Pedido({
                usuario: usuarioId,
                items: itemsPedido,
                total_pagado: totalPedido,
                estado_pedido: 'NUEVO' // Estado inicial de tu enum
            });

            // 4. Guardar el pedido
            await nuevoPedido.save();

            // 5. Vaciar el carrito
            carrito.items = [];
            await carrito.save();
            
            // 6. Devolver el pedido recién creado y populado
            return popularPedido(nuevoPedido);
        },

        async actualizarEstadoPedido(obj, { id, estado }) {
            if (!Types.ObjectId.isValid(id)) {
                throw new UserInputError(`El ID de pedido ${id} no es válido.`);
            }

            // Validar que el estado sea uno de los valores permitidos en el enum del modelo
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