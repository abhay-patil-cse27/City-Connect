import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Send, 
  X, 
  Search, 
  MoreVertical,
  Paperclip,
  Smile,
  Image as ImageIcon,
  File,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Laugh,
  Angry,
  Loader2,
  Plus,
  UserPlus
} from 'lucide-react';
import { useChats, useChatMessages, useSendMessage, useMarkChatAsRead, subscribeToChatMessages, useUpdateTypingStatus, useAddMessageReaction, useRemoveMessageReaction, useCreateChat } from '../services/chatService';
import { useAuth } from '../contexts/AuthContext';
import { useUsers } from '../services/userService';
import { useTheme } from '../contexts/ThemeContext';
import debounce from 'lodash/debounce';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useParams } from 'react-router-dom';

const REACTIONS = {
  thumbsUp: ThumbsUp,
  thumbsDown: ThumbsDown,
  heart: Heart,
  laugh: Laugh,
  angry: Angry
};

const Chat = ({ projectId }) => {
  const { id: chatId } = useParams();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showChatList, setShowChatList] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const messagesEndRef = useRef(null);
  
  const { data: chats = [], isLoading: isLoadingChats } = useChats(user.uid);
  const { data: messages = [], isLoading: isLoadingMessages } = useChatMessages(selectedChat?.id);
  const { data: users = [], isLoading: isLoadingUsers } = useUsers();
  const sendMessage = useSendMessage();
  const markChatAsRead = useMarkChatAsRead();
  const updateTypingStatus = useUpdateTypingStatus();
  const addMessageReaction = useAddMessageReaction();
  const removeMessageReaction = useRemoveMessageReaction();
  const createChat = useCreateChat();

  useEffect(() => {
    if (chatId) {
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        setSelectedChat(chat);
      }
    }
  }, [chatId, chats]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Remove the separate subscription effect since it's now handled in the hooks
  useEffect(() => {
    if (!selectedChat?.id) return;
    markChatAsRead.mutate({ chatId: selectedChat.id, userId: user.uid });
  }, [selectedChat?.id, user.uid]);

  // Handle typing status
  const debouncedUpdateTypingStatus = debounce((isTyping) => {
    if (selectedChat?.id) {
      updateTypingStatus.mutate({
        chatId: selectedChat.id,
        userId: user.uid,
        isTyping
      });
    }
  }, 500);

  useEffect(() => {
    if (messageInput.trim()) {
      setIsTyping(true);
      debouncedUpdateTypingStatus(true);
    } else {
      setIsTyping(false);
      debouncedUpdateTypingStatus(false);
    }
  }, [messageInput]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() && !selectedFile || !selectedChat) return;

    try {
      await sendMessage.mutateAsync({
        chatId: selectedChat.id,
        messageData: {
          senderId: user.uid,
          content: messageInput.trim(),
          type: selectedFile ? 'file' : 'text',
          file: selectedFile
        }
      });
      setMessageInput('');
      setSelectedFile(null);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleReaction = async (messageId, reaction) => {
    try {
      const message = messages.find(m => m.id === messageId);
      const hasReacted = message.reactions?.[user.uid] === reaction;

      if (hasReacted) {
        await removeMessageReaction.mutateAsync({
          chatId: selectedChat.id,
          messageId,
          userId: user.uid
        });
      } else {
        await addMessageReaction.mutateAsync({
          chatId: selectedChat.id,
          messageId,
          userId: user.uid,
          reaction
        });
      }
      setShowReactionPicker(null);
    } catch (error) {
      console.error('Error updating reaction:', error);
    }
  };

  const handleEmojiSelect = (emoji) => {
    setMessageInput(prev => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  const handleStartNewChat = async (userId) => {
    try {
      // Check if chat already exists
      const existingChat = chats.find(chat => 
        chat.participants.includes(userId) && 
        chat.participants.length === 2
      );

      if (existingChat) {
        setSelectedChat(existingChat);
        setShowNewChatModal(false);
        return;
      }

      // Create new chat
      const newChat = await createChat.mutateAsync({
        participants: [user.uid, userId],
        type: 'direct',
        name: getParticipantName(userId),
        description: `Direct chat with ${getParticipantName(userId)}`,
        projectId: projectId || null // Make projectId optional
      });

      setSelectedChat(newChat);
      setShowNewChatModal(false);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const filteredChats = chats.filter(chat => 
    chat.participants.some(participant => 
      participant.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const getParticipantName = (participantId) => {
    const participant = users.find(u => u.id === participantId);
    return participant?.name || 'Unknown User';
  };

  const getParticipantAvatar = (participantId) => {
    const participant = users.find(u => u.id === participantId);
    return participant?.avatar || `https://ui-avatars.com/api/?name=${getParticipantName(participantId)}`;
  };

  if (isLoadingChats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className={`flex h-full ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'} rounded-2xl border overflow-hidden`}>
      {/* Chat List */}
      <AnimatePresence>
        {showChatList && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 320 }}
            exit={{ width: 0 }}
            className={`${isDark ? 'border-slate-700' : 'border-gray-200'} border-r flex flex-col`}
          >
            <div className={`p-4 ${isDark ? 'border-slate-700' : 'border-gray-200'} border-b`}>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <UserPlus size={18} />
                  New Chat
                </button>
              </div>
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} size={18} />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-xl ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'} border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm`}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar-thumb-indigo-500 scrollbar-track-transparent hover:scrollbar-thumb-indigo-600 dark:scrollbar-thumb-indigo-400 dark:hover:scrollbar-thumb-indigo-300 scrollbar-thumb-opacity-50 hover:scrollbar-thumb-opacity-100 transition-all duration-300">
              {filteredChats.map((chat) => {
                const otherParticipant = chat.participants.find(p => p !== user.uid);
                const participantName = getParticipantName(otherParticipant);
                const participantAvatar = getParticipantAvatar(otherParticipant);
                const isTyping = chat.typingUsers?.[otherParticipant];

                return (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={`w-full p-4 text-left transition-colors ${
                      selectedChat?.id === chat.id 
                        ? isDark ? 'bg-slate-800' : 'bg-indigo-50'
                        : isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={participantAvatar}
                          alt={participantName}
                          className="w-10 h-10 rounded-full"
                        />
                        {isTyping && (
                          <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{participantName}</h3>
                          {chat.lastMessageTime?.toDate && (
                            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {new Date(chat.lastMessageTime.toDate()).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} truncate`}>
                          {isTyping ? (
                            <span className="text-indigo-400">Typing...</span>
                          ) : (
                            chat.lastMessage || 'No messages yet'
                          )}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className={`p-4 ${isDark ? 'border-slate-700' : 'border-gray-200'} border-b flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowChatList(!showChatList)}
                  className={`lg:hidden p-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'} rounded-lg`}
                >
                  <MessageSquare size={20} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
                </button>
                <div className="flex items-center gap-3">
                  <img
                    src={getParticipantAvatar(selectedChat.participants.find(p => p !== user.uid))}
                    alt={getParticipantName(selectedChat.participants.find(p => p !== user.uid))}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <h2 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {getParticipantName(selectedChat.participants.find(p => p !== user.uid))}
                    </h2>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {selectedChat.typingUsers?.[selectedChat.participants.find(p => p !== user.uid)]
                        ? 'Typing...'
                        : 'Online'}
                    </p>
                  </div>
                </div>
              </div>
              <button className={`p-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'} rounded-lg`}>
                <MoreVertical size={20} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar-thumb-indigo-500 scrollbar-track-transparent hover:scrollbar-thumb-indigo-600 dark:scrollbar-thumb-indigo-400 dark:hover:scrollbar-thumb-indigo-300 scrollbar-thumb-opacity-50 hover:scrollbar-thumb-opacity-100 transition-all duration-300">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              ) : (
                messages.map((message) => {
                  const isOwnMessage = message.senderId === user.uid;
                  const sender = users.find(u => u.id === message.senderId);
                  const senderName = sender?.name || 'Unknown User';
                  const senderAvatar = sender?.avatar || `https://ui-avatars.com/api/?name=${senderName}`;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
                    >
                      <div className="flex items-end gap-3 max-w-[85%]">
                        {!isOwnMessage && (
                          <div className="flex-shrink-0">
                            <img
                              src={senderAvatar}
                              alt={senderName}
                              className="w-8 h-8 rounded-full ring-2 ring-offset-2 ring-indigo-500/20"
                            />
                          </div>
                        )}
                        <div className="relative group">
                          <div
                            className={`rounded-2xl px-4 py-3 shadow-sm ${
                              isOwnMessage
                                ? 'bg-indigo-600 text-white rounded-br-none'
                                : isDark 
                                  ? 'bg-slate-800 text-white rounded-bl-none' 
                                  : 'bg-gray-100 text-gray-900 rounded-bl-none'
                            }`}
                          >
                            {message.type === 'file' ? (
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-white/10'}`}>
                                  <File size={20} className={isOwnMessage ? 'text-white' : isDark ? 'text-gray-300' : 'text-gray-600'} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <a
                                    href={message.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`block truncate hover:underline ${isOwnMessage ? 'text-white' : isDark ? 'text-gray-300' : 'text-gray-600'}`}
                                  >
                                    {message.content}
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <span className={`text-xs ${isOwnMessage ? 'text-white/70' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {message.createdAt?.toDate ? new Date(message.createdAt.toDate()).toLocaleTimeString() : 'Just now'}
                              </span>
                              {isOwnMessage && (
                                <span className="text-xs text-white/70 ml-2">
                                  {message.read ? 'Read' : 'Sent'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {isOwnMessage && (
                          <div className="flex-shrink-0">
                            <img
                              src={senderAvatar}
                              alt={senderName}
                              className="w-8 h-8 rounded-full ring-2 ring-offset-2 ring-indigo-500/20"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className={`p-4 ${isDark ? 'border-slate-700' : 'border-gray-200'} border-t`}>
              <div className="flex items-center gap-2">
                <label className={`p-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'} rounded-lg ${isDark ? 'text-gray-400' : 'text-gray-500'} cursor-pointer`}>
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Paperclip size={20} />
                </label>
                <label className={`p-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'} rounded-lg ${isDark ? 'text-gray-400' : 'text-gray-500'} cursor-pointer`}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <ImageIcon size={20} />
                </label>
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  className={`flex-1 px-4 py-2 rounded-xl ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'} border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none`}
                />
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'} rounded-lg ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  <Smile size={20} />
                </button>
                <button
                  type="submit"
                  className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>
              {selectedFile && (
                <div className={`mt-2 flex items-center gap-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <File size={16} />
                  <span>{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="ml-auto text-red-500 hover:text-red-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </form>

            {/* Emoji Picker */}
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className={`absolute bottom-full left-0 right-0 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-lg shadow-lg p-4`}
                >
                  <Picker
                    data={data}
                    onEmojiSelect={handleEmojiSelect}
                    theme={isDark ? "dark" : "light"}
                    previewPosition="none"
                    skinTonePosition="none"
                    searchPosition="none"
                    navPosition="none"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reaction Picker */}
            <AnimatePresence>
              {showReactionPicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`absolute ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-lg shadow-lg p-2 flex gap-1`}
                >
                  {Object.entries(REACTIONS).map(([key, Icon]) => (
                    <button
                      key={key}
                      onClick={() => handleReaction(showReactionPicker, key)}
                      className={`p-1 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'} rounded-full`}
                    >
                      <Icon size={20} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare size={48} className={`mx-auto mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Select a chat to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChatModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-xl w-full max-w-md p-6`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Start New Chat</h2>
                <button
                  onClick={() => setShowNewChatModal(false)}
                  className={`p-2 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'} rounded-lg`}
                >
                  <X size={20} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
                </button>
              </div>

              <div className="space-y-4">
                {users
                  .filter(u => u.id !== user.uid)
                  .map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleStartNewChat(user.id)}
                      className={`w-full flex items-center gap-3 p-3 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50'} rounded-lg transition-colors`}
                    >
                      <img
                        src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`}
                        alt={user.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="text-left">
                        <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{user.name}</h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{user.email}</p>
                      </div>
                    </button>
                  ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chat;