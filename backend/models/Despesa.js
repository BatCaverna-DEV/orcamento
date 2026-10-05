import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

export const DESPESA_FIXA = 1
export const DESPESA_DIVIDA = 2

const Despesa = sequelize.define('Despesa', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    descricao: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    //Valor mensal previsto
    valor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        get() {
            return Number(this.getDataValue('valor'))
        },
    },
    //1 = Fixa, 2 = Dívida
    tipo: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    inicio: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    //null = sem prazo
    fim: {
        type: DataTypes.DATEONLY,
    },
    usuarios_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
}, {
    tableName: 'despesas',
})

export default Despesa
