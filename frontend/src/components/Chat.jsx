import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaPaperPlane, FaUser } from 'react-icons/fa';
import axios from "axios";
import { io } from "socket.io-client";
import {useAuth} from '../contexts/AuthContext';
const socket = io("http://localhost:3000", {
  transports: ["websocket"], // ✅ Enforce WebSocket transport
  withCredentials: true,
} ); // Connect to backend

const Chat = ({ product, isOpen, onClose }) => {
  const {user} = useAuth();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'system',
      text: 'You are now connected with the supplier.',
      timestamp: new Date()
    }
  ]);

  const handleSend = (e) => {
    e.preventDefault();

    if (message.trim() === "" || !chatId || !userType) {
      console.error("Missing required fields in sendMessage:", { chatId, userType, message });
      return;
    }

    let senderId = "", receiverId= "";
    if (userType === "seller") {
      senderId = sellerId;
      receiverId = buyerId;
    } else {
      senderId = buyerId;
      receiverId = sellerId;
    }
    
    const newMessage = { chatId, senderId, receiverId, role: userType, message };
     
    console.log("message :" , newMessage);
    
    socket.emit("sendMessage", newMessage);

    try {
      const response = axios.post("http://localhost:3000/chat/send-message", newMessage);
      if (response.data.success) {
        // setMessages((prev) => [...prev, response.data.newMessage]);
      } else {
        console.error("Message sending failed:", response.data.error);
      }
    } catch (error) {
      console.error("Error sending message:", error.response?.data || error.message);
    }

    setMessage("");
  };

  if (!isOpen) return null;
  

    // auto scroll to bottom
    // const messagesEndRef = useRef(null);
    // useEffect(() => {
    //   if (messagesEndRef.current) {
    //     messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    //   }
    // }, [messages]);


  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-white rounded-2xl shadow-xl max-w-2xl w-full h-[80vh]"
        >
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <FaUser className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">{product.name}</h3>
                <p className="text-sm text-gray-500">Supplier</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FaTimes />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="h-[calc(80vh-8rem)] overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.userType === 'sender' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.userType === 'buyer'
                      ? 'bg-blue-600 text-white'
                      : msg.userType === 'system'
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-gray-200'
                  }`}
                >
                  <p>{msg.message}</p>

                </div>
              </motion.div>
            ))}
          </div>

          {/* Message Input */}
          <form onSubmit={handleSend} className="p-4 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Type your message..."
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <FaPaperPlane />
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default Chat;