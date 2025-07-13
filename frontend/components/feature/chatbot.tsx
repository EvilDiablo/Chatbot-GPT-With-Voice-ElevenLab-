"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import React, { useState, useEffect } from "react";
import { SendHorizonalIcon, HeadphonesIcon, MicIcon, ChevronLeft, ChevronRight, Plus, Trash2, Edit3, MessageSquare, Sparkles } from "lucide-react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

interface Message {
  text: string;
  sender: string;
}

interface ConversationSummary {
  conversation_id: string;
  title: string;
  last_query: string;
  created_at: number;
  message_count?: number;
}

interface ChatBotProps {
  conversationId: string | null;
}

const ChatBot: React.FC<ChatBotProps> = ({ conversationId }) => {
  const [user, setUser] = useState("");
  const [bot, setBot] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [audio, setAudio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const fetchConversations = async () => {
    try {
      const res = await axios.get("http://localhost:8000/medical-conversations");
      setConversations(res.data);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const loadConversationHistory = async (conversationId: string) => {
    try {
      const res = await axios.get(`http://localhost:8000/conversation/${conversationId}/messages?conversation_type=medical`);
      const conversationMessages = res.data.messages;
      
      // Convert stored messages to the format expected by the chat component
      const formattedMessages: Message[] = [];
      conversationMessages.forEach((msg: any) => {
        if (msg.sender === "user") {
          formattedMessages.push({
            text: msg.content,
            sender: "user"
          });
        } else if (msg.sender === "assistant") {
          formattedMessages.push({
            text: msg.content,
            sender: "bot"
          });
        }
      });
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error("Error loading conversation history:", error);
      setMessages([]);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleNewConversation = async () => {
    try {
      const res = await axios.post("http://localhost:8000/new-medical-conversation");
      setActiveConversationId(res.data.conversation_id);
      setMessages([]);
      setTimeout(fetchConversations, 500);
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await axios.delete(`http://localhost:8000/conversation/${id}?conversation_type=medical`);
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }
      setTimeout(fetchConversations, 500);
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const handleRenameConversation = async (id: string, title: string) => {
    try {
      await axios.post(`http://localhost:8000/conversation/${id}/rename?title=${encodeURIComponent(title)}&conversation_type=medical`);
      setRenamingId(null);
      setRenameValue("");
      setTimeout(fetchConversations, 500);
    } catch (error) {
      console.error("Error renaming conversation:", error);
    }
  };

  const handleRename = (id: string) => {
    if (renameValue.trim()) {
      handleRenameConversation(id, renameValue.trim());
    }
  };

  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id);
    await loadConversationHistory(id);
  };

  const GetChatRespond = async () => {
    if (!user.trim()) return;
    
    // Auto-create new conversation if none exists
    let currentConversationId = activeConversationId;
    if (!currentConversationId) {
      try {
        const res = await axios.post("http://localhost:8000/new-medical-conversation");
        currentConversationId = res.data.conversation_id;
        setActiveConversationId(currentConversationId);
        setTimeout(fetchConversations, 500);
      } catch (error) {
        console.error("Error creating conversation:", error);
        return;
      }
    }
    
    setLoading(true);
    const newMessages = [...messages, { text: user, sender: "user" }];
    setMessages(newMessages);
    const Input = new FormData();
    Input.append("request", user);
    Input.append("conversation_id", currentConversationId!);
    try {
      const response = await axios.post(
        "http://localhost:8000/chat-response",
        Input,
        {
          responseType: "json",
        }
      );
      const data = response.data;
      const cleanText = data.response
        .replace(/["\n\n]/g, "")
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'");
      setBot(cleanText);
      setMessages([...newMessages, { text: cleanText, sender: "bot" }]);
      setUser("");
    } catch (ex) {
      setMessages([...newMessages, { text: "Sorry, I encountered an error. Please try again.", sender: "bot" }]);
    } finally {
      setLoading(false);
    }
  };

  const GetVoiceRespond = async () => {
    const Input = new FormData();
    Input.append("voice_data", bot);
    try {
      const response = await axios.post(
        "http://localhost:8000/voice-over",
        Input
      );
      const data = await response.data;
      setAudio(data);
    } catch (error) {
      console.error("Error fetching audio:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      GetChatRespond();
    }
    // Reset conversation with Ctrl+R
    if (e.ctrlKey && e.key === 'r') {
      e.preventDefault();
      setActiveConversationId(null);
      setMessages([]);
      setBot("");
      setUser("");
    }
  };

  const renderMessage = (message: Message) => {
    if (message.sender === "user") {
      return (
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">U</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-200 mb-1">You</div>
              <div className="text-white leading-relaxed">{message.text}</div>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-emerald-200 mb-1">Medical Assistant</div>
              <div className="prose prose-invert max-w-none text-white">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-3 leading-relaxed text-white font-inter">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1 text-white font-inter">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1 text-white font-inter">{children}</ol>,
                    li: ({ children }) => <li className="mb-1 text-white font-inter">{children}</li>,
                    strong: ({ children }) => <strong className="font-bold text-yellow-300 font-inter">{children}</strong>,
                    em: ({ children }) => <em className="italic text-emerald-200 font-inter">{children}</em>,
                    h1: ({ children }) => <h1 className="text-xl font-bold mb-3 text-white font-inter">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-bold mb-2 text-white font-inter">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-bold mb-2 text-white font-inter">{children}</h3>,
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-emerald-400 pl-4 italic bg-emerald-900/20 py-2 rounded-r text-white font-inter">{children}</blockquote>,
                    code: ({ children }) => <code className="bg-gray-700/50 px-2 py-1 rounded text-sm border border-gray-600 text-white font-mono">{children}</code>,
                    pre: ({ children }) => <pre className="bg-gray-800/50 p-3 rounded border border-gray-600 overflow-x-auto text-white font-mono">{children}</pre>,
                  }}
                >
                  {message.text}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className='h-full w-full flex flex-row relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'>
      {/* Enhanced Sidebar */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 overflow-hidden bg-gradient-to-b from-slate-800 to-slate-900 text-white flex flex-col border-r border-slate-700/50 shadow-xl`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-gradient-to-r from-emerald-600/20 to-teal-600/20">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-lg bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Medical Assistant</span>
          </div>
          <button
            className="bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 rounded-lg text-white hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-emerald-500/25"
            onClick={handleNewConversation}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 && (
            <div className="p-6 text-center text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No conversations yet.</p>
              <p className="text-xs mt-1">Start a new conversation to begin</p>
            </div>
          )}
          {conversations.map((conv) => (
            <div
              key={conv.conversation_id}
              className={`p-4 rounded-lg cursor-pointer transition-all duration-200 mb-2 ${
                conv.conversation_id === activeConversationId 
                  ? "bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border border-emerald-500/50 shadow-lg" 
                  : "hover:bg-slate-700/50 border border-transparent hover:border-slate-600/50"
              }`}
              onClick={() => handleSelectConversation(conv.conversation_id)}
            >
              <div className="flex-1">
                {renamingId === conv.conversation_id ? (
                  <input
                    className="bg-slate-700/80 text-white rounded-lg px-3 py-2 w-full border border-slate-600 focus:border-emerald-500 focus:outline-none"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => handleRename(conv.conversation_id)}
                    onKeyDown={e => {
                      if (e.key === "Enter") handleRename(conv.conversation_id);
                    }}
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate text-white">{conv.title}</div>
                      <div className="text-xs text-gray-400 truncate mt-1">{conv.last_query}</div>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded-full">
                          {conv.message_count || 0} messages
                        </span>
                        <button
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          onClick={e => {
                            e.stopPropagation();
                            setRenamingId(conv.conversation_id);
                            setRenameValue(conv.title);
                          }}
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <button
                      className="ml-2 text-xs text-red-400 hover:text-red-300 transition-colors p-1 rounded hover:bg-red-900/30"
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteConversation(conv.conversation_id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Main Chat Area */}
      <div className="flex-1 h-full flex flex-col relative p-6">
        {/* Enhanced Sidebar Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-4 left-4 z-10 bg-gradient-to-r from-slate-700 to-slate-800 p-3 rounded-lg text-white hover:from-slate-600 hover:to-slate-700 transition-all duration-200 shadow-lg border border-slate-600/50"
        >
          {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {/* Welcome Header */}
        {messages.length === 0 && (
          <div className="w-full flex flex-col items-center justify-center mt-8 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-full p-3 mb-2 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8l-4.28 1.07a1 1 0 01-1.22-1.22l1.07-4.28A9.77 9.77 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Medical Chat Assistant</h2>
            <p className="text-gray-300 text-sm text-center max-w-xl">AI-powered medical consultation and health advice. Get instant responses to medical questions, symptom analysis, and general health guidance.</p>
          </div>
        )}

        <div className='h-[90%] overflow-y-auto w-full mt-16 space-y-4'>
          {messages.map((message, index) => (
            <div key={index} className={`${message.sender === "user" ? "ml-8" : "mr-8"}`}>
              {renderMessage(message)}
            </div>
          ))}
          {loading && (
            <div className="mr-8">
              <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-emerald-200 mb-1">Medical Assistant</div>
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-emerald-300 text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Input Area */}
        <div className='sticky bottom-0 w-full mt-4'>
          <div className='flex flex-row w-full items-end space-x-3'>
            <div className="flex-1">
              <Textarea
                placeholder='Ask me about any medical topic...'
                value={user}
                onChange={(e) => setUser(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                className="min-h-[60px] bg-slate-800/50 border-slate-600/50 text-white placeholder-gray-400 focus:border-emerald-500/50 focus:ring-emerald-500/20 rounded-lg resize-none"
              />
              <div className="text-xs text-gray-400 mt-2">
                Press Enter to send • Ctrl+R to reset conversation
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={GetChatRespond} 
                disabled={loading || !user.trim()}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-emerald-500/25"
              >
                <SendHorizonalIcon className="w-5 h-5" />
              </Button>
              <Button 
                onClick={GetVoiceRespond} 
                disabled={loading || !bot.trim()}
                variant="outline"
                className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50 px-4 py-3 rounded-lg"
              >
                <HeadphonesIcon className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
