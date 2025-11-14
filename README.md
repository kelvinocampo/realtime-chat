# 💬 Temporal Realtime Chat: Fullstack Multimedia Messenger

## Visión General del Proyecto

**Temporal Realtime Chat** es una aplicación de mensajería en tiempo real diseñada para demostrar la comunicación instantánea y el manejo de archivos multimedia complejos a través de WebSockets. Permite a los usuarios unirse a salas dinámicas y enviar texto, imágenes y grabaciones de audio en una única burbuja de mensaje.

Este proyecto destaca la integración *Fullstack* de Next.js (frontend) con Socket.IO (backend/realtime layer) para ofrecer una experiencia de chat moderna y fluida.

---

## 🚀 Tecnologías Utilizadas

| Categoría | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Frontend** | **Next.js** | Framework de React para el lado del cliente (routing, components). |
| | **TypeScript** | Lenguaje de programación para tipado estático y robustez. |
| | **Tailwind CSS** | Framework CSS para el estilizado rápido y diseño responsivo. |
| | **MediaRecorder API** | API del navegador para la grabación de audio. |
| **Backend/Tiempo Real** | **Socket.IO** | Librería para la comunicación bidireccional de baja latencia (WebSockets). |
| | **Node.js / Express** | Entorno de ejecución y framework para el servidor backend de Socket.IO. |

---

## ✨ Características Principales

* **Mensajería en Tiempo Real:** Comunicación instantánea con baja latencia a través de WebSockets.
* **Salas Dinámicas:** Los usuarios pueden unirse a cualquier sala especificando un `roomId` en la URL.
* **Soporte Multimedia Completo:**
    * Envío de **Texto** simple.
    * Envío de **Imágenes** (manejo de `File` y codificación a Base64).
    * Envío de **Audio** (grabación directa desde el navegador y codificación a Base64).
* **Diseño Responsivo:** Interfaz de usuario limpia y moderna, optimizada para dispositivos móviles y de escritorio.
* **Lógica Asíncrona:** Manejo de la carga de archivos multimedia (`FileReader`) para evitar bloqueos durante el envío.

---

## 🛠️ Instalación y Uso

Sigue estos pasos para levantar y ejecutar el proyecto en tu entorno local.

### 1. Requisitos

* Node.js (versión 18 o superior)
* npm o yarn

### 2. Configuración del Backend (Servidor Socket.IO)

⚠️ **Nota:** El código del chat depende de un servidor de Socket.IO que debe estar corriendo. Asumiendo que esta URL es la correcta y el servidor está en línea, solo necesitas configurar el frontend. Si necesitas ejecutar tu propio backend, asegúrate de clonar y configurar el proyecto de Node.js/Express correspondiente.

### 3. Configuración del Frontend (Next.js)

1.  **Clonar el repositorio:**

    ```bash
    git clone https://github.com/kelvinocampo/realtime-chat
    cd realtime-chat
    ```

2.  **Instalar dependencias:**

    ```bash
    npm install
    # o
    yarn install
    ```

3.  **Ejecutar la aplicación:**

    ```bash
    npm run dev
    # o
    yarn dev
    ```

La aplicación estará disponible en `http://localhost:3000` (o el puerto que use Next.js por defecto).

### 4. Modo de Uso

1.  Abre la aplicación en tu navegador.
2.  Serás redirigido a una página de inicio (asumiendo que existe) para seleccionar o introducir un ID de chat.
3.  Ingresa a la URL del chat: `http://localhost:3000/chat/[room-id]`.
    * Ejemplo: `http://localhost:3000/chat/desarrollo-web`
4.  Abre la misma URL en otra pestaña o en otro dispositivo para ver la comunicación en tiempo real.
5.  Utiliza los botones de **Imagen (🖼️)** y **Micrófono (🎙️)** para enviar contenido multimedia junto con o sin texto.

### Anexos
- Repositorio Backend [https://github.com/juanangel89/backend_chat](https://github.com/juanangel89/backend_chat)