//APAGA todas as tabelas (inclusive as do modelo antigo) e recria no formato atual dos models.
//Uso: npm run db:reset -- --sim
import { sequelize } from '../models/index.js'

if (!process.argv.includes('--sim')) {
    console.log('Isto apaga TODOS os dados do banco. Para confirmar: npm run db:reset -- --sim')
    process.exit(1)
}

//Tabelas do modelo anterior + atuais
const tabelas = ['transacoes', 'fixas', 'categoria', 'contas', 'despesas', 'meses', 'usuarios']
const dialeto = sequelize.getDialect()

try {
    if (dialeto === 'sqlite') await sequelize.query('PRAGMA foreign_keys = OFF')
    else await sequelize.query('SET FOREIGN_KEY_CHECKS = 0')

    for (const tabela of tabelas) {
        await sequelize.getQueryInterface().dropTable(tabela)
        console.log(`- ${tabela} removida`)
    }

    if (dialeto === 'sqlite') await sequelize.query('PRAGMA foreign_keys = ON')
    else await sequelize.query('SET FOREIGN_KEY_CHECKS = 1')

    await sequelize.sync()
    console.log('Tabelas recriadas: usuarios, meses, despesas, contas')
} catch (err) {
    console.error('Erro ao recriar o banco:', err.message)
    process.exitCode = 1
} finally {
    await sequelize.close()
}
