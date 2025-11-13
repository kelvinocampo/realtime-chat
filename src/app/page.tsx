"use client";

import { getClientId } from "@/helper/getClientId";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";
import Logo from './icon.png'

// --- Tipos ---
interface Chat {
  name: string;
  code: string;
}

// --- Componente Modal de Confirmación ---
interface ConfirmModalProps {
  chatName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ chatName, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
    <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full">
      <h3 className="text-xl font-bold mb-3 text-gray-800">⚠️ Confirmar Eliminación</h3>
      <p className="text-gray-600 mb-6">
        ¿Estás seguro de que deseas eliminar el chat: {chatName}? Esta acción no se puede deshacer.
      </p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 cursor-pointer border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition duration-150"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 cursor-pointer bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-150 shadow-md"
        >
          Eliminar
        </button>
      </div>
    </div>
  </div>
);

// --- Componente Principal ---
export default function ChatsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null); // Nuevo estado para mensajes de error
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null); // Estado para el modal de eliminación

  const router = useRouter();

  // 1. Cargar datos al iniciar
  useEffect(() => {
    getClientId(); // genera un ID único del cliente (asumiendo que funciona)

    const saved = localStorage.getItem("chats");
    if (saved) {
      setChats(JSON.parse(saved));
    }
  }, []);

  const generateCode = () => {
    const newUuid = uuidv4();
    setCode(newUuid);
    setError(null); // Limpiar errores si el código se genera
  };

  // 2. 🔹 Guardar lista en localStorage (memorizado para optimización)
  const updateStorage = useCallback((newChats: Chat[]) => {
    setChats(newChats);
    localStorage.setItem("chats", JSON.stringify(newChats));
  }, []);

  // 3. 🔹 Agregar nuevo chat
  const handleAddChat = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !code.trim()) {
      setError("❌ Los campos Nombre y Código no pueden estar vacíos.");
      return;
    }

    const exists = chats.some((c) => c.code === code.trim());
    if (exists) {
      setError("⚠️ Ya existe un chat con ese código.");
      return;
    }

    const newChats = [...chats, { name: name.trim(), code: code.trim() }];
    updateStorage(newChats);
    setName("");
    setCode("");
  };

  // 4. 🔹 Abrir Modal de Eliminación
  const openDeleteModal = (chat: Chat) => {
    setChatToDelete(chat);
  };

  // 5. 🔹 Ejecutar Eliminación (desde el modal)
  const executeDeleteChat = () => {
    if (!chatToDelete) return;

    const filtered = chats.filter((c) => c.code !== chatToDelete.code);
    updateStorage(filtered);
    setChatToDelete(null); // Cerrar modal
  };

  // 6. 🔹 Ir al chat
  const handleOpenChat = (chatCode: string) => {
    router.push(`/chat/${chatCode}`);
  };

  return (
    <main className="flex flex-col gap-8 justify-center items-center min-h-screen bg-linear-to-br from-indigo-500 to-purple-600 p-6 text-black">
      <div className="flex items-center gap-3 text-4xl font-extrabold text-white tracking-wide">
        <div className="bg-white p-2 rounded">
          <Image
            src={Logo}
            alt="Logo del sitio"
            width={60}  // puedes ajustar el tamaño
            height={60}
            priority
            className="rounded"
          />
        </div>
        <h1>Tus Espacios de Chat</h1>
      </div>


      <div className="w-full max-w-lg bg-white p-8 rounded-3xl shadow-2xl">

        {/* 🧾 Formulario de nuevo chat */}
        <section className="mb-8 border-b pb-6 border-gray-200">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Añadir Nuevo Chat</h2>
          <form onSubmit={handleAddChat} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Nombre amigable del chat (Ej. Equipo IT)"
              className="border border-gray-300 rounded-xl p-3 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {/* <input
              type="text"
              placeholder="Código o ID único del chat (Ej. PROYECTO-45)"
              className="border border-gray-300 rounded-xl p-3 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            /> */}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Código o ID único del chat (Ej. PROYECTO-45)"
                className="border border-gray-300 rounded-xl p-3 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow w-full font-mono text-sm"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button
                type="button" // Es importante que sea 'button' para evitar enviar el formulario
                onClick={generateCode}
                title="Generar código UUID automáticamente"
                className="bg-gray-200 cursor-pointer text-gray-700 font-semibold text-xs rounded-xl hover:bg-gray-300 transition duration-200 px-3 py-2 flex items-center justify-center whitespace-nowrap"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-dice"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <path d="M16 8h.01" />
                  <path d="M8 16h.01" />
                  <path d="M12 12h.01" />
                </svg>
              </button>
            </div>
            {error && (
              <p className="text-red-500 text-sm font-medium bg-red-50 p-2 rounded-lg border border-red-200">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="bg-indigo-600 cursor-pointer text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition duration-200 shadow-md shadow-indigo-300 mt-2"
            >
              ➕ Conectar Chat
            </button>
          </form>
        </section>

        {/* 📋 Lista de chats */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Chats Guardados</h2>
          {chats.length === 0 ? (
            <div className="text-center p-6 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500 italic">
                Aún no has conectado ningún chat. Usa el formulario de arriba.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {chats.map((chat, index) => (
                <li
                  key={index}
                  className="flex justify-between items-center bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div
                    className="flex flex-col grow"
                  >
                    <span className="font-bold text-lg text-indigo-700 truncate">{chat.name}</span>
                    <span className="text-xs text-gray-500 font-mono mt-0.5">{chat.code}</span>
                  </div>
                  <button
                    onClick={() => handleOpenChat(chat.code)}
                    className="text-indigo-600 cursor-pointer hover:text-indigo-800 p-2 rounded-full hover:bg-indigo-50 transition duration-150 ml-4 flex items-center justify-center"
                    aria-label={`Abrir chat ${chat.name}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => openDeleteModal(chat)}
                    className="text-red-500 cursor-pointer hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition duration-150 ml-4"
                    aria-label={`Eliminar chat ${chat.name}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {chatToDelete && (
        <ConfirmModal
          chatName={chatToDelete.name}
          onConfirm={executeDeleteChat}
          onCancel={() => setChatToDelete(null)}
        />
      )}
    </main>
  );
}