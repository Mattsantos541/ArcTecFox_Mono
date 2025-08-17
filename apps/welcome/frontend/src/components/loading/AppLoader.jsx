import React, { useState, useEffect } from 'react';

const AppLoader = ({ stage, authLoading, tosLoading, adminCheckLoading }) => {
  const [dots, setDots] = useState('');
  const [currentStage, setCurrentStage] = useState(0);

  // Animate dots for a more dynamic feel
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Determine current stage for better UX
  useEffect(() => {
    if (authLoading) setCurrentStage(0);
    else if (tosLoading) setCurrentStage(1);
    else if (adminCheckLoading) setCurrentStage(2);
  }, [authLoading, tosLoading, adminCheckLoading]);

  const stages = [
    { name: 'Authenticating', description: 'Verifying your credentials' },
    { name: 'Loading preferences', description: 'Checking your settings' },
    { name: 'Preparing dashboard', description: 'Setting up your workspace' }
  ];

  const currentStageInfo = stages[currentStage] || stages[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md mx-auto px-6">
        {/* Logo */}
        <img 
          src="/assets/ArcTecFox-logo.jpg" 
          alt="ArcTecFox Logo" 
          width="80" 
          height="80" 
          className="mx-auto rounded-xl shadow-lg"
        />
        
        {/* Main Loading Spinner */}
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-r-blue-400 animate-ping mx-auto opacity-20"></div>
        </div>
        
        {/* Stage Info */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-800">
            {currentStageInfo.name}{dots}
          </h2>
          <p className="text-gray-600">
            {currentStageInfo.description}
          </p>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${((currentStage + 1) / stages.length) * 100}%` }}
          ></div>
        </div>
        
        {/* Stage Indicators */}
        <div className="flex justify-center space-x-4">
          {stages.map((stageInfo, index) => (
            <div 
              key={index}
              className={`flex items-center space-x-2 text-sm transition-all duration-300 ${
                index <= currentStage ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index < currentStage ? 'bg-blue-600' : 
                index === currentStage ? 'bg-blue-600 animate-pulse' : 'bg-gray-300'
              }`}></div>
              <span className="hidden sm:inline">{stageInfo.name}</span>
            </div>
          ))}
        </div>
        
        {/* Loading tip */}
        <div className="text-xs text-gray-500 border-t pt-4">
          <p>Setting up your maintenance planning tools...</p>
        </div>
      </div>
    </div>
  );
};

export default AppLoader;