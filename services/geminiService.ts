import { GoogleGenAI, Modality, Type } from "@google/genai";
import { CORE_PERSONA_INSTRUCTION, PODCAST_SYSTEM_INSTRUCTION, SEO_AGENT_INSTRUCTION, THUMBNAIL_AGENT_INSTRUCTION } from '../constants';
import { BIBLIOGRAPHY } from '../bibliography';
import { ChatMessage, PodcastSegment, MarketingStrategy } from '../types';

const apiKey = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

const BASE_CONFIG = {
  temperature: 0.8,
  topP: 0.95,
  topK: 40,
};

const buildPrompt = (chapterTitle: string, subchapterTitle: string, description: string, subchapterId: string) => {
    const references = BIBLIOGRAPHY[subchapterId];
    const bibliographyInstruction = references 
        ? `\n\n**BASE CIENTÍFICA E BIBLIOGRÁFICA OBRIGATÓRIA:**\nVocê DEVE fundamentar seus argumentos, explicações e narrativas nas seguintes obras e referências:\n${references.map(r => `- ${r}`).join('\n')}\nUtilize conceitos, descobertas e a filosofia destes autores para enriquecer o texto com profundidade acadêmica e espiritual.\n`
        : "";

    return `
    ${CORE_PERSONA_INSTRUCTION}

    TAREFA ATUAL:
    Como Milton Dilts e Roberta Erickson, escreva o conteúdo completo, detalhado e hipnótico para o seguinte subcapítulo do livro "Portais da Consciência":
    
    Capítulo: ${chapterTitle}
    Subcapítulo: ${subchapterTitle}
    Contexto/Descrição: ${description}
    ${bibliographyInstruction}

    DIRETRIZES ESPECÍFICAS DE ESCRITA:
    1. **Hipnose Ericksoniana:** Utilize padrões de linguagem hipnótica, metáforas terapêuticas e loops para engajar o inconsciente do leitor.
    2. **Integração PNL e Espiritualidade:** Aplique técnicas de Robert Dilts para explicar conceitos complexos de forma transformadora, conectando com os ensinamentos de Meishu-Sama e a figura do Messias.
    3. **Rigor Científico:** Fundamente os argumentos em conceitos de física quântica e neurociência, mas mantenha a narrativa fluida e acessível.
    4. **Criatividade e Dinâmica:** Evite repetições. Seja criativo, profundo e abrangente. Reformule conceitos repetitivos de formas novas e instigantes.
    5. **Formato:** Escreva como um texto de livro final, pronto para publicação (padrão ISBN), em Português Brasileiro. Use formatação Markdown para títulos e ênfases.
`;
};

export const generateSubchapterContent = async (
  chapterTitle: string, 
  subchapterTitle: string, 
  description: string,
  subchapterId: string
): Promise<string> => {
  if (!apiKey) {
    throw new Error("API Key not found. Please configure your environment.");
  }
  return generateFastContent(chapterTitle, subchapterTitle, description, subchapterId);
};

export const generateFastContent = async (
  chapterTitle: string,
  subchapterTitle: string,
  description: string,
  subchapterId: string
): Promise<string> => {
    if (!apiKey) throw new Error("API Key not found.");

    const prompt = buildPrompt(chapterTitle, subchapterTitle, description, subchapterId);
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: BASE_CONFIG,
        });
        return response.text || "Erro na geração rápida.";
    } catch (error) {
        console.error("Error in fast generation:", error);
        throw error;
    }
}

export const generateDeepContent = async (
  chapterTitle: string,
  subchapterTitle: string,
  description: string,
  subchapterId: string
): Promise<string> => {
    if (!apiKey) throw new Error("API Key not found.");

    const prompt = buildPrompt(chapterTitle, subchapterTitle, description, subchapterId);

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                ...BASE_CONFIG,
                thinkingConfig: { thinkingBudget: 32768 }, // Max thinking for complex writing tasks
            },
        });
        return response.text || "Erro na geração profunda.";
    } catch (error) {
        console.error("Error in deep generation:", error);
        throw error;
    }
}

