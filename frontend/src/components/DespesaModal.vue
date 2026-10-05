<template>
  <BModal v-model="aberto" :title="despesa ? 'Editar despesa' : 'Nova despesa'" no-footer @show="preencher">
    <BForm @submit.prevent="salvar">
      <BFormGroup label="Descrição" label-for="desp-descricao" class="mb-3">
        <BFormInput id="desp-descricao" v-model="form.descricao" maxlength="100" placeholder="Ex.: Aluguel" required />
      </BFormGroup>

      <BFormGroup label="Tipo" class="mb-3">
        <BFormRadioGroup v-model="form.tipo" :options="opcoesTipo" buttons button-variant="outline-success" />
      </BFormGroup>

      <BRow class="g-3 mb-3">
        <BCol sm="6">
          <BFormGroup :label="form.tipo === DIVIDA ? 'Valor da parcela (R$)' : 'Valor mensal (R$)'" label-for="desp-valor">
            <BFormInput id="desp-valor" v-model="form.valor" type="number" min="0" step="0.01" required />
          </BFormGroup>
        </BCol>
        <BCol sm="6">
          <BFormGroup :label="form.tipo === DIVIDA ? 'Primeira parcela' : 'Início'" label-for="desp-inicio">
            <BFormInput id="desp-inicio" v-model="form.inicio" type="month" required />
          </BFormGroup>
        </BCol>
      </BRow>

      <BFormGroup
        v-if="form.tipo === DIVIDA"
        label="Número de parcelas"
        label-for="desp-parcelas"
        :description="form.inicio && form.parcelas > 0 ? `Última parcela em ${mesAno(ultimoMes + '-01')}.` : ''"
        class="mb-3"
      >
        <BFormInput id="desp-parcelas" v-model.number="form.parcelas" type="number" min="1" max="600" required />
      </BFormGroup>

      <BFormGroup
        v-else
        label="Fim (opcional)"
        label-for="desp-fim"
        description="Deixe vazio para uma despesa sem prazo."
        class="mb-3"
      >
        <BFormInput id="desp-fim" v-model="form.fim" type="month" :min="form.inicio" />
      </BFormGroup>

      <p class="small text-secondary mb-0">
        As contas são criadas automaticamente nos meses abertos em que a despesa vale.
      </p>

      <BAlert v-if="erro" :model-value="true" variant="danger" class="mt-3 mb-0 py-2">{{ erro }}</BAlert>

      <div class="d-flex gap-2 mt-4">
        <BButton v-if="despesa" variant="outline-danger" :disabled="salvando" @click="excluir">
          <i class="bi bi-trash"></i> Excluir
        </BButton>
        <BButton variant="outline-secondary" class="ms-auto" @click="aberto = false">Cancelar</BButton>
        <BButton type="submit" variant="success" :disabled="salvando">
          <BSpinner v-if="salvando" small class="me-1" />
          Salvar
        </BButton>
      </div>
    </BForm>
  </BModal>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import {
  BAlert, BButton, BCol, BForm, BFormGroup, BFormInput, BFormRadioGroup, BModal, BRow, BSpinner, useModal,
} from 'bootstrap-vue-next'
import { despesaService } from '../services/api.js'
import { mesAtual, mesAno, mesesEntre, proximoMes } from '../utils/formatar.js'

const FIXA = 1
const DIVIDA = 2

const props = defineProps({
  //null = nova despesa
  despesa: { type: Object, default: null },
})
const emit = defineEmits(['salvo'])
const aberto = defineModel({ type: Boolean, default: false })

const confirmar = useModal()

const opcoesTipo = [
  { value: FIXA, text: 'Fixa' },
  { value: DIVIDA, text: 'Dívida' },
]

const form = reactive({ descricao: '', valor: '', tipo: FIXA, inicio: '', fim: '', parcelas: 1 })
const erro = ref('')
const salvando = ref(false)

const ultimoMes = computed(() => {
  let mes = form.inicio
  for (let i = 1; i < form.parcelas; i++) mes = proximoMes(mes)
  return mes
})

//"AAAA-MM" -> último dia do mês "AAAA-MM-DD"
const ultimoDia = (mes) => {
  const [ano, m] = mes.split('-').map(Number)
  return `${mes}-${String(new Date(ano, m, 0).getDate()).padStart(2, '0')}`
}

function preencher() {
  erro.value = ''
  const d = props.despesa
  if (d) {
    const inicio = d.inicio.slice(0, 7)
    const fim = d.fim ? d.fim.slice(0, 7) : ''
    Object.assign(form, {
      descricao: d.descricao,
      valor: d.valor,
      tipo: d.tipo,
      inicio,
      fim,
      parcelas: fim ? mesesEntre(inicio, fim) + 1 : 1,
    })
  } else {
    Object.assign(form, { descricao: '', valor: '', tipo: FIXA, inicio: mesAtual(), fim: '', parcelas: 1 })
  }
}

async function salvar() {
  erro.value = ''
  if (form.tipo === FIXA && form.fim && form.fim < form.inicio) {
    erro.value = 'O fim deve ser depois do início.'
    return
  }

  const fim = form.tipo === DIVIDA ? ultimoMes.value : form.fim
  const dados = {
    descricao: form.descricao.trim(),
    valor: form.valor,
    tipo: form.tipo,
    inicio: `${form.inicio}-01`,
    fim: fim ? ultimoDia(fim) : null,
  }

  salvando.value = true
  try {
    if (props.despesa) await despesaService.atualizar(props.despesa.id, dados)
    else await despesaService.criar(dados)
    aberto.value = false
    emit('salvo', props.despesa ? 'Despesa atualizada.' : 'Despesa cadastrada.')
  } catch (e) {
    erro.value = e.message
  } finally {
    salvando.value = false
  }
}

async function excluir() {
  const resultado = await confirmar.create({
    title: 'Excluir despesa',
    body: `Excluir "${props.despesa.descricao}" e todas as suas contas pendentes?`,
    okTitle: 'Excluir',
    okVariant: 'danger',
    cancelTitle: 'Cancelar',
  }).show()
  if (!resultado?.ok) return

  salvando.value = true
  erro.value = ''
  try {
    await despesaService.excluir(props.despesa.id)
    aberto.value = false
    emit('salvo', 'Despesa excluída.')
  } catch (e) {
    erro.value = e.message
  } finally {
    salvando.value = false
  }
}
</script>
