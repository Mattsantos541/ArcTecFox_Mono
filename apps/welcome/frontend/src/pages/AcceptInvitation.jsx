import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { acceptInvitation } from '../api';
import { useAuth } from '../hooks/useAuth';

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Processing your invitation...');
  const [invitationDetails, setInvitationDetails] = useState(null);

  useEffect(() => {
    const handleInvitation = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Invalid invitation link. No token provided.');
        return;
      }

      // Wait for auth to load
      if (authLoading) return;

      // If not logged in, redirect to login with return URL
      if (!user) {
        const returnUrl = `/accept-invitation?token=${token}`;
        navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
        return;
      }

      // User is logged in, try to accept the invitation
      try {
        const result = await acceptInvitation(token);
        setInvitationDetails(result);
        setStatus('success');
        setMessage(`Success! You now have access to ${result.sites?.name || 'the site'}.`);
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } catch (error) {
        setStatus('error');
        setMessage(error.message || 'Failed to accept invitation');
      }
    };

    handleInvitation();
  }, [searchParams, navigate, user, authLoading]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Accept Invitation
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {status === 'processing' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <p className="mt-4 text-sm text-gray-900 font-medium">{message}</p>
              {invitationDetails && invitationDetails.sites && (
                <div className="mt-4 text-sm text-gray-600">
                  <p>Company: {invitationDetails.sites.companies?.name}</p>
                  <p>Site: {invitationDetails.sites.name}</p>
                </div>
              )}
              <p className="mt-4 text-xs text-gray-500">Redirecting to dashboard...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <p className="mt-4 text-sm text-red-600 font-medium">{message}</p>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go to Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitation;