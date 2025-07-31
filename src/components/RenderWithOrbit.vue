<template>
  <canvas ref="canvas" width="800" height="600" />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { createPointRenderer } from '@/utils/pointRender.ts'
import { loadPlyBinary, loadPlyBinary2, type PlyBufferData } from '@/utils/parsePly'

const canvas = ref<HTMLCanvasElement | null>(null)

onMounted(async () => {
  const { vertexCount, positions, colors }: PlyBufferData = await loadPlyBinary2()
  if (canvas.value) {
    createPointRenderer(canvas.value, positions, colors)
  }
})
</script>

<style></style>
