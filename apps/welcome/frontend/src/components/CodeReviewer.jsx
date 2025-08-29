/**
 * Code Review Agent Component
 * Shows how to use the REVIEWER_READONLY agent for code reviews
 */
import React, { useState } from 'react';
import { reviewCode, AGENT_TYPES } from '../services/agentService';

function CodeReviewer() {
  const [prTitle, setPrTitle] = useState('');
  const [prDescription, setPrDescription] = useState('');
  const [codeDiff, setCodeDiff] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleReviewCode = async () => {
    if (!prTitle.trim() || !codeDiff.trim()) {
      setError('Please provide PR title and code diff');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await reviewCode({
        title: prTitle,
        description: prDescription,
        filesChanged: 'Multiple files', // Could be extracted from diff
        codeDiff: codeDiff
      });
      
      if (response.success) {
        setResult(parseReviewResponse(response.raw_response));
      } else {
        setError(response.error || 'Failed to review code');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const parseReviewResponse = (raw) => {
    // Simple parsing - in production you'd want more robust parsing
    const sections = {
      summary: '',
      riskLevel: '',
      verdict: '',
      comments: [],
      criticalIssues: [],
      suggestions: [],
      positives: []
    };

    const lines = raw.split('\n');
    let currentSection = '';
    
    lines.forEach(line => {
      if (line.includes('## Summary')) currentSection = 'summary';
      else if (line.includes('Overall Risk Level:')) {
        sections.riskLevel = line.split(':')[1]?.trim() || 'Unknown';
      }
      else if (line.includes('Decision:')) {
        sections.verdict = line.split(':')[1]?.trim() || 'Unknown';
      }
      else if (line.includes('## Critical Issues')) currentSection = 'critical';
      else if (line.includes('## Suggestions')) currentSection = 'suggestions';
      else if (line.includes('## Positive Highlights')) currentSection = 'positives';
      else if (line.includes('## Inline Comments')) currentSection = 'comments';
      else if (currentSection && line.trim()) {
        if (currentSection === 'summary' && !line.startsWith('#')) {
          sections.summary += line + ' ';
        } else if (currentSection === 'critical' && line.startsWith('-')) {
          sections.criticalIssues.push(line.substring(1).trim());
        } else if (currentSection === 'suggestions' && line.startsWith('-')) {
          sections.suggestions.push(line.substring(1).trim());
        } else if (currentSection === 'positives' && line.startsWith('-')) {
          sections.positives.push(line.substring(1).trim());
        }
      }
    });

    return sections;
  };

  const getRiskColor = (risk) => {
    switch(risk?.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getVerdictColor = (verdict) => {
    if (verdict?.includes('APPROVE')) return 'text-green-600';
    if (verdict?.includes('REQUEST_CHANGES')) return 'text-red-600';
    return 'text-yellow-600';
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">🔍 Code Review Agent</h2>
        
        {/* Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PR Title *
            </label>
            <input
              type="text"
              value={prTitle}
              onChange={(e) => setPrTitle(e.target.value)}
              placeholder="e.g., Add user authentication feature"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PR Description
            </label>
            <input
              type="text"
              value={prDescription}
              onChange={(e) => setPrDescription(e.target.value)}
              placeholder="Brief description of changes"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Code Diff (paste your git diff here) *
            </label>
            <textarea
              value={codeDiff}
              onChange={(e) => setCodeDiff(e.target.value)}
              placeholder={`diff --git a/file.js b/file.js
index abc123..def456 100644
--- a/file.js
+++ b/file.js
@@ -10,7 +10,7 @@
-  const oldCode = true;
+  const newCode = false;`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              rows="10"
            />
          </div>
        </div>
        
        <button
          onClick={handleReviewCode}
          disabled={loading || !prTitle.trim() || !codeDiff.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Reviewing Code...' : 'Start Review'}
        </button>

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="mt-8 space-y-6">
            {/* Summary and Risk */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Summary</h3>
                <p className="text-gray-700">{result.summary || 'No summary available'}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Risk Assessment</h3>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full font-medium ${getRiskColor(result.riskLevel)}`}>
                    {result.riskLevel || 'Unknown'} Risk
                  </span>
                  <span className={`font-medium ${getVerdictColor(result.verdict)}`}>
                    {result.verdict || 'No verdict'}
                  </span>
                </div>
              </div>
            </div>

            {/* Critical Issues */}
            {result.criticalIssues.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-800 mb-3">🚨 Critical Issues</h3>
                <ul className="space-y-2">
                  {result.criticalIssues.map((issue, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-red-600 mr-2">•</span>
                      <span className="text-red-700">{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggestions */}
            {result.suggestions.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 mb-3">💡 Suggestions</h3>
                <ul className="space-y-2">
                  {result.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-yellow-600 mr-2">•</span>
                      <span className="text-yellow-700">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Positive Highlights */}
            {result.positives.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-3">✅ Positive Highlights</h3>
                <ul className="space-y-2">
                  {result.positives.map((positive, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-green-600 mr-2">•</span>
                      <span className="text-green-700">{positive}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Verdict */}
            <div className="bg-gray-100 rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold mb-2">Review Decision</h3>
              <div className={`text-2xl font-bold ${getVerdictColor(result.verdict)}`}>
                {result.verdict || 'No Decision'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CodeReviewer;