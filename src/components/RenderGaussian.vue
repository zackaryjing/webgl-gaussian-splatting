<template>
  <canvas ref="canvas" width="800" height="600" />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { loadPlyBinaryFullSpec2, type Gaussian } from '@/utils/parsePly'
import { createGaussianRenderer } from '@/utils/renderGaussian.ts'

const canvas = ref<HTMLCanvasElement | null>(null)

onMounted(async () => {
  const gaussianData: Gaussian[] = await loadPlyBinaryFullSpec2()
  if (canvas.value) {
    createGaussianRenderer(canvas.value, gaussianData)
  }
})
</script>

<style></style>
