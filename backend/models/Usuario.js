import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

const Usuario = sequelize.define('Usuario', {
    id: {
        type: DataTypes.STRING(50),
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
    },
    nome: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
    },
    username: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
    },
    //Hash bcrypt, nunca a senha em texto puro
    password: {
        type: DataTypes.STRING(250),
        allowNull: false,
    },
    //Salário base, usado como padrão ao abrir um novo mês
    salario: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        get() {
            return Number(this.getDataValue('salario'))
        },
    },
}, {
    tableName: 'usuarios',
    defaultScope: {
        attributes: { exclude: ['password'] },
    },
    scopes: {
        comSenha: { attributes: { include: ['password'] } },
    },
})

export default Usuario
