import './config/env.js'
import express from 'express';
import cors from 'cors';
const app = express();

const port = process.env.PORT || 3000;

//CORS: origens do .env (separadas por vírgula) + qualquer porta de localhost/127.0.0.1 (o Vite muda de porta se a 5173 estiver ocupada)
const origensPermitidas = (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean);
const origemLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(cors({
    origin: (origin, callback) => {
        //Sem origin = requisição fora do navegador (curl, Postman)
        const permitido = !origin || origemLocal.test(origin) || origensPermitidas.includes(origin);
        callback(null, permitido);
    },
}));
app.use(express.json());

//Rota principal
app.get('/', (req, res) => {
    res.send('Servidor Truando...')
})

//Rotas
import admin from './routes/admin.js'
import auth from './routes/auth.js'
import despesas from './routes/despesas.js'
import meses from './routes/meses.js'
import contas from './routes/contas.js'
app.use('/admin', admin);
app.use('/auth', auth);
app.use('/despesas', despesas);
app.use('/meses', meses);
app.use('/contas', contas);

//Tratamento de erros (Express 5 repassa erros de funções async para cá)
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor.' });
})

//Banco de dados
import { sequelize } from './models/index.js'

if (!process.env.JWT_SECRET) {
    console.error("Defina JWT_SECRET no backend/.env (veja o .env.example).");
    process.exit(1);
}

sequelize.sync()
    .then(() => {
        app.listen(port, ()=>{
            console.log("Servidor rodando em http://localhost:" + port);
        })
    })
    .catch((err) => {
        console.error("Erro ao conectar no banco de dados:", err.name, err.parent?.code ?? err.message);
    })
