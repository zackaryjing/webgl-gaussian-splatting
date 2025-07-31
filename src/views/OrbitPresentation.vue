<!-- src/components/Viewer.vue -->
<script setup lang="ts">
import RenderWithOrbit from '@/components/RenderWithOrbit.vue'
</script>
<template>
  <div class="main">
    <RenderWithOrbit></RenderWithOrbit>
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
