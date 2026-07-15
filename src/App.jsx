import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import Bono from './pages/Bono';
import Sobre from './pages/Sobre';
import ConfiguracoesProprietario from './pages/ConfiguracoesProprietario';
import CadastroEmpresa from './pages/CadastroEmpresa';
import PainelProprietario from './pages/PainelProprietario';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AuthProvider } from '@/lib/AuthContext';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AppRoutes = () => (
  <Routes>
    {/* Public auth routes */}
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />

    {/* Rotas de cadastro de empresa (autenticado, sem empresa) */}
    <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} requireCompany={false} />}>
      <Route path="/CadastroEmpresa" element={<LayoutWrapper currentPageName="CadastroEmpresa"><CadastroEmpresa /></LayoutWrapper>} />
    </Route>

    {/* Painel do proprietário da plataforma (super-admin) */}
    <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} requireCompany={false} requireProprietario={true} />}>
      <Route path="/PainelProprietario" element={<LayoutWrapper currentPageName="PainelProprietario"><PainelProprietario /></LayoutWrapper>} />
    </Route>

    {/* Rotas protegidas do app — requer empresa (ou proprietário) */}
    <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} requireCompany={true} />}>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/Bono" element={<LayoutWrapper currentPageName="Bono"><Bono /></LayoutWrapper>} />
      <Route path="/Sobre" element={<LayoutWrapper currentPageName="Sobre"><Sobre /></LayoutWrapper>} />
      <Route path="/ConfiguracoesProprietario" element={<LayoutWrapper currentPageName="ConfiguracoesProprietario"><ConfiguracoesProprietario /></LayoutWrapper>} />
    </Route>

    <Route path="*" element={<PageNotFound />} />
  </Routes>
);

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AppRoutes />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App