<template>
  <div class="auth-fundo d-flex align-items-center justify-content-center px-3 py-5">
    <div class="card-orc p-4 p-sm-5 w-100" style="max-width: 440px">
      <div class="d-flex align-items-center justify-content-center gap-2 mb-2">
        <span class="logo-circulo"></span>
        <span class="fs-3 fw-light">orçamento</span>
      </div>
      <p class="text-center text-secondary mb-4">{{ subtitulo }}</p>
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  subtitulo: { type: String, required: true },
})
</script>

<style scoped>
.auth-fundo {
  min-height: 100vh;
  background: linear-gradient(180deg, var(--orc-verde) 0 40%, var(--orc-fundo) 40%);
}

.logo-circulo {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 7px solid var(--orc-verde);
  border-right-color: rgba(25, 197, 82, 0.4);
  display: inline-block;
}
</style>
