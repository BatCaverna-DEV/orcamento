import express from 'express'
import { listar, criar, atualizar, excluir } from '../controllers/mesController.js'
import autenticar from '../middlewares/autenticar.js'
const router = express.Router()

router.use(autenticar)
router.get('/', listar)
router.post('/', criar)
router.put('/:id', atualizar)
router.delete('/:id', excluir)

export default router
