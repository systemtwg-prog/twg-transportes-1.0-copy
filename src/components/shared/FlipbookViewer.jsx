import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Download, Share2 } from "lucide-react";

export default function FlipbookViewer({ files, onClose, title }) {
    const [currentPage, setCurrentPage] = useState(0);
    const [zoom, setZoom] = useState(1);

    if (!files || files.length === 0) return null;

    const currentFile = files[currentPage];
    const isPdf = currentFile?.tipo === "application/pdf" || currentFile?.url?.endsWith(".pdf");

    const handleShareWhatsApp = () => {
        const texto = `${title || "Documento"}\n\nArquivo: ${currentFile?.nome}\nLink: ${currentFile?.url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black/50">
                <div className="text-white">
                    <span className="font-medium">{currentFile?.nome}</span>
                    <span className="text-white/60 ml-2">({currentPage + 1} de {files.length})</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="text-white hover:bg-white/20">
                        <ZoomOut className="w-5 h-5" />
                    </Button>
                    <span className="text-white px-2">{Math.round(zoom * 100)}%</span>
                    <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="text-white hover:bg-white/20">
                        <ZoomIn className="w-5 h-5" />
                    </Button>
                    <a href={currentFile?.url} download target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                            <Download className="w-5 h-5" />
                        </Button>
                    </a>
                    <Button variant="ghost" size="icon" onClick={handleShareWhatsApp} className="text-white hover:bg-white/20">
                        <Share2 className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center overflow-auto p-4">
                {isPdf ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                        <iframe 
                            src={`${currentFile?.url}#toolbar=1&navpanes=1&scrollbar=1`} 
                            className="w-full h-full bg-white rounded-lg border-0"
                            style={{ 
                                minWidth: "90vw", 
                                minHeight: "85vh",
                                transform: `scale(${zoom})`, 
                                transformOrigin: "center" 
                            }}
                        />
                    </div>
                ) : (
                    <img 
                        src={currentFile?.url} 
                        alt={currentFile?.nome}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform"
                        style={{ transform: `scale(${zoom})` }}
                    />
                )}
            </div>

            {/* Navigation */}
            {files.length > 1 && (
                <div className="flex items-center justify-center gap-4 p-4 bg-black/50">
                    <Button 
                        variant="ghost" 
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                        className="text-white hover:bg-white/20"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <div className="flex gap-2">
                        {files.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentPage(i)}
                                className={`w-3 h-3 rounded-full transition-colors ${i === currentPage ? "bg-white" : "bg-white/40 hover:bg-white/60"}`}
                            />
                        ))}
                    </div>
                    <Button 
                        variant="ghost" 
                        onClick={() => setCurrentPage(p => Math.min(files.length - 1, p + 1))}
                        disabled={currentPage === files.length - 1}
                        className="text-white hover:bg-white/20"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </Button>
                </div>
            )}
        </div>
    );
}