import { reactive } from 'vue'

const CHAVE_TOKEN = 'orcamento.token'

function lerToken() {
    try {
        return localStorage.getItem(CHAVE_TOKEN) || ''
    } catch {
        return ''
    }
}

//Estado global da sessão (token JWT + usuário logado)
export const sessao = reactive({
    token: lerToken(),
    usuario: null,
})

export function iniciarSessao(token, usuario) {
    sessao.token = token
    sessao.usuario = usuario
    try {
        localStorage.setItem(CHAVE_TOKEN, token)
    } catch { /* navegador sem storage: a sessão dura até recarregar */ }
}

export function encerrarSessao() {
    sessao.token = ''
    sessao.usuario = null
    try {
        localStorage.removeItem(CHAVE_TOKEN)
    } catch { /* ignora */ }
}
