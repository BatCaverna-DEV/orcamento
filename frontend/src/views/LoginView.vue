<template>
  <AuthLayout subtitulo="Entre para ver seu orçamento">
    <BForm @submit.prevent="entrar">
      <BFormGroup label="Usuário ou e-mail" label-for="login-usuario" class="mb-3">
        <BFormInput id="login-usuario" v-model="login" autocomplete="username" autofocus required />
      </BFormGroup>

      <BFormGroup label="Senha" label-for="login-senha" class="mb-3">
        <BFormInput id="login-senha" v-model="senha" type="password" autocomplete="current-password" required />
      </BFormGroup>

      <BAlert v-if="erro" :model-value="true" variant="danger" class="py-2">{{ erro }}</BAlert>

      <BButton type="submit" variant="success" class="w-100" :disabled="enviando">
        <BSpinner v-if="enviando" small class="me-1" />
        Entrar
      </BButton>
    </BForm>

    <p class="text-center mt-4 mb-0 small">
      Ainda não tem conta? <RouterLink :to="{ name: 'cadastro' }" class="link-success">Cadastre-se</RouterLink>
    </p>
  </AuthLayout>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BAlert, BButton, BForm, BFormGroup, BFormInput, BSpinner } from 'bootstrap-vue-next'
import AuthLayout from '../components/AuthLayout.vue'
import { authService } from '../services/api.js'
import { iniciarSessao } from '../services/sessao.js'

const route = useRoute()
const router = useRouter()

const login = ref('')
const senha = ref('')
const erro = ref('')
const enviando = ref(false)

async function entrar() {
  erro.value = ''
  enviando.value = true
  try {
    const { token, usuario } = await authService.login(login.value.trim(), senha.value)
    iniciarSessao(token, usuario)
    //Só aceita caminhos internos no "voltar"
    const voltar = String(route.query.voltar || '')
    router.replace(voltar.startsWith('/') && !voltar.startsWith('//') ? voltar : { name: 'home' })
  } catch (e) {
    erro.value = e.message
  } finally {
    enviando.value = false
  }
}
</script>
