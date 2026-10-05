import './env.js'
import { Sequelize } from 'sequelize'

const dialect = process.env.DB_DIALECT || 'mysql'

const sequelize = new Sequelize(
    process.env.DB_NAME || 'orcamento',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect,
        storage: process.env.DB_STORAGE,
        logging: false,
        //O DER não tem createdAt/updatedAt
        define: { timestamps: false },
        //SQLite não aceita timezone customizado
        ...(dialect !== 'sqlite' && { timezone: '-03:00' }),
    }
)

export default sequelize
