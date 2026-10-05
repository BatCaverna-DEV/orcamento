<template>
  <BContainer fluid="xl">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
      <div>
        <h4 class="fw-semibold mb-0">Despesas</h4>
        <small class="text-secondary">Fixas e dívidas que geram as contas de cada mês</small>
      </div>
      <BButton variant="success" @click="nova">
        <i class="bi bi-plus-lg me-1"></i> Nova despesa
      </BButton>
    </div>

    <BAlert v-if="erro" :model-value="true" variant="danger" class="d-flex justify-content-between align-items-center">
      {{ erro }}
      <BButton size="sm" variant="outline-danger" @click="carregar">Tentar novamente</BButton>
    </BAlert>

    <div v-else-if="carregando" class="text-center py-5">
      <BSpinner variant="success" label="Carregando" />
    </div>

    <template v-else>
      <!-- Resumo -->
      <BRow class="g-3 mb-4">
        <BCol v-for="card in resumo" :key="card.titulo" cols="6" lg="3">
          <div class="card-orc p-3 h-100">
            <small class="text-secondary">{{ card.titulo }}</small>
            <div class="fs-5 fw-semibold" :class="card.classe">R$ {{ formatarValor(card.valor) }}</div>
            <small class="text-secondary">{{ card.detalhe }}</small>
          </div>
        </BCol>
      </BRow>

      <div class="card-orc p-4">
        <BRow class="g-2 mb-3">
          <BCol md="6">
            <BFormInput v-model="busca" type="search" placeholder="Buscar despesa..." aria-label="Buscar despesa" />
          </BCol>
          <BCol cols="6" md="3">
            <BFormSelect v-model="filtroTipo" :options="opcoesTipo" aria-label="Filtrar por tipo" />
          </BCol>
          <BCol cols="6" md="3">
            <BFormSelect v-model="filtroSituacao" :options="opcoesSituacao" aria-label="Filtrar por situação" />
          </BCol>
        </BRow>

        <BTable
          :items="filtradas"
          :fields="campos"
          hover
          responsive
          show-empty
          :empty-text="despesas.length ? 'Nenhuma despesa encontrada com esses filtros.' : 'Nenhuma despesa cadastrada ainda.'"
          class="mb-0 align-middle"
        >
          <template #cell(descricao)="{ item }">
            <span class="fw-medium">{{ item.descricao }}</span>
          </template>

          <template #cell(tipo)="{ item }">
            <BBadge :variant="item.tipo === DIVIDA ? 'danger' : 'secondary'">
              {{ item.tipo === DIVIDA ? 'Dívida' : 'Fixa' }}
            </BBadge>
          </template>

          <template #cell(valor)="{ value }">R$ {{ formatarValor(value) }}</template>

          <template #cell(vigencia)="{ item }">
            <span class="text-nowrap">{{ vigencia(item) }}</span>
          </template>

          <template #cell(progresso)="{ item }">
            <template v-if="item.tipo === DIVIDA">
              <div class="small text-nowrap">{{ item.qtd_pagas }} de {{ item.parcelas }} parcelas</div>
              <BProgress :value="item.qtd_pagas" :max="item.parcelas" variant="success" height="6px" class="progresso" />
            </template>
            <span v-else class="small text-secondary text-nowrap">
              {{ item.qtd_pagas }} {{ item.qtd_pagas === 1 ? 'mês pago' : 'meses pagos' }}
            </span>
          </template>

          <template #cell(total_pago)="{ value }">
            <span class="text-receita text-nowrap">R$ {{ formatarValor(value) }}</span>
          </template>

          <template #cell(situacao)="{ value }">
            <BBadge :variant="corSituacao[value]">{{ nomeSituacao[value] }}</BBadge>
          </template>

          <template #cell(acoes)="{ item }">
            <BButton size="sm" variant="outline-secondary" class="me-2" :aria-label="`Editar ${item.descricao}`" @click="editar(item)">
              <i class="bi bi-pencil"></i>
            </BButton>
            <BButton size="sm" variant="outline-danger" :aria-label="`Excluir ${item.descricao}`" @click="excluir(item)">
              <i class="bi bi-trash"></i>
            </BButton>
          </template>
        </BTable>
      </div>
    </template>

    <DespesaModal v-model="modalAberto" :despesa="selecionada" @salvo="aposSalvar" />
  </BContainer>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  BAlert, BBadge, BButton, BCol, BContainer, BFormInput, BFormSelect, BProgress, BRow, BSpinner, BTable, useModal, useToast,
} from 'bootstrap-vue-next'
import DespesaModal from '../components/DespesaModal.vue'
import { despesaService } from '../services/api.js'
import { formatarValor, mesAno, mesAtual, mesesEntre } from '../utils/formatar.js'

const FIXA = 1
const DIVIDA = 2

const toast = useToast()
const confirmar = useModal()
const hoje = mesAtual()

const despesas = ref([])
const carregando = ref(true)
const erro = ref('')

