import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Chapter, Subchapter, GenerationStatus, MarketingStrategy } from '../types';
import { QuantumLoader } from './QuantumLoader';
import { Zap, Copy, Youtube, Image as ImageIcon, Download, Sparkles, RefreshCw, Search, Globe } from 'lucide-react';
import { generateMarketingStrategy, generateThumbnailPrompt, generateThumbnailImage } from '../services/geminiService';

interface TabManuscriptProps {
    chapter: Chapter | null;
    subchapter: Subchapter | null;
    initialContent: string | null;
    onUpdateContent: (content: string) => void;
}

export const TabManuscript: React.FC<TabManuscriptProps> = ({ 
    chapter, 
    subchapter
}) => {
    // Left Column State (SEO)
    const [seoStatus, setSeoStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
    const [strategy, setStrategy] = useState<MarketingStrategy | null>(null);
    const [customTopic, setCustomTopic] = useState<string>(""); // Novo Estado

    // Right Column State (Visual)
    const [visualStatus, setVisualStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
    const [imagePrompt, setImagePrompt] = useState<string>("");
    const [generatedImage, setGeneratedImage] = useState<string | null>(null); // Base64

    // Reset state ONLY when subchapter ID changes (if exists)
    useEffect(() => {
        if (subchapter?.id) {
            setSeoStatus(GenerationStatus.IDLE);
            setStrategy(null);
            setVisualStatus(GenerationStatus.IDLE);
            setImagePrompt("");
            setGeneratedImage(null);
            setCustomTopic(""); // Reset topic
        }
    }, [subchapter?.id]);

    const handleGenerateSEO = async () => {
        // Validation for Free Roam Mode
        if (!subchapter && !customTopic) {
            alert("Em modo livre, por favor digite um tema para pesquisar.");
            return;
        }

        setSeoStatus(GenerationStatus.GENERATING);
        try {
            const data = await generateMarketingStrategy(
                subchapter?.title || "Pesquisa Livre", 
                subchapter?.description || "Conteúdo baseado em pesquisa web deep research",
                customTopic // Pass custom topic
            );
            setStrategy(data);
            setSeoStatus(GenerationStatus.COMPLETE);
            
            // Auto-trigger prompt generation if empty
            if (!imagePrompt) {
               handleGeneratePrompt(data.optimizedTitle, data.description);
            }

        } catch (e) {
            console.error(e);
            setSeoStatus(GenerationStatus.ERROR);
        }
    };

    const handleGeneratePrompt = async (titleOverride?: string, descOverride?: string) => {
        setVisualStatus(GenerationStatus.GENERATING);
        try {
            const title = titleOverride || strategy?.optimizedTitle || subchapter?.title || customTopic;
            const desc = descOverride || strategy?.description || subchapter?.description || "";
            
            const prompt = await generateThumbnailPrompt(title, desc);
            setImagePrompt(prompt);
            setVisualStatus(GenerationStatus.COMPLETE);
        } catch (e) {
            console.error(e);
            setVisualStatus(GenerationStatus.ERROR);
        }
    };

    const handleGenerateImage = async () => {
        if (!imagePrompt) return;
        setVisualStatus(GenerationStatus.GENERATING);
        setGeneratedImage(null);
        try {
            const base64 = await generateThumbnailImage(imagePrompt);
            setGeneratedImage(base64);
            setVisualStatus(GenerationStatus.COMPLETE);
        } catch (e) {
            console.error(e);
            setVisualStatus(GenerationStatus.ERROR);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-[#050505] animate-fade-in">
            {/* LEFT COLUMN: SEO AGENT */}
            <div className="flex-1 border-r border-neutral-900 overflow-y-auto p-6 md:p-8">
                <div className="flex items-center space-x-2 text-cyan-500 mb-6 uppercase tracking-widest text-xs font-bold">
                    <Youtube size={16} />
                    <span>Neuro-Marketing Agent</span>
                </div>

                <div className="mb-8">
                    <h1 className="text-2xl font-serif-title text-white mb-2">
                        {subchapter ? subchapter.title : "Marketing & Deep Research"}
                    </h1>
                    <p className="text-neutral-500 text-sm mb-4">
                        {subchapter 
                            ? "Estratégia baseada no capítulo selecionado + Pesquisa." 
                            : "Digite um tema abaixo para iniciar uma pesquisa profunda na web (Google Grounding)."}
                    </p>
                    
                    {/* Custom Topic Input */}
                    <div className="relative group w-full mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 group-hover:text-cyan-400 transition-colors" size={16} />
                        <input 
                            type="text"
                            value={customTopic}
                            onChange={(e) => setCustomTopic(e.target.value)}
                            placeholder={subchapter ? "Adicionar Trend Específica..." : "Digite o tema para pesquisar (ex: Mecânica Quântica)..."}
                            className="w-full bg-neutral-900/50 border border-neutral-800 text-neutral-200 text-sm rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-cyan-500 focus:bg-neutral-900 transition-all placeholder-neutral-600"
                            disabled={seoStatus === GenerationStatus.GENERATING}
                        />
                        {customTopic && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] bg-cyan-900/40 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800">
                                <Globe size={10} />
                                DEEP RESEARCH
                            </span>
                        )}
                    </div>

                    <button
                        onClick={handleGenerateSEO}
                        disabled={seoStatus === GenerationStatus.GENERATING || (!subchapter && !customTopic)}
                        className="w-full flex items-center justify-center space-x-2 bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-300 border border-cyan-700/50 px-6 py-4 rounded-xl transition-all shadow-[0_0_15px_rgba(34,211,238,0.1)] group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                         {seoStatus === GenerationStatus.GENERATING ? (
                             <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                         ) : (
                             <>
                                <Zap size={20} className="group-hover:text-white transition-colors" />
                                <span className="font-display tracking-wider">ATIVAR ESTRATÉGIA VIRAL</span>
                             </>
                         )}
                    </button>
                </div>

                {seoStatus === GenerationStatus.GENERATING && <QuantumLoader />}

                {strategy && (
                    <div className="space-y-6 animate-fade-in pb-10">
                        {/* Title Block */}
                        <div className="bg-neutral-900/50 p-4 rounded-lg border border-neutral-800">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-neutral-500 uppercase font-bold">Título Otimizado (Alta Dopamina)</span>
                                <button onClick={() => copyToClipboard(strategy.optimizedTitle)} className="text-neutral-500 hover:text-white"><Copy size={14} /></button>
                            </div>
                            <p className="text-lg text-white font-medium leading-snug">{strategy.optimizedTitle}</p>
                        </div>

                        {/* Viral Hook */}
                        <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-900/50">
                             <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-purple-400 uppercase font-bold">Gancho Viral (Abertura)</span>
                                <button onClick={() => copyToClipboard(strategy.viralHook)} className="text-purple-400 hover:text-white"><Copy size={14} /></button>
                            </div>
                            <p className="text-purple-200 italic">"{strategy.viralHook}"</p>
                        </div>

                        {/* Description & Chapters */}
                        <div className="bg-neutral-900/50 p-4 rounded-lg border border-neutral-800">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-neutral-500 uppercase font-bold">Descrição & Timestamps</span>
                                <button onClick={() => copyToClipboard(strategy.description + "\n\n" + strategy.chapters)} className="text-neutral-500 hover:text-white"><Copy size={14} /></button>
                            </div>
                            <div className="h-48 overflow-y-auto pr-2 text-sm text-neutral-300 space-y-4 whitespace-pre-wrap font-mono">
                                {strategy.description}
                                <div className="text-neutral-500 mt-4 pt-4 border-t border-neutral-800">
                                    {strategy.chapters}
                                </div>
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="bg-neutral-900/50 p-4 rounded-lg border border-neutral-800">
                             <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-neutral-500 uppercase font-bold">Tags (Prontas para colar)</span>
                                <button onClick={() => copyToClipboard(strategy.tags)} className="text-neutral-500 hover:text-white"><Copy size={14} /></button>
                            </div>
                            <p className="text-xs text-neutral-400 font-mono break-words bg-black/50 p-2 rounded">{strategy.tags}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT COLUMN: VISUAL AGENT */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-neutral-950/50">
                <div className="flex items-center space-x-2 text-purple-500 mb-6 uppercase tracking-widest text-xs font-bold">
                    <ImageIcon size={16} />
                    <span>Visual Semiotics Agent (Imagen 4)</span>
                </div>

                {!imagePrompt ? (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-600 space-y-4">
                        <ImageIcon size={48} className="opacity-20" />
                        <p className="text-sm">Gere a estratégia SEO primeiro para desbloquear o visual.</p>
                    </div>
                ) : (
                    <div className="space-y-6 animate-fade-in pb-10">
                        {/* Prompt Display */}
                        <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-xs text-neutral-400 uppercase font-bold">Prompt de Imagem (Semiótica)</span>
                                <div className="flex space-x-2">
                                    <button onClick={() => handleGeneratePrompt()} title="Regenerar Prompt" className="text-neutral-500 hover:text-white"><RefreshCw size={14} /></button>
                                    <button onClick={() => copyToClipboard(imagePrompt)} className="text-neutral-500 hover:text-white"><Copy size={14} /></button>
                                </div>
                            </div>
                            <textarea 
                                value={imagePrompt}
                                onChange={(e) => setImagePrompt(e.target.value)}
                                className="w-full bg-black/30 text-neutral-300 text-sm p-3 rounded-lg border border-neutral-800 focus:border-purple-500 focus:outline-none min-h-[100px] font-mono"
                            />
                        </div>

                        {/* Generation Action */}
                        <button
                            onClick={handleGenerateImage}
                            disabled={visualStatus === GenerationStatus.GENERATING}
                            className="w-full flex items-center justify-center space-x-2 bg-purple-900/30 hover:bg-purple-900/50 text-purple-300 border border-purple-700/50 px-6 py-4 rounded-xl transition-all shadow-[0_0_15px_rgba(168,85,247,0.1)] group"
                        >
                            {visualStatus === GenerationStatus.GENERATING ? (
                                <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Sparkles size={20} className="group-hover:text-white transition-colors" />
                                    <span className="font-display tracking-wider">MATERIALIZAR THUMBNAIL (IMAGEN 4)</span>
                                </>
                            )}
                        </button>

                        {/* Image Result */}
                        {generatedImage ? (
                            <div className="relative group rounded-xl overflow-hidden border border-neutral-800 shadow-2xl shadow-purple-900/20">
                                <img 
                                    src={`data:image/jpeg;base64,${generatedImage}`} 
                                    alt="Generated Thumbnail" 
                                    className="w-full h-auto object-cover"
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <a 
                                        href={`data:image/jpeg;base64,${generatedImage}`} 
                                        download={`thumb_${subchapter ? subchapter.id : 'deep_research'}.jpg`}
                                        className="bg-white text-black px-4 py-2 rounded-full flex items-center space-x-2 font-bold hover:scale-105 transition-transform"
                                    >
                                        <Download size={16} />
                                        <span>Baixar Imagem</span>
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="aspect-video bg-neutral-900/30 border-2 border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center text-neutral-700">
                                <ImageIcon size={32} className="mb-2 opacity-50" />
                                <span className="text-xs uppercase tracking-widest">Área de Materialização</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};