import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

export const MES_ABERTO = 1
export const MES_FECHADO = 0

const Mes = sequelize.define('Mes', {
    id: {
        type: DataTypes.STRING(50),
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
    },
    //No DER está VARCHAR(45); usado DECIMAL para permitir somas
    salario: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        get() {
            return Number(this.getDataValue('salario'))
        },
    },
    status: {
        type: DataTypes.INTEGER,
        defaultValue: MES_ABERTO,
    },
    //Mês de referência no formato "AAAA-MM" (único por usuário)
    descricao: {
        type: DataTypes.STRING(45),
        allowNull: false,
    },
    usuarios_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
}, {
    tableName: 'meses',
    indexes: [{ unique: true, fields: ['usuarios_id', 'descricao'] }],
})

export default Mes
