"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import React, { useState } from "react";
import { SendHorizonalIcon, HeadphonesIcon, MicIcon, User, Bot, Loader2 } from "lucide-react";
import axios from "axios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ImageAnalyzer from "@/components/feature/image-analyzer";
import Thinker from "@/components/feature/thinker";
import PatientManagement from "@/components/feature/patient-management";
import ChatBot from "@/components/feature/chatbot";
import ReactMarkdown from "react-markdown";

interface Message {
  text: string;
  sender: "user" | "bot";
}

const HomePage = () => {
  const [user, setUser] = useState("");
  const [bot, setBot] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Hello! I'm your medical assistant. I can help you with medical questions, provide information about symptoms, treatments, and general health advice. How can I assist you today?",
      sender: "bot"
    }
  ]);
  const [audio, setAudio] = useState(null);
  const [loading, setLoading] = useState(false);

  const GetChatRespond = async () => {
    if (!user.trim()) return;
    
    const userMessage: Message = {
      text: user,
      sender: "user"
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    const Input = new FormData();
    Input.append("request", user);

    try {
      const response = await axios.post(
        "http://localhost:8000/chat-response",
        Input,
        {
          responseType: "text",
        }
      );
      const data = await response.data;
      // Clean up the response and handle escaped characters
      const cleanText = data
        .replace(/["\n\n]/g, "")
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'");
      setBot(cleanText);
      
      const botMessage: Message = {
        text: cleanText,
        sender: "bot"
      };
      setMessages(prev => [...prev, botMessage]);
      setUser(""); // Clear input after sending
    } catch (ex) {
      console.log(ex);
      const errorMessage: Message = {
        text: "Sorry, I encountered an error. Please try again.",
        sender: "bot"
      };
      setMessages(prev => [...prev, errorMessage]);
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
  };

  const renderMessage = (message: Message) => {
    if (message.sender === "user") {
      return <div className="text-white font-inter">{message.text}</div>;
    } else {
      return (
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
      );
    }
  };

  return (
    <div className='h-full w-full flex flex-col relative p-6'>
      <Tabs defaultValue='Assistant' className='h-full'>
        <TabsList className="font-inter">
          <TabsTrigger value='Assistant' className="font-medium">Medical Chat</TabsTrigger>
          <TabsTrigger value='Thinker' className="font-medium">Document Assistant</TabsTrigger>
          <TabsTrigger value='Analyzer' className="font-medium">Medical Imaging</TabsTrigger>
          <TabsTrigger value='Patients' className="font-medium">Patient Database</TabsTrigger>
        </TabsList>
        <TabsContent value='Assistant' className='w-full h-[95%] bg-slate-500 rounded-md shadow-2xl'>
          <ChatBot conversationId={null} />
        </TabsContent>
        <TabsContent value='Thinker' className='w-full h-[95%] bg-slate-500 rounded-md shadow-2xl'>
          <Thinker conversationId={null} />
        </TabsContent>
        <TabsContent value='Analyzer' className='w-full h-[95%] bg-slate-500 rounded-md shadow-2xl'>
          <ImageAnalyzer />
        </TabsContent>
        <TabsContent value='Patients' className='w-full h-[95%] bg-slate-500 rounded-md shadow-2xl'>
          <PatientManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HomePage;
