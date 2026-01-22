
import React, { useState } from 'react';
import { AppState, KnowledgeEntry } from '../types';
import { Plus, Trash2, Database, Brain } from 'lucide-react';

const KnowledgeBase: React.FC<{ state: AppState; updateState: (u: Partial<AppState>) => void }> = ({ state, updateState }) => {
  const [newTopic, setNewTopic] = useState('');
  const [newContent, setNewContent] = useState('');

  const handleAddEntry = () => {
    if (!newTopic || !newContent) return;
    const entry: KnowledgeEntry = {
      id: Math.random().toString(),
      topic: newTopic,
      content: newContent,
      source: 'manual',
      timestamp: new Date().toISOString()
    };
    updateState({ knowledgeBase: [...state.knowledgeBase, entry] });
    setNewTopic('');
    setNewContent('');
  };

  const removeEntry = (id: string) => {
    updateState({ knowledgeBase: state.knowledgeBase.filter(e => e.id !== id) });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-8 rounded-2xl text-white shadow-xl">
        <div className="flex items-center gap-4 mb-4">
          <Brain size={40} className="text-indigo-100" />
          <h2 className="text-3xl font-bold">Agent Memory Bank</h2>
        </div>
        <p className="text-indigo-100 text-lg">
          Teach your agents specific details about your business. They will use this information to answer customer questions and personalize outreach.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Plus size={20} className="text-indigo-600" />
          Add New Fact
        </h3>
        <div className="space-y-4">
          <input 
            type="text" 
            placeholder="Topic (e.g., Pricing Strategy)" 
            className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
          />
          <textarea 
            placeholder="Detailed content for agents to remember..." 
            className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 h-32 resize-none"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
          />
          <button 
            onClick={handleAddEntry}
            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Add to Memory Bank
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {state.knowledgeBase.map(entry => (
          <div key={entry.id} className="bg-white p-6 rounded-xl border border-slate-200 flex justify-between group">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-slate-900">{entry.topic}</span>
                <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-bold uppercase tracking-wider">
                  {entry.source}
                </span>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">{entry.content}</p>
              <div className="mt-2 text-[10px] text-slate-400">Learned: {new Date(entry.timestamp).toLocaleString()}</div>
            </div>
            <button 
              onClick={() => removeEntry(entry.id)}
              className="text-slate-300 hover:text-rose-500 transition-colors p-2"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KnowledgeBase;