async function carregar() {
  erro.value = ''
  try {
    despesas.value = await despesaService.listar()
  } catch (e) {
    erro.value = e.message
  } finally {
    carregando.value = false
  }
}

onMounted(carregar)

function notificar(body, variant = 'success') {
  toast.create({ body, variant, pos: 'top-end', modelValue: 4000 })
}

async function aposSalvar(mensagem) {
  notificar(mensagem)
  await carregar()
}

//Situação em relação ao mês atual
function situacao(d) {
  if (d.inicio.slice(0, 7) > hoje) return 'futura'
  if (d.fim && d.fim.slice(0, 7) < hoje) return 'encerrada'
  return 'vigente'
}

const nomeSituacao = { vigente: 'Vigente', futura: 'Futura', encerrada: 'Encerrada' }
const corSituacao = { vigente: 'success', futura: 'info', encerrada: 'light' }

//Acrescenta os campos calculados usados na tabela e no resumo
const lista = computed(() =>
  despesas.value.map((d) => {
    const parcelas = d.fim ? mesesEntre(d.inicio.slice(0, 7), d.fim.slice(0, 7)) + 1 : null
    return {
      ...d,
      parcelas,
      restantes: parcelas ? Math.max(parcelas - d.qtd_pagas, 0) : null,
      situacao: situacao(d),
    }
  })
)

const resumo = computed(() => {
  const vigentes = lista.value.filter((d) => d.situacao === 'vigente')
  const fixas = vigentes.filter((d) => d.tipo === FIXA)
  const dividas = vigentes.filter((d) => d.tipo === DIVIDA)
  const somar = (itens, fn) => itens.reduce((total, d) => total + fn(d), 0)
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`

  return [
    {
      titulo: 'Fixas por mês',
      valor: somar(fixas, (d) => d.valor),
      detalhe: plural(fixas.length, 'despesa vigente', 'despesas vigentes'),
      classe: '',
    },
    {
      titulo: 'Parcelas por mês',
      valor: somar(dividas, (d) => d.valor),
      detalhe: plural(dividas.length, 'dívida vigente', 'dívidas vigentes'),
      classe: 'text-despesa',
    },
    {
      titulo: 'Saldo devedor',
      valor: somar(lista.value.filter((d) => d.tipo === DIVIDA), (d) => d.restantes * d.valor),
      detalhe: 'parcelas ainda não pagas',
      classe: 'text-despesa',
    },
    {
      titulo: 'Total já pago',
      valor: somar(lista.value, (d) => d.total_pago),
      detalhe: 'em todas as despesas',
      classe: 'text-receita',
    },
  ]
})

//Filtros
const busca = ref('')
const filtroTipo = ref(null)
const filtroSituacao = ref('vigente')

const opcoesTipo = [
  { value: null, text: 'Todos os tipos' },
  { value: FIXA, text: 'Fixas' },
  { value: DIVIDA, text: 'Dívidas' },
]

const opcoesSituacao = [
  { value: null, text: 'Todas as situações' },
  { value: 'vigente', text: 'Vigentes' },
  { value: 'futura', text: 'Futuras' },
  { value: 'encerrada', text: 'Encerradas' },
]

const filtradas = computed(() => {
  const termo = busca.value.trim().toLowerCase()
  return lista.value.filter((d) =>
    (filtroTipo.value === null || d.tipo === filtroTipo.value) &&
    (filtroSituacao.value === null || d.situacao === filtroSituacao.value) &&
    d.descricao.toLowerCase().includes(termo)
  )
})

const campos = [
  { key: 'descricao', label: 'Descrição', sortable: true },
  { key: 'tipo', label: 'Tipo', sortable: true },
  { key: 'valor', label: 'Valor mensal', sortable: true, tdClass: 'text-nowrap' },
  { key: 'vigencia', label: 'Vigência' },
  { key: 'progresso', label: 'Pagamentos' },
  { key: 'total_pago', label: 'Total pago', sortable: true },
  { key: 'situacao', label: 'Situação', sortable: true },
  { key: 'acoes', label: '', tdClass: 'text-end text-nowrap' },
]

const vigencia = (d) => (d.fim ? `${mesAno(d.inicio)} a ${mesAno(d.fim)}` : `desde ${mesAno(d.inicio)}`)

//Cadastro / edição
const modalAberto = ref(false)
const selecionada = ref(null)

function nova() {
  selecionada.value = null
  modalAberto.value = true
}

function editar(despesa) {
  selecionada.value = despesa
  modalAberto.value = true
}

async function excluir(despesa) {
  const resultado = await confirmar.create({
    title: 'Excluir despesa',
    body: `Excluir "${despesa.descricao}" e todas as suas contas pendentes?`,
    okTitle: 'Excluir',
    okVariant: 'danger',
    cancelTitle: 'Cancelar',
  }).show()
  if (!resultado?.ok) return

  try {
    await despesaService.excluir(despesa.id)
    await aposSalvar('Despesa excluída.')
  } catch (e) {
    notificar(e.message, 'danger')
  }
}
</script>

<style scoped>
.progresso {
  min-width: 110px;
}
</style>
