<template>
  <BModal v-model="aberto" :title="mes ? `Salário de ${nomeMes(mes.descricao)}` : 'Abrir mês'" no-footer @show="preencher">
    <BForm @submit.prevent="salvar">
      <BFormGroup v-if="!mes" label="Mês" label-for="mes-referencia" class="mb-3">
        <BFormInput id="mes-referencia" v-model="form.descricao" type="month" required />
      </BFormGroup>

      <BFormGroup label="Salário do mês (R$)" label-for="mes-salario">
        <BFormInput id="mes-salario" v-model="form.salario" type="number" min="0" step="0.01" required />
      </BFormGroup>

      <p v-if="!mes" class="small text-secondary mt-3 mb-0">
        As contas das despesas que valem nesse mês serão geradas como pendentes.
      </p>

      <BAlert v-if="erro" :model-value="true" variant="danger" class="mt-3 mb-0 py-2">{{ erro }}</BAlert>

      <div class="d-flex justify-content-end gap-2 mt-4">
        <BButton variant="outline-secondary" @click="aberto = false">Cancelar</BButton>
        <BButton type="submit" variant="success" :disabled="salvando">
          <BSpinner v-if="salvando" small class="me-1" />
          {{ mes ? 'Salvar' : 'Abrir mês' }}
        </BButton>
      </div>
    </BForm>
  </BModal>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { BAlert, BButton, BForm, BFormGroup, BFormInput, BModal, BSpinner } from 'bootstrap-vue-next'
import { mesService } from '../services/api.js'
import { nomeMes } from '../utils/formatar.js'

const props = defineProps({
  //null = abrir novo mês; objeto = editar salário
  mes: { type: Object, default: null },
  sugestao: { type: String, default: '' },
  salarioPadrao: { type: Number, default: 0 },
})
const emit = defineEmits(['salvo'])
const aberto = defineModel({ type: Boolean, default: false })

const form = reactive({ descricao: '', salario: '' })
const erro = ref('')
const salvando = ref(false)

function preencher() {
  erro.value = ''
  form.descricao = props.mes?.descricao ?? props.sugestao
  form.salario = props.mes?.salario ?? props.salarioPadrao
}

async function salvar() {
  erro.value = ''
  salvando.value = true
  try {
    if (props.mes) {
      await mesService.atualizar(props.mes.id, { salario: form.salario })
      emit('salvo', 'Salário atualizado.')
    } else {
      await mesService.criar({ descricao: form.descricao, salario: form.salario })
      emit('salvo', `Mês ${nomeMes(form.descricao)} aberto.`)
    }
    aberto.value = false
  } catch (e) {
    erro.value = e.message
  } finally {
    salvando.value = false
  }
}
</script>
