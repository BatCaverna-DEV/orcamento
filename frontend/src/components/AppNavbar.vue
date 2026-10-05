<template>
  <BNavbar toggleable="lg" variant="dark" class="navbar-orc shadow-sm" sticky="top">
    <BContainer fluid="xl">
      <BNavbarBrand :to="{ name: 'home' }" class="d-flex align-items-center gap-2 fs-3">
        <span class="logo-circulo"></span>
        <span class="fw-light">orçamento</span>
      </BNavbarBrand>

      <BNavbarToggle target="nav-principal" />

      <BCollapse id="nav-principal" is-nav>
        <BNavbarNav class="mx-auto gap-lg-3">
          <BNavItem :to="{ name: 'home' }" :active="route.name === 'home'" link-class="nav-link-orc">
            visão geral
          </BNavItem>
          <BNavItem :to="{ name: 'despesas' }" :active="route.name === 'despesas'" link-class="nav-link-orc">
            despesas
          </BNavItem>
          <BNavItem :to="{ name: 'simulacao' }" :active="route.name === 'simulacao'" link-class="nav-link-orc">
            simulação
          </BNavItem>
        </BNavbarNav>

        <BNavbarNav>
          <BNavItemDropdown right toggle-class="nav-link-orc">
            <template #button-content>
              <i class="bi bi-person-circle me-1"></i> {{ sessao.usuario?.nome ?? 'Conta' }}
            </template>
            <BDropdownItem @click="sair"><i class="bi bi-box-arrow-right me-2"></i>Sair</BDropdownItem>
          </BNavItemDropdown>
        </BNavbarNav>
      </BCollapse>
    </BContainer>
  </BNavbar>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import {
  BCollapse, BContainer, BDropdownItem, BNavbar, BNavbarBrand, BNavbarNav, BNavbarToggle, BNavItem, BNavItemDropdown,
} from 'bootstrap-vue-next'
import { sessao, encerrarSessao } from '../services/sessao.js'

const route = useRoute()
const router = useRouter()

function sair() {
  encerrarSessao()
  router.push({ name: 'login' })
}
</script>

<style scoped>
.navbar-orc {
  background-color: var(--orc-verde) !important;
}

.logo-circulo {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 7px solid #fff;
  border-right-color: rgba(255, 255, 255, 0.55);
  display: inline-block;
}

:deep(.nav-link-orc) {
  color: rgba(255, 255, 255, 0.85) !important;
  border-bottom: 3px solid transparent;
}

:deep(.nav-link-orc:hover) {
  color: #fff !important;
}

:deep(.nav-link-orc.active) {
  color: #fff !important;
  font-weight: 600;
  border-bottom-color: #fff;
}
</style>
