import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, ClipboardPaste, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function PasteNotasDialog({ open, onOpenChange, modoAtualizar, onSuccess }) {
  const [pasteText, setPasteText] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleClose = () => {
    onOpenChange(false);
    setPasteText("");
  };

  const handleProcess = async () => {
    if (!pasteText.trim()) return;
    setProcessing(true);

    if (modoAtualizar) {
      try {
        const linhas = pasteText.split('\n').filter(l => l.trim());
        let atualizados = 0, naoEncontrados = 0;
        for (let linha of linhas) {
          const colunas = linha.split('\t');
          if (colunas.length >= 2 && colunas[0]?.trim()) {
            const notasExistentes = await base44.entities.NotaFiscal.filter({ numero_nf: colunas[0].trim() });
            if (notasExistentes.length > 0) {
              const n = notasExistentes[0];
              await base44.entities.NotaFiscal.update(n.id, {
                destinatario: n.destinatario || colunas[1]?.trim() || "",
                remetente: n.remetente || colunas[2]?.trim() || "",
                peso: n.peso || colunas[3]?.trim() || "",
                volume: n.volume || colunas[4]?.trim() || "",
                transportadora: n.transportadora || colunas[5]?.trim() || "",
                filial: n.filial || colunas[6]?.trim() || ""
              });
              atualizados++;
            } else { naoEncontrados++; }
          }
        }
        toast.success(atualizados > 0
          ? (naoEncontrados > 0 ? `${atualizados} atualizada(s). ${naoEncontrados} não encontrada(s).` : `${atualizados} atualizada(s)!`)
          : 'Nenhuma nota encontrada');
        onSuccess({ atualizados });
        handleClose();
      } catch (error) {
        toast.error('Erro ao atualizar');
      }
      setProcessing(false);
      return;
    }

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Extraia dados de notas fiscais do texto abaixo. O texto pode estar em formato corrido de sistemas de transporte (CTe/NF).

PADRÃO DO TEXTO: sequência com número sequencial, número NF, destinatário (empresa que RECEBE), endereço, chave de acesso, volumes (CAIXAS X,00), peso (ex: 545,2), transportadora (empresa que FAZ a entrega, aparece APÓS o peso).

EXEMPLO: "01 120240 1 006047 01 AGUILERA AUTOPECAS DE GOIAS LTDA AV PERIMETRAL... 121454... CAIXAS 29,00 545,2 ST SOLUCAO TRANSPORTES LOGISTICA LTDA..."
→ numero_nf: "120240", destinatario: "AGUILERA AUTOPECAS DE GOIAS LTDA", volume: "29", peso: "545,2", transportadora: "ST SOLUCAO TRANSPORTES LOGISTICA LTDA"

REGRAS:
1. Extraia TODAS as notas presentes
2. destinatario = empresa que RECEBE (aparece logo após o número NF)
3. transportadora = empresa que FAZ a entrega (aparece APÓS o peso/CAIXAS)
4. volume = número inteiro antes de "CAIXAS" (ex: "29")
5. peso = número decimal após as CAIXAS (ex: "545,2")
6. NÃO preencha remetente (deixe vazio)

TEXTO:
${pasteText}`,
        response_json_schema: {
          type: "object",
          properties: {
            notas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  numero_nf: { type: "string", description: "Número da NF (só o número, ex: 120240)" },
                  destinatario: { type: "string", description: "Nome completo do destinatário" },
                  peso: { type: "string", description: "Peso em kg (ex: 545,2)" },
                  volume: { type: "string", description: "Quantidade de volumes (ex: 29)" },
                  transportadora: { type: "string", description: "Nome da transportadora" }
                }
              }
            }
          },
          required: ["notas"]
        }
      });

      const notasEncontradas = result?.notas || [];

      if (notasEncontradas.length === 0) {
        toast.error("Não foi possível identificar notas fiscais no texto.");
        setProcessing(false);
        return;
      }

      const todasNotasExistentes = await base44.entities.NotaFiscal.list("-created_date", 2000);
      const notasExistentesMap = new Map(
        todasNotasExistentes.map((n) => [n.numero_nf?.toLowerCase().trim(), n])
      );

      let importados = 0;
      let atualizados = 0;
      const transportadorasUnicas = new Set();
      const notasIdsImportadas = [];

      for (const nota of notasEncontradas) {
        if (nota.numero_nf || nota.destinatario) {
          const numeroNf = (nota.numero_nf || "").toLowerCase().trim();
          const notaExistente = numeroNf ? notasExistentesMap.get(numeroNf) : null;

          const dadosNota = {
            numero_nf: nota.numero_nf || "",
            destinatario: nota.destinatario || "",
            peso: nota.peso || "",
            volume: nota.volume || "",
            transportadora: nota.transportadora || "",
            remetente: "",
            data: format(new Date(), "yyyy-MM-dd")
          };

          if (notaExistente) {
            await base44.entities.NotaFiscal.update(notaExistente.id, dadosNota);
            atualizados++;
            notasIdsImportadas.push(notaExistente.id);
          } else {
            const novaNota = await base44.entities.NotaFiscal.create(dadosNota);
            importados++;
            notasIdsImportadas.push(novaNota.id);
          }

          if (nota.transportadora) {
            transportadorasUnicas.add(nota.transportadora.trim());
          }
        }
      }

      if (atualizados > 0 && importados > 0) toast.success(`✅ ${importados} nova(s) + ${atualizados} atualizada(s)!`);
      else if (atualizados > 0) toast.success(`✅ ${atualizados} atualizada(s)!`);
      else toast.success(`✅ ${importados} criada(s)!`);

      onSuccess({
        importados,
        atualizados,
        notasIds: notasIdsImportadas,
        transportadoras: Array.from(transportadorasUnicas)
      });
      handleClose();
    } catch (error) {
      console.error("Erro ao processar texto:", error);
      toast.error("Erro ao processar texto. Tente novamente.");
    }

    setProcessing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {modoAtualizar
              ? <RefreshCw className="w-5 h-5 text-green-600" />
              : <ClipboardPaste className="w-5 h-5 text-purple-600" />}
            {modoAtualizar ? "Atualizar Notas Fiscais" : "Colar Informações"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {modoAtualizar
              ? "Cole as informações. O sistema buscará as notas existentes e preencherá apenas os campos vazios."
              : <>Cole abaixo as informações de notas fiscais. O sistema irá identificar e organizar automaticamente os dados.
                <strong className="block mt-1 text-orange-600">Obs: O campo remetente será deixado em branco para você preencher depois.</strong></>}
          </p>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Cole as informações das notas fiscais aqui..."
            rows={10}
            className="font-mono text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              <X className="w-4 h-4 mr-1" /> Cancelar
            </Button>
            <Button
              onClick={handleProcess}
              disabled={processing || !pasteText.trim()}
              className={modoAtualizar ? "bg-green-600 hover:bg-green-700" : "bg-purple-600 hover:bg-purple-700"}
            >
              {processing
                ? <>
                    <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    {modoAtualizar ? "Atualizando..." : "Processando..."}
                  </>
                : modoAtualizar
                  ? <><RefreshCw className="w-4 h-4 mr-1" /> Atualizar</>
                  : <><Sparkles className="w-4 h-4 mr-1" /> Processar</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}