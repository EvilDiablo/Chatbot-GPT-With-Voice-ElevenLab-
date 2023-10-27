"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import React, { useState } from "react";
import { SendHorizonalIcon, HeadphonesIcon, MicIcon } from "lucide-react";
import axios from "axios";

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

  return (
    <div className='h-full w-full flex flex-col relative p-6'>
      <div className='h-[85%] overflow-y-auto w-full'>
        {messages.map((message, index) => (
          <div key={index} className={`mb-1 text-white text-justify`}>
            {message.sender === "user" ? "You: " : "Bot: "}
            {message.text}
          </div>
        ))}
      </div>
      <div className='sticky bottom-0 w-full h-[15%] items-center flex'>
        <span className='flex flex-row w-full items-center space-x-2'>
          <Textarea
            placeholder='Type your message here!'
            onChange={(e) => setUser(e.target.value)}
          />
          <Button onClick={GetChatRespond}>
            <SendHorizonalIcon />
          </Button>
          <Button>
            <MicIcon />
          </Button>
          <Button>
            <HeadphonesIcon onClick={GetVoiceRespond} />
          </Button>
          {audio && (
            <audio controls src={`data:audio/mpeg;base64,${audio}`} autoPlay />
          )}
        </span>
      </div>
    </div>
  );
};

export default HomePage;