// Generates a structured JSON script for the podcast
export const generatePodcastScript = async (
  chapterTitle: string,
  subchapterTitle: string,
  description: string,
  subchapterId: string,
  history: ChatMessage[] = [],
  isDeep: boolean = false,
  durationMinutes: number = 5,
  customTopic: string = ""
): Promise<PodcastSegment[]> => {
    if (!apiKey) throw new Error("API Key not found.");

    // Bibliography Injection for Podcast
    const references = BIBLIOGRAPHY[subchapterId];
    let bibliographyInstruction = references 
        ? `\n\n**BASE CIENTÍFICA INTERNA (Referência):**\n${references.map(r => `- ${r}`).join('\n')}`
        : "";

    // CUSTOM TOPIC & SEARCH LOGIC
    let topicInstruction = "";
    let toolsConfig: any = undefined;

    if (customTopic.trim()) {
        topicInstruction = `
        **ATENÇÃO - TEMA PRIORITÁRIO (DEEP RESEARCH):**
        O usuário definiu um tema manual: "${customTopic}".
        
        1. Ignore o título do subcapítulo se ele conflitar com este tema. O foco é "${customTopic}".
        2. USE A FERRAMENTA DE BUSCA (Google Search) para encontrar:
           - Artigos acadêmicos recentes.
           - Definições científicas precisas (Neurociência/Física Quântica).
           - Notícias ou tendências atuais sobre o tema.
        3. Sintetize as informações da BUSCA EXTERNA com a BASE CIENTÍFICA INTERNA.
        `;
        // Enable Google Search Tool for Deep Research
        toolsConfig = [{ googleSearch: {} }];
    } else {
        topicInstruction = "Siga estritamente o tema do Subcapítulo fornecido.";
    }

    // Strategy: Break down large durations into manageable chunks (10 minutes)
    // to ensure the model generates enough content and doesn't hit output token limits.
    const CHUNK_DURATION = 10; 
    const totalChunks = Math.ceil(durationMinutes / CHUNK_DURATION);
    
    let allSegments: PodcastSegment[] = [];
    let previousContext = "";

    console.log(`Starting Podcast Generation: ${durationMinutes} mins total, split into ${totalChunks} chunks. Topic: ${customTopic || "Standard"}`);

    for (let i = 0; i < totalChunks; i++) {
        const currentChunk = i + 1;
        // Calculate minutes for this specific chunk
        let minutesForThisChunk = CHUNK_DURATION;
        // Adjust last chunk duration
        if (currentChunk === totalChunks) {
            const remainder = durationMinutes % CHUNK_DURATION;
            if (remainder > 0) minutesForThisChunk = remainder;
        }

        const targetWordCount = minutesForThisChunk * 160; // Increased word count per minute to ensure length
        const isFinalChunk = currentChunk === totalChunks;

        const partInstruction = totalChunks > 1 
            ? `PARTE ${currentChunk} de ${totalChunks}. (Gere APENAS o roteiro para esta parte, mantendo a continuidade).`
            : "Roteiro Completo.";

        const contextInstruction = previousContext 
            ? `RESUMO DA PARTE ANTERIOR: ${previousContext}\nCONTINUE A CONVERSA NATURALMENTE A PARTIR DAQUI.`
            : "INÍCIO DO PODCAST.";

        const closingInstruction = isFinalChunk
            ? "Encerre o podcast com conclusões finais e despedidas."
            : "NÃO encerre o podcast ainda. Termine este segmento de forma que o próximo possa continuar o fluxo.";

        let hookInstruction = "";
        if (currentChunk === 1) {
            hookInstruction = `
            **REGRA DE INÍCIO (O GANCHO):**
            Comece o roteiro IMEDIATAMENTE com um Gancho Hipnótico que quebra a quarta parede.
            - PROIBIDO: Começar com "Olá", "Bem-vindos", "Neste episódio".
            - OBRIGATÓRIO: A primeira fala deve ser uma pergunta provocativa ("Você já imaginou...", "Pare e sinta...") ou uma afirmação chocante para prender a atenção em 3 segundos.
            `;
        }

        const userPrompt = `
        Gere o roteiro do Podcast para:
        Capítulo: ${chapterTitle}
        Subcapítulo: ${subchapterTitle}
        Contexto Original: ${description}
        ${bibliographyInstruction}
        
        ${topicInstruction}
        
        **ESTRUTURA DE GERAÇÃO:**
        ${partInstruction}
        ${contextInstruction}
        ${hookInstruction}
        
        **META DESTE SEGMENTO:**
        - Duração deste bloco: ${minutesForThisChunk} minutos.
        - Palavras alvo: ~${targetWordCount} palavras.
        - ${closingInstruction}
        
        **PERSONAGENS E VOZES (CRÍTICO E ABSOLUTO):**
        1. **Milton Dilts** (Voz ID: "Enceladus") -> Voz Masculina.
        2. **Roberta Erickson** (Voz ID: "Aoede") -> Voz Feminina.
        
        **PROIBIDO:**
        - NÃO USE "Narrador".
        - NÃO USE "Host".
        - NÃO USE "Sistema".
        - NÃO mencione os nomes técnicos das vozes ("Enceladus" ou "Aoede") no texto. Eles não sabem que são IAs usando essas vozes.
        - NÃO faça monólogos. O diálogo deve ser interativo e curto (ping-pong).

        IMPORTANTE: Para atingir a meta de ${minutesForThisChunk} minutos, aprofunde os tópicos com histórias e metáforas, mas mantenha a troca de turnos constante entre Milton e Roberta.

        Gere o JSON array de segmentos.
        `;

        try {
             const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: [
                    { role: 'user', parts: [{ text: PODCAST_SYSTEM_INSTRUCTION }] },
                    { role: 'user', parts: [{ text: userPrompt }] }
                ],
                config: {
                    ...BASE_CONFIG,
                    tools: toolsConfig, // Enable Search if custom topic provided
                    responseMimeType: "application/json",
                    // Use a smaller thinking budget per chunk to speed up total generation, 
                    // but enough to ensure quality.
                    thinkingConfig: { thinkingBudget: isDeep ? 8192 : 4096 },
                }
            });
            
            const text = response.text;
            if (!text) {
                console.warn(`No text response for chunk ${currentChunk}`);
                continue;
            }
            
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsedData = JSON.parse(jsonStr) as any[];

            // Sanitize data and remove Narrator strictly
            const segments: PodcastSegment[] = parsedData
            .map(item => {
                let speaker = item.speaker || "Milton Dilts";
                const text = item.text || "";
                
                // FORCE OVERWRITE if AI hallucinates Narrator
                if (speaker.toLowerCase().includes('narrador') || speaker.toLowerCase().includes('host')) {
                    speaker = "Milton Dilts"; // Default fallback
                }

                // Auto-fix voice ID based on Speaker Name
                let voiceId = item.voiceId || "Enceladus";
                if (speaker.toLowerCase().includes('roberta')) {
                    voiceId = 'Aoede';
                } else {
                    voiceId = 'Enceladus';
                }

                return {
                    speaker,
                    voiceId,
                    text,
                    tone: item.tone
                };
            })
            // Extra safety filter
            .filter(s => {
                const speaker = s.speaker ? s.speaker.toLowerCase() : "";
                return !speaker.includes('narrador') && !speaker.includes('narrator');
            });
            
            allSegments = [...allSegments, ...segments];

            // Create context for next chunk
            if (!isFinalChunk && segments.length > 0) {
                const lastFewLines = segments.slice(-4).map(s => `${s.speaker}: ${s.text}`).join('\n');
                previousContext = `A conversa estava fluindo. Últimas falas:\n${lastFewLines}`;
            }

        } catch (error) {
            console.error(`Error generating podcast chunk ${currentChunk}:`, error);
            throw error;
        }
    }

    return allSegments;
}

