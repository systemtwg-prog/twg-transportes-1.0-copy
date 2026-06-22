import React from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ThemeToggle({ isDark, onToggle, size = "sm" }) {
    return (
        <Button
            variant="ghost"
            size={size === "xs" ? "sm" : size}
            onClick={onToggle}
            title={isDark ? "Modo claro" : "Modo escuro"}
            className={`text-slate-400 hover:text-slate-200 hover:bg-white/10 ${size === "xs" ? "h-7 w-7 p-0" : ""}`}
        >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
    );
}