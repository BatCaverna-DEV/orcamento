import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

//Carrega backend/.env independente da pasta de onde o node foi iniciado
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true })
