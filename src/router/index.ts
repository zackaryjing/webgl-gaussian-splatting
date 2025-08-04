import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/info',
      name: 'info',
      component: () => import('@/views/InformationView.vue'),
    },
    {
      path: '/static',
      name: 'static',
      component: () => import('@/views/StaticPresentation.vue'),
    },
    {
      path: '/orbit',
      name: 'orbit',
      component: () => import('@/views/OrbitPresentation.vue'),
    },
    {
      path: '/full',
      name: 'full',
      component: () => import('@/views/FullSpecGaussian.vue'),
    },
  ],
})

export default router
