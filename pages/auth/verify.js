import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export default function Verify() {
  const router = useRouter();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const { token } = router.query;

  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await fetch(`/api/auth/verify?token=${token}`);
      
      if (response.ok) {
        setStatus('success');
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white flex items-center justify-center">
      <div className="text-center">
        {status === 'verifying' && (
          <>
            <Loader className="w-12 h-12 text-[#00CFFF] mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-white mb-2">Verifying your account...</h1>
            <p className="text-gray-400">Please wait while we authenticate your magic link.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Welcome to GOALVERSE!</h1>
            <p className="text-gray-400">Redirecting to your dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Authentication Failed</h1>
            <p className="text-gray-400 mb-4">Your magic link may have expired or is invalid.</p>
            <a href="/" className="bg-[#00CFFF] text-[#0D1B2A] px-4 py-2 rounded-lg font-medium">
              Return to GOALVERSE
            </a>
          </>
        )}
      </div>
    </div>
  );
}
