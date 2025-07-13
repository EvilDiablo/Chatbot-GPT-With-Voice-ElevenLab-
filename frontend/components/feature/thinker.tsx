"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import React, { useState, useEffect } from "react";
import { FileText, Upload, Loader2, Download, X, Send, User, Bot, Search, UserCheck, ChevronLeft, ChevronRight, Plus, Trash2, Edit3, MessageSquare, Sparkles, FileUp } from "lucide-react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

interface Message {
  text: string;
  sender: "user" | "bot";
  type: "text" | "file" | "analysis" | "patient_search" | "patient_selection";
  fileName?: string;
  patientData?: any;
}

interface Patient {
  id: string;
  name: string;
  dateOfBirth: string;
  medicalRecordNumber: string;
  lastVisit: string;
  email?: string;
  phone?: string;
  address?: string;
  emergencyContact?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  primaryCarePhysician?: string;
  allergies?: string[];
  medications?: string[];
  conditions?: string[];
}

interface ConversationSummary {
  conversation_id: string;
  title: string;
  last_query: string;
  created_at: number;
  message_count?: number;
}

interface ThinkerProps {
  conversationId: string | null;
}

const Thinker: React.FC<ThinkerProps> = ({ conversationId }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Hello! I'm your medical document assistant. To get started, I need to identify the patient. Please provide the patient's name, date of birth, or medical record number.",
      sender: "bot",
      type: "text"
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [workflowStep, setWorkflowStep] = useState<"patient_search" | "patient_selection" | "document_analysis">("patient_search");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const fetchConversations = async () => {
    try {
      const res = await axios.get("http://localhost:8000/document-conversations");
      setConversations(res.data);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const loadConversationHistory = async (conversationId: string) => {
    try {
      const res = await axios.get(`http://localhost:8000/conversation/${conversationId}/messages?conversation_type=document`);
      const conversationData = res.data;
      const conversationMessages = conversationData.messages;
      
      // Convert stored messages to the format expected by the thinker component
      const formattedMessages: Message[] = [];
      conversationMessages.forEach((msg: any) => {
        if (msg.sender === "user") {
          formattedMessages.push({
            text: msg.content,
            sender: "user",
            type: "text"
          });
        } else if (msg.sender === "assistant") {
          formattedMessages.push({
            text: msg.content,
            sender: "bot",
            type: "text"
          });
        } else if (msg.sender === "bot") {
          formattedMessages.push({
            text: msg.content,
            sender: "bot",
            type: msg.type || "text"
          });
        }
      });
      
      setMessages(formattedMessages);
      
      // Load patient data from conversation
      try {
        const patientRes = await axios.get(`http://localhost:8000/conversation/${conversationId}/patient-data?conversation_type=document`);
        const patientData = patientRes.data.patient_data;
        
        if (patientData) {
          setCurrentPatient(patientData);
          setWorkflowStep("document_analysis");
        } else if (conversationData.patient_context) {
          // Fallback to parsing patient context if patient_data is not available
          try {
            const patientMatch = conversationData.patient_context.match(/Patient: (.+?) \(MRN: (.+?), DOB: (.+?)\)/);
            if (patientMatch) {
              const parsedPatientData: Patient = {
                id: patientMatch[2], // MRN as ID
                name: patientMatch[1],
                dateOfBirth: patientMatch[3],
                medicalRecordNumber: patientMatch[2],
                lastVisit: new Date().toISOString().split('T')[0], // Default to today
                allergies: [],
                medications: [],
                conditions: []
              };
              
              // Extract additional patient information
              const allergiesMatch = conversationData.patient_context.match(/Allergies: (.+?)(?:\r?\n|$)/);
              if (allergiesMatch && allergiesMatch[1] !== "None") {
                parsedPatientData.allergies = allergiesMatch[1].split(',').map((a: string) => a.trim());
              }
              
              const medicationsMatch = conversationData.patient_context.match(/Current Medications: (.+?)(?:\r?\n|$)/);
              if (medicationsMatch && medicationsMatch[1] !== "None") {
                parsedPatientData.medications = medicationsMatch[1].split(',').map((m: string) => m.trim());
              }
              
              const conditionsMatch = conversationData.patient_context.match(/Medical Conditions: (.+?)(?:\r?\n|$)/);
              if (conditionsMatch && conditionsMatch[1] !== "None") {
                parsedPatientData.conditions = conditionsMatch[1].split(',').map((c: string) => c.trim());
              }
              
              setCurrentPatient(parsedPatientData);
              setWorkflowStep("document_analysis");
            }
          } catch (error) {
            console.error("Error parsing patient data:", error);
          }
        }
      } catch (error) {
        console.error("Error loading patient data:", error);
      }
    } catch (error) {
      console.error("Error loading conversation history:", error);
      const welcomeMessage: Message = {
        text: "Hello! I'm your medical document assistant. To get started, I need to identify the patient. Please provide the patient's name, date of birth, or medical record number.",
        sender: "bot",
        type: "text"
      };
      setMessages([welcomeMessage]);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleNewConversation = async () => {
    try {
      const res = await axios.post("http://localhost:8000/new-document-conversation");
      setActiveConversationId(res.data.conversation_id);
      const welcomeMessage: Message = {
        text: "Hello! I'm your medical document assistant. To get started, I need to identify the patient. Please provide the patient's name, date of birth, or medical record number.",
        sender: "bot",
        type: "text"
      };
      setMessages([welcomeMessage]);
      await saveMessage(welcomeMessage);
      setWorkflowStep("patient_search");
      setCurrentPatient(null);
      setSelectedFile(null);
      setTimeout(fetchConversations, 500);
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await axios.delete(`http://localhost:8000/conversation/${id}?conversation_type=document`);
      if (activeConversationId === id) {
        setActiveConversationId(null);
        const welcomeMessage: Message = {
          text: "Hello! I'm your medical document assistant. To get started, I need to identify the patient. Please provide the patient's name, date of birth, or medical record number.",
          sender: "bot",
          type: "text"
        };
        setMessages([welcomeMessage]);
        await saveMessage(welcomeMessage);
        setWorkflowStep("patient_search");
        setCurrentPatient(null);
        setSelectedFile(null);
      }
      setTimeout(fetchConversations, 500);
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const handleRenameConversation = async (id: string, title: string) => {
    try {
      await axios.post(`http://localhost:8000/conversation/${id}/rename?title=${encodeURIComponent(title)}&conversation_type=document`);
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

  const savePatientData = async (patient: Patient | null) => {
    if (activeConversationId) {
      try {
        await axios.post(`http://localhost:8000/conversation/${activeConversationId}/save-patient?conversation_type=document`, patient);
      } catch (error) {
        console.error("Error saving patient data:", error);
      }
    }
  };

  const saveMessage = async (message: Message, conversationId?: string) => {
    const currentConversationId = conversationId || activeConversationId;
    if (currentConversationId) {
      try {
        await axios.post(`http://localhost:8000/conversation/${currentConversationId}/save-message?conversation_type=document`, {
          sender: message.sender,
          content: message.text,
          type: message.type,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error("Error saving message:", error);
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['.pdf', '.docx', '.doc', '.txt'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedTypes.includes(fileExtension)) {
        alert('Please select a valid file type: PDF, DOCX, DOC, or TXT');
        return;
      }
      
      setSelectedFile(file);
      
      // Add file message to chat
      const newMessage: Message = {
        text: `I've uploaded: ${file.name}`,
        sender: "user",
        type: "file",
        fileName: file.name
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      // Add bot response
      setTimeout(() => {
        const botResponse: Message = {
          text: "Great! I can see you've uploaded a document. What specific information would you like me to extract or analyze from this document? For example:\n\n• Patient allergies and medical history\n• Surgical procedures and interventions\n• Treatment recommendations\n• Specific medical conditions\n\nJust let me know what you're looking for!",
          sender: "bot",
          type: "text"
        };
        setMessages(prev => [...prev, botResponse]);
      }, 500);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    // Auto-create new conversation if none exists
    let currentConversationId = activeConversationId;
    if (!currentConversationId) {
      try {
        const res = await axios.post("http://localhost:8000/new-document-conversation");
        currentConversationId = res.data.conversation_id;
        setActiveConversationId(currentConversationId);
        setTimeout(fetchConversations, 500);
      } catch (error) {
        console.error("Error creating conversation:", error);
        return;
      }
    }

    const userMessage: Message = {
      text: inputText,
      sender: "user",
      type: "text"
    };

    setMessages(prev => [...prev, userMessage]);
    // Save user message
    await saveMessage(userMessage, currentConversationId!);
    setLoading(true);
    setInputText("");

    try {
      if (workflowStep === "patient_search") {
        // Search patients using backend API
        const response = await axios.post("http://localhost:8000/patients/search", {
          query: inputText
        });

        const { patients } = response.data;

        if (patients.length > 0) {
          const patientList = patients.map((patient: Patient) => 
            `• **${patient.name}** (DOB: ${patient.dateOfBirth}, MRN: ${patient.medicalRecordNumber}, Last Visit: ${patient.lastVisit})`
          ).join('\n');

          const botMessage: Message = {
            text: `I found ${patients.length} matching patient(s):\n\n${patientList}\n\nPlease select a patient by typing their name or MRN number.`,
            sender: "bot",
            type: "patient_search"
          };
          setMessages(prev => [...prev, botMessage]);
          await saveMessage(botMessage, currentConversationId!);
          setWorkflowStep("patient_selection");
        } else {
          const botMessage: Message = {
            text: "I couldn't find any patients matching your search. Please try a different name or medical record number.",
            sender: "bot",
            type: "text"
          };
          setMessages(prev => [...prev, botMessage]);
          await saveMessage(botMessage);
        }
      } else if (workflowStep === "patient_selection") {
        // Get patient details from backend API
        const response = await axios.post("http://localhost:8000/patients/search", {
          query: inputText
        });

        const { patients } = response.data;
        const selectedPatient = patients.find((patient: Patient) => 
          patient.name.toLowerCase() === inputText.toLowerCase() ||
          patient.medicalRecordNumber.toLowerCase() === inputText.toLowerCase()
        );

        if (selectedPatient) {
          setCurrentPatient(selectedPatient);
          // Save patient data to conversation
          await savePatientData(selectedPatient);
          const botMessage: Message = {
            text: `Perfect! I've selected **${selectedPatient.name}** (MRN: ${selectedPatient.medicalRecordNumber}).\n\nNow I have access to the patient's medical history and can help you analyze documents or answer questions about their care. You can:\n\n• Upload a new document for analysis\n• Ask questions about the patient's medical history\n• Request specific information extraction\n\nWhat would you like to do?`,
            sender: "bot",
            type: "patient_selection",
            patientData: selectedPatient
          };
          setMessages(prev => [...prev, botMessage]);
          await saveMessage(botMessage, currentConversationId!);
          setWorkflowStep("document_analysis");
        } else {
          const botMessage: Message = {
            text: "I couldn't find that exact patient. Please try selecting from the list I provided earlier.",
            sender: "bot",
            type: "text"
          };
          setMessages(prev => [...prev, botMessage]);
          await saveMessage(botMessage);
        }
      } else if (workflowStep === "document_analysis") {
        // Document analysis with patient context and conversation continuity
        const formData = new FormData();
        
        if (selectedFile) {
          formData.append("file", selectedFile);
        }
        
        // Include comprehensive patient data as context
        const patientContext = currentPatient ? 
          `Patient: ${currentPatient.name} (MRN: ${currentPatient.medicalRecordNumber}, DOB: ${currentPatient.dateOfBirth})
Allergies: ${currentPatient.allergies?.join(', ') || 'None documented'}
Current Medications: ${currentPatient.medications?.join(', ') || 'None documented'}
Medical Conditions: ${currentPatient.conditions?.join(', ') || 'None documented'}
Primary Care Physician: ${currentPatient.primaryCarePhysician || 'Not specified'}` : "";
        
        formData.append("patient_information", patientContext);
        formData.append("query", inputText);
        
        // Add conversation ID for continuity
        formData.append("conversation_id", currentConversationId!);

        const response = await axios.post(
          "http://localhost:8000/thinker",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        
        const cleanAnalysis = response.data.response
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'");

        const botMessage: Message = {
          text: cleanAnalysis,
          sender: "bot",
          type: "analysis"
        };

        setMessages(prev => [...prev, botMessage]);
        
        // Store conversation ID for future requests
        if (response.data.conversation_id && !activeConversationId) {
          setActiveConversationId(response.data.conversation_id);
        }
        
        setSelectedFile(null); // Clear file after analysis
      }
      
    } catch (error) {
      console.error("Error processing request:", error);
      const errorMessage: Message = {
        text: "I'm sorry, I encountered an error while processing your request. Please try again.",
        sender: "bot",
        type: "text"
      };
      setMessages(prev => [...prev, errorMessage]);
      // Save error message
      await saveMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    // Reset with Ctrl+R
    if (e.ctrlKey && e.key === 'r') {
      e.preventDefault();
      setActiveConversationId(null);
      const welcomeMessage: Message = {
        text: "Hello! I'm your medical document assistant. To get started, I need to identify the patient. Please provide the patient's name, date of birth, or medical record number.",
        sender: "bot",
        type: "text"
      };
      setMessages([welcomeMessage]);
      void saveMessage(welcomeMessage);
      setWorkflowStep("patient_search");
      setCurrentPatient(null);
      setSelectedFile(null);
    }
    // Reset patient with Ctrl+P
    if (e.ctrlKey && e.key === 'p' && currentPatient) {
      e.preventDefault();
      (async () => {
        setCurrentPatient(null);
        await savePatientData(null);
        setWorkflowStep("patient_search");
        const resetMessage: Message = {
          text: "Patient reset. Please provide the patient's name, date of birth, or medical record number.",
          sender: "bot",
          type: "text"
        };
        setMessages([resetMessage]);
        await saveMessage(resetMessage);
      })();
    }
    // Change patient with Ctrl+Shift+P
    if (e.ctrlKey && e.shiftKey && e.key === 'P' && currentPatient) {
      e.preventDefault();
      (async () => {
        setCurrentPatient(null);
        await savePatientData(null);
        setWorkflowStep("patient_search");
        const changeMessage: Message = {
          text: "Please provide the patient's name, date of birth, or medical record number to change to a different patient.",
          sender: "bot",
          type: "text"
        };
        setMessages(prev => [...prev, changeMessage]);
        await saveMessage(changeMessage);
      })();
    }
  };

  const exportAnalysis = () => {
    const analysisMessages = messages.filter(msg => msg.type === "analysis");
    if (analysisMessages.length === 0) return;
    
    const analysisText = analysisMessages.map(msg => msg.text).join('\n\n');
    const blob = new Blob([analysisText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medical_analysis_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-indigo-200 mb-1">Document Assistant</div>
              <div className="prose prose-invert max-w-none text-white">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-3 leading-relaxed text-white font-inter">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1 text-white font-inter">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1 text-white font-inter">{children}</ol>,
                    li: ({ children }) => <li className="mb-1 text-white font-inter">{children}</li>,
                    strong: ({ children }) => <strong className="font-bold text-yellow-300 font-inter">{children}</strong>,
                    em: ({ children }) => <em className="italic text-indigo-200 font-inter">{children}</em>,
                    h1: ({ children }) => <h1 className="text-xl font-bold mb-3 text-white font-inter">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-bold mb-2 text-white font-inter">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-bold mb-2 text-white font-inter">{children}</h3>,
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-indigo-400 pl-4 italic bg-indigo-900/20 py-2 rounded-r text-white font-inter">{children}</blockquote>,
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
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-gradient-to-r from-indigo-600/20 to-purple-600/20">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-lg bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Document Analysis</span>
          </div>
          <button
            className="bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-2 rounded-lg text-white hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-indigo-500/25"
            onClick={handleNewConversation}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 && (
            <div className="p-6 text-center text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No conversations yet.</p>
              <p className="text-xs mt-1">Start a new conversation to begin</p>
            </div>
          )}
          {conversations.map((conv) => (
            <div
              key={conv.conversation_id}
              className={`p-4 rounded-lg cursor-pointer transition-all duration-200 mb-2 ${
                conv.conversation_id === activeConversationId 
                  ? "bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border border-indigo-500/50 shadow-lg" 
                  : "hover:bg-slate-700/50 border border-transparent hover:border-slate-600/50"
              }`}
              onClick={() => handleSelectConversation(conv.conversation_id)}
            >
              <div className="flex-1">
                {renamingId === conv.conversation_id ? (
                  <input
                    className="bg-slate-700/80 text-white rounded-lg px-3 py-2 w-full border border-slate-600 focus:border-indigo-500 focus:outline-none"
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
                        <span className="text-xs text-indigo-400 bg-indigo-900/30 px-2 py-1 rounded-full">
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
        {messages.length === 1 && messages[0].sender === "bot" && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Document Analysis Assistant</h2>
            <p className="text-gray-300 max-w-md mx-auto leading-relaxed">
              Your AI-powered medical document analyzer. Upload patient documents and I'll help you 
              extract, analyze, and understand medical information with patient context.
            </p>
          </div>
        )}

        {/* <div className="w-full flex flex-col items-center justify-center mt-8 mb-6">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full p-3 mb-2 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10M7 7v10a2 2 0 002 2h6a2 2 0 002-2V7M7 7H5a2 2 0 00-2 2v10a2 2 0 002 2h2" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Document Analysis Assistant</h2>
          <p className="text-gray-300 text-sm text-center max-w-xl">Upload and analyze medical documents (PDF, DOCX, DOC, TXT) with patient context. Extract medical information, allergies, medications, and treatment details.</p>
        </div> */}

        <div className='h-[90%] overflow-y-auto w-full mt-16 space-y-4'>
          {messages.map((message, index) => (
            <div key={index} className={`${message.sender === "user" ? "ml-8" : "mr-8"}`}>
              {renderMessage(message)}
            </div>
          ))}
          {loading && (
            <div className="mr-8">
              <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-indigo-200 mb-1">Document Assistant</div>
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-indigo-300 text-sm">Analyzing...</span>
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
                placeholder='Type your message or upload a document...'
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                className="min-h-[60px] bg-slate-800/50 border-slate-600/50 text-white placeholder-gray-400 focus:border-indigo-500/50 focus:ring-indigo-500/20 rounded-lg resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-gray-400">
                  Enter to send • Ctrl+R to reset • {currentPatient && "Ctrl+P to reset patient • Ctrl+Shift+P to change patient"}
                </div>
                <div className="flex items-center space-x-2">
                  <label className="cursor-pointer bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-indigo-500/25">
                    <FileUp className="w-4 h-4 inline mr-2" />
                    Upload File
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      accept=".pdf,.docx,.doc,.txt"
                      className="hidden"
                    />
                  </label>
                  {selectedFile && (
                    <span className="text-sm text-gray-300 bg-slate-700/50 px-3 py-1 rounded-lg border border-slate-600/50">
                      {selectedFile.name}
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="ml-2 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Minimal Patient Card */}
            {currentPatient && (
              <div className="w-48 bg-gradient-to-r from-slate-700/90 to-slate-800/90 rounded-lg border border-slate-600/50 backdrop-blur-sm shadow-lg p-2">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-5 h-5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <UserCheck className="w-3 h-3 text-white" />
                  </div>
                  <div className="text-xs font-medium text-white truncate">
                    {currentPatient.name}
                  </div>
                </div>
                <div className="text-xs text-gray-300 mb-1">
                  MRN: {currentPatient.medicalRecordNumber}
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  DOB: {currentPatient.dateOfBirth}
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => {
                      (async () => {
                        setCurrentPatient(null);
                        await savePatientData(null);
                        setWorkflowStep("patient_search");
                        const resetMessage: Message = {
                          text: "Patient reset. Please provide the patient's name, date of birth, or medical record number.",
                          sender: "bot",
                          type: "text"
                        };
                        setMessages([resetMessage]);
                        await saveMessage(resetMessage);
                      })();
                    }}
                    className="bg-orange-600/80 hover:bg-orange-600 px-2 py-1 rounded text-white text-xs font-medium transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => {
                      (async () => {
                        setCurrentPatient(null);
                        await savePatientData(null);
                        setWorkflowStep("patient_search");
                        const changeMessage: Message = {
                          text: "Please provide the patient's name, date of birth, or medical record number to change to a different patient.",
                          sender: "bot",
                          type: "text"
                        };
                        setMessages(prev => [...prev, changeMessage]);
                        await saveMessage(changeMessage);
                      })();
                    }}
                    className="bg-blue-600/80 hover:bg-blue-600 px-2 py-1 rounded text-white text-xs font-medium transition-colors"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex space-x-2">
              <Button 
                onClick={handleSendMessage} 
                disabled={loading || !inputText.trim()}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-indigo-500/25"
              >
                <Send className="w-5 h-5" />
              </Button>
              <Button 
                onClick={exportAnalysis} 
                variant="outline"
                className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50 px-4 py-3 rounded-lg"
              >
                <Download className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Thinker; 