// components/EmailCaptureModal.js
import { useState } from 'react';
import { X, Crown, Check, CreditCard, ExternalLink } from 'lucide-react';

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
      <div className="bg-[#0D1B2A] border border-gray-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        
        {step === 'email' ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Crown className="w-6 h-6 text-[#FFD60A]" />
                  <h2 className="text-xl font-bold text-white">Upgrade to Premium</h2>
                </div>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-300 text-sm">
                You've reached your free limit of 3 goal sessions per week.
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* 14-Day Guarantee Badge */}
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-center">
                <div className="text-green-400 font-semibold text-sm">14-Day Money-Back Guarantee</div>
                <div className="text-green-300 text-xs">Full refund if not satisfied</div>
              </div>

              {/* Premium Benefits - Compact */}
              <div>
                <h3 className="text-white font-semibold mb-3">Premium includes:</h3>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    'Unlimited goal coaching sessions',
                    'Priority AI responses',
                    'Advanced progress tracking',
                    'Export functionality (PDF/CSV)',
                    'Cloud sync across devices'
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-[#00CFFF] flex-shrink-0" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Plans - Compact */}
              <div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedPlan('monthly')}
                    className={`p-3 rounded-lg border-2 transition-colors text-center ${
                      selectedPlan === 'monthly'
                        ? 'border-[#00CFFF] bg-[#00CFFF]/10'
                        : 'border-gray-600 bg-gray-800/50'
                    }`}
                  >
                    <div className="text-white font-semibold text-sm">Monthly</div>
                    <div className="text-[#00CFFF] text-lg font-bold">$6<span className="text-xs text-gray-400">/mo</span></div>
                  </button>
                  
                  <button
                    onClick={() => setSelectedPlan('annual')}
                    className={`p-3 rounded-lg border-2 transition-colors relative text-center ${
                      selectedPlan === 'annual'
                        ? 'border-[#FFD60A] bg-[#FFD60A]/10'
                        : 'border-gray-600 bg-gray-800/50'
                    }`}
                  >
                    <div className="absolute -top-1 -right-1 bg-[#FFD60A] text-[#0D1B2A] text-xs px-1 py-0.5 rounded text-[10px] font-bold">
                      SAVE 17%
                    </div>
                    <div className="text-white font-semibold text-sm">Annual</div>
                    <div className="text-[#FFD60A] text-lg font-bold">$60<span className="text-xs text-gray-400">/yr</span></div>
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              {/* Email Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00CFFF] focus:border-transparent text-white placeholder-gray-400"
                  required
                />
                
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

              {/* Legal & Pricing Info */}
              <div className="text-center space-y-2">
                <p className="text-xs text-gray-500">
                  {selectedPlan === 'monthly' ? '$6/month' : '$60/year'} + applicable taxes
                </p>
                <p className="text-xs text-gray-400">
                  By subscribing you accept our{' '}
                  <a
                    href="https://get.goalverse.app/legal/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#00CFFF] hover:underline inline-flex items-center space-x-1"
                  >
                    <span>Legal Policies</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
                <p className="text-xs text-gray-500">
                  14-day money-back guarantee • Cancel anytime
                </p>
              </div>
            </div>
          </>
        ) : (
          /* Success Step */
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-[#00CFFF]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-[#00CFFF]" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Check Your Email!</h2>
            <p className="text-gray-300 text-sm mb-4">
              We've sent you a secure payment link to complete your upgrade.
            </p>
            <p className="text-[#00CFFF] text-sm mb-4">
              Click the link to securely pay and unlock unlimited goal sessions!
            </p>
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
              <p className="text-green-400 text-xs font-semibold">
                14-day money-back guarantee • Instant premium access after payment
              </p>
            </div>
            <button
              onClick={handleClose}
              className="mt-4 text-gray-400 hover:text-white text-sm"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
