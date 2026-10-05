<template>
  <AuthLayout subtitulo="Crie sua conta">
    <BForm @submit.prevent="cadastrar">
      <BFormGroup label="Nome" label-for="cad-nome" class="mb-3">
        <BFormInput id="cad-nome" v-model="form.nome" maxlength="100" autocomplete="name" autofocus required />
      </BFormGroup>

      <BFormGroup label="E-mail" label-for="cad-email" class="mb-3">
        <BFormInput id="cad-email" v-model="form.email" type="email" maxlength="100" autocomplete="email" required />
      </BFormGroup>

      <BFormGroup label="Usuário" label-for="cad-usuario" class="mb-3">
        <BFormInput id="cad-usuario" v-model="form.username" maxlength="100" autocomplete="username" required />
      </BFormGroup>

      <BFormGroup
        label="Senha"
        label-for="cad-senha"
        description="Mínimo de 6 caracteres."
        class="mb-3"
      >
        <BFormInput id="cad-senha" v-model="form.password" type="password" minlength="6" autocomplete="new-password" required />
      </BFormGroup>

      <BFormGroup
        label="Salário mensal (R$)"
        label-for="cad-salario"
        description="Usado como padrão ao abrir cada mês. Pode ser alterado depois."
        class="mb-3"
      >
        <BFormInput id="cad-salario" v-model="form.salario" type="number" min="0" step="0.01" placeholder="0,00" />
      </BFormGroup>

      <BAlert v-if="erro" :model-value="true" variant="danger" class="py-2">{{ erro }}</BAlert>

      <BButton type="submit" variant="success" class="w-100" :disabled="enviando">
        <BSpinner v-if="enviando" small class="me-1" />
        Criar conta
      </BButton>
    </BForm>

    <p class="text-center mt-4 mb-0 small">
      Já tem conta? <RouterLink :to="{ name: 'login' }" class="link-success">Entrar</RouterLink>
    </p>
  </AuthLayout>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { BAlert, BButton, BForm, BFormGroup, BFormInput, BSpinner } from 'bootstrap-vue-next'
import AuthLayout from '../components/AuthLayout.vue'
import { authService } from '../services/api.js'
import { iniciarSessao } from '../services/sessao.js'

const router = useRouter()

const form = reactive({ nome: '', email: '', username: '', password: '', salario: '' })
const erro = ref('')
const enviando = ref(false)

async function cadastrar() {
  erro.value = ''
  enviando.value = true
  try {
    const { token, usuario } = await authService.registrar({ ...form, salario: form.salario || 0 })
    iniciarSessao(token, usuario)
    router.replace({ name: 'home' })
  } catch (e) {
    erro.value = e.message
  } finally {
    enviando.value = false
  }
}
</script>
