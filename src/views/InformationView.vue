<!-- src/components/Viewer.vue -->
<script setup lang="ts">
import InformationCard from '@/components/InformationCard.vue'
import DetailCard from '@/components/DetailCard.vue'
</script>
<template>
  <div class="main">
<!--    <InformationCard></InformationCard>-->
    <DetailCard></DetailCard>
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
