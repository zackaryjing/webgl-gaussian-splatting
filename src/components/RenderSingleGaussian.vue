<template>
  <canvas ref="canvas" width="800" height="600" />
  <button @click="goToInfo()" class="button">See Details</button>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { loadPlyBinaryFullSpec2, type Gaussian } from '@/utils/parsePly'
import { createGaussianRenderer } from '@/utils/singleGaussianRender.ts'
import router from '@/router'

const canvas = ref<HTMLCanvasElement | null>(null)

onMounted(async () => {
  const gaussianData: Gaussian[] = await loadPlyBinaryFullSpec2()
  if (canvas.value) {
    createGaussianRenderer(canvas.value)
  }
})

function goToInfo() {
  router.push('info')
}
</script>

<style>
.button {
  height: 30px;
  width: 100px;
  border: solid 1px;
  border-radius: 5px;
  background-color: beige;
  transition: 0.5s;
  position: absolute;
  bottom: 5px;
  right: 5px;
}

.button:hover {
  background-color: bisque;
}
</style>
