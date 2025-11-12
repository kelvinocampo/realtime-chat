"use client";

import { getClientId } from "@/helper/getClientId";
import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useParams, useRouter } from "next/navigation";

const URL_SOCKET = "http://172.21.103.15:3001";

// --- Tipos ---
interface Message {
  user: string;
  message: string;
  roomId?: string;
}

// --- Componente Principal ---
export default function ChatPage() {
  const router = useRouter();

  const params = useParams();
  const roomId = params.chat as string;

  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [chat, setChat] = useState<Message[]>([]);


  const handleGoBack = () => {
    router.push('/');
  };
  const socketRef = useRef<Socket | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const addMessage = useCallback((msg: Message) => {
    setChat((prev) => [...prev, msg]);
  }, []);

  useEffect(() => {
    const id = getClientId();
    setUserId(id);

    if (!socketRef.current) {
      const newSocket = io(URL_SOCKET, { transports: ["websocket"] });
      socketRef.current = newSocket;

      newSocket.on("connect", () => {
        console.log(`Conectado al servidor con ID: ${newSocket.id}`);
        newSocket.emit("join_room", roomId);
      });

      newSocket.on("receive_message", (msg: Message) => {
        console.log(msg);
        
        if (msg.roomId === roomId) {
          addMessage(msg);
        }
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [roomId, addMessage]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chat]);

  const sendMessage = () => {
    const currentSocket = socketRef.current;

    if (message.trim() && currentSocket) {
      const newMsg: Message = { message: message.trim(), user: userId, roomId };

      currentSocket.emit("send_message", newMsg);

      addMessage(newMsg);

      setMessage("");
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-linear-to-br from-indigo-500 to-purple-600 p-6 text-gray-800">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl overflow-hidden">

        <header className="bg-indigo-600 text-white p-4 text-center border-b border-indigo-700">
          <h1 className="text-2xl font-extrabold truncate">
            💬 Sala: {roomId}
          </h1>
          <p className="text-sm opacity-80">Conectado como: {userId.length > 15 ? userId.slice(0, 15) + "..." : userId}</p>
        </header>

        <div
          ref={chatContainerRef}
          className="h-96 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-100"
        >
          {chat.length === 0 ? (
            <p className="text-center text-gray-500 italic mt-10">Aún no hay mensajes en esta sala...</p>
          ) : (
            chat.map((msg, i) => {
              const isOwn = msg.user === userId;

              return (
                <div
                  key={i}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] p-3 rounded-xl shadow-md wrap-break-words ${isOwn
                      ? "bg-indigo-500 text-white rounded-br-none"
                      : "bg-white text-gray-800 rounded-tl-none border border-gray-200"
                      }`}
                  >
                    {!isOwn && (
                      <div className="text-xs font-semibold text-indigo-600 mb-1">
                        {msg.user.length > 15 ? msg.user.slice(0, 15) + "..." : msg.user}
                      </div>
                    )}
                    <p className="text-sm">{msg.message}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <footer className="p-4 bg-white border-t border-gray-200">
          <div className="flex gap-3">
            <input
              className="flex-1 border border-gray-300 rounded-xl p-3 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none"
              placeholder="Escribe un mensaje..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              autoFocus
            />
            <button
              onClick={sendMessage}
              disabled={!message.trim()}
              className={`bg-indigo-600 text-white font-semibold px-5 rounded-xl transition-all duration-200 ${!message.trim()
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-indigo-700 shadow-md cursor-pointer"
                }`}
            >
              Enviar
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}