import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ContentArea } from './components/ContentArea';
import { BOOK_STRUCTURE } from './constants';
import { Chapter, Subchapter } from './types';

function App() {
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [currentSubchapter, setCurrentSubchapter] = useState<Subchapter | null>(null);
  
  // Initialize from Local Storage
  const [contentCache, setContentCache] = useState<Record<string, string>>(() => {
    try {
        const saved = localStorage.getItem('quantum_content_cache');
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        console.warn("Failed to load cache", e);
        return {};
    }
  });

  // Persist to Local Storage whenever cache changes
  useEffect(() => {
    try {
        localStorage.setItem('quantum_content_cache', JSON.stringify(contentCache));
    } catch (e) {
        console.error("Failed to save cache", e);
    }
  }, [contentCache]);

  const handleSelectSubchapter = (chapter: Chapter, subchapter: Subchapter) => {
    setCurrentChapter(chapter);
    setCurrentSubchapter(subchapter);
  };

  const handleUpdateContent = (newContent: string) => {
      if (!currentSubchapter) return;
      
      setContentCache(prev => ({
          ...prev,
          [currentSubchapter.id]: newContent
      }));
  };

  const currentContent = currentSubchapter ? contentCache[currentSubchapter.id] || null : null;

  return (
    <div className="flex h-screen w-full bg-[#050505] overflow-hidden selection:bg-indigo-500/30">
      <Sidebar 
        book={BOOK_STRUCTURE} 
        currentSubchapter={currentSubchapter}
        onSelectSubchapter={handleSelectSubchapter}
      />
      <ContentArea 
        chapter={currentChapter}
        subchapter={currentSubchapter}
        initialContent={currentContent}
        onUpdateContent={handleUpdateContent}
      />
    </div>
  );
}

export default App;