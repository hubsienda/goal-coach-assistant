// pages/success.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Check, Crown, ArrowRight, Download } from 'lucide-react';

export default function Success() {
  const router = useRouter();
  const { session_id } = router.query;
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (session_id) {
      verifyPayment();
    }
  }, [session_id]);

  const verifyPayment = async () => {
    try {
      const response = await fetch('/api/stripe/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id })
      });

      if (response.ok) {
        const data = await response.json();
        setSessionData(data);
        
        // Set auth cookie if user is now authenticated
        if (data.user_id) {
          document.cookie = `goalverse_auth=${data.user_id}; Path=/; Max-Age=2592000`; // 30 days
        }
      } else {
        setError('Failed to verify payment. Please contact support.');
      }
    } catch (err) {
      setError('Payment verification failed. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    router.push('/?premium_activated=true');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D1B2A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#00CFFF]/30 border-t-[#00CFFF] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0D1B2A] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-500/20 border border-red-500/30 rounded-xl p-6 text-center">
          <h1 className="text-xl font-bold text-red-300 mb-4">Payment Verification Failed</h1>
          <p className="text-red-200 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-[#00CFFF] text-[#0D1B2A] px-6 py-2 rounded-lg font-medium hover:bg-[#00CFFF]/90 transition-colors"
          >
            Return to GOALVERSE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1B2A] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Welcome to Premium!</h1>
          <p className="text-gray-300">
            Your payment has been processed successfully. You now have unlimited access to GOALVERSE.
          </p>
        </div>

        {/* Payment Details */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Crown className="w-5 h-5 text-[#FFD60A] mr-2" />
            Premium Subscription Activated
          </h2>
          
          {sessionData && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Plan:</span>
                <span className="text-white font-medium">
                  {sessionData.plan === 'annual' ? 'Annual ($60/year)' : 'Monthly ($6/month)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Email:</span>
                <span className="text-white">{sessionData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className="text-green-400 font-medium">Active</span>
              </div>
              {sessionData.plan === 'annual' && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Savings:</span>
                  <span className="text-[#FFD60A] font-medium">$12/year (17% off)</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Premium Features */}
        <div className="bg-gradient-to-r from-[#00CFFF]/10 to-[#FFD60A]/10 border border-[#00CFFF]/30 rounded-xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">You now have access to:</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              'Unlimited goal coaching sessions',
              'Priority AI responses',
              'Advanced progress tracking',
              'Export functionality (PDF/CSV)',
              'Cloud sync across devices',
              '14-day money-back guarantee'
            ].map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-[#00CFFF]" />
                <span className="text-gray-300 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleContinue}
            className="flex-1 bg-[#00CFFF] text-[#0D1B2A] py-3 px-6 rounded-lg font-semibold hover:bg-[#00CFFF]/90 transition-colors flex items-center justify-center space-x-2"
          >
            <span>Start Using Premium</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => window.open('mailto:support@goalverse.app', '_blank')}
            className="flex-1 border border-gray-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800/50 transition-colors flex items-center justify-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>Get Receipt</span>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-400">
          <p>
            Questions? Contact us at{' '}
            <a href="mailto:support@goalverse.app" className="text-[#00CFFF] hover:underline">
              support@goalverse.app
            </a>
          </p>
          <p className="mt-2">
            <strong className="text-[#FFD60A]">GOALVERSE by Naralimon</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
