import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, ChevronUp, ChevronDown, Sparkles, HelpCircle, MessageSquare, FileText, Users, Settings, Building2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLocation } from 'react-router-dom';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(import.meta.env.VITE_HUGGINGFACE_API_KEY);

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: 'Hello! I\'m CityServe, your AI assistant for municipal coordination. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const { isDark } = useTheme();
  const location = useLocation();
  const projectId = location.pathname.match(/\/project\/([^\/]+)/)?.[1];
  const isInChat = location.pathname.includes('/chat');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { 
      type: 'user', 
      text: input,
      timestamp: new Date()
    }]);
    const userInput = input;
    setInput('');
    setIsTyping(true);

    try {
      // Prepare context based on whether we're in a project or not
      const context = projectId 
        ? `You are CityServe, an AI assistant for municipal coordination. You are currently helping with a specific project. `
        : `You are CityServe, an AI assistant for municipal coordination. `;

      const response = await hf.textGeneration({
        model: 'mistralai/Mistral-7B-Instruct-v0.2',
        inputs: `${context}${userInput}`,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
          top_p: 0.95,
        }
      });

      let cleanResponse = response.generated_text;
      
      // Clean up the response
      const promptsToRemove = [
        "You are CityServe, an AI assistant for municipal coordination.",
        "You are currently helping with a specific project.",
        userInput
      ];

      promptsToRemove.forEach(prompt => {
        cleanResponse = cleanResponse.replace(prompt, '').trim();
      });

      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: cleanResponse,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: 'I apologize, but I encountered an error. Please try again or rephrase your question.',
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const quickActions = projectId ? [
    { icon: Building2, label: 'Project Info', query: 'Tell me about this project' },
    { icon: Users, label: 'Team', query: 'Who is working on this project?' },
    { icon: FileText, label: 'Tasks', query: 'What are the current tasks?' },
    { icon: MessageSquare, label: 'Updates', query: 'What are the recent project updates?' },
    { icon: Settings, label: 'Settings', query: 'How can I manage this project?' }
  ] : [
    { icon: HelpCircle, label: 'Help Guide', query: 'help guide' },
    { icon: MessageSquare, label: 'Chat Help', query: 'chat help' },
    { icon: FileText, label: 'Projects', query: 'project management' },
    { icon: Users, label: 'Departments', query: 'department management' },
    { icon: Settings, label: 'Settings', query: 'settings help' }
  ];

  return (
    <div className={`fixed bottom-4 ${isInChat ? 'left-4' : 'right-4'} z-50`}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 600 }}
            exit={{ opacity: 0, y: 20, height: 0 }}
            className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-2xl w-[400px] overflow-hidden border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">CityServe AI</h3>
                  <p className="text-xs text-blue-100">
                    {projectId ? 'Project Assistant' : 'General Assistant'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <div className="grid grid-cols-5 gap-2">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInput(action.query);
                      handleSubmit({ preventDefault: () => {} });
                    }}
                    className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <action.icon size={20} className="text-blue-600 dark:text-blue-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-300">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="h-[400px] overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-slate-900">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : `${isDark ? 'bg-slate-700' : 'bg-white'} text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-slate-600 shadow-sm`
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{message.text}</p>
                    <span className="text-xs opacity-75 mt-1 block">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className={`${isDark ? 'bg-slate-700' : 'bg-white'} rounded-lg p-3 border border-gray-200 dark:border-slate-600 shadow-sm`}>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className={`p-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={projectId ? "Ask about this project..." : "Ask me anything..."}
                  className={`flex-1 px-4 py-2 rounded-lg border ${
                    isDark 
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  disabled={isTyping}
                />
                <button
                  type="submit"
                  disabled={isTyping || !input.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all"
      >
        {isOpen ? <ChevronDown size={24} /> : <ChevronUp size={24} />}
      </motion.button>
    </div>
  );
};

export default AIAssistant; 