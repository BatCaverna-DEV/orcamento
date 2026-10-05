import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

export const CONTA_PENDENTE = 'pendente'
export const CONTA_PAGA = 'pago'

//Conta = ocorrência de uma despesa em um mês
const Conta = sequelize.define('Conta', {
    id: {
        type: DataTypes.STRING(50),
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
    },
    valor_pago: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        get() {
            return Number(this.getDataValue('valor_pago'))
        },
    },
    //"pendente" ou "pago"
    status: {
        type: DataTypes.STRING(45),
        defaultValue: CONTA_PENDENTE,
    },
    meses_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    despesas_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    tableName: 'contas',
    indexes: [{ unique: true, fields: ['meses_id', 'despesas_id'] }],
})

export default Conta
