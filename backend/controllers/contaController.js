import { Conta, Mes } from '../models/index.js'
import { CONTA_PAGA, CONTA_PENDENTE } from '../models/Conta.js'
import { MES_FECHADO } from '../models/Mes.js'
import { dinheiro } from '../utils/validar.js'

//PUT /contas/:id { status: "pago" | "pendente", valor_pago? }
export async function atualizar(req, res) {
    const conta = await Conta.findByPk(req.params.id, {
        include: [{ model: Mes, as: 'mes', where: { usuarios_id: req.usuarioId } }],
    })
    if (!conta) return res.status(404).json({ erro: 'Conta não encontrada.' })
    if (conta.mes.status === MES_FECHADO) return res.status(409).json({ erro: 'Esse mês está fechado. Reabra-o para alterar.' })

    const status = req.body.status
    if (![CONTA_PAGA, CONTA_PENDENTE].includes(status)) {
        return res.status(400).json({ erro: 'Status inválido (use "pago" ou "pendente").' })
    }

    let valorPago = 0
    if (status === CONTA_PAGA) {
        const erro = dinheiro(req.body.valor_pago, 'Valor pago')
        if (erro) return res.status(400).json({ erro })
        valorPago = Number(req.body.valor_pago)
    }

    await conta.update({ status, valor_pago: valorPago })
    const { mes, ...dados } = conta.toJSON()
    res.json(dados)
}
