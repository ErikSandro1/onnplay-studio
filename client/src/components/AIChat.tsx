/**
 * AI Chat Component
 * 
 * Interface de chat para o operador de IA.
 * Permite enviar comandos em linguagem natural e ver respostas.
 */

import React, { useState, useEffect, useRef } from 'react';
import { aiAssistantService } from '../services/AIAssistantService';
import type { AIMessage, AIAssistantState } from '../types/ai-assistant';

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIChat: React.FC<AIChatProps> = ({ isOpen, onClose }) => {
  const [state, setState] = useState<AIAssistantState>(aiAssistantService.getState());
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const unsubscribe = aiAssistantService.subscribe(setState);
    return unsubscribe;
  }, []);
  
  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || state.isProcessing) return;
    
    const command = input.trim();
    setInput('');
    
    await aiAssistantService.processCommand(command);
  };
  
  const handleExampleClick = (example: string) => {
    setInput(example);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-slate-900 rounded-lg shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-xl">🤖</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Operador IA</h2>
              <p className="text-xs text-slate-400">
                {state.isProcessing ? 'Processando...' : 'Pronto para ajudar'}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {state.messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                <span className="text-3xl">🎙️</span>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                Bem-vindo ao Operador IA!
              </h3>
              <p className="text-sm text-slate-400 mb-6">
                Digite comandos em linguagem natural para controlar o studio.
              </p>
              
              {/* Example Commands */}
              <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                {[
                  'Aumenta o áudio do convidado 2',
                  'Muda para layout PIP',
                  'Zoom 2x na CAM 1',
                  'Aplica fade',
                ].map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleExampleClick(example)}
                    className="text-xs text-left p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  >
                    💡 {example}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {state.messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite um comando... (ex: aumenta o áudio do convidado 2)"
              disabled={state.isProcessing}
              className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || state.isProcessing}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {state.isProcessing ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                'Enviar'
              )}
            </button>
          </div>
          
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>💡 Dica: Seja natural, como se estivesse falando com um operador</span>
            <button
              type="button"
              onClick={() => aiAssistantService.clearHistory()}
              className="hover:text-slate-400"
            >
              Limpar histórico
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =============================================================================
// Message Bubble Component
// =============================================================================

interface MessageBubbleProps {
  message: AIMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isError = message.status === 'error';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Avatar */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs">
              🤖
            </div>
            <span className="text-xs text-slate-400">Operador IA</span>
          </div>
        )}
        
        {/* Message Content */}
        <div
          className={`rounded-lg p-3 ${
            isUser
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : isError
              ? 'bg-red-500/20 border border-red-500/50 text-red-200'
              : 'bg-slate-800 text-slate-200'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          
          {/* Command Details (for user messages) */}
          {isUser && message.command && (
            <div className="mt-2 pt-2 border-t border-white/20 text-xs opacity-75">
              <div className="flex items-center gap-2">
                <span className="font-mono bg-white/20 px-2 py-0.5 rounded">
                  {message.command.intent.action}
                </span>
                <span className="text-white/60">
                  {Math.round(message.command.intent.confidence * 100)}% confiança
                </span>
              </div>
            </div>
          )}
          
          {/* Result Details (for assistant messages) */}
          {!isUser && message.result && message.result.details && (
            <div className="mt-2 pt-2 border-t border-slate-700 text-xs">
              {Object.entries(message.result.details).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-slate-400">{key}:</span>
                  <span className="font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Timestamp */}
        <div className={`text-xs text-slate-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};
