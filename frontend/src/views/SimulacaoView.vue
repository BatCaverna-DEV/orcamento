<template>
  <BContainer fluid="xl">
    <div class="card-orc p-4 mb-4">
      <div class="d-flex flex-wrap align-items-end gap-3">
        <div class="me-auto">
          <h4 class="fw-semibold mb-0">Simulação</h4>
          <small class="text-secondary">
            Teste valores e despesas para um mês. <strong>Nada aqui é salvo</strong> — suas despesas e meses reais não mudam.
          </small>
        </div>
        <BForm class="d-flex gap-2 align-items-end" @submit.prevent="abrir">
          <BFormGroup label="Mês" label-for="sim-mes" class="mb-0">
            <BFormInput id="sim-mes" v-model="mesEscolhido" type="month" required />
          </BFormGroup>
          <BButton type="submit" variant="success" :disabled="carregando">
            <BSpinner v-if="carregando" small class="me-1" />
            <i v-else class="bi bi-calculator me-1"></i> Abrir mês
          </BButton>
        </BForm>
      </div>
    </div>

    <BAlert v-if="erro" :model-value="true" variant="danger">{{ erro }}</BAlert>

    <div v-if="!sim" class="card-orc p-5 text-center text-secondary">
      <i class="bi bi-calculator display-5"></i>
      <p class="mt-3 mb-0">Escolha um mês e clique em <strong>Abrir mês</strong> para começar a simular.</p>
    </div>

    <template v-else>
      <!-- Resumo simulado x real -->
      <BRow class="g-3 mb-4">
        <BCol cols="12" md="6" :lg="true">
          <div class="card-orc p-3 h-100">
            <label for="sim-salario" class="small text-secondary">Salário</label>
            <BInputGroup prepend="R$" size="sm" class="mt-1">
              <BFormInput id="sim-salario" v-model.number="sim.salario" type="number" min="0" step="0.01" class="fw-semibold" />
            </BInputGroup>
            <Diferenca :valor="sim.salario - real.salario" :positivo-bom="true" class="mt-1" />
          </div>
        </BCol>
        <BCol v-for="card in cards" :key="card.titulo" cols="6" md="3" :lg="true">
          <div class="card-orc p-3 h-100">
            <small class="text-secondary">{{ card.titulo }}</small>
            <div class="fs-5 fw-semibold" :class="card.classe">R$ {{ formatarValor(card.simulado) }}</div>
            <Diferenca :valor="card.simulado - card.real" :positivo-bom="card.positivoBom" />
          </div>
        </BCol>
      </BRow>

      <div class="card-orc p-0 overflow-hidden">
        <div class="d-flex flex-wrap align-items-center gap-2 px-4 py-3 border-bottom">
          <h5 class="fw-semibold mb-0 me-auto">
            <span class="text-capitalize">{{ nomeMes(sim.mes) }}</span>
            <BBadge v-if="mesReal" variant="light" class="text-secondary border ms-2 fw-normal">mês aberto</BBadge>
            <BBadge v-else variant="info" class="ms-2 fw-normal">mês ainda não aberto</BBadge>
          </h5>
          <BButton size="sm" variant="outline-secondary" @click="restaurar">
            <i class="bi bi-arrow-counterclockwise me-1"></i> Restaurar valores reais
          </BButton>
        </div>

        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0 tabela-sim">
            <thead>
              <tr>
                <th class="text-center" style="width: 48px">Incluir</th>
                <th>Despesa</th>
                <th class="text-end">Real</th>
                <th class="text-end" style="width: 190px">Simulado</th>
                <th class="text-end">Diferença</th>
                <th style="width: 48px"></th>
              </tr>
            </thead>

            <tbody v-for="grupo in grupos" :key="grupo.tipo">
              <tr class="linha-grupo">
                <th colspan="2"><i :class="grupo.icone" class="me-2"></i>{{ grupo.nome }}</th>
                <td class="text-end">{{ formatarValor(grupo.real) }}</td>
                <td class="text-end fw-semibold">{{ formatarValor(grupo.simulado) }}</td>
                <td class="text-end"><Diferenca :valor="grupo.simulado - grupo.real" :positivo-bom="false" /></td>
                <td></td>
              </tr>
              <tr v-for="item in grupo.itens" :key="item.chave" :class="{ 'item-desligado': !item.incluir }">
                <td class="text-center">
                  <BFormCheckbox v-model="item.incluir" switch :aria-label="`Incluir ${item.descricao}`" class="d-inline-block" />
                </td>
                <td>
                  <span class="fw-medium">{{ item.descricao }}</span>
                  <BBadge v-if="item.temporaria" variant="warning" class="ms-2">temporária</BBadge>
                  <BBadge v-else-if="item.pago" variant="success" class="ms-2">pago</BBadge>
                </td>
                <td class="text-end text-secondary">{{ item.temporaria ? '—' : formatarValor(item.real) }}</td>
                <td class="text-end">
                  <BInputGroup prepend="R$" size="sm">
                    <BFormInput
                      v-model.number="item.valor"
                      type="number"
                      min="0"
                      step="0.01"
                      class="text-end"
                      :disabled="!item.incluir"
                      :aria-label="`Valor simulado de ${item.descricao}`"
                    />
                  </BInputGroup>
                </td>
                <td class="text-end">
                  <Diferenca :valor="valorSimulado(item) - (item.temporaria ? 0 : item.real)" :positivo-bom="false" />
                </td>
                <td class="text-end">
                  <BButton
                    v-if="item.temporaria"
                    size="sm"
                    variant="link"
                    class="text-danger p-0"
                    :aria-label="`Remover ${item.descricao}`"
                    @click="remover(item)"
                  >
                    <i class="bi bi-x-lg"></i>
                  </BButton>
                </td>
              </tr>
            </tbody>

            <tbody v-if="!sim.itens.length">
              <tr>
                <td colspan="6" class="text-center text-secondary py-4">
                  Nenhuma despesa vale neste mês. Adicione uma despesa temporária abaixo.
                </td>
              </tr>
            </tbody>

            <tfoot>
              <tr class="linha-total">
                <th colspan="2">Total de despesas</th>
                <td class="text-end">{{ formatarValor(real.total) }}</td>
                <td class="text-end fw-bold">{{ formatarValor(simulado.total) }}</td>
                <td class="text-end"><Diferenca :valor="simulado.total - real.total" :positivo-bom="false" /></td>
                <td></td>
              </tr>
              <tr class="linha-total">
                <th colspan="2">Saldo (salário − despesas)</th>
                <td class="text-end" :class="real.saldo >= 0 ? 'text-receita' : 'text-despesa'">{{ formatarValor(real.saldo) }}</td>
                <td class="text-end fw-bold" :class="simulado.saldo >= 0 ? 'text-receita' : 'text-despesa'">
                  {{ formatarValor(simulado.saldo) }}
                </td>
                <td class="text-end"><Diferenca :valor="simulado.saldo - real.saldo" :positivo-bom="true" /></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Nova despesa temporária -->
        <BForm class="px-4 py-3 border-top bg-body-tertiary" @submit.prevent="adicionar">
          <BRow class="g-2 align-items-end">
            <BCol md="5">
              <BFormGroup label="Despesa temporária" label-for="sim-nova-desc" label-class="small" class="mb-0">
                <BFormInput id="sim-nova-desc" v-model="nova.descricao" maxlength="100" placeholder="Ex.: Viagem, novo financiamento..." required />
              </BFormGroup>
            </BCol>
            <BCol cols="6" md="2">
              <BFormGroup label="Tipo" label-for="sim-nova-tipo" label-class="small" class="mb-0">
                <BFormSelect id="sim-nova-tipo" v-model="nova.tipo" :options="opcoesTipo" />
              </BFormGroup>
            </BCol>
            <BCol cols="6" md="3">
              <BFormGroup label="Valor (R$)" label-for="sim-nova-valor" label-class="small" class="mb-0">
                <BFormInput id="sim-nova-valor" v-model.number="nova.valor" type="number" min="0" step="0.01" required />
              </BFormGroup>
            </BCol>
            <BCol md="2">
              <BButton type="submit" variant="outline-success" class="w-100">
                <i class="bi bi-plus-lg me-1"></i> Adicionar
              </BButton>
            </BCol>
          </BRow>
        </BForm>
      </div>
    </template>
  </BContainer>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import {
  BAlert, BBadge, BButton, BCol, BContainer, BForm, BFormCheckbox, BFormGroup, BFormInput, BFormSelect,
  BInputGroup, BRow, BSpinner,
} from 'bootstrap-vue-next'
import Diferenca from '../components/Diferenca.vue'
import { despesaService, mesService } from '../services/api.js'
import { sessao } from '../services/sessao.js'
import { despesaVigente, formatarValor, mesAtual, nomeMes } from '../utils/formatar.js'

