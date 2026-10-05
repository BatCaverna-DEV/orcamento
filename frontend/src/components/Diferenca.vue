<template>
  <small v-if="Math.abs(valor) < 0.005" class="text-secondary">sem alteração</small>
  <small v-else :class="bom ? 'text-receita' : 'text-despesa'" class="text-nowrap">
    <i :class="valor > 0 ? 'bi bi-arrow-up-short' : 'bi bi-arrow-down-short'"></i>
    {{ valor > 0 ? '+' : '−' }} R$ {{ formatarValor(Math.abs(valor)) }}
  </small>
</template>

<script setup>
import { computed } from 'vue'
import { formatarValor } from '../utils/formatar.js'

//Mostra a diferença em relação ao valor real; positivoBom define a cor (ex.: saldo maior = verde, despesa maior = vermelho)
const props = defineProps({
  valor: { type: Number, required: true },
  positivoBom: { type: Boolean, default: false },
})

const bom = computed(() => (props.valor > 0) === props.positivoBom)
</script>
