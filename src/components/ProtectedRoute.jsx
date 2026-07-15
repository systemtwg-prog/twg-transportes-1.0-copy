import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({
  fallback = <DefaultFallback />,
  unauthenticatedElement,
  requireCompany = true,
  requireProprietario = false,
}) {
  const { isAuthenticated, isLoadingAuth, authError, user } = useAuth();

  if (isLoadingAuth) {
    return fallback;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    return unauthenticatedElement;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement;
  }

  const isProprietarioPlataforma = !!user?.is_proprietario ||
    (user?.email || "").toLowerCase() === "descarbel.sp@gmail.com";
  const temEmpresa = !!user?.empresa_id;

  // Proprietário da plataforma sem empresa própria vai direto ao painel do proprietário
  if (isProprietarioPlataforma && !temEmpresa && requireCompany && !requireProprietario) {
    return <Navigate to="/PainelProprietario" replace />;
  }

  if (requireProprietario && !isProprietarioPlataforma) {
    return <Navigate to="/" replace />;
  }

  if (requireCompany && !isProprietarioPlataforma && !temEmpresa) {
    return <Navigate to="/CadastroEmpresa" replace />;
  }

  return <Outlet />;
}