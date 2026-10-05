import { Mes, Conta, Despesa, Usuario, sequelize } from '../models/index.js'
import { MES_ABERTO, MES_FECHADO } from '../models/Mes.js'
import { gerarContasDoMes } from '../services/contas.js'
import { dinheiro, mesReferencia, primeiroErro } from '../utils/validar.js'

const comContas = { model: Conta, as: 'contas', attributes: ['id', 'valor_pago', 'status', 'despesas_id', 'meses_id'] }

async function buscarDoUsuario(req) {
    return Mes.findOne({ where: { id: req.params.id, usuarios_id: req.usuarioId } })
}

//GET /meses — meses em ordem cronológica, cada um com suas contas
export async function listar(req, res) {
    const meses = await Mes.findAll({
        where: { usuarios_id: req.usuarioId },
        include: [comContas],
        order: [['descricao', 'ASC']],
    })
    res.json(meses)
}

//POST /meses { descricao: "AAAA-MM", salario? } — gera as contas das despesas vigentes
export async function criar(req, res) {
    const descricao = String(req.body.descricao ?? '')
    const erro = primeiroErro(
        mesReferencia(descricao),
        req.body.salario !== undefined ? dinheiro(req.body.salario, 'Salário') : null,
    )
    if (erro) return res.status(400).json({ erro })

    const existe = await Mes.findOne({ where: { usuarios_id: req.usuarioId, descricao } })
    if (existe) return res.status(409).json({ erro: 'Esse mês já foi aberto.' })

    const usuario = await Usuario.findByPk(req.usuarioId)
    const salario = req.body.salario !== undefined ? Number(req.body.salario) : usuario.salario

    const mes = await sequelize.transaction(async (transaction) => {
        const novo = await Mes.create({ descricao, salario, usuarios_id: req.usuarioId }, { transaction })
        const despesas = await Despesa.findAll({ where: { usuarios_id: req.usuarioId }, transaction })
        await gerarContasDoMes(novo, despesas, transaction)
        return novo
    })

    res.status(201).json(await Mes.findByPk(mes.id, { include: [comContas] }))
}

//PUT /meses/:id { salario?, status? }
export async function atualizar(req, res) {
    const mes = await buscarDoUsuario(req)
    if (!mes) return res.status(404).json({ erro: 'Mês não encontrado.' })

    const dados = {}
    if (req.body.salario !== undefined) {
        const erro = dinheiro(req.body.salario, 'Salário')
        if (erro) return res.status(400).json({ erro })
        dados.salario = Number(req.body.salario)
    }
    if (req.body.status !== undefined) {
        const status = Number(req.body.status)
        if (![MES_ABERTO, MES_FECHADO].includes(status)) return res.status(400).json({ erro: 'Status inválido (1 = aberto, 0 = fechado).' })
        dados.status = status
    }

    await mes.update(dados)
    res.json(mes)
}

//DELETE /meses/:id — remove o mês e suas contas
export async function excluir(req, res) {
    const mes = await buscarDoUsuario(req)
    if (!mes) return res.status(404).json({ erro: 'Mês não encontrado.' })

    await sequelize.transaction(async (transaction) => {
        await Conta.destroy({ where: { meses_id: mes.id }, transaction })
        await mes.destroy({ transaction })
    })
    res.status(204).end()
}
