import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";

export default function AudioRecorder({ onRecordingComplete }) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                if (onRecordingComplete) {
                    onRecordingComplete(blob, url);
                }
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Erro ao acessar microfone:", err);
            alert("Não foi possível acessar o microfone. Verifique as permissões.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    return (
        <div className="space-y-3">
            {audioUrl && (
                <audio src={audioUrl} controls className="w-full" />
            )}
            <Button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-full h-16 text-lg font-semibold ${
                    isRecording 
                        ? "bg-red-500 hover:bg-red-600" 
                        : "bg-sky-500 hover:bg-sky-600"
                }`}
            >
                {isRecording ? (
                    <>
                        <Square className="w-6 h-6 mr-2" />
                        Parar Gravação
                    </>
                ) : (
                    <>
                        <Mic className="w-6 h-6 mr-2" />
                        Gravar Áudio
                    </>
                )}
            </Button>
        </div>
    );
}