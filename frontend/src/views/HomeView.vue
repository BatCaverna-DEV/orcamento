<template>
  <BContainer fluid="xl">
    <!-- Cabeçalho -->
    <div class="card-orc p-4 mb-4">
      <div class="d-flex flex-wrap align-items-center gap-3">
        <div class="me-auto">
          <h4 class="fw-bold mb-1">
            {{ saudacao() }}{{ sessao.usuario ? `, ${primeiroNome}` : '' }}!
            <i class="bi bi-cloud-sun text-warning"></i>
          </h4>
          <p class="text-secondary mb-0">
            <template v-if="resumo">Resumo de <span class="text-capitalize">{{ nomeMes(resumo.mes.descricao) }}</span></template>
            <template v-else>Cadastre suas despesas e abra os meses para acompanhar o orçamento.</template>
          </p>
        </div>
        <BButton variant="success" @click="abrirMes">
          <i class="bi bi-calendar-plus me-1"></i> Abrir mês
        </BButton>
      </div>

      <div v-if="resumo" class="d-flex flex-wrap gap-4 mt-3 pt-3 border-top">
        <div v-for="item in itensResumo" :key="item.rotulo">
          <small class="text-secondary">{{ item.rotulo }}</small>
          <div class="fs-5 fw-semibold" :class="item.classe">R$ {{ formatarValor(item.valor) }}</div>
        </div>
      </div>
    </div>

    <BAlert v-if="erro" :model-value="true" variant="danger" class="d-flex justify-content-between align-items-center">
      {{ erro }}
      <BButton size="sm" variant="outline-danger" @click="carregar">Tentar novamente</BButton>
    </BAlert>

    <div v-else-if="carregando" class="text-center py-5">
      <BSpinner variant="success" label="Carregando" />
    </div>

    <div v-else-if="!despesas.length && !meses.length" class="card-orc p-5 text-center text-secondary">
      <i class="bi bi-table display-5"></i>
      <p class="mt-3 mb-1 fs-5">Sua planilha está vazia.</p>
      <p class="mb-0">
        Comece cadastrando suas despesas em <RouterLink :to="{ name: 'despesas' }" class="link-success">Despesas</RouterLink>
        e depois <strong>abra um mês</strong>.
      </p>
    </div>

    <!-- Planilha: despesas nas linhas, meses nas colunas -->
    <div v-else class="card-orc p-0 overflow-hidden">
      <div class="table-responsive planilha">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th class="col-despesa">Despesa</th>
              <th v-if="!meses.length" class="text-secondary fw-normal small">
                Nenhum mês aberto — clique em “Abrir mês”.
              </th>
              <th
                v-for="mes in meses"
                :key="mes.id"
                class="col-mes text-end"
                :class="{ 'mes-atual': mes.descricao === hoje }"
              >
                <div class="d-flex align-items-center justify-content-end gap-1">
                  <span class="text-capitalize">{{ nomeMes(mes.descricao) }}</span>
                  <i v-if="mes.status === FECHADO" class="bi bi-lock-fill text-secondary" title="Mês fechado"></i>
                  <BDropdown size="sm" variant="link" no-caret toggle-class="p-0 text-secondary" :aria-label="`Opções de ${nomeMes(mes.descricao)}`">
                    <template #button-content><i class="bi bi-three-dots-vertical"></i></template>
                    <BDropdownItem :disabled="mes.status === FECHADO" @click="editarSalario(mes)">
                      <i class="bi bi-cash me-2"></i>Editar salário
                    </BDropdownItem>
                    <BDropdownItem @click="alternarStatus(mes)">
                      <i :class="mes.status === FECHADO ? 'bi bi-unlock' : 'bi bi-lock'" class="me-2"></i>
                      {{ mes.status === FECHADO ? 'Reabrir mês' : 'Fechar mês' }}
                    </BDropdownItem>
                    <BDropdownDivider />
                    <BDropdownItem variant="danger" @click="excluirMes(mes)">
                      <i class="bi bi-trash me-2"></i>Excluir mês
                    </BDropdownItem>
                  </BDropdown>
                </div>
              </th>
            </tr>
          </thead>

          <tbody>
            <!-- Salário -->
            <tr class="linha-salario">
              <th class="col-despesa">
                <i class="bi bi-wallet2 me-2 text-success"></i>Salário
              </th>
              <td v-if="!meses.length"></td>
              <td
                v-for="mes in meses"
                :key="mes.id"
                class="text-end text-receita fw-semibold"
                :class="{ 'mes-atual': mes.descricao === hoje, clicavel: mes.status !== FECHADO }"
                @click="mes.status !== FECHADO && editarSalario(mes)"
              >
                {{ formatarValor(mes.salario) }}
              </td>
            </tr>

            <!-- Saldo previsto (salário − despesas previstas) -->
            <tr class="linha-saldo-previsto">
              <th class="col-despesa">
                <i class="bi bi-piggy-bank me-2 text-secondary"></i>Saldo previsto
              </th>
              <td v-if="!meses.length"></td>
              <td
                v-for="mes in meses"
                :key="mes.id"
                class="text-end fw-bold"
                :class="[totais[mes.id].saldo >= 0 ? 'text-receita' : 'text-despesa', { 'mes-atual': mes.descricao === hoje }]"
              >
                {{ formatarValor(totais[mes.id].saldo) }}
              </td>
            </tr>

            <!-- Despesas -->
            <tr v-if="!despesas.length">
              <th class="col-despesa fw-normal text-secondary small">Nenhuma despesa cadastrada.</th>
              <td v-for="mes in meses" :key="mes.id"></td>
            </tr>
            <template v-for="grupo in grupos" :key="grupo.tipo">
            <!-- Cabeçalho do grupo com o total previsto do grupo em cada mês -->
            <tr class="linha-grupo" :class="grupo.classe">
              <th class="col-despesa">
                <i :class="grupo.icone" class="me-2"></i>{{ grupo.nome }}
                <span class="badge rounded-pill contador ms-1">{{ grupo.despesas.length }}</span>
              </th>
              <td v-if="!meses.length"></td>
              <td
                v-for="mes in meses"
                :key="mes.id"
                class="text-end fw-semibold"
                :class="{ 'mes-atual': mes.descricao === hoje }"
              >
                {{ formatarValor(totais[mes.id].porTipo[grupo.tipo]) }}
              </td>
            </tr>
            <tr v-for="(despesa, i) in grupo.despesas" :key="despesa.id" :class="{ 'linha-zebra': i % 2 === 1 }">
              <th class="col-despesa fw-normal clicavel ps-4" @click="editarDespesa(despesa)">
                <div class="d-flex align-items-baseline gap-2" :title="`${despesa.descricao} — R$ ${formatarValor(despesa.valor)} · ${vigencia(despesa)}`">
                  <span class="fw-medium text-truncate">{{ despesa.descricao }}</span>
                  <small class="text-secondary text-nowrap ms-auto">
                    R$ {{ formatarValor(despesa.valor) }} · {{ vigencia(despesa) }}
                  </small>
                </div>
              </th>
              <td v-if="!meses.length"></td>
              <td
                v-for="mes in meses"
                :key="mes.id"
                class="text-end text-nowrap"
                :class="{ 'mes-atual': mes.descricao === hoje, clicavel: contaDe(mes, despesa) && mes.status !== FECHADO }"
                @click="abrirConta(mes, despesa)"
              >
                <template v-if="contaDe(mes, despesa)">
                  <span v-if="contaDe(mes, despesa).status === PAGO" class="text-receita" title="Pago">
                    {{ formatarValor(contaDe(mes, despesa).valor_pago) }}
                    <i class="bi bi-check-circle-fill ms-1"></i>
                  </span>
                  <span v-else class="text-secondary" title="Pendente">
                    {{ formatarValor(despesa.valor) }}
                    <i class="bi bi-circle ms-1"></i>
                  </span>
                </template>
                <span v-else class="text-body-tertiary">—</span>
              </td>
            </tr>
            </template>
          </tbody>

          <tfoot>
            <tr>
              <th class="col-despesa">Total de despesas</th>
              <td v-if="!meses.length"></td>
              <td v-for="mes in meses" :key="mes.id" class="text-end fw-semibold" :class="{ 'mes-atual': mes.descricao === hoje }">
                {{ formatarValor(totais[mes.id].previsto) }}
              </td>
            </tr>
            <tr>
              <th class="col-despesa fw-normal">Pago</th>
              <td v-if="!meses.length"></td>
              <td v-for="mes in meses" :key="mes.id" class="text-end text-receita" :class="{ 'mes-atual': mes.descricao === hoje }">
                {{ formatarValor(totais[mes.id].pago) }}
              </td>
            </tr>
            <tr>
              <th class="col-despesa fw-normal">A pagar</th>
              <td v-if="!meses.length"></td>
              <td v-for="mes in meses" :key="mes.id" class="text-end text-despesa" :class="{ 'mes-atual': mes.descricao === hoje }">
                {{ formatarValor(totais[mes.id].aPagar) }}
              </td>
            </tr>
            <tr class="linha-saldo">
              <th class="col-despesa">Saldo</th>
              <td v-if="!meses.length"></td>
              <td
                v-for="mes in meses"
                :key="mes.id"
                class="text-end fw-bold"
                :class="[totais[mes.id].saldo >= 0 ? 'text-receita' : 'text-despesa', { 'mes-atual': mes.descricao === hoje }]"
              >
                {{ formatarValor(totais[mes.id].saldo) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div class="px-3 py-2 small text-secondary border-top d-flex flex-wrap gap-3">
        <span><i class="bi bi-check-circle-fill text-success me-1"></i>pago (valor pago)</span>
        <span><i class="bi bi-circle me-1"></i>pendente (valor previsto)</span>
        <span>— a despesa não vale no mês</span>
        <span class="ms-auto">Clique numa despesa para editar, ou numa célula para pagar.</span>
      </div>
    </div>

    <DespesaModal v-model="modalDespesa" :despesa="despesaSelecionada" @salvo="aposSalvar" />
    <MesModal
      v-model="modalMes"
      :mes="mesSelecionado"
      :sugestao="sugestaoMes"
      :salario-padrao="sessao.usuario?.salario ?? 0"
      @salvo="aposSalvar"
    />
    <ContaModal
      v-model="modalConta"
      :conta="contaSelecionada?.conta"
      :despesa="contaSelecionada?.despesa"
      :mes="contaSelecionada?.mes"
      @salvo="aposSalvar"
    />
  </BContainer>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  BAlert, BButton, BContainer, BDropdown, BDropdownDivider, BDropdownItem, BSpinner, useModal, useToast,
} from 'bootstrap-vue-next'
import DespesaModal from '../components/DespesaModal.vue'
import MesModal from '../components/MesModal.vue'
import ContaModal from '../components/ContaModal.vue'
import { despesaService, mesService } from '../services/api.js'
import { sessao } from '../services/sessao.js'
import { formatarValor, mesAno, mesAtual, nomeMes, proximoMes, saudacao } from '../utils/formatar.js'

const FIXA = 1
const DIVIDA = 2
const FECHADO = 0
const PAGO = 'pago'

const toast = useToast()
const confirmar = useModal()
const hoje = mesAtual()

const despesas = ref([])
const meses = ref([])
const carregando = ref(true)
const erro = ref('')

const primeiroNome = computed(() => sessao.usuario?.nome.split(' ')[0] ?? '')

async function carregar() {
  erro.value = ''
  try {
    const [d, m] = await Promise.all([despesaService.listar(), mesService.listar()])
    despesas.value = d
    meses.value = m
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

//Índice: mesId -> (despesaId -> conta)
const contasPorMes = computed(() => {
  const indice = {}
  for (const mes of meses.value) indice[mes.id] = new Map(mes.contas.map((c) => [c.despesas_id, c]))
  return indice
})
const contaDe = (mes, despesa) => contasPorMes.value[mes.id]?.get(despesa.id)

const despesaPorId = computed(() => new Map(despesas.value.map((d) => [d.id, d])))

//Linhas da planilha agrupadas por tipo (grupos vazios não aparecem)
const grupos = computed(() =>
  [
    { tipo: FIXA, nome: 'Fixas', icone: 'bi bi-arrow-repeat', classe: 'grupo-fixa' },
    { tipo: DIVIDA, nome: 'Dívidas', icone: 'bi bi-credit-card', classe: 'grupo-divida' },
  ]
    .map((g) => ({ ...g, despesas: despesas.value.filter((d) => d.tipo === g.tipo) }))
    .filter((g) => g.despesas.length)
)

//Previsto: contas pagas pelo valor pago, pendentes pelo valor da despesa
const totais = computed(() => {
  const resultado = {}
  for (const mes of meses.value) {
    let pago = 0
    let aPagar = 0
    const porTipo = { [FIXA]: 0, [DIVIDA]: 0 }
    for (const conta of mes.contas) {
      const despesa = despesaPorId.value.get(conta.despesas_id)
      const valor = conta.status === PAGO ? conta.valor_pago : (despesa?.valor ?? 0)
      if (conta.status === PAGO) pago += valor
      else aPagar += valor
      if (despesa) porTipo[despesa.tipo] += valor
    }
    const previsto = pago + aPagar
    resultado[mes.id] = { previsto, pago, aPagar, porTipo, saldo: mes.salario - previsto }
  }
  return resultado
})

//Resumo do mês atual (ou do último aberto)
const resumo = computed(() => {
  const mes = meses.value.find((m) => m.descricao === hoje) ?? meses.value.at(-1)
  return mes ? { mes, ...totais.value[mes.id] } : null
})

const itensResumo = computed(() => {
  const r = resumo.value
  return [
    { rotulo: 'Salário', valor: r.mes.salario, classe: 'text-receita' },
    { rotulo: 'Fixas', valor: r.porTipo[FIXA], classe: '' },
    { rotulo: 'Dívidas', valor: r.porTipo[DIVIDA], classe: 'text-despesa' },
    { rotulo: 'A pagar', valor: r.aPagar, classe: 'text-despesa' },
    { rotulo: 'Saldo previsto', valor: r.saldo, classe: r.saldo >= 0 ? 'text-receita' : 'text-despesa' },
  ]
})

const vigencia = (d) => (d.fim ? `${mesAno(d.inicio)} a ${mesAno(d.fim)}` : `desde ${mesAno(d.inicio)}`)

//Despesas
const modalDespesa = ref(false)
const despesaSelecionada = ref(null)

function editarDespesa(despesa) {
  despesaSelecionada.value = despesa
  modalDespesa.value = true
}

//Meses
const modalMes = ref(false)
const mesSelecionado = ref(null)

//Sugere o mês seguinte ao último aberto; sem meses, o atual
const sugestaoMes = computed(() => (meses.value.length ? proximoMes(meses.value.at(-1).descricao) : hoje))

function abrirMes() {
  mesSelecionado.value = null
  modalMes.value = true
}

function editarSalario(mes) {
  mesSelecionado.value = mes
  modalMes.value = true
}

async function alternarStatus(mes) {
  const fechar = mes.status !== FECHADO
  try {
    await mesService.atualizar(mes.id, { status: fechar ? 0 : 1 })
    await aposSalvar(`Mês ${nomeMes(mes.descricao)} ${fechar ? 'fechado' : 'reaberto'}.`)
  } catch (e) {
    notificar(e.message, 'danger')
  }
}

async function excluirMes(mes) {
  const resultado = await confirmar.create({
    title: 'Excluir mês',
    body: `Excluir ${nomeMes(mes.descricao)} e todas as contas dele (inclusive as pagas)?`,
    okTitle: 'Excluir',
    okVariant: 'danger',
    cancelTitle: 'Cancelar',
  }).show()
  if (!resultado?.ok) return

  try {
    await mesService.excluir(mes.id)
    await aposSalvar(`Mês ${nomeMes(mes.descricao)} excluído.`)
  } catch (e) {
    notificar(e.message, 'danger')
  }
}

//Contas
const modalConta = ref(false)
const contaSelecionada = ref(null)

function abrirConta(mes, despesa) {
  const conta = contaDe(mes, despesa)
  if (!conta) return
  if (mes.status === FECHADO) {
    notificar('Esse mês está fechado. Reabra-o para alterar.', 'warning')
    return
  }
  contaSelecionada.value = { conta, despesa, mes }
  modalConta.value = true
}
</script>

<style scoped>
.planilha {
  max-height: calc(100vh - 260px);
}

.planilha table {
  --bs-table-bg: var(--orc-card);
}

.planilha thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f7f7f5;
  white-space: nowrap;
}

/* Primeira coluna fixa ao rolar para os lados */
.col-despesa {
  position: sticky;
  left: 0;
  z-index: 1;
  min-width: 360px;
  max-width: 420px;
  background: var(--orc-card);
  border-right: 1px solid var(--orc-borda);
}

.planilha thead .col-despesa {
  z-index: 3;
  background: #f7f7f5;
}

.col-mes {
  min-width: 130px;
}

.mes-atual {
  background-color: rgba(25, 197, 82, 0.07) !important;
  box-shadow: none;
}

.planilha thead .mes-atual {
  background-color: #e3f8ea !important;
  color: var(--orc-verde-escuro);
}

/* Cabeçalho dos grupos Fixas / Dívidas: faixa colorida, texto em destaque */
.linha-grupo > * {
  --cor-grupo: #3b6fb6;
  --fundo-grupo: #e6eef9;
  background-color: var(--fundo-grupo) !important;
  color: var(--cor-grupo) !important;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.9rem;
  padding-top: 0.65rem;
  padding-bottom: 0.65rem;
  border-top: 2px solid var(--cor-grupo);
  border-bottom: 1px solid var(--cor-grupo);
}

.linha-grupo > th:first-child {
  box-shadow: inset 5px 0 0 var(--cor-grupo);
}

.grupo-divida > * {
  --cor-grupo: #c62828;
  --fundo-grupo: #fdeaea;
}

.linha-grupo .contador {
  background-color: var(--cor-grupo);
  color: #fff;
  font-size: 0.7rem;
  letter-spacing: 0;
  vertical-align: middle;
}

/* Linhas alternadas das despesas */
.linha-zebra > * {
  --bs-table-bg: #e9ece6;
}

.linha-zebra > .col-despesa {
  background-color: #e9ece6;
}

.linha-zebra > .mes-atual {
  background-color: rgba(25, 197, 82, 0.13) !important;
}

.linha-salario > * {
  background-color: #fbfdfb;
}

.linha-saldo-previsto > * {
  background-color: #fbfdfb;
  border-bottom: 2px solid var(--orc-borda);
}

.planilha tfoot > tr > * {
  background-color: #f7f7f5;
}

.linha-saldo > * {
  border-top: 2px solid var(--orc-borda);
}

.clicavel {
  cursor: pointer;
}
</style>
