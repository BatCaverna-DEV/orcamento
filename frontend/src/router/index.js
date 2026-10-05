import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { sessao, iniciarSessao } from '../services/sessao.js'
import { authService, definirAoExpirarSessao } from '../services/api.js'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/despesas', name: 'despesas', component: () => import('../views/DespesasView.vue') },
    { path: '/simulacao', name: 'simulacao', component: () => import('../views/SimulacaoView.vue') },
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { publica: true } },
    { path: '/cadastro', name: 'cadastro', component: () => import('../views/CadastroView.vue'), meta: { publica: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  if (to.meta.publica) {
    //Já logado não precisa ver login/cadastro
    return sessao.token ? { name: 'home' } : true
  }

  if (!sessao.token) return { name: 'login', query: { voltar: to.fullPath } }

  //Recarregou a página: busca o usuário do token salvo
  if (!sessao.usuario) {
    try {
      iniciarSessao(sessao.token, await authService.me())
    } catch {
      //401 já limpou o token -> login. Servidor fora do ar: segue e a tela mostra o erro
      if (!sessao.token) return { name: 'login' }
    }
  }
  return true
})

definirAoExpirarSessao(() => {
  if (!router.currentRoute.value.meta.publica) router.push({ name: 'login' })
})

export default router
