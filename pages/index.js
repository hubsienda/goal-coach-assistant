import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Target, Lightbulb } from 'lucide-react';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userContext, setUserContext] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

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
      
      setMessages([...newMessages, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: 'I apologize, but I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickStarters = [
    "I want to start a new fitness routine but struggle with consistency",
    "Help me organize my work projects and set priorities",
    "I'm feeling stuck in my career and need direction",
    "I want to develop a new skill but don't know where to start"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-2 mb-4">
            <Target className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">Goal Coach Assistant</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Your personal AI coach to help you clarify goals, create action plans, and stay motivated on your journey to success.
          </p>
        </div>

        {/* User Context Input */}
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lightbulb className="w-4 h-4 inline mr-1" />
                Tell me about yourself (optional - helps me give better advice):
              </label>
              <textarea
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
                placeholder="e.g., I'm a software developer, working remotely, looking to improve work-life balance and learn new skills..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Chat Container */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg border h-96 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 mt-8">
                  <Bot className="w-12 h-12 mx-auto mb-4 text-indigo-400" />
                  <p className="text-lg font-medium mb-2">Hi! I'm your Goal Coach Assistant</p>
                  <p>Share what you'd like to work on, and I'll help you create a plan to achieve it.</p>
                  
                  {/* Quick Starters */}
                  <div className="mt-6">
                    <p className="text-sm text-gray-400 mb-3">Try asking about:</p>
                    <div className="space-y-2">
                      {quickStarters.map((starter, index) => (
                        <button
                          key={index}
                          onClick={() => setInput(starter)}
                          className="block w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          "{starter}"
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${
                      message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'user'
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="p-4 border-t">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="What would you like to work on today?"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Features */}
        <div className="max-w-4xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
            <Target className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-800 mb-2">Goal Setting</h3>
            <p className="text-gray-600 text-sm">Clarify and refine your objectives with structured guidance</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
            <Lightbulb className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-800 mb-2">Action Planning</h3>
            <p className="text-gray-600 text-sm">Break down big goals into manageable, actionable steps</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
            <User className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-800 mb-2">Accountability</h3>
            <p className="text-gray-600 text-sm">Stay motivated with regular check-ins and progress tracking</p>
          </div>
        </div>
      </div>
    </div>
  );
}
