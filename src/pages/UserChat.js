import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import io from 'socket.io-client';
import { soundManager } from '../utils/sounds';
import './UserChat.css';

const socket = io('http://localhost:5000');

const UserChat = () => {
  const { user, logout } = useAuth();
  const [chatId, setChatId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [category, setCategory] = useState('others');
  const [chatHistory, setChatHistory] = useState([]);
  const [showCategory, setShowCategory] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [chatStatus, setChatStatus] = useState(null);
  const [adminOnline, setAdminOnline] = useState(false);
  const [adminName, setAdminName] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingName, setTypingName] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Load chat history if user is logged in
    if (user) {
      loadChatHistory();
    } else {
      // Generate session ID for guest
      const guestSessionId = localStorage.getItem('guestSessionId') || generateSessionId();
      localStorage.setItem('guestSessionId', guestSessionId);
      setSessionId(guestSessionId);
    }
    // Load categories
    loadCategories();
  }, [user]);

  const loadCategories = async () => {
    try {
      const response = await api.get('/categories/active');
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
      // Fallback to default categories
      setCategories([
        { name: 'racepack', display_name: 'Racepack' },
        { name: 'akun', display_name: 'Akun' },
        { name: 'event', display_name: 'Event' },
        { name: 'pembayaran', display_name: 'Pembayaran' },
        { name: 'others', display_name: 'Lainnya' }
      ]);
    }
  };

  useEffect(() => {
    if (!chatId) return;

    // Socket listeners - use named function to ensure proper cleanup
    const handleNewMessage = (message) => {
      console.log('Received new message via socket:', message);
      const messageChatId = parseInt(message.chat_id);
      const currentChatId = parseInt(chatId);
      
      if (messageChatId === currentChatId) {
        setMessages((prev) => {
          // Check if message already exists to avoid duplicates (by ID)
          const exists = prev.some(msg => msg.id === message.id);
          if (exists) {
            console.log('Message already exists, skipping duplicate');
            return prev;
          }
          console.log('Adding new message to state');
          
          // Play receive sound if message is from admin or system
          if (message.sender_type === 'admin' || message.sender_type === 'system') {
            soundManager.playReceiveSound();
          }
          
          // Update admin online status if message from admin or Admin Runtera
          if ((message.sender_type === 'admin' || message.sender_name === 'Runtera') && message.sender_name) {
            setAdminOnline(true);
            setAdminName(message.sender_name);
          }
          
          return [...prev, message];
        });
      }
    };

    const handleAdminStatus = (data) => {
      if (data.chatId === chatId || data.chatId === parseInt(chatId)) {
        if (data.adminName) {
          setAdminOnline(true);
          setAdminName(data.adminName);
        }
      }
    };

    const handleChatUpdated = (data) => {
      if (data.chatId === chatId || data.chatId === parseInt(chatId)) {
        loadMessages();
        updateChatStatus();
      }
    };

    const handleTyping = (data) => {
      const dataChatId = parseInt(data.chatId);
      const currentChatId = parseInt(chatId);
      
      if (dataChatId === currentChatId) {
        setIsTyping(data.isTyping);
        setTypingName(data.isTyping ? data.senderName : null);
      }
    };

    // Register listeners
    socket.on('new-message', handleNewMessage);
    socket.on('chat-updated', handleChatUpdated);
    socket.on('admin-status', handleAdminStatus);
    socket.on('typing', handleTyping);

    // Check admin status when chat is opened
    checkAdminStatus();

    // Cleanup: remove listeners when component unmounts or chatId changes
    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('chat-updated', handleChatUpdated);
      socket.off('admin-status', handleAdminStatus);
      socket.off('typing', handleTyping);
    };
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateSessionId = () => {
    return 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  const loadChatHistory = async () => {
    try {
      const response = await api.get('/chats/history');
      setChatHistory(response.data);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const loadMessages = async () => {
    if (!chatId) return;
    try {
      const response = await api.get(`/messages/chat/${chatId}`);
      setMessages(response.data);
      
      // Check if Admin Runtera or admin has sent messages
      const adminRunteraMsg = response.data.find(msg => msg.sender_name === 'Admin Runtera');
      const adminMessage = response.data.find(msg => msg.sender_type === 'admin');
      
      if (adminRunteraMsg) {
        setAdminOnline(true);
        setAdminName('Admin Runtera');
      } else if (adminMessage && adminMessage.sender_name) {
        setAdminOnline(true);
        setAdminName(adminMessage.sender_name);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const checkAdminStatus = async () => {
    if (!chatId) return;
    try {
      // Check messages for Admin Runtera or claimed admin
      const messagesResponse = await api.get(`/messages/chat/${chatId}`);
      const adminRunteraMsg = messagesResponse.data.find(msg => msg.sender_name === 'Admin Runtera');
      const adminMsg = messagesResponse.data.find(msg => msg.sender_type === 'admin');
      
      if (adminRunteraMsg) {
        setAdminOnline(true);
        setAdminName('Runtera');
      } else if (adminMsg) {
        setAdminOnline(true);
        setAdminName(adminMsg.sender_name);
      }
      
      // Also check from chat data
      if (user) {
        const chatResponse = await api.get('/chats/history');
        const currentChat = chatResponse.data.find(c => c.id === chatId);
        if (currentChat?.admin_name) {
          setAdminOnline(true);
          setAdminName(currentChat.admin_name);
        }
      } else if (sessionId) {
        const response = await api.get(`/chats/session/${sessionId}`);
        if (response.data?.admin_name) {
          setAdminOnline(true);
          setAdminName(response.data.admin_name);
        }
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const createChat = async (selectedCategory) => {
    try {
      let response;
      if (user) {
        response = await api.post('/chats', { category: selectedCategory });
      } else {
        response = await api.post('/chats/guest', { category: selectedCategory });
        setSessionId(response.data.sessionId);
      }
      setChatId(response.data.chatId);
      setShowCategory(false);
      socket.emit('join-chat', response.data.chatId);
      loadMessages();
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const selectChat = async (id) => {
    setChatId(id);
    setShowCategory(false);
    socket.emit('join-chat', id);
    loadMessages();
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran file maksimal 5MB');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !chatId) {
      console.log('Message and image empty or no chatId:', { newMessage, selectedImage, chatId });
      return;
    }

    const messageContent = newMessage.trim();
    console.log('Sending message:', { chatId, content: messageContent, hasImage: !!selectedImage, user: !!user, sessionId });

    // Play send sound
    soundManager.playSendSound();

    try {
      const formData = new FormData();
      formData.append('chatId', chatId);
      if (messageContent) {
        formData.append('content', messageContent);
      }
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      let response;
      if (user) {
        response = await api.post('/messages', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        formData.append('sessionId', sessionId);
        response = await api.post('/messages/guest', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }
      console.log('Message sent successfully:', response.data);
      
      // Don't add to state here - let socket.io handle it to avoid duplicates
      // The backend will broadcast the message via socket.io
      
      setNewMessage('');
      setSelectedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Gagal mengirim pesan. Silakan coba lagi.');
    }
  };

  const submitFeedback = async () => {
    try {
      const payload = { rating, comment };
      if (!user && sessionId) {
        payload.sessionId = sessionId;
      }
      await api.post(`/feedback/${chatId}`, payload);
      setShowFeedback(false);
      alert('Terima kasih atas feedback Anda!');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Gagal mengirim feedback. Silakan coba lagi.');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const updateChatStatus = async () => {
    if (!chatId) return;
    try {
      if (user) {
        const chat = chatHistory.find(c => c.id === chatId);
        setChatStatus(chat?.status);
      } else if (sessionId) {
        const response = await api.get(`/chats/session/${sessionId}`);
        setChatStatus(response.data?.status);
      }
    } catch (error) {
      console.error('Error getting chat status:', error);
    }
  };

  useEffect(() => {
    if (chatId) {
      updateChatStatus();
    }
  }, [chatId, chatHistory, sessionId]);

  const backToHome = () => {
    setChatId(null);
    setShowCategory(true);
    setMessages([]);
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="user-chat-container">
      <div className="chat-header">
        <div className="header-left">
          <h1>RUNTERA Customer Service</h1>
          {adminOnline && adminName && (
            <div className="admin-status-indicator">
              <span className="status-dot online"></span>
              <span className="admin-status-text">Admin {adminName} sedang online</span>
            </div>
          )}
        </div>
        <div className="header-actions">
          {chatId && (
            <button onClick={backToHome} className="back-home-btn" title="Kembali ke halaman utama">
              ← Kembali
            </button>
          )}
          {user ? (
            <>
              <span>Welcome, {user.name}</span>
              <button onClick={logout}>Logout</button>
            </>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </div>

      <div className="chat-main">
        {user && chatHistory.length > 0 && (
          <div className="chat-sidebar">
            <h3>Chat History</h3>
            <div className="chat-list">
              {chatHistory.map((chat) => (
                <div
                  key={chat.id}
                  className={`chat-item ${chat.id === chatId ? 'active' : ''}`}
                  onClick={() => selectChat(chat.id)}
                >
                  <div className="chat-item-header">
                    <span className="category-badge">{chat.category}</span>
                    <span className="status-badge">{chat.status}</span>
                  </div>
                  <p className="last-message">{chat.last_message || 'No messages'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="chat-area">
          {showCategory ? (
            <div className="category-selection">
              <h2>Pilih Kategori Pertanyaan</h2>
              <div className="category-grid">
                {categories.map((cat) => (
                  <button key={cat.name} onClick={() => createChat(cat.name)}>
                    {cat.display_name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="messages-container">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`message ${msg.sender_type === 'user' ? 'user-message' : msg.sender_type === 'admin' ? 'admin-message' : 'system-message'}`}
                  >
                    <div className="message-header">
                      <strong>{msg.sender_name}</strong>
                      <span className="message-time">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="message-content">
                      {msg.file_path && (
                        <div className="message-image">
                          <img 
                            src={`http://localhost:5000${msg.file_path}`} 
                            alt={msg.file_name || 'Uploaded image'}
                            onClick={() => window.open(`http://localhost:5000${msg.file_path}`, '_blank')}
                          />
                          {msg.file_name && <div className="image-name">{msg.file_name}</div>}
                        </div>
                      )}
                      {msg.content && <div>{msg.content}</div>}
                    </div>
                  </div>
                ))}
                {isTyping && typingName && (
                  <div className="message typing-indicator">
                    <div className="message-header">
                      <strong>{typingName}</strong>
                    </div>
                    <div className="message-content typing-content">
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {(chatStatus === 'solved' || chatStatus === 'closed') ? (
                <div className="feedback-section">
                  {!showFeedback ? (
                    <button onClick={() => setShowFeedback(true)}>
                      Berikan Feedback
                    </button>
                  ) : (
                    <div className="feedback-form">
                      <h3>Feedback</h3>
                      <div className="rating">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={star <= rating ? 'star filled' : 'star'}
                            onClick={() => setRating(star)}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <textarea
                        placeholder="Komentar (opsional)"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                      <button onClick={submitFeedback}>Submit Feedback</button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {imagePreview && (
                    <div className="image-preview-container">
                      <div className="image-preview">
                        <img src={imagePreview} alt="Preview" />
                        <button type="button" onClick={removeImage} className="remove-image-btn">×</button>
                      </div>
                    </div>
                  )}
                  <form className="message-input" onSubmit={sendMessage}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      style={{ display: 'none' }}
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="upload-btn" title="Upload gambar">
                      📷
                    </label>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Ketik pesan Anda..."
                    />
                    <button type="submit">Kirim</button>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserChat;
