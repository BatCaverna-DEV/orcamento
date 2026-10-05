const moeda = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

//Formata número como "1.486,45" (sem o símbolo R$)
export function formatarValor(valor) {
    return moeda.format(Number(valor) || 0)
}

//Mês atual no formato "2026-10" (horário local)
export function mesAtual() {
    const hoje = new Date()
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
}

//"2026-10" -> "2026-11"
export function proximoMes(mes) {
    const [ano, m] = mes.split('-').map(Number)
    return m === 12 ? `${ano + 1}-01` : `${ano}-${String(m + 1).padStart(2, '0')}`
}

//Diferença em meses entre "AAAA-MM" a e b ("2026-01", "2026-03" -> 2)
export function mesesEntre(a, b) {
    const [ya, ma] = a.split('-').map(Number)
    const [yb, mb] = b.split('-').map(Number)
    return (yb - ya) * 12 + (mb - ma)
}

//A despesa vale no mês "AAAA-MM" se inicio <= mês <= fim (fim nulo = sem prazo) — mesma regra do backend
export function despesaVigente(despesa, mes) {
    const inicio = despesa.inicio.slice(0, 7)
    const fim = despesa.fim ? despesa.fim.slice(0, 7) : null
    return inicio <= mes && (!fim || fim >= mes)
}

//"2026-10" -> "out/2026"
export function nomeMes(mes) {
    const [ano, m] = mes.split('-').map(Number)
    const nome = new Date(ano, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    return `${nome}/${ano}`
}

//"2026-10-01" -> "10/2026"
export function mesAno(data) {
    const [ano, m] = data.split('-')
    return `${m}/${ano}`
}

//Saudação conforme o horário atual
export function saudacao() {
    const hora = new Date().getHours()
    if (hora < 12) return 'Bom dia'
    if (hora < 18) return 'Boa tarde'
    return 'Boa noite'
}
