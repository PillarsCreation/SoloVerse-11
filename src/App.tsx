/**
 * FloodGuard 路由系统
 */
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import LoginPage from '@/pages/LoginPage';
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminWarning from '@/pages/admin/AdminWarning';
import AdminPersonnel from '@/pages/admin/AdminPersonnel';
import AdminRescue from '@/pages/admin/AdminRescue';
import VillagerLayout from '@/pages/villager/VillagerLayout';
import VillagerHome from '@/pages/villager/VillagerHome';
import VillagerWarning from '@/pages/villager/VillagerWarning';
import VillagerRegister from '@/pages/villager/VillagerRegister';
import VillagerReport from '@/pages/villager/VillagerReport';
import VillagerRescue from '@/pages/villager/VillagerRescue';
import RescueLayout from '@/pages/rescue/RescueLayout';
import RescueTaskList from '@/pages/rescue/RescueTaskList';
import RescueTaskDetail from '@/pages/rescue/RescueTaskDetail';
import AgricultureLayout from '@/pages/agriculture/AgricultureLayout';
import AgricultureForm from '@/pages/agriculture/AgricultureForm';
import AgricultureLedger from '@/pages/agriculture/AgricultureLedger';

// 角色守卫
function RoleGuard({ role, children }: { role: string; children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== role) {
    const redirect = user ? `/${user.role === 'admin' ? 'admin' : user.role}` : '/login';
    return <Navigate to={redirect} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const loadFromStorage = useAuthStore(s => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* 管理端 */}
        <Route path="/admin" element={<RoleGuard role="admin"><AdminLayout /></RoleGuard>}>
          <Route index element={<AdminWarning />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="warning" element={<AdminWarning />} />
          <Route path="personnel" element={<AdminPersonnel />} />
          <Route path="rescue" element={<AdminRescue />} />
        </Route>

        {/* 村民端 */}
        <Route path="/villager" element={<RoleGuard role="villager"><VillagerLayout /></RoleGuard>}>
          <Route index element={<VillagerHome />} />
          <Route path="warning" element={<VillagerWarning />} />
          <Route path="register" element={<VillagerRegister />} />
          <Route path="report" element={<VillagerReport />} />
          <Route path="rescue" element={<VillagerRescue />} />
        </Route>

        {/* 救援端 */}
        <Route path="/rescue" element={<RoleGuard role="rescue"><RescueLayout /></RoleGuard>}>
          <Route index element={<RescueTaskList />} />
          <Route path="task/:id" element={<RescueTaskDetail />} />
        </Route>

        {/* 统计员端 */}
        <Route path="/agriculture" element={<RoleGuard role="agriculture"><AgricultureLayout /></RoleGuard>}>
          <Route index element={<AgricultureForm />} />
          <Route path="ledger" element={<AgricultureLedger />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
