import express from 'express'
const router = express.Router()

router.get('/', (req, res) => {res.send('Tela de Admin...')})

export default router