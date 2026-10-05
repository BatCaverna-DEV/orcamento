<template>
  <BModal v-model="aberto" :title="titulo" no-footer @show="preencher">
    <BForm v-if="conta" @submit.prevent="pagar">
      <div class="d-flex justify-content-between small text-secondary mb-3">
        <span>Valor previsto: R$ {{ formatarValor(despesa.valor) }}</span>
        <BBadge :variant="conta.status === PAGO ? 'success' : 'warning'">
          {{ conta.status === PAGO ? 'Pago' : 'Pendente' }}
        </BBadge>
      </div>

      <BFormGroup label="Valor pago (R$)" label-for="conta-valor">
        <BFormInput id="conta-valor" v-model="valorPago" type="number" min="0" step="0.01" required autofocus />
      </BFormGroup>

      <BAlert v-if="erro" :model-value="true" variant="danger" class="mt-3 mb-0 py-2">{{ erro }}</BAlert>

      <div class="d-flex gap-2 mt-4">
        <BButton v-if="conta.status === PAGO" variant="outline-warning" :disabled="salvando" @click="desfazer">
          Desfazer pagamento
        </BButton>
        <BButton variant="outline-secondary" class="ms-auto" @click="aberto = false">Cancelar</BButton>
        <BButton type="submit" variant="success" :disabled="salvando">
          <BSpinner v-if="salvando" small class="me-1" />
          {{ conta.status === PAGO ? 'Salvar' : 'Marcar como pago' }}
        </BButton>
      </div>
    </BForm>
  </BModal>
</template>

<script setup>
import { computed, ref } from 'vue'
import { BAlert, BBadge, BButton, BForm, BFormGroup, BFormInput, BModal, BSpinner } from 'bootstrap-vue-next'
import { contaService } from '../services/api.js'
import { formatarValor, nomeMes } from '../utils/formatar.js'

const PAGO = 'pago'
const PENDENTE = 'pendente'

const props = defineProps({
  conta: { type: Object, default: null },
  despesa: { type: Object, default: null },
  mes: { type: Object, default: null },
})
const emit = defineEmits(['salvo'])
const aberto = defineModel({ type: Boolean, default: false })

const valorPago = ref('')
const erro = ref('')
const salvando = ref(false)

const titulo = computed(() =>
  props.despesa && props.mes ? `${props.despesa.descricao} — ${nomeMes(props.mes.descricao)}` : 'Conta'
)

function preencher() {
  erro.value = ''
  valorPago.value = props.conta?.status === PAGO ? props.conta.valor_pago : props.despesa?.valor
}

async function enviar(dados, mensagem) {
  erro.value = ''
  salvando.value = true
  try {
    await contaService.atualizar(props.conta.id, dados)
    aberto.value = false
    emit('salvo', mensagem)
  } catch (e) {
    erro.value = e.message
  } finally {
    salvando.value = false
  }
}

const pagar = () => enviar({ status: PAGO, valor_pago: valorPago.value }, 'Pagamento registrado.')
const desfazer = () => enviar({ status: PENDENTE }, 'Pagamento desfeito.')
</script>
