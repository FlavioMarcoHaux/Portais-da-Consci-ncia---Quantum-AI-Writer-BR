import React from 'react';
import { BookStructure, Chapter, Subchapter } from '../types';
import { Book, ChevronRight, Circle } from 'lucide-react';

interface SidebarProps {
  book: BookStructure;
  currentSubchapter: Subchapter | null;
  onSelectSubchapter: (chapter: Chapter, subchapter: Subchapter) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ book, currentSubchapter, onSelectSubchapter }) => {
  return (
    <div className="w-80 bg-neutral-900 border-r border-neutral-800 h-screen overflow-y-auto flex-shrink-0 text-sm">
      <div className="p-6 sticky top-0 bg-neutral-900/95 backdrop-blur z-10 border-b border-neutral-800">
        <div className="flex items-center space-x-2 text-indigo-400 mb-2">
          <Book size={20} />
          <span className="font-bold tracking-wider text-xs uppercase">Estrutura do Livro</span>
        </div>
        <h1 className="font-serif-title text-xl text-white leading-tight">{book.title}</h1>
      </div>
      
      <div className="p-4 space-y-6">
        {book.chapters.map((chapter) => (
          <div key={chapter.id} className="space-y-2">
            <h3 className="text-neutral-400 font-semibold px-2 uppercase text-xs tracking-wider flex items-center">
              {chapter.title}
            </h3>
            <ul className="space-y-1">
              {chapter.subchapters.map((sub) => (
                <li key={sub.id}>
                  <button
                    onClick={() => onSelectSubchapter(chapter, sub)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-all duration-200 flex items-start group ${
                      currentSubchapter?.id === sub.id
                        ? 'bg-indigo-900/30 text-indigo-200 shadow-[0_0_10px_rgba(99,102,241,0.1)] border-l-2 border-indigo-500'
                        : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'
                    }`}
                  >
                    <div className="mt-1 mr-2 flex-shrink-0">
                      {currentSubchapter?.id === sub.id ? (
                        <ChevronRight size={12} className="text-indigo-400" />
                      ) : (
                        <Circle size={6} className="text-neutral-600 group-hover:text-neutral-500" />
                      )}
                    </div>
                    <span className="line-clamp-2">{sub.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};