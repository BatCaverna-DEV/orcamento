import { Conta, Mes } from '../models/index.js'
import { CONTA_PENDENTE } from '../models/Conta.js'
import { MES_ABERTO } from '../models/Mes.js'

//A despesa vale no mês "AAAA-MM" se inicio <= mês <= fim (fim nulo = sem prazo)
export function despesaVigente(despesa, mes) {
    const inicio = despesa.inicio.slice(0, 7)
    const fim = despesa.fim ? despesa.fim.slice(0, 7) : null
    return inicio <= mes && (!fim || fim >= mes)
}

//Cria as contas (pendentes) do mês para cada despesa vigente que ainda não tem conta
export async function gerarContasDoMes(mes, despesas, transaction) {
    const existentes = await Conta.findAll({ where: { meses_id: mes.id }, attributes: ['despesas_id'], transaction })
    const jaTem = new Set(existentes.map((c) => c.despesas_id))

    const novas = despesas
        .filter((d) => despesaVigente(d, mes.descricao) && !jaTem.has(d.id))
        .map((d) => ({ meses_id: mes.id, despesas_id: d.id, status: CONTA_PENDENTE, valor_pago: 0 }))

    if (novas.length) await Conta.bulkCreate(novas, { transaction })
}

//Após criar/alterar uma despesa: cria contas nos meses abertos do usuário em que ela passou a valer
//e remove as contas pendentes dos meses em que deixou de valer (contas pagas e meses fechados são mantidos)
export async function sincronizarContasDaDespesa(despesa, transaction) {
    const meses = await Mes.findAll({ where: { usuarios_id: despesa.usuarios_id, status: MES_ABERTO }, transaction })
    const contas = await Conta.findAll({ where: { despesas_id: despesa.id }, transaction })
    const contaPorMes = new Map(contas.map((c) => [c.meses_id, c]))

    for (const mes of meses) {
        const conta = contaPorMes.get(mes.id)
        const vigente = despesaVigente(despesa, mes.descricao)

        if (vigente && !conta) {
            await Conta.create({ meses_id: mes.id, despesas_id: despesa.id }, { transaction })
        } else if (!vigente && conta && conta.status === CONTA_PENDENTE) {
            await conta.destroy({ transaction })
        }
    }
}
