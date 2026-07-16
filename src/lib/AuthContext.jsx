import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44, rawBase44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { setTenantContext, setActiveEmpresa } from '@/lib/tenantContext';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `${appParams.serverUrl}/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });
      
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      let currentUser = await base44.auth.me();
      setIsAuthenticated(true);

      // Auto-provisionamento SaaS por e-mail
      const em = (currentUser?.email || "").toLowerCase();
      const TWG_EMAILS = ["twg.transportes1@gmail.com", "system.twg@gmail.com"];
      let patch = null;
      if (em === "descarbel.sp@gmail.com" && !currentUser?.is_proprietario) {
        patch = { ...(patch || {}), is_proprietario: true };
      }
      if (TWG_EMAILS.includes(em) && !currentUser?.empresa_id) {
        try {
          const empresas = await base44.entities.Empresa.list();
          const twg = empresas.find((e) => e.cnpj === "69.133.510/0001-33")
            || empresas.find((e) => (e.razao_social || "").toUpperCase().includes("TWG"));
          if (twg) {
            patch = { ...(patch || {}), empresa_id: twg.id };
            // Vincula os dados já criados por este usuário (sem empresa) à empresa TWG para não perdê-los.
            try {
              const entityNames = Object.keys(rawBase44.entities).filter((n) => n !== "User" && n !== "Empresa");
              for (const name of entityNames) {
                try {
                  await rawBase44.entities[name].updateMany(
                    { created_by_id: currentUser?.id, empresa_id: null },
                    { $set: { empresa_id: twg.id } }
                  );
                } catch {}
              }
            } catch (e) { console.error("Migração de dados do TWG falhou", e); }
          }
        } catch (e) {
          console.error("Auto-provision TWG falhou", e);
        }
      }
      // Auto-vincular usuário comum (sem empresa_id) à empresa que criou ou associada por e-mail.
      // Garante que cadastros de motoristas/veículos/coletas sejam salvos com empresa_id (isolamento SaaS).
      if (!currentUser?.is_proprietario && em !== "descarbel.sp@gmail.com" && !TWG_EMAILS.includes(em) && !currentUser?.empresa_id) {
        try {
          const empresas = await rawBase44.entities.Empresa.list();
          let minha = empresas.find((e) => (e.email || "").toLowerCase() === em);
          if (!minha) minha = empresas.find((e) => e.created_by_id === currentUser?.id);
          if (minha) {
            patch = { ...(patch || {}), empresa_id: minha.id };
            // Vincula dados já criados por este usuário (sem empresa) à empresa encontrada.
            try {
              const entityNames = Object.keys(rawBase44.entities).filter((n) => n !== "User" && n !== "Empresa");
              for (const name of entityNames) {
                try {
                  await rawBase44.entities[name].updateMany(
                    { created_by_id: currentUser?.id, empresa_id: null },
                    { $set: { empresa_id: minha.id } }
                  );
                } catch {}
              }
            } catch (e) { console.error("Migração de dados do usuário falhou", e); }
          }
        } catch (e) {
          console.error("Auto-vincular empresa ao usuário falhou", e);
        }
      }
      if (patch) {
        try {
          const updated = await base44.auth.updateMe(patch);
          currentUser = { ...currentUser, ...updated, ...patch };
        } catch (e) {
          console.error("updateMe (auto-provision) falhou", e);
        }
      }

      // Migração de segurança (roda a cada login, quando o usuário já tem empresa_id):
      // garante que coletas/notas criadas pelo usuário que ficaram sem empresa_id (órfãs)
      // sejam reatribuídas à empresa dele, para aparecerem no filtro multi-tenant.
      if (currentUser?.empresa_id && !currentUser?.is_proprietario && em !== "descarbel.sp@gmail.com" && !TWG_EMAILS.includes(em)) {
        try {
          const entityNames = Object.keys(rawBase44.entities).filter((n) => n !== "User" && n !== "Empresa");
          for (const name of entityNames) {
            if (name === "ListaColeta") continue; // isenta de tenant
            try {
              await rawBase44.entities[name].updateMany(
                { created_by_id: currentUser?.id, empresa_id: null },
                { $set: { empresa_id: currentUser.empresa_id } }
              );
            } catch {}
          }
        } catch (e) { console.error("Migração periódica de órfãos falhou", e); }
      }

      setUser(currentUser);
      const isPropPlat = !!currentUser?.is_proprietario || em === "descarbel.sp@gmail.com";
      // Configura o contexto de tenant (empresa) para o isolamento de dados SaaS.
      setTenantContext({
        empresaId: currentUser?.empresa_id,
        isProprietario: isPropPlat,
      });
      // Proprietário da plataforma não usa empresa_id fixo — "empresa ativa" é por sessão (memória),
      // para que ao logar caia no painel e só visualize uma empresa ao clicar em "Visualizar dados".
      setActiveEmpresa(isPropPlat ? null : (currentUser?.active_empresa_id || null));
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};