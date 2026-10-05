import express from 'express'
import { atualizar } from '../controllers/contaController.js'
import autenticar from '../middlewares/autenticar.js'
const router = express.Router()

router.use(autenticar)
router.put('/:id', atualizar)

export default router
