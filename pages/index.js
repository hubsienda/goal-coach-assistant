// pages/index.js
import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Plus, Menu, X, Target, MessageSquare, Trash2, Edit3, Check } from 'lucide-react';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userContext, setUserContext] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [goals, setGoals] = useState([]);
  const [goalCreationStep, setGoalCreationStep] = useState(null);
  const [pendingGoal, setPendingGoal] = useState(null);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const messagesEndRef = useRef(null);

  // Load chat sessions and goals from localStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('goalverse_sessions');
    if (savedSessions) {
      const sessions = JSON.parse(savedSessions);
      setChatSessions(sessions);
    }
    
    const savedGoals = localStorage.getItem('goalverse_goals');
    if (savedGoals) {
      const goals = JSON.parse(savedGoals);
      setGoals(goals);
    }
  }, []);

  // Save chat sessions to localStorage whenever they change
  useEffect(() => {
    if (chatSessions.length > 0) {
      localStorage.setItem('goalverse_sessions', JSON.stringify(chatSessions));
    }
  }, [chatSessions]);

  // Save goals to localStorage whenever they change
  useEffect(() => {
    if (goals.length >= 0) {
      localStorage.setItem('goalverse_goals', JSON.stringify(goals));
    }
  }, [goals]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createNewChat = () => {
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

  const createGoal = (goalData) => {
    const newGoal = {
      id: Date.now().toString(),
      title: goalData.title,
      description: goalData.description,
      specific: goalData.specific,
      measurable: goalData.measurable,
      achievable: goalData.achievable,
      relevant: goalData.relevant,
      timeBound: goalData.timeBound,
      status: 'active',
      progress: 0,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    setGoals(prev => [newGoal, ...prev]);
    return newGoal;
  };

  const detectGoalIntent = (message) => {
    const goalKeywords = [
      'want to', 'goal', 'achieve', 'improve', 'start', 'learn', 'build', 
      'create', 'develop', 'get better at', 'work on', 'focus on'
    ];
    
    return goalKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  };

  const deleteSession = (sessionId) => {
    setChatSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([]);
    }
  };

  const startEditingSession = (sessionId, currentTitle) => {
    setEditingSessionId(sessionId);
    setEditingTitle(currentTitle);
  };

  const saveSessionTitle = () => {
    if (editingTitle.trim() && editingSessionId) {
      setChatSessions(prev => prev.map(session => 
        session.id === editingSessionId 
          ? { ...session, title: editingTitle.trim() }
          : session
      ));
    }
    setEditingSessionId(null);
    setEditingTitle('');
  };

  const cancelEditingSession = () => {
    setEditingSessionId(null);
    setEditingTitle('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!currentSessionId) {
      createNewChat();
    }

    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    
    const isGoalIntent = detectGoalIntent(input);
    
    setInput('');
    setIsLoading(true);

    try {
      let systemPrompt = '';
      
      if (isGoalIntent && !goalCreationStep) {
        setGoalCreationStep('clarifying');
        systemPrompt = `You are a SMART goal creation assistant. The user just expressed a goal intention: "${input}"

Your job is to ask 1-2 SPECIFIC clarifying questions to make this goal SMART (Specific, Measurable, Achievable, Relevant, Time-bound). 

Keep your response under 100 words and focus on the MOST important missing elements. Ask questions like:
- "What specific outcome do you want to achieve?"
- "How will you measure success?"
- "By when do you want to accomplish this?"

Be conversational and encouraging. Don't mention "SMART goals" directly.`;
      } else if (goalCreationStep === 'clarifying') {
        systemPrompt = `Continue helping the user refine their goal based on their response. Ask 1 more specific question if needed, or if you have enough information, confirm the final SMART goal.

If ready to confirm, format like this:
"Perfect! Here's your goal: [Clear, specific goal statement]

Is this correct? Reply 'yes' to create this goal."

Keep responses under 100 words.`;
      } else if (goalCreationStep === 'confirming' || input.toLowerCase().includes('yes')) {
        const goalTitle = pendingGoal || extractGoalFromConversation(newMessages);
        const newGoal = createGoal({
          title: goalTitle,
          description: `Goal created from conversation on ${new Date().toLocaleDateString()}`,
          specific: true,
          measurable: true,
          achievable: true,
          relevant: true,
          timeBound: true
        });
        
        setGoalCreationStep(null);
        setPendingGoal(null);
        
        const successMessage = {
          role: 'assistant',
          content: `🎯 Goal Created Successfully!\n\n"${newGoal.title}"\n\nCreated: ${new Date().toLocaleDateString()}\nStatus: Active\n\nI'll help you break this down into actionable steps. What would you like to focus on first?`,
          type: 'goal-created',
          goalId: newGoal.id
        };
        
        const finalMessages = [...newMessages, successMessage];
        setMessages(finalMessages);
        updateCurrentSession(finalMessages);
        setIsLoading(false);
        return;
      } else {
        systemPrompt = `You are an experienced life and career coach. Provide concise, actionable advice in under 150 words.

Guidelines:
- Be supportive but direct
- Ask 1 follow-up question maximum
- Provide specific, actionable steps
- Keep responses conversational and encouraging

Current goals: ${goals.length > 0 ? goals.map(g => g.title).join(', ') : 'None yet'}
User Context: ${userContext || 'New conversation'}`;
      }

      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages.slice(-5),
          userContext,
          systemPrompt,
          maxTokens: 150
        }),
      });

      const data = await response.json();
      
      if (goalCreationStep === 'clarifying' && data.message.toLowerCase().includes('is this correct')) {
        setGoalCreationStep('confirming');
        setPendingGoal(extractGoalFromMessage(data.message));
      }
      
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

  const extractGoalFromMessage = (message) => {
    const match = message.match(/"([^"]+)"/);
    return match ? match[1] : 'New Goal';
  };

  const extractGoalFromConversation = (messages) => {
    const userMessages = messages.filter(m => m.role === 'user');
    return userMessages.length > 0 ? userMessages[0].content : 'New Goal';
  };

  const quickCommands = [
    { command: '/goal', description: 'Create a new goal' },
    { command: '/fitness', description: 'Create a fitness plan' },
    { command: '/career', description: 'Career development guidance' },
    { command: '/productivity', description: 'Boost your productivity' },
    { command: '/habits', description: 'Build better habits' },
  ];

  const conversationStarters = [
    "I want to start a new fitness routine but struggle with consistency",
    "Help me organize my work projects and set priorities", 
    "I'm feeling stuck in my career and need direction",
    "I want to develop a new skill but don't know where to start"
  ];

  return (
    <div style={{
      height: '100vh',
      backgroundColor: '#0D1B2A',
      color: 'white',
      display: 'flex',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Sidebar */}
      <div style={{
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        position: 'fixed',
        zIndex: 50,
        width: '320px',
        height: '100%',
        backgroundColor: '#0D1B2A',
        borderRight: '1px solid #374151',
        transition: 'transform 0.3s ease-in-out',
        display: 'flex',
        flexDirection: 'column',
        '@media (min-width: 1024px)': {
          transform: 'translateX(0)',
          position: 'relative'
        }
      }}>
        {/* Sidebar Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid #374151' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#00CFFF',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ color: '#0D1B2A', fontWeight: 'bold', fontSize: '18px' }}>G</span>
              </div>
              <span style={{ color: '#00CFFF', fontWeight: 'bold', fontSize: '20px' }}>GOALVERSE</span>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>
          
          <button 
            onClick={createNewChat}
            style={{
              width: '100%',
              backgroundColor: '#00CFFF',
              color: '#0D1B2A',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: '500',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Plus size={16} />
            <span>New Goal Session</span>
          </button>
        </div>

        {/* Goals Section */}
        <div style={{ padding: '16px', borderBottom: '1px solid #374151' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#9CA3AF', marginBottom: '12px' }}>
            Active Goals ({goals.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {goals.slice(0, 3).map((goal) => (
              <div key={goal.id} style={{
                padding: '12px',
                backgroundColor: 'rgba(107, 114, 128, 0.2)',
                borderRadius: '8px',
                border: '1px solid #374151'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#FFD60A',
                    borderRadius: '50%',
                    marginTop: '8px',
                    flexShrink: 0
                  }}></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {goal.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      {new Date(goal.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {goals.length > 3 && (
              <div style={{ textAlign: 'center', padding: '8px', fontSize: '12px', color: '#6B7280' }}>
                +{goals.length - 3} more goals
              </div>
            )}
            {goals.length === 0 && (
              <div style={{ textAlign: 'center', padding: '16px', color: '#6B7280' }}>
                <Target size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <p style={{ fontSize: '12px', margin: '0 0 4px 0' }}>No goals yet</p>
                <p style={{ fontSize: '12px', margin: 0 }}>Try: "I want to..."</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Sessions */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#9CA3AF', marginBottom: '12px' }}>Recent Sessions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {chatSessions.map((session) => (
              <div key={session.id} style={{ position: 'relative' }} className="group">
                {editingSessionId === session.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px' }}>
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveSessionTitle();
                        if (e.key === 'Escape') cancelEditingSession();
                      }}
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        fontSize: '14px',
                        backgroundColor: '#374151',
                        border: '1px solid #4B5563',
                        borderRadius: '4px',
                        color: 'white',
                        outline: 'none'
                      }}
                      autoFocus
                      maxLength={50}
                    />
                    <button
                      onClick={saveSessionTitle}
                      style={{ padding: '4px', color: '#10B981', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={cancelEditingSession}
                      style={{ padding: '4px', color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => loadChatSession(session.id)}
                      style={{
                        flex: 1,
                        textAlign: 'left',
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: currentSessionId === session.id ? 'rgba(0, 207, 255, 0.2)' : 'transparent',
                        color: currentSessionId === session.id ? '#00CFFF' : '#D1D5DB',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (currentSessionId !== session.id) {
                          e.target.style.backgroundColor = '#1F2937';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentSessionId !== session.id) {
                          e.target.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MessageSquare size={16} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {session.title}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>
                            {new Date(session.lastActivity).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </button>
                    
                    <div className="action-buttons" style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      opacity: 0,
                      transition: 'opacity 0.2s'
                    }}>
                      <button
                        onClick={() => startEditingSession(session.id, session.title)}
                        style={{ padding: '4px', color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}
                        title="Rename session"
                        onMouseEnter={(e) => e.target.style.color = '#00CFFF'}
                        onMouseLeave={(e) => e.target.style.color = '#9CA3AF'}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => deleteSession(session.id)}
                        style={{ padding: '4px', color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}
                        title="Delete session"
                        onMouseEnter={(e) => e.target.style.color = '#EF4444'}
                        onMouseLeave={(e) => e.target.style.color = '#9CA3AF'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div style={{ padding: '16px', borderTop: '1px solid #374151', textAlign: 'center' }}>
          <div style={{ color: '#FFD60A', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>GOALVERSE</div>
          <div style={{ color: '#9CA3AF', fontSize: '12px' }}>Because progress needs direction.</div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Bar */}
        <div style={{
          backgroundColor: '#0D1B2A',
          borderBottom: '1px solid #374151',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button 
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
            className="lg-hidden"
          >
            <Menu size={20} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Target size={20} style={{ color: '#00CFFF' }} />
            <h1 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
              {currentSessionId ? 'Goal Coaching Session' : 'Welcome to GOALVERSE'}
            </h1>
          </div>
        </div>

        {/* Messages Area */}
        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#0D1B2A' }}>
          {messages.length === 0 ? (
            /* Welcome Screen */
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px',
              textAlign: 'center'
            }}>
              <div style={{ marginBottom: '32px' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: '#00CFFF',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <span style={{ color: '#0D1B2A', fontWeight: 'bold', fontSize: '32px' }}>G</span>
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#00CFFF', margin: '0 0 8px 0' }}>Welcome to GOALVERSE</h2>
                <p style={{ color: '#9CA3AF', maxWidth: '480px', margin: '0 auto' }}>
                  Your personal AI coach to help you clarify goals, create action plans, and stay motivated on your journey to success.
                </p>
                <p style={{ color: '#FFD60A', fontSize: '14px', marginTop: '8px', fontWeight: '500' }}>Because progress needs direction.</p>
              </div>

              {/* Conversation Starters */}
              <div style={{ width: '100%', maxWidth: '640px' }}>
                <h3 style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '16px' }}>Try asking about:</h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {conversationStarters.map((starter, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(starter)}
                      style={{
                        textAlign: 'left',
                        padding: '16px',
                        backgroundColor: 'rgba(107, 114, 128, 0.1)',
                        borderRadius: '8px',
                        transition: 'background-color 0.2s',
                        border: '1px solid #374151',
                        color: '#D1D5DB',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = 'rgba(107, 114, 128, 0.2)';
                        e.target.style.borderColor = 'rgba(0, 207, 255, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
                        e.target.style.borderColor = '#374151';
                      }}
                    >
                      "{starter}"
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Chat Messages */
            <div style={{ padding: '16px', minHeight: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {messages.map((message, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    maxWidth: '80%',
                    flexDirection: message.role === 'user' ? 'row-reverse' : 'row'
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      backgroundColor: message.role === 'user' ? '#FFD60A' : '#00CFFF',
                      color: '#0D1B2A'
                    }}>
                      {message.role === 'user' ? <User size={16} /> : <span style={{ fontWeight: 'bold', fontSize: '14px' }}>G</span>}
                    </div>
                    
                    {/* Message Bubble or Goal Card */}
                    {message.type === 'goal-created' ? (
                      <div style={{
                        background: 'linear-gradient(to right, rgba(0, 207, 255, 0.2), rgba(255, 214, 10, 0.2))',
                        border: '1px solid rgba(0, 207, 255, 0.3)',
                        borderRadius: '16px',
                        padding: '16px',
                        maxWidth: '400px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <Target size={20} style={{ color: '#00CFFF' }} />
                          <span style={{ color: '#00CFFF', fontWeight: '500', fontSize: '14px' }}>Goal Created!</span>
                        </div>
                        <div style={{ color: 'white', fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{message.content}</div>
                      </div>
                    ) : (
                      <div style={{
                        padding: '12px 16px',
                        borderRadius: '16px',
                        backgroundColor: message.role === 'user' ? '#FFD60A' : '#1F2937',
                        color: message.role === 'user' ? '#0D1B2A' : 'white',
                        borderBottomRightRadius: message.role === 'user' ? '4px' : '16px',
                        borderBottomLeftRadius: message.role === 'user' ? '16px' : '4px'
