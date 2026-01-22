import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { completeOAuthFlow, IntegrationName } from '../services/oauth';

const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state') as IntegrationName;
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage(`Authentication failed: ${error}`);
        if (window.opener) {
          window.opener.postMessage(
            { type: 'oauth-error', error },
            window.location.origin
          );
        }
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setMessage('Invalid callback parameters');
        return;
      }

      try {
        await completeOAuthFlow(code, state);
        setStatus('success');
        setMessage(`${state} connected successfully!`);
        
        // Close window after 2 seconds
        setTimeout(() => {
          window.close();
        }, 2000);
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Authentication failed');
        if (window.opener) {
          window.opener.postMessage(
            { type: 'oauth-error', error: message },
            window.location.origin
          );
        }
      }
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Connecting...</h2>
            <p className="text-slate-600">{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Success!</h2>
            <p className="text-slate-600 mb-4">{message}</p>
            <p className="text-sm text-slate-400">This window will close automatically...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-rose-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Connection Failed</h2>
            <p className="text-slate-600 mb-4">{message}</p>
            <button 
              onClick={() => window.close()}
              className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800"
            >
              Close Window
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
