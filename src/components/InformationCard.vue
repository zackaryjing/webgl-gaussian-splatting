<!-- src/components/Viewer.vue -->
<template>
  <div>
    <h2>PLY 模型信息</h2>
    <p>总顶点数：{{ plyInfo?.vertexCount }}</p>
    <p>示例点：</p>
    <ul v-if="plyInfo">
      <li v-for="(pt, idx) in plyInfo.samplePoints" :key="idx">
        点{{ idx + 1 }}: ({{ pt.x.toFixed(2) }}, {{ pt.y.toFixed(2) }}, {{ pt.z.toFixed(2) }}) RGB:
        ({{ pt.r }}, {{ pt.g }}, {{ pt.b }})
      </li>
    </ul>
    {{ message }}

  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { loadPlyFromAssets, type PlyData } from '@/utils/parsePly'

const plyInfo = ref<PlyData | null>(null)

onMounted(async () => {
  plyInfo.value = await loadPlyFromAssets()
})

let message = ""

const canvas = document.createElement('canvas');
const gl2 = canvas.getContext('webgl2');
if (gl2) {
  message = ('WebGL 2 is supported and in use');
} else {
  const gl1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (gl1) {
    message = ('WebGL 1 is supported and in use');
  } else {
    message = ('WebGL is not supported');
  }
}

</script>