const FIXA = 1
const DIVIDA = 2
const PAGO = 'pago'

const mesEscolhido = ref(mesAtual())
const carregando = ref(false)
const erro = ref('')

//Estado da simulação: { mes, salario, itens: [{ chave, descricao, tipo, real, valor, incluir, temporaria, pago }] }
const sim = ref(null)
//Dados reais do mês aberto (para comparar e restaurar)
const base = ref(null)
const mesReal = ref(null)
let proximaChave = 1

//Monta as linhas a partir das despesas reais que valem no mês.
//Valor real: conta paga -> valor pago; senão -> valor previsto da despesa
function montarBase(mes, despesas, mesDoBanco) {
  const contas = new Map((mesDoBanco?.contas ?? []).map((c) => [c.despesas_id, c]))
  const itens = despesas
    .filter((d) => (mesDoBanco ? contas.has(d.id) : despesaVigente(d, mes)))
    .map((d) => {
      const conta = contas.get(d.id)
      const pago = conta?.status === PAGO
      const real = pago ? conta.valor_pago : d.valor
      return { chave: `d${d.id}`, descricao: d.descricao, tipo: d.tipo, real, valor: real, incluir: true, temporaria: false, pago }
    })
  return { mes, salario: mesDoBanco?.salario ?? sessao.usuario?.salario ?? 0, itens }
}

