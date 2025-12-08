import React from "react";
import { MessageCircle } from "lucide-react";

export default function WhatsAppWeb() {
    return (
        <div className="h-full w-full flex flex-col bg-white">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                <MessageCircle className="w-6 h-6" />
                <h1 className="text-xl font-bold">WhatsApp Web</h1>
            </div>

            {/* WhatsApp Web iframe */}
            <iframe
                src="https://web.whatsapp.com"
                className="flex-1 w-full border-0"
                title="WhatsApp Web"
                allow="microphone; camera"
            />
        </div>
    );
}