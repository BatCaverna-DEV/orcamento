import { Despesa, Conta, sequelize } from '../models/index.js'
import { DESPESA_FIXA, DESPESA_DIVIDA } from '../models/Despesa.js'
import { CONTA_PAGA } from '../models/Conta.js'
import { sincronizarContasDaDespesa } from '../services/contas.js'
import { texto, dinheiro, data, primeiroErro } from '../utils/validar.js'

function validar(body) {
    const tipo = Number(body.tipo)
    const fim = body.fim || null
    const erro = primeiroErro(
        texto(body.descricao, 'Descrição', 100),
        dinheiro(body.valor, 'Valor'),
        [DESPESA_FIXA, DESPESA_DIVIDA].includes(tipo) ? null : 'Tipo inválido (1 = Fixa, 2 = Dívida).',
        data(body.inicio, 'Data de início'),
        fim ? data(fim, 'Data de fim') : null,
        fim && fim < body.inicio ? 'A data de fim deve ser depois do início.' : null,
        tipo === DESPESA_DIVIDA && !fim ? 'Dívida precisa de data de fim (última parcela).' : null,
    )
    if (erro) return { erro }
    return { dados: { descricao: body.descricao.trim(), valor: Number(body.valor), tipo, inicio: body.inicio, fim } }
}

async function buscarDoUsuario(req) {
    return Despesa.findOne({ where: { id: req.params.id, usuarios_id: req.usuarioId } })
}

//GET /despesas — cada despesa com o resumo das contas: qtd_contas, qtd_pagas, total_pago
export async function listar(req, res) {
    const despesas = await Despesa.findAll({
        where: { usuarios_id: req.usuarioId },
        include: [{ model: Conta, as: 'contas', attributes: ['status', 'valor_pago'] }],
        order: [['tipo', 'ASC'], ['descricao', 'ASC']],
    })

    res.json(despesas.map((d) => {
        const { contas, ...dados } = d.toJSON()
        const pagas = contas.filter((c) => c.status === CONTA_PAGA)
        return {
            ...dados,
            qtd_contas: contas.length,
            qtd_pagas: pagas.length,
            total_pago: Math.round(pagas.reduce((total, c) => total + c.valor_pago, 0) * 100) / 100,
        }
    }))
}

//POST /despesas — já cria as contas nos meses existentes em que ela vale
export async function criar(req, res) {
    const { dados, erro } = validar(req.body)
    if (erro) return res.status(400).json({ erro })

    const despesa = await sequelize.transaction(async (transaction) => {
        const nova = await Despesa.create({ ...dados, usuarios_id: req.usuarioId }, { transaction })
        await sincronizarContasDaDespesa(nova, transaction)
        return nova
    })
    res.status(201).json(despesa)
}

//PUT /despesas/:id
export async function atualizar(req, res) {
    const despesa = await buscarDoUsuario(req)
    if (!despesa) return res.status(404).json({ erro: 'Despesa não encontrada.' })

    const { dados, erro } = validar(req.body)
    if (erro) return res.status(400).json({ erro })

    await sequelize.transaction(async (transaction) => {
        await despesa.update(dados, { transaction })
        await sincronizarContasDaDespesa(despesa, transaction)
    })
    res.json(despesa)
}

//DELETE /despesas/:id — bloqueia se já houver conta paga (para não perder histórico)
export async function excluir(req, res) {
    const despesa = await buscarDoUsuario(req)
    if (!despesa) return res.status(404).json({ erro: 'Despesa não encontrada.' })

    const pagas = await Conta.count({ where: { despesas_id: despesa.id, status: CONTA_PAGA } })
    if (pagas > 0) {
        return res.status(409).json({ erro: 'Essa despesa já tem contas pagas. Defina uma data de fim em vez de excluir.' })
    }

    await sequelize.transaction(async (transaction) => {
        await Conta.destroy({ where: { despesas_id: despesa.id }, transaction })
        await despesa.destroy({ transaction })
    })
    res.status(204).end()
}
