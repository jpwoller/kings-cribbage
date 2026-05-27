import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { getPlayerId } from '../multiplayer';

interface ChatProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}

export function Chat({ messages, onSend }: ChatProps) {
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const playerId = getPlayerId();
  const [lastSeenCount, setLastSeenCount] = useState(messages.length);

  const unreadCount = isOpen ? 0 : messages.length - lastSeenCount;

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setLastSeenCount(messages.length);
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative bg-amber-600 hover:bg-amber-500 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-80 h-96 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-slate-700">
            <span className="font-semibold text-white text-sm">Game Chat</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white text-lg leading-none"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {(!messages || messages.length === 0) && (
              <p className="text-slate-500 text-xs text-center mt-8">No messages yet. Say hi!</p>
            )}
            {messages?.map((msg) => {
              const isMe = msg.playerId === playerId;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-lg px-3 py-2 ${
                    isMe
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-700 text-slate-200'
                  }`}>
                    {!isMe && (
                      <p className="text-[10px] font-medium text-slate-400 mb-0.5">{msg.playerName}</p>
                    )}
                    <p className="text-sm break-words">{msg.text}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                maxLength={200}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
