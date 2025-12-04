
export interface Subchapter {
  id: string;
  title: string;
  description?: string;
  content?: string; // The generated content
  isGenerating?: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  subchapters: Subchapter[];
}

export interface BookStructure {
  title: string;
  subtitle: string;
  chapters: Chapter[];
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
  SPEAKING = 'SPEAKING',
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  id: string;
}

// Novo tipo para o roteiro do Podcast
export interface PodcastSegment {
  speaker: string; // "Milton Dilts" or "Roberta Erickson"
  voiceId: string; // "Enceladus" or "Aoede"
  text: string;
  tone?: string;
}

export interface MarketingStrategy {
  optimizedTitle: string;
  description: string;
  tags: string; // Comma separated
  chapters: string; // Formatted timestamp list
  viralHook: string; // Short sentence
}