export const generateSpeech = async (text: string, voiceIdOrName: string): Promise<string | null> => {
  if (!apiKey) throw new Error("API Key not found.");

  try {
    const safeText = text.slice(0, 4000); 
    
    // STRICT VOICE MAPPING LOGIC
    // Gemini Voices: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Zephyr'
    // User Update: Explicitly requested 'Enceladus' for Milton and 'Aoede' for Roberta.
    
    let apiVoiceName = 'Aoede'; // Default variable

    const input = voiceIdOrName ? voiceIdOrName.toLowerCase() : '';

    // Map "Roberta" / "Aoede" / "Erickson"
    if (input.includes('roberta') || input.includes('aoede') || input.includes('erickson')) {
        apiVoiceName = 'Aoede';
    }
    // Map "Milton" / "Enceladus" / "Dilts"
    else {
        // Fallback for ANY other input (including 'Narrador' if it slips through) is Milton/Enceladus
        apiVoiceName = 'Enceladus'; 
    }

    // Safety Override: specific check for male names to Enceladus
    if (input.includes('milton') || input.includes('dilts') || input.includes('enceladus')) {
        apiVoiceName = 'Enceladus';
    }

    console.log(`Generating speech. Input Voice ID: "${voiceIdOrName}" -> Mapped API Voice: "${apiVoiceName}"`);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text: safeText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: apiVoiceName }, 
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("Error generating speech:", error);
    return null;
  }
};

