"use client";

import { getClientId } from "@/helper/getClientId";
import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useParams, useRouter } from "next/navigation";

const URL_SOCKET = process.env.NEXT_PUBLIC_API_URL || "";

// --- Tipos ---
interface Message {
  user: string;
  message: string;
  roomId?: string;
  image?: string;
  audio?: string;
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


  // 💡 NUEVOS ESTADOS DE AUDIO
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // 💡 NUEVAS REFS DE AUDIO
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null); // Referencia al MediaRecorder
  const audioStreamRef = useRef<MediaStream | null>(null); // Referencia al Stream de audio
  const audioChunksRef = useRef<Blob[]>([]); // Array para guardar los fragmentos de audio

  const addMessage = useCallback((msg: Message) => {
    setChat((prev) => [...prev, msg]);
  }, []);

  const handleGoBack = () => {
    router.push('/');
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (fileInputRef.current) {
      // 💡 Limpiar el valor para permitir seleccionar la misma imagen de nuevo
      fileInputRef.current.value = '';
    }
  };

  // 💡 Función para ELIMINAR el audio de la vista previa
  const handleRemoveAudio = () => {
    setAudioBlob(null);
  };

  // --- LÓGICA DE GRABACIÓN DE AUDIO ---

  // 💡 Iniciar la Grabación
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      // 💡 Asegurarse de que el formato de audio sea aceptado
      const options = { mimeType: 'audio/webm' };
      const recorder = new MediaRecorder(stream, options);

      recorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setIsRecording(false);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setAudioBlob(null); // Limpiar cualquier audio anterior
    } catch (error) {
      console.error("Error al acceder al micrófono:", error);
      alert("No se pudo acceder al micrófono. Asegúrate de dar los permisos.");
      setIsRecording(false);
    }
  };

  // 💡 Detener la Grabación
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    // Detener las pistas de la MediaStream para liberar el micrófono
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
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
      stopRecording();
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

    // 1. Verificación Inicial: Debe haber contenido (texto, imagen, o audio) para enviar.
    if ((!message.trim() && !imageFile && !audioBlob) || !currentSocket) {
      return;
    }

    // El objeto base del mensaje. El texto siempre se incluye (puede estar vacío).
    const baseMessage: Message = {
      message: message.trim(),
      user: userId,
      roomId
    };


    // Variable para rastrear la imagen codificada
    let base64Image: string | undefined = undefined;

    // Función central que realiza el envío a través de Socket.IO
    const finalSend = (finalMsg: Message) => {
      currentSocket.emit("send_message", finalMsg);
      addMessage(finalMsg);

      // Limpiar la interfaz de usuario después del envío
      setMessage("");
      setImageFile(null);
      setAudioBlob(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ----------------------------------------------------
    // 3. Manejo de Audio (si existe)
    // Se ejecuta al final del flujo, ya sea después de la imagen o inmediatamente.
    const handleAudio = (msgWithImage: Message) => {
      if (audioBlob) {
        const audioReader = new FileReader();
        audioReader.readAsDataURL(audioBlob);

        audioReader.onload = () => {
          const base64Audio = audioReader.result as string;
          finalSend({ ...msgWithImage, audio: base64Audio });
        };

        audioReader.onerror = (error) => {
          console.error("Error al leer el audio:", error);
          // Si falla el audio, envía el mensaje sin él.
          finalSend(msgWithImage);
        };
      } else {
        // Si no hay audio, envía el mensaje tal como está (con o sin imagen/texto).
        finalSend(msgWithImage);
      }
    };
    // ----------------------------------------------------

    // 2. Manejo de Imagen (si existe)
    if (imageFile) {
      const imageReader = new FileReader();
      imageReader.readAsDataURL(imageFile);

      imageReader.onload = () => {
        base64Image = imageReader.result as string;
        // Pasa el mensaje con la imagen al siguiente handler (audio)
        handleAudio({ ...baseMessage, image: base64Image });
      };

      imageReader.onerror = (error) => {
        console.error("Error al leer la imagen:", error);
        // Si falla la imagen, pasa el mensaje sin ella al handler de audio.
        handleAudio(baseMessage);
      };

      // 4. Solo Texto y/o Audio (si NO hay imagen)
    } else {
      // Pasa el mensaje base (solo texto) directamente al handler de audio.
      handleAudio(baseMessage);
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
              // Determina si hay algún contenido multimedia para aplicar margen al texto posterior
              const hasMedia = msg.image || msg.audio;

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
                    {msg.image && (
                      <img
                        src={msg.image}
                        alt="Mensaje con imagen"
                        // 💡 AÑADIDO mb-2 para separarlo del audio/texto
                        className="rounded-lg w-full max-w-[200px] min-w-4 mb-2 h-auto min-h-10"
                      />
                    )}

                    {/* 🎙️ MOSTRAR AUDIO (si existe) */}
                    {msg.audio && (
                      <audio
                        controls
                        // 💡 AJUSTADO EL MIN-WIDTH y AÑADIDO mb-2 para separarlo del texto
                        className="w-full min-w-[300px] mb-2"
                      >
                        <source src={msg.audio} type="audio/webm" />
                        Tu navegador no soporta el elemento de audio.
                      </audio>
                    )}

                    {/* Mostrar texto solo si existe */}
                    {msg.message.trim() ? (
                      <p
                        className={`text-sm whitespace-pre-wrap ${hasMedia && 'mt-1'}`}
                      >
                        {msg.message}
                      </p>
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

          {/* 🎙️ VISTA PREVIA DEL AUDIO GRABADO */}
          {audioBlob && (
            <div className="mb-3 p-3 bg-gray-100 rounded-lg flex items-center justify-between border border-gray-200">
              <div className="flex items-center gap-3 w-full">
                <audio controls src={URL.createObjectURL(audioBlob)} className="flex-1 min-w-0" />
              </div>
              <button
                onClick={handleRemoveAudio}
                className="text-red-500 cursor-pointer hover:text-red-700 transition ml-3"
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

            {/* 🎙️ Botón para Grabar/Detener Audio */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-3 cursor-pointer rounded-xl transition duration-200 
    ${isRecording
                  ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
                  : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }
    ${(!!audioBlob && !isRecording) ? "opacity-50 cursor-not-allowed" : ""}`
              }
              title={isRecording ? "Detener Grabación" : "Grabar Audio"}
              disabled={!!audioBlob && !isRecording}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 90 90" stroke="currentColor" strokeWidth={2}>
                {isRecording ? (
                  <rect x="25" y="25" width="40" height="40" rx="4" fill="currentColor" stroke="none" />
                ) : (
                  <g transform="translate(0 0) scale(1 1)">
                    <path d="M 45 60.738 L 45 60.738 c -10.285 0 -18.7 -8.415 -18.7 -18.7 V 18.7 C 26.3 8.415 34.715 0 45 0 h 0 c 10.285 0 18.7 8.415 18.7 18.7 v 23.337 C 63.7 52.322 55.285 60.738 45 60.738 z" />
                    <path d="M 45 89.213 c -1.712 0 -3.099 -1.387 -3.099 -3.099 V 68.655 c 0 -1.712 1.388 -3.099 3.099 -3.099 c 1.712 0 3.099 1.387 3.099 3.099 v 17.459 C 48.099 87.826 46.712 89.213 45 89.213 z" />
                    <path d="M 55.451 90 H 34.549 c -1.712 0 -3.099 -1.387 -3.099 -3.099 s 1.388 -3.099 3.099 -3.099 h 20.901 c 1.712 0 3.099 1.387 3.099 3.099 S 57.163 90 55.451 90 z" />
                  </g>
                )}
              </svg>
            </button>

            <input
              className="flex-1 border border-gray-300 rounded-xl p-3
              focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none
              disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
              placeholder="Escribe un mensaje..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              autoFocus
              disabled={isRecording}
            />
            <button
              onClick={sendMessage}
              disabled={(!message.trim() && !imageFile && !audioBlob)}
              className="bg-indigo-600 text-white font-semibold px-5 rounded-xl transition-all duration-200 
              disabled:opacity-50 disabled:cursor-not-allowed 
              hover:bg-indigo-700 shadow-md cursor-pointer"
            >
              Enviar
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}