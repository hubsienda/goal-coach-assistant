// components/HelpModal.js
import { X, Zap, ExternalLink } from 'lucide-react';

export default function HelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const quickCommands = [
    { command: '/fitness', description: 'Create a fitness plan' },
    { command: '/career', description: 'Career development guidance' },
    { command: '/productivity', description: 'Boost your productivity' },
    { command: '/habits', description: 'Build better habits' },
    { command: '/goals', description: 'Set and achieve goals' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0D1B2A] border border-gray-700 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Help & Support</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Quick Commands Section */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <Zap className="w-5 h-5 text-[#FFD60A]" />
              <span>Quick Commands</span>
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              Use these shortcuts to get started faster:
            </p>
            <div className="space-y-3">
              {quickCommands.map((cmd, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-800/50 rounded-lg">
                  <code className="text-[#00CFFF] text-sm font-mono bg-gray-900/50 px-2 py-1 rounded">
                    {cmd.command}
                  </code>
                  <span className="text-gray-300 text-sm">{cmd.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Support Links */}
          <div className="space-y-4">
            <div className="border-t border-gray-700 pt-4">
              <h3 className="text-white font-semibold mb-3">Need More Help?</h3>
              <div className="space-y-2">
                <a
                  href="https://get.goalverse.app/help/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-gray-800/30 hover:bg-gray-800/50 rounded-lg transition-colors group"
                >
                  <span className="text-gray-300 group-hover:text-white">Go to help to learn more</span>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#00CFFF]" />
                </a>
                
                <a
                  href="https://get.goalverse.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-gray-800/30 hover:bg-gray-800/50 rounded-lg transition-colors group"
                >
                  <span className="text-gray-300 group-hover:text-white">Knowledge Base, Terms, Legal Policies</span>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#00CFFF]" />
                </a>
              </div>
            </div>
          </div>

          {/* Tips Section */}
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-white font-semibold mb-3">Getting Started Tips</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <p>• Start by telling GOALVERSE about your current situation and what you want to achieve.</p>
              <p>• Be specific about your goals - the more detail you provide, the better advice you'll receive.</p>
              <p>• Use the quick commands above to jump into common goal areas quickly.</p>
              <p>• Your conversations are saved automatically - you can continue them anytime.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
