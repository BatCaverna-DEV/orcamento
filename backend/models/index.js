import sequelize from '../config/database.js'
import Usuario from './Usuario.js'
import Mes from './Mes.js'
import Despesa from './Despesa.js'
import Conta from './Conta.js'

//Usuario 1:N Mes
Usuario.hasMany(Mes, { foreignKey: 'usuarios_id', as: 'meses' })
Mes.belongsTo(Usuario, { foreignKey: 'usuarios_id', as: 'usuario' })

//Usuario 1:N Despesa
Usuario.hasMany(Despesa, { foreignKey: 'usuarios_id', as: 'despesas' })
Despesa.belongsTo(Usuario, { foreignKey: 'usuarios_id', as: 'usuario' })

//Mes 1:N Conta
Mes.hasMany(Conta, { foreignKey: 'meses_id', as: 'contas', onDelete: 'CASCADE' })
Conta.belongsTo(Mes, { foreignKey: 'meses_id', as: 'mes' })

//Despesa 1:N Conta
Despesa.hasMany(Conta, { foreignKey: 'despesas_id', as: 'contas', onDelete: 'CASCADE' })
Conta.belongsTo(Despesa, { foreignKey: 'despesas_id', as: 'despesa' })

export { sequelize, Usuario, Mes, Despesa, Conta }
