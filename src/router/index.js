import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LoginPage from '@/views/Auth/LoginPage.vue'
import DashboardPage from '@/views/DashboardPage.vue'
import UserManagementPage from '@/views/Users/UserManagementPage.vue'
import StoreManagementPage from '@/views/Stores/StoreManagementPage.vue'
import BankManagementPage from '@/views/Banks/BankManagementPage.vue'
import ReportCreationPage from '@/views/Reports/ReportCreationPage.vue'
import ReportListPage from '@/views/Reports/ReportListPage.vue'
import ProfitAnalysisPage from '@/views/Analytics/ProfitAnalysisPage.vue'
import AppLayout from '@/layouts/AppLayout.vue'

function decodeToken(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        })
        .join(''),
    )
    return JSON.parse(jsonPayload)
  } catch (e) {
    return null
  }
}

const router = createRouter({
  // Ubah dari createWebHistory ke createWebHashHistory
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: LoginPage,
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      name: 'DashboardLayout',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: DashboardPage,
          meta: { requiresAuth: true, roles: ['admin', 'karyawan'] },
        },
        {
          path: 'users',
          name: 'UserManagement',
          component: UserManagementPage,
          meta: { requiresAuth: true, roles: ['admin'] },
        },
        {
          path: 'stores',
          name: 'StoreManagement',
          component: StoreManagementPage,
          meta: { requiresAuth: true, roles: ['admin'] },
        },
        {
          path: 'banks',
          name: 'BankManagement',
          component: BankManagementPage,
          meta: { requiresAuth: true, roles: ['admin', 'karyawan'] },
        },
        {
          path: 'reports/create',
          name: 'ReportCreation',
          component: ReportCreationPage,
          meta: { requiresAuth: true, roles: ['admin', 'karyawan'] },
        },
        {
          path: 'reports',
          name: 'ReportList',
          component: ReportListPage,
          meta: { requiresAuth: true, roles: ['admin', 'karyawan'] },
        },
        {
          path: 'analytics/profit',
          name: 'ProfitAnalysis',
          component: ProfitAnalysisPage,
          meta: { requiresAuth: true, roles: ['admin', 'karyawan'] },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      redirect: '/',
    },
  ],
})

// Navigation guard tetap sama
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const token = localStorage.getItem('token')
  const isAuthenticated = authStore.isAuthenticated
  const userRole = authStore.user?.role

  if (token) {
    const decodedToken = decodeToken(token)
    if (!decodedToken || (decodedToken.exp && decodedToken.exp * 1000 < Date.now())) {
      authStore.clearAuth()
      localStorage.removeItem('token')
      if (to.meta.requiresAuth || to.matched.some((record) => record.meta.requiresAuth)) {
        return next({ name: 'Login' })
      }
      return next()
    }
  }

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'Login' })
  } else if (to.meta.roles && !to.meta.roles.includes(userRole)) {
    next({ name: 'Dashboard' })
  } else if (!to.meta.requiresAuth && isAuthenticated) {
    next({ name: 'Dashboard' })
  } else {
    next()
  }
})

export default router
