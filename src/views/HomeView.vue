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
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { loadPlyFromAssets, type PlyData } from '@/utils/parsePly'

const plyInfo = ref<PlyData | null>(null)

onMounted(async () => {
  plyInfo.value = await loadPlyFromAssets()
})
</script>
