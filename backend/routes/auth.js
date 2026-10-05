import express from 'express'
import { registrar, login, me, atualizarPerfil } from '../controllers/authController.js'
import autenticar from '../middlewares/autenticar.js'
const router = express.Router()

router.post('/registrar', registrar)
router.post('/login', login)
router.get('/me', autenticar, me)
router.put('/me', autenticar, atualizarPerfil)

export default router
