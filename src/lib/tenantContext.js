// Contexto de multi-tenancy (SaaS) — isolamento de dados por empresa.
// O client do SDK (base44Client.js) lê este contexto para injetar empresa_id
// automaticamente em todas as leituras/criações das entidades de domínio.

let _tenant = {
    empresaId: null,
    isProprietario: false,
    activeEmpresaId: null,
    ready: false,
};
const _readyResolvers = [];

export function setTenantContext({ empresaId, isProprietario }) {
    _tenant.empresaId = empresaId || null;
    _tenant.isProprietario = !!isProprietario;
    _tenant.ready = true;
    flushReady();
}

export function setActiveEmpresa(empresaId) {
    _tenant.activeEmpresaId = empresaId || null;
}

export function getActiveEmpresa() {
    return _tenant.activeEmpresaId;
}

export function isTenantReady() {
    return _tenant.ready;
}

export function getTenant() {
    return { ..._tenant };
}

function flushReady() {
    const resolvers = _readyResolvers.splice(0);
    resolvers.forEach((r) => r());
}

function waitForReady() {
    if (_tenant.ready) return Promise.resolve();
    return new Promise((resolve) => _readyResolvers.push(resolve));
}

// Retorna o empresa_id a ser usado para filtrar leituras.
// - Proprietário com empresa ativa selecionada -> essa empresa
// - Proprietário sem seleção -> null (vê todas as empresas)
// - Usuário comum -> sua empresa
export async function resolveEmpresaId() {
    await waitForReady();
    if (_tenant.isProprietario) return _tenant.activeEmpresaId || null;
    return _tenant.empresaId || null;
}

export async function resolveIsProprietario() {
    await waitForReady();
    return _tenant.isProprietario;
}

// Entidades isentas do filtro automático (não são dados de tenant).
const EXEMPT = new Set(["User", "Empresa"]);
export function isExempt(name) {
    return EXEMPT.has(name);
}