// components/EmailCaptureModal.js
import { useState } from 'react';
import { X, Crown, Check, Zap, Shield, CreditCard } from 'lucide-react';

export default function EmailCaptureModal({ isOpen, onClose, onSubmit }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('email'); // 'email' or 'success'
  const [selectedPlan, setSelectedPlan] = useState('monthly'); // 'monthly' or 'annual'
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      await onSubmit(email, selectedPlan);
      setStep('success');
      
      // Auto close after 5 seconds
      setTimeout(() => {
        onClose();
        setStep('email');
        setEmail('');
        setError('');
      }, 5000);
    } catch (error) {
      console.error('Email submission error:', error);
      setError('Failed to send payment link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setStep('email');
    setEmail('');
    setError('');
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
                You've reached your free limit of 3 goal sessions per week. Upgrade for unlimited access!
              </p>
            </div>

            {/* Money-Back Guarantee Banner */}
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-3 mb-6 text-center">
              <div className="flex items-center justify-center space-x-2 mb-1">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-semibold text-sm">14-Day Money-Back Guarantee</span>
              </div>
              <p className="text-green-300 text-xs">Full refund if not satisfied • No questions asked</p>
            </div>

            {/* Premium Benefits */}
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-3">Premium includes:</h3>
              <div className="space-y-2">
                {[
                  'Unlimited goal coaching sessions',
                  'Priority AI responses (faster & detailed)',
                  'Advanced progress tracking & analytics',
                  'Export goals and conversations (PDF/CSV)',
                  'Cloud sync across all devices'
                ].map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-[#00CFFF]" />
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing Plans */}
            <div className="mb-6">
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => setSelectedPlan('monthly')}
                  className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                    selectedPlan === 'monthly'
                      ? 'border-[#00CFFF] bg-[#00CFFF]/10'
                      : 'border-gray-600 bg-gray-800/50'
                  }`}
                >
                  <div className="text-white font-semibold">Monthly</div>
                  <div className="text-[#00CFFF] text-lg font-bold">$6<span className="text-sm text-gray-400">/month</span></div>
                  <div className="text-xs text-gray-400">+ Tax if applicable</div>
                </button>
                
                <button
                  onClick={() => setSelectedPlan('annual')}
                  className={`flex-1 p-3 rounded-lg border-2 transition-colors relative ${
                    selectedPlan === 'annual'
                      ? 'border-[#FFD60A] bg-[#FFD60A]/10'
                      : 'border-gray-600 bg-gray-800/50'
                  }`}
                >
                  <div className="absolute -top-2 -right-2 bg-[#FFD60A] text-[#0D1B2A] text-xs px-2 py-1 rounded-full font-bold">
                    SAVE 17%
                  </div>
                  <div className="text-white font-semibold">Annual</div>
                  <div className="text-[#FFD60A] text-lg font-bold">$60<span className="text-sm text-gray-400">/year</span></div>
                  <div className="text-xs text-gray-400">+ Tax if applicable</div>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

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
                    <CreditCard className="w-5 h-5" />
                    <span>Continue to Payment</span>
                  </>
                )}
              </button>
            </form>

            <div className="text-center mt-4">
              <p className="text-xs text-gray-500">
                <strong>Secure payment</strong> • {selectedPlan === 'monthly' ? '$6/month' : '$60/year'} + applicable taxes
              </p>
              <p className="text-xs text-gray-500 mt-1">
                14-day money-back guarantee • Cancel anytime
              </p>
            </div>
          </>
        ) : (
          /* Success Step */
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-[#00CFFF]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-[#00CFFF]" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Check Your Email!</h2>
            <p className="text-gray-300 text-sm mb-4">
              We've sent you a secure payment link to complete your upgrade.
            </p>
            <p className="text-[#00CFFF] text-sm">
              Click the link to securely pay and unlock unlimited goal sessions!
            </p>
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 mt-4">
              <p className="text-green-400 text-xs font-semibold">
                14-day money-back guarantee • Instant premium access after payment
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
