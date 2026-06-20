import React, { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, ArrowLeft, Replace, Package, Calendar, Car, Building2, FileText, Printer, Search, ExternalLink, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "subst_washington", title: "Substituir Washington", icon: Replace, desc: "Substitua a transportadora 'WASHINGTON' pelo nome do destinatário em todas as notas." },
  { id: "romaneios_realizados", title: "Romaneios Gerados", icon: Package, desc: "Acesse o menu Romaneios Gerados e marque todos como 'Realizado'." },
  { id: "data_romaneio", title: "Data do Romaneio", icon: Calendar, desc: "Digite a data do romaneio no campo 'Data do Romaneio'." },
  { id: "veiculo", title: "Selecionar Veículo", icon: Car, desc: "Selecione o veículo no campo 'Veículo (aplica em todos)'." },
  { id: "remetente", title: "Selecionar Remetente", icon: Building2, desc: "Selecione o remetente no campo 'Remetente (aplica em todas)'." },
  { id: "notas_romaneio", title: "Notas para o Romaneio", icon: FileText, desc: "Digite os números das notas e clique em 'Buscar e Selecionar'." },
  { id: "continuar_fluxo", title: "Continuar Fluxo", icon: Play, desc: "Finalize as etapas acima e clique para prosseguir com as importações." },
];

export default function PostImportWizard({ 
  open, 
  onOpenChange,
  onSubstituirWashington,
  onMarcarRomaneiosRealizados,
  hasImportacaoHoje,
  importacaoHoje,
  notasComPlaca,
  onScrollToImportacoes,
  onAtribuirFilialAuto,
  onImprimirImportacao,
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [loading, setLoading] = useState(false);

  const markComplete = useCallback((stepId) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
  }, []);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      markComplete(STEPS[currentStep].id);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const handleClose = () => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    onOpenChange(false);
  };

  const renderStepContent = () => {
    const step = STEPS[currentStep];

    switch (step.id) {
      case "subst_washington":
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{step.desc}</p>
            <Button 
              onClick={async () => {
                setLoading(true);
                try {
                  await onSubstituirWashington();
                  markComplete(step.id);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Replace className="w-4 h-4 mr-2" />
              {loading ? "Substituindo..." : "Substituir Washington"}
            </Button>
          </div>
        );

      case "romaneios_realizados":
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{step.desc}</p>
            <div className="flex gap-2">
              <a href="/RomaneiosGerados" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border-purple-500 text-purple-700">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir Romaneios Gerados
                </Button>
              </a>
              <Button 
                onClick={async () => {
                  setLoading(true);
                  try {
                    await onMarcarRomaneiosRealizados();
                    markComplete(step.id);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading ? "Marcando..." : "Marcar Todos como Realizado"}
              </Button>
            </div>
          </div>
        );

      case "data_romaneio":
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{step.desc}</p>
            <p className="text-sm text-slate-500">📍 Localize o card <strong>"Configurações do Romaneio"</strong> acima e preencha o campo <strong>"Data do Romaneio"</strong>.</p>
            <Button onClick={() => markComplete(step.id)} variant="outline" className="border-emerald-500 text-emerald-700">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Já preenchi
            </Button>
          </div>
        );

      case "veiculo":
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{step.desc}</p>
            <p className="text-sm text-slate-500">📍 No card <strong>"Configurações do Romaneio"</strong>, selecione o veículo no campo <strong>"Veículo (aplica em todos)"</strong>.</p>
            <Button onClick={() => markComplete(step.id)} variant="outline" className="border-emerald-500 text-emerald-700">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Já selecionei
            </Button>
          </div>
        );

      case "remetente":
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{step.desc}</p>
            <p className="text-sm text-slate-500">📍 No card <strong>"Configurações do Romaneio"</strong>, selecione o remetente no campo <strong>"Remetente (aplica em todas)"</strong>.</p>
            <Button onClick={() => markComplete(step.id)} variant="outline" className="border-emerald-500 text-emerald-700">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Já selecionei
            </Button>
          </div>
        );

      case "notas_romaneio":
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{step.desc}</p>
            <p className="text-sm text-slate-500">📍 No card <strong>"Notas para o Romaneio"</strong>, digite os números e clique em <strong>"Buscar e Selecionar"</strong>.</p>
            <Button onClick={() => markComplete(step.id)} variant="outline" className="border-emerald-500 text-emerald-700">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Já busquei as notas
            </Button>
          </div>
        );

      case "continuar_fluxo":
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 font-semibold">Todas as etapas concluídas! Agora vamos finalizar:</p>
            <div className="bg-blue-50 rounded-lg p-4 space-y-3">
              <p className="text-sm text-slate-700 font-medium">Próximas ações:</p>
              <ol className="text-sm text-slate-600 space-y-2 list-decimal pl-4">
                <li>Role até a seção <strong>Importações</strong> (abaixo)</li>
                <li>Na importação do dia, clique na aba das notas com placas</li>
                <li>Digite <strong>"0"</strong> no campo de busca e selecione todas as placas</li>
                <li>Clique em <strong>"Atribuir Filial"</strong>:
                  <ul className="list-disc pl-4 mt-1">
                    <li>Notas que começam com <strong>0</strong> → Filial <strong>SC</strong></li>
                    <li>Notas que começam com <strong>1</strong> → Filial <strong>SP</strong></li>
                  </ul>
                </li>
                <li>Clique no botão <strong>Imprimir</strong> da importação do dia</li>
              </ol>
            </div>
            <div className="flex gap-2">
              {onScrollToImportacoes && (
                <Button onClick={onScrollToImportacoes} className="bg-blue-600 hover:bg-blue-700">
                  <Search className="w-4 h-4 mr-2" />
                  Ir para Importações
                </Button>
              )}
              {onAtribuirFilialAuto && (
                <Button onClick={onAtribuirFilialAuto} variant="outline" className="border-indigo-500 text-indigo-700">
                  Atribuir Filial Automaticamente
                </Button>
              )}
              {onImprimirImportacao && importacaoHoje && (
                <Button onClick={() => onImprimirImportacao(importacaoHoje)} className="bg-emerald-600 hover:bg-emerald-700">
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir Importação
                </Button>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-blue-600" />
            Fluxo Pós-Importação
          </DialogTitle>
        </DialogHeader>

        {/* Steps indicator */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = idx === currentStep;
            const isDone = completedSteps.has(s.id);
            return (
              <React.Fragment key={s.id}>
                {idx > 0 && <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />}
                <button
                  onClick={() => setCurrentStep(idx)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0",
                    isActive && "bg-blue-100 text-blue-700",
                    isDone && !isActive && "bg-emerald-50 text-emerald-600",
                    !isActive && !isDone && "bg-slate-100 text-slate-500"
                  )}
                  title={s.title}
                >
                  {isDone ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                  <span className="hidden md:inline">{idx + 1}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Current step */}
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            {React.createElement(STEPS[currentStep].icon, { className: "w-5 h-5 text-blue-600" })}
            <h3 className="font-semibold text-slate-800">
              Passo {currentStep + 1}: {STEPS[currentStep].title}
            </h3>
            {completedSteps.has(STEPS[currentStep].id) && (
              <Badge className="bg-emerald-100 text-emerald-700 ml-auto">Concluído</Badge>
            )}
          </div>
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="ghost" onClick={handlePrev} disabled={currentStep === 0}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Anterior
          </Button>
          {currentStep < STEPS.length - 1 ? (
            <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
              Próximo <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleClose} variant="outline">
              Fechar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}