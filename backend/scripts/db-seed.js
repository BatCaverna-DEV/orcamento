//Cria (ou recria) um usuário fictício com despesas, meses e contas de exemplo.
//Uso: npm run db:seed
//Login de demonstração: usuário "demo", senha "demo123"
import bcrypt from 'bcryptjs'
import { sequelize, Usuario, Mes, Despesa, Conta } from '../models/index.js'
import { DESPESA_FIXA, DESPESA_DIVIDA } from '../models/Despesa.js'
import { CONTA_PAGA } from '../models/Conta.js'
import { MES_FECHADO } from '../models/Mes.js'
import { gerarContasDoMes } from '../services/contas.js'

const DEMO = {
    nome: 'Usuário Demo',
    email: 'demo@orcamento.local',
    username: 'demo',
    senha: 'demo123',
    salario: 6500,
}

const despesas = [
    { descricao: 'Aluguel', valor: 1800, tipo: DESPESA_FIXA, inicio: '2026-01-01', fim: null },
    { descricao: 'Energia', valor: 250, tipo: DESPESA_FIXA, inicio: '2026-01-01', fim: null },
    { descricao: 'Internet', valor: 119.9, tipo: DESPESA_FIXA, inicio: '2026-01-01', fim: null },
    { descricao: 'Academia', valor: 99.9, tipo: DESPESA_FIXA, inicio: '2026-02-01', fim: '2026-12-31' },
    { descricao: 'Financiamento do carro', valor: 890, tipo: DESPESA_DIVIDA, inicio: '2026-03-01', fim: '2028-02-29' },
    { descricao: 'Notebook', valor: 450, tipo: DESPESA_DIVIDA, inicio: '2026-08-01', fim: '2027-01-31' },
]

//Meses abertos: [mês, salário, fechado?, despesas pagas (descrição -> valor pago)]
const meses = [
    ['2026-08', 6500, true, { Aluguel: 1800, Energia: 231.4, Internet: 119.9, Academia: 99.9, 'Financiamento do carro': 890, Notebook: 450 }],
    ['2026-09', 6500, true, { Aluguel: 1800, Energia: 268.75, Internet: 119.9, Academia: 99.9, 'Financiamento do carro': 890, Notebook: 450 }],
    ['2026-10', 7200, false, { Aluguel: 1800, Internet: 119.9, 'Financiamento do carro': 890 }],
    ['2026-11', 6500, false, {}],
]

try {
    await sequelize.transaction(async (transaction) => {
        //Recria do zero: remove o demo anterior e tudo dele
        const antigo = await Usuario.findOne({ where: { username: DEMO.username }, transaction })
        if (antigo) {
            const mesesAntigos = await Mes.findAll({ where: { usuarios_id: antigo.id }, attributes: ['id'], transaction })
            await Conta.destroy({ where: { meses_id: mesesAntigos.map((m) => m.id) }, transaction })
            await Mes.destroy({ where: { usuarios_id: antigo.id }, transaction })
            await Despesa.destroy({ where: { usuarios_id: antigo.id }, transaction })
            await antigo.destroy({ transaction })
        }

        const usuario = await Usuario.create({
            nome: DEMO.nome,
            email: DEMO.email,
            username: DEMO.username,
            password: await bcrypt.hash(DEMO.senha, 10),
            salario: DEMO.salario,
        }, { transaction })

        await Despesa.bulkCreate(despesas.map((d) => ({ ...d, usuarios_id: usuario.id })), { transaction })
        //bulkCreate no MySQL não devolve os ids auto-incremento: relê do banco
        const lista = await Despesa.findAll({ where: { usuarios_id: usuario.id }, transaction })
        const porDescricao = new Map(lista.map((d) => [d.descricao, d]))

        for (const [descricao, salario, fechado, pagas] of meses) {
            const mes = await Mes.create({ descricao, salario, usuarios_id: usuario.id }, { transaction })
            await gerarContasDoMes(mes, lista, transaction)

            for (const [nome, valor] of Object.entries(pagas)) {
                await Conta.update(
                    { status: CONTA_PAGA, valor_pago: valor },
                    { where: { meses_id: mes.id, despesas_id: porDescricao.get(nome).id }, transaction }
                )
            }
            if (fechado) await mes.update({ status: MES_FECHADO }, { transaction })
        }

        console.log(`Usuário fictício criado: ${lista.length} despesas, ${meses.length} meses.`)
        console.log(`Login: ${DEMO.username} / ${DEMO.senha}`)
    })
} catch (err) {
    console.error('Erro ao criar o usuário fictício:', err.message)
    process.exitCode = 1
} finally {
    await sequelize.close()
}
