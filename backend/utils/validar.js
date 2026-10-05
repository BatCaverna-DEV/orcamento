//Helpers de validação: cada um devolve a mensagem de erro ou null

export function texto(valor, campo, max) {
    const t = String(valor ?? '').trim()
    if (!t) return `${campo} é obrigatório.`
    if (t.length > max) return `${campo} deve ter no máximo ${max} caracteres.`
    return null
}

export function dinheiro(valor, campo) {
    const n = Number(valor)
    if (valor === '' || valor === null || valor === undefined || !Number.isFinite(n)) return `${campo} inválido.`
    if (n < 0) return `${campo} não pode ser negativo.`
    if (n >= 1e8) return `${campo} muito alto.`
    return null
}

export function data(valor, campo) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(valor ?? '')) || Number.isNaN(Date.parse(valor))) {
        return `${campo} inválida (use AAAA-MM-DD).`
    }
    return null
}

export function mesReferencia(valor) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(valor ?? ''))) return 'Mês inválido (use AAAA-MM).'
    return null
}

//Primeiro erro encontrado
export const primeiroErro = (...erros) => erros.find(Boolean) ?? null