export const sendChatMessage = async (
    history: ChatMessage[], 
    newMessage: string,
    attachment?: { mimeType: string, data: string } | null
): Promise<string> => {
    if (!apiKey) throw new Error("API Key not found.");

    const historyParts = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
    }));

    const systemInstruction = {
        role: 'user',
        parts: [{ text: CORE_PERSONA_INSTRUCTION + "\n\nVocê agora está em um CHAT interativo. Milton Dilts e Roberta Erickson respondem dúvidas diretas sobre o livro e os temas quânticos/espirituais. Você tem acesso a uma janela de contexto massiva, portanto, se o usuário enviar PDFs longos ou documentos, analise-os profundamente." }]
    };

    // Construct the new message part
    const newMessageParts: any[] = [];
    
    // Add attachment if exists
    if (attachment) {
        newMessageParts.push({
            inlineData: {
                mimeType: attachment.mimeType,
                data: attachment.data
            }
        });
        newMessageParts.push({ text: `[Arquivo Anexado]: ${newMessage}` });
    } else {
        newMessageParts.push({ text: newMessage });
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: [
                systemInstruction,
                ...historyParts,
                { role: 'user', parts: newMessageParts }
            ],
             config: BASE_CONFIG
        });
        return response.text || "Não consegui processar a resposta.";
    } catch (error) {
        console.error("Chat error:", error);
        return "Perturbação no campo quântico. Erro ao processar mensagem ou arquivo.";
    }
}

// --------------------------------------------------------
// NOVO: MARKETING & VISUAL AGENTS
// --------------------------------------------------------

export const generateMarketingStrategy = async (
    subchapterTitle: string,
    subchapterDescription: string,
    customTopic: string = ""
): Promise<MarketingStrategy> => {
    if (!apiKey) throw new Error("API Key not found.");

    let contextPrompt = "";
    let toolsConfig: any = undefined;

    if (customTopic.trim()) {
        contextPrompt = `
        [TEMA PRIORITÁRIO - DEEP RESEARCH]: ${customTopic}
        USE O GOOGLE SEARCH para analisar o que está em alta (trending) sobre este tema, buscar artigos acadêmicos recentes e palavras-chave virais.
        Sintetize a pesquisa externa com o contexto do livro.
        Ignore o título original se necessário para focar neste tema personalizado.
        `;
        toolsConfig = [{ googleSearch: {} }];
    } else {
        contextPrompt = `
        [TEMA DO VÍDEO]: ${subchapterTitle}
        [CONTEXTO/DESCRIÇÃO]: ${subchapterDescription}
        Identifique 3 subtemas baseados no contexto acima.
        `;
    }

    const fullPrompt = `
    ${contextPrompt}
    Gere a estratégia completa de SEO conforme suas instruções de sistema.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: [
                { role: 'user', parts: [{ text: SEO_AGENT_INSTRUCTION }] },
                { role: 'user', parts: [{ text: fullPrompt }] }
            ],
            config: {
                ...BASE_CONFIG,
                tools: toolsConfig,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        optimizedTitle: { type: Type.STRING },
                        description: { type: Type.STRING },
                        tags: { type: Type.STRING },
                        chapters: { type: Type.STRING },
                        viralHook: { type: Type.STRING }
                    },
                    required: ["optimizedTitle", "description", "tags", "chapters"]
                }
            }
        });
        
        const text = response.text || "{}";
        return JSON.parse(text) as MarketingStrategy;

    } catch (error) {
        console.error("Marketing generation error", error);
        throw error;
    }
}

export const generateThumbnailPrompt = async (
    title: string,
    description: string
): Promise<string> => {
    if (!apiKey) throw new Error("API Key not found.");
    
    const prompt = `
    TÍTULO DO VÍDEO: ${title}
    RESUMO DO CONTEÚDO: ${description}
    
    Gere APENAS o prompt visual para a IA de imagem. Resposta crua, sem explicações.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: [
                { role: 'user', parts: [{ text: THUMBNAIL_AGENT_INSTRUCTION }] },
                { role: 'user', parts: [{ text: prompt }] }
            ],
            config: BASE_CONFIG
        });
        
        return response.text || "";
    } catch (error) {
        console.error("Thumbnail prompt generation error", error);
        throw error;
    }
}

export const generateThumbnailImage = async (imagePrompt: string): Promise<string | null> => {
    if (!apiKey) throw new Error("API Key not found.");

    try {
        // Using Imagen 4 (or best available) as requested
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: imagePrompt,
            config: {
                numberOfImages: 1,
                aspectRatio: "16:9",
                outputMimeType: "image/jpeg"
            }
        });

        // Imagen returns separate generatedImages array
        const base64 = response.generatedImages?.[0]?.image?.imageBytes;
        return base64 || null;
    } catch (error) {
        console.error("Image generation error", error);
        throw error;
    }
}