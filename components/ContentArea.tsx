import React, { useState } from 'react';
import { Chapter, Subchapter } from '../types';
import { BrainCircuit } from 'lucide-react';
import { TabManuscript } from './TabManuscript';
import { TabPodcast } from './TabPodcast';
import { TabChat } from './TabChat';

interface ContentAreaProps {
  chapter: Chapter | null;
  subchapter: Subchapter | null;
  initialContent: string | null;
  onUpdateContent: (content: string) => void;
}

export const ContentArea: React.FC<ContentAreaProps> = ({ 
  chapter, 
  subchapter, 
  initialContent,
  onUpdateContent
}) => {
  const [activeTab, setActiveTab] = useState<'write' | 'chat' | 'podcast'>('write');

  // REMOVED THE BLOCKING SCREEN LOGIC
  // Now the app renders tabs immediately, allowing "Deep Research" without a selected chapter.

  return (
    <div className="flex-1 h-screen overflow-hidden bg-[#050505] relative flex flex-col">
      {/* Top Bar / Tabs - Fixed Z-Index to prevent overlap */}
      <div className="border-b border-neutral-900 bg-neutral-900/95 backdrop-blur flex items-center px-8 pt-4 space-x-6 z-50 flex-shrink-0">
         <button 
            onClick={() => setActiveTab('write')}
            className={`pb-4 px-2 text-sm font-medium tracking-wider transition-colors border-b-2 ${activeTab === 'write' ? 'border-indigo-500 text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
         >
            MARKETING STUDIO
         </button>
         <button 
            onClick={() => setActiveTab('podcast')}
            className={`pb-4 px-2 text-sm font-medium tracking-wider transition-colors border-b-2 ${activeTab === 'podcast' ? 'border-purple-500 text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
         >
            PODCAST (LIVE)
         </button>
         <button 
            onClick={() => setActiveTab('chat')}
            className={`pb-4 px-2 text-sm font-medium tracking-wider transition-colors border-b-2 ${activeTab === 'chat' ? 'border-cyan-500 text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
         >
            CHAT (IA)
         </button>
      </div>

      {/* Tab Content - Uses CSS hiding to persist state */}
      <div className="flex-1 overflow-hidden relative">
          <div className={activeTab === 'write' ? 'h-full flex flex-col' : 'hidden'}>
              <TabManuscript 
                chapter={chapter} 
                subchapter={subchapter} 
                initialContent={initialContent} 
                onUpdateContent={onUpdateContent}
              />
          </div>

          <div className={activeTab === 'podcast' ? 'h-full flex flex-col' : 'hidden'}>
              <TabPodcast 
                chapter={chapter} 
                subchapter={subchapter} 
              />
          </div>

          <div className={activeTab === 'chat' ? 'h-full flex flex-col' : 'hidden'}>
              <TabChat />
          </div>
      </div>
    </div>
  );
};