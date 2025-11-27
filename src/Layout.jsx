import React from "react";
import FloatingMenu from "@/components/navigation/FloatingMenu";

export default function Layout({ children, currentPageName }) {

    // Todas as páginas usam apenas o menu flutuante
    return (
        <div className="min-h-screen">
            <FloatingMenu currentPage={currentPageName} />
            {children}
        </div>
    );

}