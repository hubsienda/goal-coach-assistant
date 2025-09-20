// pages/index.js
import { useState, useRef, useEffect } from 'react';
import { Send, User, Plus, Menu, X, MessageSquare, Trash2, Crown, HelpCircle, Target } from 'lucide-react';
import EmailCaptureModal from '../components/EmailCaptureModal';
import HelpModal from '../components/HelpModal';
import GoalTemplatesModal from '../components/GoalTemplatesModal';
import { useUsageTracking } from '../hooks/useUsageTracking';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userContext, setUserContext] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const messagesEndRef = useRef(null);

  // Usage tracking
  const { 
    usage, 
    showEmailModal, 
    setShowEmailModal, 
    trackGoalCreation, 
    handleEmailModalSubmit 
  } = useUsageTracking();

  // Load chat sessions from localStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('goalverse_sessions');
    if (savedSessions) {
      const sessions = JSON.parse(savedSessions);
      setChatSessions(sessions);
    }
  }, []);

  // Save chat sessions to localStorage whenever they change
  useEffect(() => {
    if (chatSessions.length > 0) {
      localStorage.setItem('goalverse_sessions', JSON.stringify(chatSessions));
    }
  }, [chatSessions]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createNewChat = async () => {
    // Check usage limits before creating new chat
    const canCreate = await trackGoalCreation();
    if (!canCreate) {
      return; // Usage limit reached, modal will show
    }

    const newSessionId = Date.now().toString();
    const newSession = {
      id: newSessionId,
      title: 'New Goal Session',
      messages: [],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    
    setChatSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSessionId);
    setMessages([]);
    setInput('');
    setUserContext('');
    setSidebarOpen(false);
  };

  const loadChatSession = (sessionId) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      setSidebarOpen(false);
    }
  };

  const updateCurrentSession = (newMessages) => {
    if (currentSessionId) {
      setChatSessions(prev => prev.map(session => 
        session.id === currentSessionId 
          ? { 
              ...session, 
              messages: newMessages,
              lastActivity: new Date().toISOString(),
              title: newMessages.length > 0 ? newMessages[0].content.slice(0, 50) + '...' : 'New Goal Session'
            }
          : session
      ));
    }
  };

  const deleteSession = (sessionId) => {
    setChatSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([]);
    }
  };

  const handleTemplateSelection = async (template) => {
    // Check usage limits before creating template-based session
    const canCreate = await trackGoalCreation();
    if (!canCreate) {
      return; // Usage limit reached, modal will show
    }

    const newSessionId = Date.now().toString();
    const templateMessage = generateTemplateMessage(template);
    
    const newSession = {
      id: newSessionId,
      title: template.title,
      messages: [templateMessage],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      template: template.id
    };
    
    setChatSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSessionId);
    setMessages([templateMessage]);
    setInput('');
    setUserContext('');
    setSidebarOpen(false);
    
    // Auto-send the template message to get AI response
    handleTemplateMessage(templateMessage, newSessionId);
  };

  const generateTemplateMessage = (template) => {
    return {
      role: 'user',
      content: `I want to work on: ${template.title}

Goal: ${template.description}
Timeline: ${template.duration}
Difficulty: ${template.difficulty}

Here's what I want to achieve:
${template.framework.overview}

Key milestones I'm aiming for:
${template.framework.milestones.map((milestone, index) => `${index + 1}. ${milestone}`).join('\n')}

Help me get started with the first specific steps.`,
      template: true
    };
  };

  const handleTemplateMessage = async (templateMessage, sessionId) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [templateMessage],
          userContext,
        }),
      });

      const data = await response.json();
      const aiResponse = { role: 'assistant', content: data.message };
      const finalMessages = [templateMessage, aiResponse];
      
      setMessages(finalMessages);
      updateCurrentSession(finalMessages);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = { 
        role: 'assistant', 
        content: 'I apologize, but I encountered an error. Please try again.' 
      };
      const finalMessages = [templateMessage, errorMessage];
      setMessages(finalMessages);
      updateCurrentSession(finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Create new session if none exists
    if (!currentSessionId) {
      const canCreate = await trackGoalCreation();
      if (!canCreate) return;

      const newSessionId = Date.now().toString();
      const newSession = {
        id: newSessionId,
        title: 'New Goal Session',
        messages: [],
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
      
      setChatSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSessionId);
    }

    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages,
          userContext,
        }),
      });

      const data = await response.json();
      const finalMessages = [...newMessages, { role: 'assistant', content: data.message }];
      setMessages(finalMessages);
      updateCurrentSession(finalMessages);
    } catch (error) {
      console.error('Error:', error);
      const errorMessages = [...newMessages, { 
        role: 'assistant', 
        content: 'I apologize, but I encountered an error. Please try again.' 
      }];
      setMessages(errorMessages);
      updateCurrentSession(errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const conversationStarters = [
    "I want to start a new fitness routine but struggle with consistency",
    "I want to develop a new skill but don't know where to start"
  ];

  // Show upgrade prompt for free users
  const showUpgradePrompt = usage.subscription_status === 'free' && 
    (usage.usage_count >= 2 || usage.daily_goals_count >= 8);

  return (
    <div className="h-screen bg-[#0D1B2A] text-white flex overflow-hidden">
      {/* Modals */}
      <EmailCaptureModal 
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSubmit={handleEmailModalSubmit}
      />

      <HelpModal 
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      <GoalTemplatesModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        onSelectTemplate={handleTemplateSelection}
      />

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-50 w-80 h-full bg-[#0D1B2A] border-r border-gray-700 transition-transform duration-300 ease-in-out flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            {/* GOALVERSE Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#00CFFF] rounded-lg flex items-center justify-center">
                <span className="text-[#0D1B2A] font-bold text-lg">G</span>
              </div>
              <span className="text-[#00CFFF] font-bold text-xl">GOALVERSE</span>
              {usage.subscription_status === 'active' && (
                <Crown className="w-4 h-4 text-[#FFD60A]" />
              )}
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Action Buttons */}
          <div className="space-y-2">
            <button 
              onClick={createNewChat}
              className="w-full bg-[#00CFFF] text-[#0D1B2A] px-4 py-2 rounded-lg font-medium hover:bg-[#00CFFF]/90 transition-colors flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Goal Session</span>
            </button>
            
            <button 
              onClick={() => setShowTemplatesModal(true)}
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
            >
              <Target className="w-4 h-4" />
              <span>Goal Templates</span>
            </button>
          </div>
        </div>

        {/* Usage Status */}
        {usage.subscription_status === 'free' && (
          <div className="px-4 py-3 border-b border-gray-700">
            <div className="text-xs text-gray-400 mb-1">
              Weekly Goals: {usage.usage_count}/3 • Daily: {usage.daily_goals_count}/10
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-[#00CFFF] h-2 rounded-full transition-all"
                style={{ width: `${Math.min((usage.usage_count / 3) * 100, 100)}%` }}
              ></div>
            </div>
            {showUpgradePrompt && (
              <button
                onClick={() => setShowEmailModal(true)}
                className="w-full mt-2 text-xs bg-[#FFD60A] text-[#0D1B2A] py-1 px-2 rounded font-medium hover:bg-[#FFD60A]/90"
              >
                Upgrade to Premium
              </button>
            )}
          </div>
        )}

        {/* Recent Sessions */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Recent Sessions</h3>
          <div className="space-y-2">
            {chatSessions.map((session) => (
              <div key={session.id} className="group flex items-center space-x-2">
                <button
                  onClick={() => loadChatSession(session.id)}
                  className={`flex-1 text-left p-3 rounded-lg transition-colors ${
                    currentSessionId === session.id 
                      ? 'bg-[#00CFFF]/20 text-[#00CFFF]' 
                      : 'hover:bg-gray-800 text-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{session.title}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(session.lastActivity).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => deleteSession(session.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-[#FFD60A] text-sm font-medium">
              GOALVERSE, <span className="text-gray-400">because progress needs direction.</span>
            </span>
            <button
              onClick={() => setShowHelpModal(true)}
              className="text-gray-400 hover:text-[#00CFFF] transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header Bar Only */}
        <div className="lg:hidden bg-[#0D1B2A] border-b border-gray-700 p-4 flex items-center justify-between">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-[#00CFFF] rounded flex items-center justify-center">
              <span className="text-[#0D1B2A] font-bold text-sm">G</span>
            </div>
            <span className="text-[#00CFFF] font-bold">GOALVERSE</span>
          </div>
          <div className="w-5"></div>
        </div>

        {/* Messages Area - Full Height */}
        <div className="flex-1 overflow-y-auto bg-[#0D1B2A]">
          {messages.length === 0 ? (
            /* Welcome Screen */
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              {/* User Context Input */}
              <div className="w-full max-w-2xl mb-8">
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Tell me about yourself (optional - helps me give better advice):
                  </label>
                  <textarea
                    value={userContext}
                    onChange={(e) => setUserContext(e.target.value)}
                    placeholder="e.g., I'm a software developer, working remotely, looking to improve work-life balance and learn new skills..."
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00CFFF] focus:border-transparent text-white placeholder-gray-400"
                    rows={3}
                  />
                </div>
              </div>

              {/* Conversation Starters */}
              <div className="w-full max-w-2xl">
                <h3 className="text-gray-400 text-sm mb-4">Try asking about:</h3>
                <div className="grid gap-3">
                  {conversationStarters.map((starter, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(starter)}
                      className="text-left p-4 bg-gray-800/30 hover:bg-gray-800/50 rounded-lg transition-colors border border-gray-700 hover:border-[#00CFFF]/30"
                    >
                      <span className="text-gray-300">"{starter}"</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Chat Messages */
            <div className="p-4 space-y-6 min-h-full">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-start space-x-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === 'user' 
                        ? 'bg-[#FFD60A] text-[#0D1B2A]' 
                        : 'bg-[#00CFFF] text-[#0D1B2A]'
                    }`}>
                      {message.role === 'user' ? <User className="w-4 h-4" /> : <span className="font-bold text-sm">G</span>}
                    </div>
                    
                    {/* Message Bubble or Goal Card */}
                    {message.type === 'goal-created' ? (
                      <div className="bg-gradient-to-r from-[#00CFFF]/20 to-[#FFD60A]/20 border border-[#00CFFF]/30 rounded-2xl p-4 max-w-md">
                        <div className="flex items-center space-x-2 mb-2">
                          <Plus className="w-5 h-5 text-[#00CFFF]" />
                          <span className="text-[#00CFFF] font-medium text-sm">Goal Created!</span>
                        </div>
                        <div className="text-white text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
                      </div>
                    ) : (
                      <div className={`px-4 py-3 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-[#FFD60A] text-[#0D1B2A] rounded-br-sm'
                          : 'bg-gray-800 text-white rounded-bl-sm'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-[#00CFFF] text-[#0D1B2A] flex items-center justify-center">
                      <span className="font-bold text-sm">G</span>
                    </div>
                    <div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-[#00CFFF] rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-[#00CFFF] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-[#00CFFF] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-[#0D1B2A] border-t border-gray-700 p-4">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="What would you like to work on today?"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00CFFF] focus:border-transparent text-white placeholder-gray-400 resize-none max-h-32"
                  disabled={isLoading}
                  rows={1}
                  style={{ minHeight: '48px' }}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="w-12 h-12 bg-[#00CFFF] text-[#0D1B2A] rounded-full hover:bg-[#00CFFF]/90 focus:outline-none focus:ring-2 focus:ring-[#00CFFF] focus:ring-offset-2 focus:ring-offset-[#0D1B2A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
