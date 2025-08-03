<!-- src/components/Viewer.vue -->
<template>
  <div>
    <h2>PLY 模型信息</h2>
    <p>示例点：</p>
    <ul v-if="gaussianData">
      <li v-for="(pt, idx) in gaussianData" :key="idx">
        position: {{ idx + 1 }}: ({{ pt.position[0].toFixed(2) }}, {{ pt.position[1].toFixed(2) }},
        {{ pt.position[2].toFixed(2) }})
        <span v-for="(sh, idk) in pt.sh.slice(0, 5)" :key="idk">
          sh{{ idk }}: {{ sh.toFixed(2) }}
        </span>
        opacity: {{ pt.opacity.toFixed(2) }} scale: ({{
          pt.scale.map((a: number) => a.toFixed(2))
        }}) quat: {{ pt.quat.map((a: number) => a.toFixed(2)) }}
      </li>
    </ul>
    {{ message }}
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { loadCactusPlyFromAssets, type Gaussian } from '@/utils/parsePly'

const gaussianData = ref<Gaussian[] | null>(null)

onMounted(async () => {
  gaussianData.value = await loadCactusPlyFromAssets()
})

let message = ''

const canvas = document.createElement('canvas')
const gl2 = canvas.getContext('webgl2')
if (gl2) {
  message = 'WebGL 2 is supported and in use'
} else {
  const gl1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
  if (gl1) {
    message = 'WebGL 1 is supported and in use'
  } else {
    message = 'WebGL is not supported'
  }
}
</script>
