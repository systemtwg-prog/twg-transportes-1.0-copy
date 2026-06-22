import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Clock } from "lucide-react";

const STATUS_CONFIG = {
  trial: { label: "Trial", color: "bg-blue-100 text-blue-700 border-blue-300", icon: Clock },
  ativa: { label: "Licenciado", color: "bg-emerald-100 text-emerald-700 border-emerald-300", icon: ShieldCheck },
  suspensa: { label: "Suspenso", color: "bg-amber-100 text-amber-700 border-amber-300", icon: ShieldAlert },
  bloqueada: { label: "Bloqueado", color: "bg-red-100 text-red-700 border-red-300", icon: ShieldAlert },
  cancelada: { label: "Cancelado", color: "bg-slate-100 text-slate-600 border-slate-300", icon: ShieldAlert },
};

export default function LicenseStatusBadge() {
  const { data: licencas = [] } = useQuery({
    queryKey: ["licencas-footer"],
    queryFn: () => base44.entities.Licenca.list("-created_date", 1),
    staleTime: 60000,
  });

  const licenca = licencas[0];
  if (!licenca) return null;

  const cfg = STATUS_CONFIG[licenca.status] || STATUS_CONFIG.trial;
  const Icon = cfg.icon;

  return (
    <Badge className={`${cfg.color} border px-3 py-1 text-xs font-semibold flex items-center gap-1.5 cursor-default shadow-sm`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}