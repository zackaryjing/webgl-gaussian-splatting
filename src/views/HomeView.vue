<!-- src/components/Viewer.vue -->
<script setup lang="ts">
import RenderStatic from '@/components/RenderStatic.vue'
import RenderWithOrbit from '@/components/RenderWithOrbit.vue'
import RenderGaussian from '@/components/RenderGaussian.vue'
import RenderSingleGaussian from '@/components/RenderSingleGaussian.vue'
</script>
<template>
  <div class="main">
    <!--    <RenderStatic></RenderStatic>-->
<!--        <RenderWithOrbit></RenderWithOrbit>-->
    <RenderGaussian></RenderGaussian>
<!--    <RenderSingleGaussian></RenderSingleGaussian>-->
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
