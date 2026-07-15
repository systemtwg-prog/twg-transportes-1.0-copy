import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { resolveEmpresaId, isExempt } from '@/lib/tenantContext';

const { appId, serverUrl, token, functionsVersion } = appParams;

// Cliente bruto (sem filtro de empresa) — usado pelo painel do proprietário
// e por migrações que precisam acessar dados de todas as empresas.
export const rawBase44 = createClient({
    appId,
    serverUrl,
    token,
    functionsVersion,
    requiresAuth: false,
});

function wrapOne(rawEntity, name) {
    const exempt = isExempt(name);

    const filterWithTenant = async (query, ...rest) => {
        let merged = query || {};
        if (!exempt) {
            const eid = await resolveEmpresaId();
            if (eid) merged = { ...merged, empresa_id: eid };
        }
        return rawEntity.filter(merged, ...rest);
    };

    const listWithTenant = async (sort, limit, ...rest) => {
        if (!exempt) {
            const eid = await resolveEmpresaId();
            if (eid) return rawEntity.filter({ empresa_id: eid }, sort, limit, ...rest);
        }
        return rawEntity.list(sort, limit, ...rest);
    };

    const createWithTenant = async (data) => {
        if (!exempt && data && typeof data === 'object' && !data.empresa_id) {
            const eid = await resolveEmpresaId();
            if (eid) data.empresa_id = eid;
        }
        return rawEntity.create(data);
    };

    const bulkCreateWithTenant = async (arr) => {
        if (!exempt && Array.isArray(arr)) {
            const eid = await resolveEmpresaId();
            if (eid) {
                arr.forEach((d) => {
                    if (d && typeof d === 'object' && !d.empresa_id) d.empresa_id = eid;
                });
            }
        }
        return rawEntity.bulkCreate(arr);
    };

    const scopedBulk = async (op, query, ...rest) => {
        let merged = query || {};
        if (!exempt) {
            const eid = await resolveEmpresaId();
            if (eid) merged = { ...merged, empresa_id: eid };
        }
        return rawEntity[op](merged, ...rest);
    };

    return new Proxy(rawEntity, {
        get(target, prop) {
            switch (prop) {
                case 'filter':
                    return (q, ...r) => filterWithTenant(q, ...r);
                case 'list':
                    return (...r) => listWithTenant(...r);
                case 'create':
                    return (d) => createWithTenant(d);
                case 'bulkCreate':
                    return (a) => bulkCreateWithTenant(a);
                case 'updateMany':
                    return (q, ...r) => scopedBulk('updateMany', q, ...r);
                case 'deleteMany':
                    return (q, ...r) => scopedBulk('deleteMany', q, ...r);
                default: {
                    const value = target[prop];
                    if (typeof value === 'function') return value.bind(target);
                    return value;
                }
            }
        },
    });
}

function wrapEntities(rawEntities) {
    return new Proxy(rawEntities, {
        get(target, name) {
            const rawEntity = target[name];
            if (!rawEntity) return rawEntity;
            return wrapOne(rawEntity, name);
        },
    });
}

let _entitiesCache = null;

// Cliente consumido por todo o app — aplica isolamento por empresa automaticamente.
export const base44 = new Proxy(rawBase44, {
    get(target, prop) {
        if (prop === 'entities') {
            if (!_entitiesCache) _entitiesCache = wrapEntities(target.entities);
            return _entitiesCache;
        }
        return target[prop];
    },
});