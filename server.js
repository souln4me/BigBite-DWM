const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const {ApolloServer, gql, UserInputError} = require('apollo-server-express');
const {Types} = require('mongoose');

const Usuario = require('./models/usuario');
const Rol = require('./models/rol');

mongoose.connect('mongodb://localhost:27017/bd-bigbite');

const typeDefs = gql`
type Rol {
    id: ID!
    nombre: String!
}
type Usuario {
    id: ID!
    nombre: String!
    pass: String!
    rol: Rol!
}
input UsuarioInput {
    nombre: String!
    pass: String!
    rol: String!
}
input RolInput {
    nombre: String!
}
type Response {
    status: String
    message: String
}
type Query {
    getUsuarios: [Usuario]
    getUsuariosRol: [Usuario]
    getUsuarioById(id: ID!): Usuario
    getUsuarioByIdRol(id: ID!): Usuario
    getRoles: [Rol]
    getRolById(id: ID!): Rol
}
type Mutation {
    addUsuario(input: UsuarioInput): Usuario
    updUsuario(id: ID!, input: UsuarioInput): Usuario
    delUsuario(id: ID!): Response
    addRol(input: RolInput): Rol
    updRol(id: ID!, input: RolInput): Rol
    delRol(id: ID!): Response
}
`;

const resolvers = {
    Query: {
        async getUsuarios(obj){
            const usuarios = await Usuario.find();
            return usuarios;
        },
        async getUsuariosRol(obj){
            const usuarios = await Usuario.find().populate('rol');
            return usuarios;
        },
        async getUsuarioById(obj, {id}){
            const usuarioBus = await Usuario.findById(id);
            if (usuarioBus == null){
                return null;
            } else {
                return usuarioBus;
            }
        },
        async getUsuarioByIdRol(obj, {id}){
            const usuarioBus = await Usuario.findById(id).populate('rol');
            if (usuarioBus == null){
                return null;
            } else {
                return usuarioBus;
            }
        },
        async getRoles(obj){
            const roles = await Rol.find();
            return roles;
        },
        async getRolById(obj, {id}){
            const rolBus = await Rol.findById(id);
            if (rolBus == null){
                return null;
            } else {
                return rolBus;
            }
        },
    },
    Mutation: {
        async addUsuario(obj, {input}){
            const {nombre, pass, rol} = input;
            const rolId = rol;

            // Validar el ID del rol
            if (!rolId) {
                throw new UserInputError('El ID del rol no puede estar vacío');
            }

            if (!Types.ObjectId.isValid(rolId)) {
                throw new UserInputError('El ID del rol no es válido');
            }
            // Fin validación

            let rolBus = await Rol.findById(rolId);
            if (rolBus == null) {
                throw new UserInputError(`El rol con ID ${rolId} no existe`);
            } else {
                const usuario = new Usuario({nombre: nombre, pass: pass, rol: rolBus});
                await usuario.save();
                return usuario;                
            }
        },
        async addRol(obj, {input}){
            const rol = new Rol(input);
            await rol.save();
            return rol;
        },
        async updUsuario(obj, {id, input}){
            const {nombre, pass, rol} = input;
            const rolId = rol;

            // Validar el ID del rol
            if (!rolId || !Types.ObjectId.isValid(rolId)) {
                throw new UserInputError('El ID de rol proporcionado no es válido.');
            }

            let rolBus = await Rol.findById(rolId);
            if (rolBus == null) {
                throw new UserInputError(`El rol con ID ${rolId} no existe`);
            } else {
                const usuario = await Usuario.findByIdAndUpdate(id,
                    {nombre: nombre, pass: pass, rol: rolBus},
                    {new: true}
                );
                return usuario;
            }
        },
        async delUsuario(obj, {id}){
            if (!Types.ObjectId.isValid(id)) {
                throw new UserInputError(`El ID ${id} no es válido.`);
            }

            const res = await Usuario.deleteOne({_id: id});

            if (res.deletedCount === 0) {
                throw new UserInputError(`Usuario con ID ${id} no encontrado.`)
            }

            return {
                status: "200",
                message: "Usuario eliminado"
            }
        },
        async delRol(obj, {id}){
            if (!Types.ObjectId.isValid(id)) {
                throw new UserInputError(`El ID ${id} no es válido.`)
            }

            const res = await Rol.deleteOne({_id: id});

            if (res.deletedCount === 0) {
                throw new UserInputError(`Rol con ID ${id} no encontrado.`)
            }

            return {
                status: "200",
                message: "Rol eliminado"
            }
        }        
    }
}

// ---------------------
// INICIO DEL SERVIDOR
// ---------------------
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