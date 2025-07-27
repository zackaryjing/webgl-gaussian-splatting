<!-- src/components/Viewer.vue -->
<script setup lang="ts">
import InformationCard from '@/components/InformationCard.vue'
</script>
<template>
  <div class="main">
    <InformationCard></InformationCard>
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
