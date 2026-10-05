<template>
  <BApp>
    <template v-if="route.meta.publica">
      <RouterView />
    </template>
    <template v-else>
      <AppNavbar />
      <main class="py-4">
        <RouterView />
      </main>
    </template>
  </BApp>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { BApp } from 'bootstrap-vue-next'
import AppNavbar from './components/AppNavbar.vue'

const route = useRoute()
</script>
