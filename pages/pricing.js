import { useState } from 'react';
import { Check, Crown, Target, X } from 'lucide-react';

export default function Pricing() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubscribe = async (priceType) => {
    if (!email) {
      alert('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, priceType })
      });

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to create checkout session');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white">
      {/* Header */}
      <div className="border-b border-gray-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#00CFFF] rounded-lg flex items-center justify-center">
              <span className="text-[#0D1B2A] font-bold text-lg">G</span>
            </div>
            <span className="text-[#00CFFF] font-bold text-xl">GOALVERSE</span>
          </div>
          <a href="/" className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#00CFFF] mb-4">
            Upgrade to GOALVERSE Premium
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Transform your aspirations into achievements with unlimited goals, 
            progress tracking, and personalized coaching.
          </p>
        </div>

        {/* Email Input */}
        <div className="max-w-md mx-auto mb-8">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00CFFF] text-white"
            required
          />
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-12">
          {/* Monthly Plan */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-white mb-2">Monthly</h3>
              <div className="text-3xl font-bold text-[#00CFFF]">$6<span className="text-lg text-gray-400">/month</span></div>
            </div>
            <button
              onClick={() => handleSubscribe('monthly')}
              disabled={isLoading}
              className="w-full bg-[#00CFFF] text-[#0D1B2A] py-3 rounded-lg font-medium hover:bg-[#00CFFF]/90 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Start Monthly Plan'}
            </button>
          </div>

          {/* Annual Plan */}
          <div className="bg-gradient-to-br from-[#00CFFF]/20 to-[#FFD60A]/20 border border-[#00CFFF] rounded-xl p-6 relative">
            <div className="absolute top-4 right-4">
              <span className="bg-[#FFD60A] text-[#0D1B2A] px-2 py-1 rounded-full text-xs font-bold">
                SAVE 17%
              </span>
            </div>
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-white mb-2">Annual</h3>
              <div className="text-3xl font-bold text-[#00CFFF]">$60<span className="text-lg text-gray-400">/year</span></div>
              <div className="text-sm text-gray-400">($5/month billed annually)</div>
            </div>
            <button
              onClick={() => handleSubscribe('yearly')}
              disabled={isLoading}
              className="w-full bg-[#00CFFF] text-[#0D1B2A] py-3 rounded-lg font-medium hover:bg-[#00CFFF]/90 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Start Annual Plan'}
            </button>
          </div>
        </div>

        {/* Features List */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-white mb-8">
            Everything included in Premium
          </h2>
          <div className="grid gap-4">
            {[
              'Unlimited goal creation and management',
              'Progress tracking with completion metrics',
              'Custom email reminders (daily/weekly)',
              'Permanent goal storage and history',
              'Priority AI coaching responses',
              'Cross-device synchronization',
              'Advanced analytics and insights',
              'Cancel anytime'
            ].map((feature, index) => (
              <div key={index} className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-[#00CFFF] flex-shrink-0" />
                <span className="text-gray-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-400 text-sm">
          <p>Secure payment powered by Stripe • Cancel anytime</p>
        </div>
      </div>
    </div>
  );
}
