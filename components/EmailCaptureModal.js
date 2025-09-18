// components/EmailCaptureModal.js
import { useState } from 'react';
import { X, Crown, Check, Zap } from 'lucide-react';

export default function EmailCaptureModal({ isOpen, onClose, onSubmit }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('email'); // 'email' or 'success'

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setLoading(true);
    
    try {
      await onSubmit(email);
      setStep('success');
      
      // Auto close after 3 seconds
      setTimeout(() => {
        onClose();
        setStep('email');
        setEmail('');
      }, 3000);
    } catch (error) {
      console.error('Email submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setStep('email');
    setEmail('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0D1B2A] border border-gray-700 rounded-2xl max-w-md w-full p-6 relative">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'email' ? (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <Crown className="w-8 h-8 text-[#FFD60A]" />
                <h2 className="text-2xl font-bold text-white">Upgrade to Premium</h2>
              </div>
              <p className="text-gray-300 text-sm">
                You've reached your free usage limit. Upgrade to continue your goal journey!
              </p>
            </div>

            {/* Premium Benefits */}
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-3">Premium includes:</h3>
              <div className="space-y-2">
                {[
                  'Unlimited goal coaching sessions',
                  'Advanced progress tracking',
                  'Personalized action plans',
                  'Priority AI responses',
                  'Export your goals & progress'
                ].map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-[#00CFFF]" />
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-gradient-to-r from-[#00CFFF]/20 to-[#FFD60A]/20 border border-[#00CFFF]/30 rounded-xl p-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">$9.99<span className="text-sm text-gray-400">/month</span></div>
                <div className="text-[#00CFFF] text-sm">Start your 7-day free trial</div>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00CFFF] focus:border-transparent text-white placeholder-gray-400"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full bg-[#00CFFF] text-[#0D1B2A] py-3 rounded-lg font-semibold hover:bg-[#00CFFF]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-[#0D1B2A]/30 border-t-[#0D1B2A] rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    <span>Start Free Trial</span>
                  </>
                )}
              </button>
            </form>

            <p className="text-xs text-gray-500 text-center mt-4">
              Cancel anytime. No commitment required.
            </p>
          </>
        ) : (
          /* Success Step */
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-[#00CFFF]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-[#00CFFF]" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Check Your Email!</h2>
            <p className="text-gray-300 text-sm mb-4">
              We've sent you a magic link to complete your upgrade.
            </p>
            <div className="text-[#00CFFF] text-sm">Redirecting you shortly...</div>
          </div>
        )}
      </div>
    </div>
  );
}
