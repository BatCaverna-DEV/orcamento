import { sessao, encerrarSessao } from './sessao.js'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

//Chamado quando a API responde 401 (token ausente/expirado); o router define o destino
let aoExpirarSessao = () => {}
export function definirAoExpirarSessao(fn) {
    aoExpirarSessao = fn
}

//Wrapper do fetch: envia/recebe JSON, anexa o token e lança Error com a mensagem "erro" da API
async function request(metodo, caminho, corpo) {
    const headers = {}
    if (corpo) headers['Content-Type'] = 'application/json'
    if (sessao.token) headers.Authorization = `Bearer ${sessao.token}`

    let resposta
    try {
        resposta = await fetch(BASE_URL + caminho, {
            method: metodo,
            headers,
            body: corpo ? JSON.stringify(corpo) : undefined,
        })
    } catch {
        throw new Error('Não foi possível conectar ao servidor.')
    }

    if (resposta.status === 204) return null

    const dados = await resposta.json().catch(() => null)
    if (resposta.status === 401 && sessao.token) {
        encerrarSessao()
        aoExpirarSessao()
    }
    if (!resposta.ok) throw new Error(dados?.erro || `Erro ${resposta.status}`)
    return dados
}

export const api = {
    get: (caminho) => request('GET', caminho),
    post: (caminho, corpo) => request('POST', caminho, corpo),
    put: (caminho, corpo) => request('PUT', caminho, corpo),
    delete: (caminho) => request('DELETE', caminho),
}

export const authService = {
    login: (login, password) => api.post('/auth/login', { login, password }),
    registrar: (dados) => api.post('/auth/registrar', dados),
    me: () => api.get('/auth/me'),
    atualizarPerfil: (dados) => api.put('/auth/me', dados),
}

export const despesaService = {
    listar: () => api.get('/despesas'),
    criar: (dados) => api.post('/despesas', dados),
    atualizar: (id, dados) => api.put(`/despesas/${id}`, dados),
    excluir: (id) => api.delete(`/despesas/${id}`),
}

export const mesService = {
    //Cada mês vem com suas contas
    listar: () => api.get('/meses'),
    criar: (dados) => api.post('/meses', dados),
    atualizar: (id, dados) => api.put(`/meses/${id}`, dados),
    excluir: (id) => api.delete(`/meses/${id}`),
}

export const contaService = {
    //dados: { status: 'pago' | 'pendente', valor_pago }
    atualizar: (id, dados) => api.put(`/contas/${id}`, dados),
}
