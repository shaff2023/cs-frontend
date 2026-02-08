import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import io from 'socket.io-client';
import { getSocketUrl, getBaseUrl } from '../config/env';
import './AdminDashboard.css';

const socket = io(getSocketUrl());

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [stats, setStats] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    adminId: ''
  });
  const [statsCollapsed, setStatsCollapsed] = useState(true);
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [typingName, setTypingName] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadChats();
    loadStats();

    // Socket listeners - use named function to ensure proper cleanup
    const handleNewMessage = (message) => {
      console.log('Admin received new message via socket:', message);
      const messageChatId = parseInt(message.chat_id);

      // Update messages for currently selected chat (detail view)
      if (selectedChat) {
        const currentChatId = parseInt(selectedChat.id);
        if (messageChatId === currentChatId) {
          setMessages((prev) => {
            // Check if message already exists to avoid duplicates (by ID)
            const exists = prev.some((msg) => msg.id === message.id);
            if (exists) {
              console.log('Message already exists in detail view, skipping duplicate');
              return prev;
            }
            console.log('Adding new message to admin detail view');
            return [...prev, message];
          });
        }
      }

      // Update chat list preview (last_message & message_count) in real-time
      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (parseInt(chat.id) === messageChatId) {
            return {
              ...chat,
              last_message: message.content,
              message_count: (chat.message_count || 0) + 1,
            };
          }
          return chat;
        })
      );
    };

    const handleChatUpdated = (data) => {
      loadChats();
      loadStats();
      if (selectedChat && (data.chatId === selectedChat.id || data.chatId === parseInt(selectedChat.id))) {
        loadChatDetails(selectedChat.id);
      }
    };

    const handleTyping = (data) => {
      if (selectedChat && (data.chatId === selectedChat.id || data.chatId === parseInt(selectedChat.id))) {
        setIsTyping(data.isTyping);
        setTypingName(data.isTyping ? data.senderName : null);
      }
    };

    // Register listeners
    socket.on('new-message', handleNewMessage);
    socket.on('chat-updated', handleChatUpdated);
    socket.on('typing', handleTyping);

    // Cleanup: remove listeners when component unmounts or selectedChat changes
    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('chat-updated', handleChatUpdated);
      socket.off('typing', handleTyping);
    };
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChats = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      if (filters.adminId) params.append('adminId', filters.adminId);

      const response = await api.get(`/chats/admin/all?${params.toString()}`);
      setChats(response.data);
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/chats/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadChatDetails = async (chatId) => {
    try {
      const [chatResponse, messagesResponse] = await Promise.all([
        api.get(`/chats/admin/all`).then(res => res.data.find(c => c.id === chatId)),
        api.get(`/messages/chat/${chatId}`)
      ]);

      setSelectedChat(chatResponse);
      setMessages(messagesResponse.data);
      socket.emit('join-chat', chatId);
    } catch (error) {
      console.error('Error loading chat details:', error);
    }
  };

  const selectChat = (chat) => {
    setSelectedChat(chat);
    loadChatDetails(chat.id);
  };

  const claimChat = async (chatId) => {
    try {
      await api.post(`/chats/${chatId}/claim`);
      // Don't emit socket here - the API route already handles socket broadcast
      loadChats();
      if (selectedChat && selectedChat.id === chatId) {
        loadChatDetails(chatId);
      }
    } catch (error) {
      console.error('Error claiming chat:', error);
    }
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
    if ((!newMessage.trim() && !selectedImage) || !selectedChat) return;

    const messageContent = newMessage.trim();
    console.log('Admin sending message:', { chatId: selectedChat.id, content: messageContent, hasImage: !!selectedImage });

    try {
      const formData = new FormData();
      formData.append('chatId', selectedChat.id);
      if (messageContent) {
        formData.append('content', messageContent);
      }
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      const response = await api.post('/messages/admin', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Admin message sent successfully:', response.data);
      
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

  const closeChat = async () => {
    if (!selectedChat) return;
    try {
      await api.post(`/chats/${selectedChat.id}/close`);
      socket.emit('update-chat-status', {
        chatId: selectedChat.id,
        status: 'closed'
      });
      loadChats();
      loadStats();
    } catch (error) {
      console.error('Error closing chat:', error);
    }
  };

  const solveChat = async () => {
    if (!selectedChat) return;
    try {
      await api.post(`/chats/${selectedChat.id}/solve`);
      socket.emit('update-chat-status', {
        chatId: selectedChat.id,
        status: 'solved'
      });
      loadChats();
      loadStats();
    } catch (error) {
      console.error('Error solving chat:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadChats();
  }, [filters]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#ff9800';
      case 'claimed': return '#2196f3';
      case 'closed': return '#9e9e9e';
      case 'solved': return '#4caf50';
      default: return '#666';
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>RUNTERA Admin Dashboard</h1>
        <div className="header-info">
          <span>Welcome, {user?.name}</span>
          <button onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="admin-stats-container">
        <div className="stats-header" onClick={() => setStatsCollapsed(!statsCollapsed)}>
          <h2>Statistik Admin</h2>
          <span className="collapse-icon">{statsCollapsed ? '▼' : '▲'}</span>
        </div>
        {!statsCollapsed && (
          <div className="admin-stats">
            {stats.map((stat) => (
              <div key={stat.id} className="stat-card">
                <h3>{stat.name}</h3>
                <div className="stat-numbers">
                  <div>
                    <span className="stat-label">Solved:</span>
                    <span className="stat-value">{stat.solved_count || 0}</span>
                  </div>
                  <div>
                    <span className="stat-label">Closed:</span>
                    <span className="stat-value">{stat.closed_count || 0}</span>
                  </div>
                  <div>
                    <span className="stat-label">Active:</span>
                    <span className="stat-value">{stat.active_count || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="admin-main">
        <div className="admin-sidebar">
          <div className="filters-container">
            <div className="filters-header" onClick={() => setFiltersCollapsed(!filtersCollapsed)}>
              <h3>Filters</h3>
              <span className="collapse-icon">{filtersCollapsed ? '▼' : '▲'}</span>
            </div>
            {!filtersCollapsed && (
              <div className="filters">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">All Status</option>
                  <option value="open">Open</option>
                  <option value="claimed">Claimed</option>
                  <option value="closed">Closed</option>
                  <option value="solved">Solved</option>
                </select>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                >
                  <option value="">All Categories</option>
                  <option value="racepack">Racepack</option>
                  <option value="akun">Akun</option>
                  <option value="event">Event</option>
                  <option value="pembayaran">Pembayaran</option>
                  <option value="others">Others</option>
                </select>
                <select
                  value={filters.adminId}
                  onChange={(e) => setFilters({ ...filters, adminId: e.target.value })}
                >
                  <option value="">All Admins</option>
                  {stats.map((stat) => (
                    <option key={stat.id} value={stat.id}>
                      {stat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="chat-list">
            <h3>Chats ({chats.length})</h3>
            <div className="chats">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`chat-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
                  onClick={() => selectChat(chat)}
                >
                  <div className="chat-item-header">
                    <span
                      className="status-indicator"
                      style={{ backgroundColor: getStatusColor(chat.status) }}
                    />
                    <div className="chat-info">
                      <div className="chat-meta">
                        <span className="category">{chat.category}</span>
                        <span className="status">{chat.status}</span>
                      </div>
                      {chat.user_name && (
                        <div className="user-name">{chat.user_name}</div>
                      )}
                      {chat.admin_name && (
                        <div className="admin-name">Handled by: {chat.admin_name}</div>
                      )}
                    </div>
                  </div>
                  <div className="last-message">{chat.last_message || 'No messages'}</div>
                  {chat.status === 'open' && (
                    <button
                      className="claim-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        claimChat(chat.id);
                      }}
                    >
                      Claim
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="admin-chat-area">
          {selectedChat ? (
            <>
              <button 
                className="back-to-list-btn"
                onClick={() => setSelectedChat(null)}
                title="Kembali ke daftar chat"
              >
                ← Kembali
              </button>
              <div className="chat-header-info">
                <div>
                  <h3>
                    {selectedChat.user_name || 'Guest'} - {selectedChat.category}
                  </h3>
                  <p>Status: <span style={{ color: getStatusColor(selectedChat.status) }}>
                    {selectedChat.status}
                  </span></p>
                  {selectedChat.claimed_by && selectedChat.claimed_by !== user.id && (
                    <p>Handled by: {selectedChat.admin_name}</p>
                  )}
                </div>
                {selectedChat.claimed_by === user.id && 
                 selectedChat.status !== 'closed' && 
                 selectedChat.status !== 'solved' && (
                  <div className="chat-actions">
                    <button onClick={solveChat} className="solve-btn">
                      Mark as Solved
                    </button>
                    <button onClick={closeChat} className="close-btn">
                      Close Chat
                    </button>
                  </div>
                )}
                {selectedChat.status === 'open' && (
                  <button onClick={() => claimChat(selectedChat.id)} className="claim-btn-large">
                    Claim This Chat
                  </button>
                )}
              </div>

              <div className="messages-container">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`message ${
                      msg.sender_type === 'admin' ? 'admin-message' :
                      msg.sender_type === 'user' ? 'user-message' :
                      'system-message'
                    }`}
                  >
                    <div className="message-header">
                      <strong>{msg.sender_name}</strong>
                      <span className="message-time">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="message-content">
                      {msg.file_path && (
                        <div className="message-image">
                          <img 
                            src={`${getBaseUrl()}${msg.file_path}`} 
                            alt={msg.file_name || 'Uploaded image'}
                            onClick={() => window.open(`${getBaseUrl()}${msg.file_path}`, '_blank')}
                          />
                          {msg.file_name && (
                            <div className="image-name">
                              {msg.file_name}
                              <a 
                                href={`${getBaseUrl()}${msg.file_path}`} 
                                download={msg.file_name}
                                className="download-link"
                              >
                                📥 Download
                              </a>
                            </div>
                          )}
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

              {selectedChat.claimed_by === user.id &&
               selectedChat.status !== 'closed' &&
               selectedChat.status !== 'solved' && (
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
                      id="admin-image-upload"
                    />
                    <label htmlFor="admin-image-upload" className="upload-btn" title="Upload gambar">
                      📷
                    </label>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Ketik balasan..."
                    />
                    <button type="submit">Kirim</button>
                  </form>
                </>
              )}
            </>
          ) : (
            <div className="no-chat-selected">
              <p>Pilih chat untuk melihat percakapan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
