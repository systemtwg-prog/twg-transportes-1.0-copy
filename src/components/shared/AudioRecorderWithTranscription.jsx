import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play, Pause, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function AudioRecorderWithTranscription({ onRecordingComplete, existingAudioUrl, existingTranscription }) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState(existingAudioUrl || null);
    const [transcription, setTranscription] = useState(existingTranscription || "");
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioRef = useRef(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                const url = URL.createObjectURL(audioBlob);
                setAudioUrl(url);

                // Upload do áudio
                const file = new File([audioBlob], "audio_observacao.webm", { type: "audio/webm" });
                const { file_url } = await base44.integrations.Core.UploadFile({ file });

                // Transcrever áudio
                setIsTranscribing(true);
                try {
                    const result = await base44.integrations.Core.InvokeLLM({
                        prompt: "Transcreva o áudio anexado. Retorne apenas o texto transcrito, sem comentários adicionais.",
                        file_urls: [file_url],
                        response_json_schema: {
                            type: "object",
                            properties: {
                                transcricao: { type: "string" }
                            }
                        }
                    });
                    const texto = result.transcricao || "";
                    setTranscription(texto);
                    onRecordingComplete(file_url, texto);
                } catch (err) {
                    console.error("Erro na transcrição:", err);
                    onRecordingComplete(file_url, "");
                }
                setIsTranscribing(false);

                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
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

    const togglePlayback = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                {!isRecording ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={startRecording}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                        <Mic className="w-4 h-4 mr-1" />
                        Gravar Áudio
                    </Button>
                ) : (
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={stopRecording}
                        className="animate-pulse"
                    >
                        <Square className="w-4 h-4 mr-1" />
                        Parar Gravação
                    </Button>
                )}

                {audioUrl && !isRecording && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={togglePlayback}
                        className="border-blue-300 text-blue-600 hover:bg-blue-50"
                    >
                        {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                        {isPlaying ? "Pausar" : "Ouvir"}
                    </Button>
                )}

                {isTranscribing && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Transcrevendo...
                    </div>
                )}
            </div>

            {audioUrl && (
                <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                />
            )}

            {transcription && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-600 font-medium mb-1">Transcrição do áudio:</p>
                    <p className="text-sm text-slate-700">{transcription}</p>
                </div>
            )}
        </div>
    );
}