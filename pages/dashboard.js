export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[#00CFFF] mb-4">Welcome to Premium!</h1>
        <p className="text-gray-400 mb-6">Your premium account is now active.</p>
        <a href="/" className="bg-[#00CFFF] text-[#0D1B2A] px-6 py-3 rounded-lg font-medium">
          Start Coaching
        </a>
      </div>
    </div>
  );
}
