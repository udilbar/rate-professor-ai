"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import Markdown from 'react-markdown';

const Chat = () => {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm the Rate My Professor support assistant. How can I help you today?"
    }
  ]);
  const [message, setMessage] = useState('');

  const sendMessage = async () => {
    if (message.trim()) {
      setMessages((messages) => [
        ...messages,
        { role: "user", content: message },
        { role: "assistant", content: "" }
      ]);
      setMessage(''); 
      const response = fetch("/api/chat",{
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify([...messages, {role: "user", content: message}])
      }).then(async(res) => {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let result = ''

        return reader.read().then(function processText({done, value}) {
          if (done) {
            return result
          }
          const text = decoder.decode(value || new Uint8Array(), {stream: true})
          setMessages((messages) => {
            let lastMessage = messages[messages.length - 1]
            let otherMessages = messages.slice(0, messages.length - 1)
            return [
              ...otherMessages,
              {...lastMessage, content: lastMessage.content + text},
            ]
          })
          return reader.read().then(processText)
        })
      })
    }
  };


  return (
    <Card className="max-w-lg mx-auto mt-10">
      <CardHeader>
        <h2 className="text-lg font-semibold">Chat</h2>
      </CardHeader>
      <CardContent className="flex flex-col space-y-4 p-4 h-[400px] overflow-y-auto">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg ${message.role === 'user' ? 'bg-blue-500 text-white self-end' : 'bg-gray-200 self-start'}`}
          >
            <p className="text-sm">
              {message.role === "user" ? message.content : <Markdown>{message.content}</Markdown>}
            </p>
          </div>
        ))}
      </CardContent>
      <div className="p-4 border-t flex space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type your message..."
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-blue-500 text-white rounded-md"
        >
          Send
        </button>
      </div>
    </Card>
  );
};

export default Chat;
