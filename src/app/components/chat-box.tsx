import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, Minus, Maximize2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import api from '../../lib/api';

export function ChatBox() {
  const { activeChatUser, closeChat, messages, sendMessage, isConnected } = useChat();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Combine fetched history with live messages
  const allMessages = [...history, ...messages.filter(m => 
    (m.senderId === activeChatUser?.id && m.receiverId === user?.id) ||
    (m.senderId === user?.id && m.receiverId === activeChatUser?.id)
  )];

  useEffect(() => {
    if (activeChatUser && user) {
      // Fetch history when opening chat
      api.get(`/chat/history/${user.id}/${activeChatUser.id}`)
        .then(res => setHistory(res.data))
        .catch(err => console.error("History fetch failed", err));
    } else {
      setHistory([]);
    }
  }, [activeChatUser, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [allMessages]);

  if (!activeChatUser) return null;

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && activeChatUser) {
      sendMessage(activeChatUser.id, input.trim());
      setInput("");
    }
  };

  return (
    <div className={`fixed bottom-0 right-4 z-50 transition-all duration-300 ${isMinimized ? 'h-14' : 'h-[450px]'} w-80 sm:w-96`}>
      <Card className="h-full flex flex-col shadow-2xl border-primary/20 rounded-t-2xl overflow-hidden bg-white">
        {/* Header */}
        <div className="bg-primary p-4 flex items-center justify-between text-white cursor-pointer" onClick={() => isMinimized && setIsMinimized(false)}>
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
                {activeChatUser.name[0]}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-primary ${isConnected ? 'bg-green-400' : 'bg-gray-400'}`} />
            </div>
            <div>
              <p className="font-bold text-sm truncate w-32 sm:w-48">{activeChatUser.name}</p>
              <p className="text-[10px] opacity-80 uppercase font-black">{isConnected ? 'Online' : 'Connecting...'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}>
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); closeChat(); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
              {allMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 opacity-60">
                  <MessageSquare className="w-12 h-12" />
                  <p className="text-sm font-medium">Start the conversation</p>
                </div>
              )}
              {allMessages.map((msg, idx) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
                      isMe 
                        ? 'bg-primary text-white rounded-br-none' 
                        : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex items-center gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <Button 
                type="submit" 
                size="icon" 
                className="rounded-xl h-10 w-10 shadow-lg shadow-primary/20"
                disabled={!input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
