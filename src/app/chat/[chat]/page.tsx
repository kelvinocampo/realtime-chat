"use client";

import { getClientId } from "@/helper/getClientId";
import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useParams, useRouter } from "next/navigation";

const URL_SOCKET = "https://backendchat-production-2bcd.up.railway.app";

// --- Tipos ---
interface Message {
  user: string;
  message: string;
  roomId?: string;
  image?: string;
}

// --- Componente Principal ---
export default function ChatPage() {
  const router = useRouter();

  const params = useParams();
  const roomId = params.chat as string;

  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [chat, setChat] = useState<Message[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleGoBack = () => {
    router.push('/');
  };

  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const addMessage = useCallback((msg: Message) => {
    setChat((prev) => [...prev, msg]);
  }, []);

  const handleRemoveImage = () => {
    setImageFile(null);
    if (fileInputRef.current) {
      // 💡 Limpiar el valor para permitir seleccionar la misma imagen de nuevo
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    const id = getClientId();
    setUserId(id);

    if (!socketRef.current) {
      const newSocket = io(URL_SOCKET, { transports: ["websocket"] });
      socketRef.current = newSocket;

      newSocket.on("connect", () => {
        newSocket.emit("join_room", roomId);
      });

      newSocket.on("receive_message", (msg: Message) => {
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

  // 💡 Handler para seleccionar la imagen
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/')) {
        setImageFile(file);
      } else {
        alert("Solo se permiten archivos de imagen.");
        e.target.value = ''; // Limpiar el input
      }
    }
  };

  const sendMessage = () => {
    const currentSocket = socketRef.current;

    if ((!message.trim() && !imageFile) || !currentSocket) {
      return;
    }

    if (imageFile) {
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);

      reader.onload = () => {
        const base64Image = reader.result as string;

        const newMsg: Message = {
          message: message.trim(),
          user: userId,
          roomId,
          image: base64Image // Enviar Base64 al backend
        };

        currentSocket.emit("send_message", newMsg);
        addMessage(newMsg);

        // Limpiar después de enviar
        setMessage("");
        setImageFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };

      reader.onerror = (error) => {
        console.error("Error al leer el archivo:", error);
      };

    } else if (message.trim()) {
      // 2. Solo mensaje de texto
      const newMsg: Message = { message: message.trim(), user: userId, roomId };

      currentSocket.emit("send_message", newMsg);
      addMessage(newMsg);
      setMessage("");
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-linear-to-br from-indigo-500 to-purple-600 p-6 text-gray-800">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl overflow-hidden">

        <header className="bg-indigo-600 flex justify-between text-white p-4 text-center border-b border-indigo-700">
          <button
            onClick={handleGoBack}
            className="flex cursor-pointer items-center gap-1 transition duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a Chats
          </button>

          <div>
            <h1 className="text-2xl font-extrabold truncate">
              💬 Sala: {roomId}
            </h1>
            <p className="text-sm opacity-80">Conectado como: {userId.length > 15 ? userId.slice(0, 15) + "..." : userId}</p>
          </div>
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
                    {/* 🖼️ MOSTRAR IMAGEN (si existe) */}
                    {msg.image && (<img
                      src={msg.image}
                      alt="Mensaje con imagen"
                      className="rounded-lg max-w-full min-h-20 h-auto"
                      style={{ maxHeight: '200px' }}
                    />)}

                    {/* Mostrar texto solo si existe o si no hay imagen (para evitar un espacio vacío) */}
                    {msg.message.trim() || !msg.image ? (
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <footer className="p-4 bg-white border-t border-gray-200">
          {/* 🖼️ VISTA PREVIA DE LA IMAGEN */}
          {imageFile && (
            <div className="mb-3 p-3 bg-gray-100 rounded-lg flex items-center justify-between border border-gray-200">
              <div className="flex items-center gap-3">
                <img
                  src={URL.createObjectURL(imageFile)}
                  alt="Vista previa"
                  className="h-10 w-10 object-cover rounded-md"
                />
                <span className="text-sm text-gray-700 truncate">{imageFile.name}</span>
              </div>
              <button
                onClick={handleRemoveImage}
                className="text-red-500 cursor-pointer hover:text-red-700 transition"
              >
                ❌
              </button>
            </div>
          )}
          <div className="flex gap-3">

            {/* 📁 Botón para seleccionar archivo (SVG) */}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 cursor-pointer bg-gray-200 text-gray-600 rounded-xl hover:bg-gray-300 transition duration-200"
              title="Adjuntar Imagen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-2-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

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
              disabled={!message.trim() && !imageFile}
              className={`bg-indigo-600 text-white font-semibold px-5 rounded-xl transition-all duration-200 ${!message.trim() && !imageFile
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