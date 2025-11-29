import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter, X, Check, Search } from "lucide-react";

export default function TableColumnFilter({ 
    data = [], 
    columnKey, 
    columnLabel,
    selectedValues = [],
    onFilterChange,
    className = ""
}) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Extrair valores únicos da coluna
    const uniqueValues = useMemo(() => {
        const values = new Set();
        data.forEach(item => {
            const value = item[columnKey];
            if (value !== undefined && value !== null && value !== "") {
                values.add(String(value));
            }
        });
        return Array.from(values).sort();
    }, [data, columnKey]);

    // Filtrar valores pela busca
    const filteredValues = useMemo(() => {
        if (!searchTerm) return uniqueValues;
        return uniqueValues.filter(v => 
            v.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [uniqueValues, searchTerm]);

    const handleToggle = (value) => {
        if (selectedValues.includes(value)) {
            onFilterChange(selectedValues.filter(v => v !== value));
        } else {
            onFilterChange([...selectedValues, value]);
        }
    };

    const handleSelectAll = () => {
        if (selectedValues.length === uniqueValues.length) {
            onFilterChange([]);
        } else {
            onFilterChange([...uniqueValues]);
        }
    };

    const handleClear = () => {
        onFilterChange([]);
        setSearchTerm("");
    };

    const isFiltered = selectedValues.length > 0 && selectedValues.length < uniqueValues.length;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`h-6 w-6 p-0 ${isFiltered ? "text-blue-600" : "text-slate-400"} hover:text-blue-600 ${className}`}
                >
                    <Filter className={`w-3 h-3 ${isFiltered ? "fill-blue-100" : ""}`} />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
                <div className="p-3 border-b">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">Filtrar: {columnLabel}</span>
                        {selectedValues.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={handleClear} className="h-6 text-xs">
                                <X className="w-3 h-3 mr-1" /> Limpar
                            </Button>
                        )}
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 h-8 text-sm"
                        />
                    </div>
                </div>
                <div className="max-h-64 overflow-y-auto p-2">
                    {/* Selecionar Todos */}
                    <div 
                        className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                        onClick={handleSelectAll}
                    >
                        <Checkbox 
                            checked={selectedValues.length === uniqueValues.length && uniqueValues.length > 0}
                            className="pointer-events-none"
                        />
                        <span className="text-sm font-medium text-slate-700">(Selecionar Todos)</span>
                    </div>
                    
                    {filteredValues.length === 0 ? (
                        <p className="text-center text-sm text-slate-400 py-4">Nenhum valor encontrado</p>
                    ) : (
                        filteredValues.map(value => (
                            <div 
                                key={value}
                                className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                                onClick={() => handleToggle(value)}
                            >
                                <Checkbox 
                                    checked={selectedValues.includes(value)}
                                    className="pointer-events-none"
                                />
                                <span className="text-sm text-slate-600 truncate" title={value}>
                                    {value}
                                </span>
                            </div>
                        ))
                    )}
                </div>
                <div className="p-2 border-t bg-slate-50">
                    <p className="text-xs text-slate-500 text-center">
                        {selectedValues.length} de {uniqueValues.length} selecionado(s)
                    </p>
                </div>
            </PopoverContent>
        </Popover>
    );
}