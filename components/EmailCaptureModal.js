import { useState } from 'react';
import { X, Mail, Sparkles } from 'lucide-react';

export default function EmailCaptureModal({ isOpen, onClose, onSubmit }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        setIsSubmitted(true);
        setTimeout(() => {
          onSubmit();
          onClose();
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to send magic link:', error);
    }
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1B2A] border border-gray-700 rounded-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[#00CFFF]">Keep Your Progress Forever</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {isSubmitted ? (
          <div className="text-center py-6">
            <Mail className="w-12 h-12 text-[#00CFFF] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Check Your Email</h3>
            <p className="text-gray-400">We've sent you a magic link to access your premium account.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-3">
                <Sparkles className="w-5 h-5 text-[#FFD60A]" />
                <span className="text-[#FFD60A] font-medium">Upgrade to Premium</span>
              </div>
              <ul className="text-sm text-gray-300 space-y-1 mb-4">
                <li>• Unlimited goal creation</li>
                <li>• Progress tracking & analytics</li>
                <li>• Email reminders</li>
                <li>• Permanent goal storage</li>
              </ul>
            </div>

            <div className="mb-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00CFFF] text-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#00CFFF] text-[#0D1B2A] py-3 rounded-lg font-medium hover:bg-[#00CFFF]/90 disabled:opacity-50"
            >
              {isLoading ? 'Sending...' : 'Get Premium Access'}
            </button>

            <p className="text-xs text-gray-400 text-center mt-3">
              Only $6/month • Cancel anytime
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
