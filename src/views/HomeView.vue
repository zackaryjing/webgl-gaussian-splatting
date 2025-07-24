<!-- src/components/Viewer.vue -->
<script setup lang="ts">
import RenderTest from '@/components/RenderTest.vue'
</script>
<template>
  <div class="main">
    <RenderTest></RenderTest>
  </div>
</template>

<style>
.main {
  height: 100vh;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
