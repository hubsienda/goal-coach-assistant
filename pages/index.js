// pages/index.js
const handleSubmit = async (e) => {
  e.preventDefault();
  if (!input.trim() || isLoading) return;

  if (!currentSessionId) {
    createNewChat();
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
        messages: newMessages.slice(-5)
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
