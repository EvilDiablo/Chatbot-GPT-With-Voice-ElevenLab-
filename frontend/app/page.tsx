"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import React, { useState } from "react";
import { SendHorizonalIcon } from "lucide-react";
import axios from "axios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Message {
  text: string;
  sender: string;
}

const HomePage = () => {
  const [user, setUser] = useState("");
  const [bot, setBot] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [audio, setAudio] = useState(null);

  const GetChatRespond = async () => {
    const newMessages = [...messages, { text: user, sender: "user" }];
    setMessages(newMessages);
    const Input = new FormData();
    Input.append("request", user);

    try {
      const responsse = await axios.post(
        "http://localhost:8000/chat-response",
        Input,
        {
          responseType: "text",
        }
      );
      const data = await responsse.data;
      const cleanText = data.replace(/["\n\n]/g, "");
      setBot(cleanText);
      setMessages([...newMessages, { text: cleanText, sender: "bot" }]);
    } catch (ex) {
      console.log(ex);
    }
  };

  return (
    <div className='h-full w-full flex flex-col relative p-6'>
      <Tabs defaultValue='Assistant' className='h-full '>
        <TabsList>
          <TabsTrigger value='Assistant'>Assistant</TabsTrigger>
          <TabsTrigger value='Analyzer'>Analyzer</TabsTrigger>
        </TabsList>
        <TabsContent
          value='Assistant'
          className='w-full h-[95%] bg-slate-500 rounded-md shadow-2xl'
        >
          <div className='h-[85%] w-full p-4'>
            {messages.map((message, index) => (
              <div key={index} className={`mb-1 text-white text-justify`}>
                {message.sender === "user" ? "You: " : "Bot: "}
                {message.text}
              </div>
            ))}
          </div>
          <div className='w-full h-[15%] items-center flex p-4'>
            <span className='flex flex-row w-full items-center space-x-2'>
              <Textarea
                placeholder='Type your message here!'
                onChange={(e) => setUser(e.target.value)}
              />
              <Button onClick={GetChatRespond}>
                <SendHorizonalIcon />
              </Button>
            </span>
          </div>
        </TabsContent>
        <TabsContent value='Analyzer'>Change your password here.</TabsContent>
      </Tabs>
    </div>
  );
};

export default HomePage;
