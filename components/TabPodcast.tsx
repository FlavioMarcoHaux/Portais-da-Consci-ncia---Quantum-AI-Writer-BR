import React, { useState, useEffect } from 'react';
import { Chapter, Subchapter, GenerationStatus, PodcastSegment } from '../types';
import { QuantumLoader } from './QuantumLoader';
import { Mic2, Play, Pause, Download, Radio, Sparkles, Clock, FileText, Search } from 'lucide-react';
import { generatePodcastScript, generateSpeech } from '../services/geminiService';
import { useAudioPlayer } from '../hooks/useAudioPlayer';

interface TabPodcastProps {
    chapter: Chapter | null;
    subchapter: Subchapter | null;
}

export const TabPodcast: React.FC<TabPodcastProps> = ({ chapter, subchapter }) => {
    const [segments, setSegments] = useState<PodcastSegment[]>([]);
    const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number>(-1);
    const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
    const [durationMinutes, setDurationMinutes] = useState<number>(5);
    const [customTopic, setCustomTopic] = useState<string>(""); // Novo Estado
    const [isDownloading, setIsDownloading] = useState(false);
    
    const { playBase64, isPlaying, stop, resume, suspend, base64ToUint8Array } = useAudioPlayer();

    // Reset when switching chapters (only if chapter exists)
    useEffect(() => {
        if (subchapter?.id) {
            setSegments([]);
            setCurrentSegmentIndex(-1);
            setStatus(GenerationStatus.IDLE);
            setCustomTopic(""); // Reset topic too
            stop();
        }
    }, [subchapter?.id]);

    useEffect(() => {
        if (currentSegmentIndex >= 0 && segments.length > 0) {
            const el = document.getElementById(`segment-${currentSegmentIndex}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [currentSegmentIndex]);

    const handleGenerate = async (isDeep: boolean) => {
        // Fallback validation for Free Roam
        if (!subchapter && !customTopic) {
            alert("Em modo livre, digite um tema para o Podcast.");
            return;
        }

        setStatus(GenerationStatus.GENERATING);
        setSegments([]);
        setCurrentSegmentIndex(-1);
        stop();

        try {
            const result = await generatePodcastScript(
                chapter?.title || "Sessão Livre",
                subchapter?.title || "Deep Research",
                subchapter?.description || "Conversa espontânea baseada em pesquisa web.",
                subchapter?.id || "free-roam",
                [],
                isDeep,
                durationMinutes,
                customTopic // Pass custom topic
            );
            setSegments(result);
            setStatus(GenerationStatus.COMPLETE);
        } catch (e) {
            console.error(e);
            setStatus(GenerationStatus.ERROR);
        }
    };

    const playSegmentRecursive = async (index: number) => {
        if (index >= segments.length) {
            setCurrentSegmentIndex(-1);
            stop();
            return;
        }

        setCurrentSegmentIndex(index);
        const segment = segments[index];

        try {
            const base64Audio = await generateSpeech(segment.text, segment.voiceId);
            if (base64Audio) {
                playBase64(base64Audio, () => {
                    playSegmentRecursive(index + 1);
                });
            } else {
                // Skip if error
                playSegmentRecursive(index + 1);
            }
        } catch (e) {
            console.error("Playback error", e);
            stop();
        }
    };

    const togglePlayback = async () => {
        if (isPlaying) {
            await suspend();
        } else {
            // If we have a current index, try to resume or restart
            if (currentSegmentIndex >= 0) {
                // Logic to resume is tricky with raw buffers, simpler to restart segment or use suspend/resume from context
                // Our hook uses context suspend/resume.
                await resume();
            } else {
                // Start from beginning
                playSegmentRecursive(0);
            }
        }
    };

    const handleDownloadScript = () => {
        if (segments.length === 0) return;
    
        const title = customTopic || subchapter?.title || "podcast_gerado";
        const safeTitle = title.replace(/\s+/g, '_').toLowerCase();
        const header = `PODCAST ROTEIRO: ${title}\n` +
                       `DESCRIÇÃO: ${subchapter?.description || 'Modo Livre'}\n` +
                       `GERADO EM: ${new Date().toLocaleString()}\n` +
                       `--------------------------------------------------\n\n`;
    
        const body = segments.map(seg => {
            return `${seg.speaker.toUpperCase()}:\n${seg.text}\n`;
        }).join('\n');
    
        const content = header + body;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeTitle}_roteiro.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleDownloadAudio = async () => {
        if (segments.length === 0 || isDownloading) return;
        
        setIsDownloading(true);
        const audioBlobs: Blob[] = [];
        const title = customTopic || subchapter?.title || "podcast_audio";
        const safeTitle = title.replace(/\s+/g, '_').toLowerCase();

        try {
            for (const segment of segments) {
                const base64Audio = await generateSpeech(segment.text, segment.voiceId);
                if (base64Audio) {
                    const bytes = base64ToUint8Array(base64Audio);
                    audioBlobs.push(new Blob([bytes]));
                }
            }
  
            if (audioBlobs.length > 0) {
                const totalLength = audioBlobs.reduce((acc, blob) => acc + blob.size, 0);
                const wavHeader = new ArrayBuffer(44);
                const view = new DataView(wavHeader);
                
                const writeString = (view: DataView, offset: number, string: string) => {
                  for (let i = 0; i < string.length; i++) {
                    view.setUint8(offset + i, string.charCodeAt(i));
                  }
                };
  
                writeString(view, 0, 'RIFF');
                view.setUint32(4, 36 + totalLength, true);
                writeString(view, 8, 'WAVE');
                writeString(view, 12, 'fmt ');
                view.setUint32(16, 16, true); 
                view.setUint16(20, 1, true); 
                view.setUint16(22, 1, true); 
                view.setUint32(24, 24000, true); 
                view.setUint32(28, 24000 * 2, true); 
                view.setUint16(32, 2, true); 
                view.setUint16(34, 16, true); 
                writeString(view, 36, 'data');
                view.setUint32(40, totalLength, true);
                
                const finalBlob = new Blob([wavHeader, ...audioBlobs], { type: 'audio/wav' });
                const url = window.URL.createObjectURL(finalBlob);
                
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `${safeTitle}.wav`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            }
        } catch (e) {
            console.error("Download failed", e);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#050505] animate-fade-in">
             <div className="p-8 border-b border-neutral-900">
                <div className="flex flex-col md:flex-row md:items-center justify-between max-w-5xl mx-auto gap-6">
                    <div>
                        <h2 className="text-2xl font-serif-title text-purple-300 flex items-center gap-2">
                            <Mic2 className="text-purple-500" />
                            Transmissão Quântica
                        </h2>
                        <p className="text-neutral-400 text-sm mt-1">
                            {subchapter ? `Milton & Roberta: ${subchapter.title}` : "Milton & Roberta: Modo Livre"}
                        </p>
                    </div>

                    {/* Controls & Input */}
                    <div className="flex flex-col gap-4 w-full md:w-auto">
                        
                        {/* Custom Topic Input */}
                        <div className="relative group w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 group-hover:text-purple-400 transition-colors" size={16} />
                            <input 
                                type="text"
                                value={customTopic}
                                onChange={(e) => setCustomTopic(e.target.value)}
                                placeholder="Deep Research / Tema Personalizado..."
                                className="w-full bg-neutral-900/50 border border-neutral-800 text-neutral-200 text-sm rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-purple-500 focus:bg-neutral-900 transition-all placeholder-neutral-600"
                                disabled={status === GenerationStatus.GENERATING}
                            />
                            {customTopic && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-purple-900/40 text-purple-300 px-1.5 py-0.5 rounded border border-purple-800">
                                    GROUNDING
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3 justify-end">
                            {segments.length > 0 && (
                                <>
                                    <button 
                                        onClick={togglePlayback}
                                        disabled={isDownloading}
                                        className={`flex items-center justify-center w-12 h-12 rounded-full border transition-all ${isPlaying ? 'bg-purple-600 border-purple-400 text-white' : 'bg-neutral-800 border-neutral-700 text-purple-400 hover:bg-neutral-700'}`}
                                    >
                                        {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
                                    </button>
                                    <button
                                        onClick={handleDownloadAudio}
                                        disabled={isDownloading || status === GenerationStatus.GENERATING}
                                        className="flex items-center justify-center w-12 h-12 rounded-full border border-neutral-700 bg-neutral-800 text-cyan-400 hover:bg-neutral-700 hover:text-cyan-300 transition-all disabled:opacity-50"
                                        title="Baixar Episódio Completo (Áudio)"
                                    >
                                        {isDownloading ? (
                                            <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Download size={20} />
                                        )}
                                    </button>
                                    <button
                                        onClick={handleDownloadScript}
                                        disabled={segments.length === 0}
                                        className="flex items-center justify-center w-12 h-12 rounded-full border border-neutral-700 bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white transition-all disabled:opacity-50"
                                        title="Baixar Roteiro (Texto)"
                                    >
                                        <FileText size={20} />
                                    </button>
                                </>
                            )}
                            
                            <div className="flex items-center bg-neutral-800 rounded-full pl-3 pr-2 py-1 border border-neutral-700 mr-2 h-12 shadow-sm">
                                <Clock size={16} className="text-neutral-400 mr-2" />
                                <select 
                                    value={durationMinutes} 
                                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                                    className="bg-transparent text-white text-sm font-medium focus:outline-none cursor-pointer border-none mr-1 appearance-none hover:text-purple-300 transition-colors"
                                    disabled={status === GenerationStatus.GENERATING || isDownloading}
                                >
                                    <option value={5} className="bg-neutral-900 text-white">5 min</option>
                                    <option value={10} className="bg-neutral-900 text-white">10 min</option>
                                    <option value={15} className="bg-neutral-900 text-white">15 min</option>
                                    <option value={20} className="bg-neutral-900 text-white">20 min</option>
                                    <option value={30} className="bg-neutral-900 text-white">30 min</option>
                                </select>
                            </div>

                            <button
                                onClick={() => handleGenerate(false)}
                                disabled={status === GenerationStatus.GENERATING || isDownloading || (!subchapter && !customTopic)}
                                className="flex items-center space-x-2 bg-purple-900/40 hover:bg-purple-900/60 text-white px-6 py-3 rounded-full transition-all border border-purple-700 hover:border-purple-400 group disabled:opacity-50 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                            >
                                {status === GenerationStatus.GENERATING ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Sparkles size={18} className="text-purple-200" />
                                )}
                                <span>Roteiro Rápido</span>
                            </button>

                            <button
                                onClick={() => handleGenerate(true)}
                                disabled={status === GenerationStatus.GENERATING || isDownloading || (!subchapter && !customTopic)}
                                className="flex items-center space-x-2 bg-indigo-900/40 hover:bg-indigo-900/60 text-white px-6 py-3 rounded-full transition-all border border-indigo-800 hover:border-indigo-500 group disabled:opacity-50 shadow-[0_0_15px_rgba(79,70,229,0.2)]"
                            >
                                {status === GenerationStatus.GENERATING ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Radio size={18} className="text-indigo-200" />
                                )}
                                <span>Roteiro Profundo</span>
                            </button>
                        </div>
                    </div>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-3xl mx-auto space-y-6">
                    {status === GenerationStatus.IDLE && segments.length === 0 && (
                        <div className="text-center text-neutral-600 mt-20">
                            <div className="w-24 h-24 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-neutral-800">
                                <Mic2 size={32} className="text-neutral-700" />
                            </div>
                            <p className="text-lg font-display">Estúdio Quântico Pronto.</p>
                            <p className="text-sm mt-2 max-w-md mx-auto opacity-70">
                                {subchapter 
                                    ? `Escolha a duração e o modo para gerar o episódio sobre: ${subchapter.title}` 
                                    : "Digite um tema acima para iniciar um Podcast de Pesquisa Livre."}
                            </p>
                        </div>
                    )}

                    {status === GenerationStatus.GENERATING && (
                        <QuantumLoader />
                    )}

                    {segments.length > 0 && (
                        <div className="space-y-4 pb-8">
                            {segments.map((seg, idx) => {
                                const isActive = idx === currentSegmentIndex;
                                const speakerName = seg.speaker || "Milton Dilts";
                                const isMilton = speakerName.toLowerCase().includes("milton");
                                
                                return (
                                    <div 
                                        key={idx} 
                                        id={`segment-${idx}`}
                                        className={`p-6 rounded-xl border transition-all duration-500 cursor-pointer ${
                                            isActive 
                                            ? 'bg-purple-900/20 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.15)] scale-[1.02]' 
                                            : 'bg-neutral-900/30 border-neutral-800 opacity-70 hover:opacity-100'
                                        }`}
                                        onClick={() => playSegmentRecursive(idx)}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-neutral-600'}`} />
                                            <span className={`text-xs uppercase tracking-widest font-bold ${isMilton ? 'text-cyan-400' : 'text-pink-400'}`}>
                                                {speakerName}
                                            </span>
                                            {seg.tone && (
                                                <span className="text-xs text-neutral-500 italic">
                                                    ({seg.tone})
                                                </span>
                                            )}
                                        </div>
                                        <p className={`text-lg font-display leading-relaxed ${isActive ? 'text-white' : 'text-neutral-400'}`}>
                                            {seg.text}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
             </div>
        </div>
    );
};