const copiar = (b) => ({ ...b, itens: b.itens.map((i) => ({ ...i })) })

async function abrir() {
  erro.value = ''
  carregando.value = true
  try {
    const [despesas, meses] = await Promise.all([despesaService.listar(), mesService.listar()])
    mesReal.value = meses.find((m) => m.descricao === mesEscolhido.value) ?? null
    base.value = montarBase(mesEscolhido.value, despesas, mesReal.value)
    sim.value = copiar(base.value)
  } catch (e) {
    erro.value = e.message
  } finally {
    carregando.value = false
  }
}

//Volta aos valores reais, mas mantém as despesas temporárias adicionadas
function restaurar() {
  const temporarias = sim.value.itens.filter((i) => i.temporaria)
  sim.value = copiar(base.value)
  sim.value.itens.push(...temporarias)
}

const valorSimulado = (item) => (item.incluir ? Number(item.valor) || 0 : 0)

const grupos = computed(() => {
  if (!sim.value) return []
  return [
    { tipo: FIXA, nome: 'Fixas', icone: 'bi bi-arrow-repeat text-secondary' },
    { tipo: DIVIDA, nome: 'Dívidas', icone: 'bi bi-credit-card text-danger' },
  ]
    .map((g) => {
      const itens = sim.value.itens.filter((i) => i.tipo === g.tipo)
      return {
        ...g,
        itens,
        real: itens.filter((i) => !i.temporaria).reduce((t, i) => t + i.real, 0),
        simulado: itens.reduce((t, i) => t + valorSimulado(i), 0),
      }
    })
    .filter((g) => g.itens.length)
})

const real = computed(() => {
  const total = base.value.itens.reduce((t, i) => t + i.real, 0)
  const porTipo = (tipo) => base.value.itens.filter((i) => i.tipo === tipo).reduce((t, i) => t + i.real, 0)
  return { salario: base.value.salario, total, fixas: porTipo(FIXA), dividas: porTipo(DIVIDA), saldo: base.value.salario - total }
})

const simulado = computed(() => {
  const salario = Number(sim.value.salario) || 0
  const total = sim.value.itens.reduce((t, i) => t + valorSimulado(i), 0)
  const porTipo = (tipo) => sim.value.itens.filter((i) => i.tipo === tipo).reduce((t, i) => t + valorSimulado(i), 0)
  return { salario, total, fixas: porTipo(FIXA), dividas: porTipo(DIVIDA), saldo: salario - total }
})

const cards = computed(() => [
  { titulo: 'Fixas', simulado: simulado.value.fixas, real: real.value.fixas, classe: '', positivoBom: false },
  { titulo: 'Dívidas', simulado: simulado.value.dividas, real: real.value.dividas, classe: 'text-despesa', positivoBom: false },
  { titulo: 'Total de despesas', simulado: simulado.value.total, real: real.value.total, classe: 'text-despesa', positivoBom: false },
  {
    titulo: 'Saldo',
    simulado: simulado.value.saldo,
    real: real.value.saldo,
    classe: simulado.value.saldo >= 0 ? 'text-receita' : 'text-despesa',
    positivoBom: true,
  },
])

//Despesas temporárias
const opcoesTipo = [
  { value: FIXA, text: 'Fixa' },
  { value: DIVIDA, text: 'Dívida' },
]
const nova = reactive({ descricao: '', tipo: FIXA, valor: '' })

function adicionar() {
  sim.value.itens.push({
    chave: `t${proximaChave++}`,
    descricao: nova.descricao.trim(),
    tipo: nova.tipo,
    real: 0,
    valor: Number(nova.valor) || 0,
    incluir: true,
    temporaria: true,
    pago: false,
  })
  Object.assign(nova, { descricao: '', valor: '' })
}

function remover(item) {
  sim.value.itens = sim.value.itens.filter((i) => i !== item)
}
</script>

<style scoped>
.linha-grupo > * {
  background-color: #f3f4f2;
  font-size: 0.9rem;
}

.linha-total > * {
  background-color: #f7f7f5;
}

.item-desligado td {
  opacity: 0.55;
}

.item-desligado td:first-child {
  opacity: 1;
}

.tabela-sim .input-group {
  max-width: 180px;
  margin-left: auto;
}
</style>
