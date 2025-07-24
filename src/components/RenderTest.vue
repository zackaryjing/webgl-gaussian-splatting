<template>
  <canvas ref="canvas" width="800" height="600" />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { renderPointCloud } from '@/utils/pointRender.ts'
import { loadPlyBinary, type PlyBufferData } from '@/utils/parsePly.ts'

const canvas = ref<HTMLCanvasElement | null>(null)
onMounted(async () => {
  const { positions, colors }: PlyBufferData = await loadPlyBinary()
  renderPointCloud(canvas.value!, positions, colors)
})
</script>
