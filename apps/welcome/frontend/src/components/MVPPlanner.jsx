/**
 * Example component showing how to use the MVP Planner agent
 */
import React, { useState } from 'react';
import { planMVP, AGENT_TYPES, executeAgent } from '../services/agentService';

function MVPPlanner() {
  const [goal, setGoal] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handlePlanMVP = async () => {
    if (!goal.trim()) {
      setError('Please enter a goal description');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Use the MVP planner agent
      const response = await planMVP(goal, context);
      
      if (response.success) {
        setResult({
          raw: response.raw_response,
          backlog: response.structured_data // Will contain the JSON backlog if found
        });
      } else {
        setError(response.error || 'Failed to generate MVP plan');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Parse the raw response to extract sections
  const parseResponse = (raw) => {
    if (!raw) return null;
    
    const sections = {
      scope: '',
      willBuild: [],
      wontBuild: [],
      risks: [],
      backlog: []
    };

    // Extract sections using regex or string parsing
    const lines = raw.split('\n');
    let currentSection = '';
    
    lines.forEach(line => {
      if (line.includes('## MVP Scope')) currentSection = 'scope';
      else if (line.includes('## We WILL Build')) currentSection = 'willBuild';
      else if (line.includes('## We will NOT Build')) currentSection = 'wontBuild';
      else if (line.includes('## Risks & Mitigations')) currentSection = 'risks';
      else if (line.includes('## Implementation Backlog')) currentSection = 'backlog';
      else if (currentSection && line.trim()) {
        if (currentSection === 'scope') {
          sections.scope += line + ' ';
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          sections[currentSection].push(line.substring(2));
        }
      }
    });

    return sections;
  };

  const sections = result ? parseResponse(result.raw) : null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">MVP Planner Agent</h2>
        
        {/* Input Form */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Goal Description *
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="E.g., Build a mobile app for tracking personal fitness goals"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Context
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Target audience, constraints, technical requirements, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="2"
            />
          </div>
          
          <button
            onClick={handlePlanMVP}
            disabled={loading || !goal.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Planning MVP...' : 'Generate MVP Plan'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Results Display */}
        {sections && (
          <div className="space-y-6">
            {/* MVP Scope */}
            <div>
              <h3 className="text-lg font-semibold mb-2">MVP Scope</h3>
              <p className="text-gray-700">{sections.scope}</p>
            </div>

            {/* We WILL Build */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-green-600">✅ We WILL Build</h3>
              <ul className="list-disc list-inside space-y-1">
                {sections.willBuild.map((item, idx) => (
                  <li key={idx} className="text-gray-700">{item}</li>
                ))}
              </ul>
            </div>

            {/* We will NOT Build */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-red-600">❌ We will NOT Build (Yet)</h3>
              <ul className="list-disc list-inside space-y-1">
                {sections.wontBuild.map((item, idx) => (
                  <li key={idx} className="text-gray-700">{item}</li>
                ))}
              </ul>
            </div>

            {/* Risks & Mitigations */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-orange-600">⚠️ Risks & Mitigations</h3>
              <div className="space-y-2">
                {sections.risks.map((risk, idx) => (
                  <div key={idx} className="text-gray-700">{risk}</div>
                ))}
              </div>
            </div>

            {/* Implementation Backlog */}
            {result.backlog && (
              <div>
                <h3 className="text-lg font-semibold mb-2">📋 Implementation Backlog</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Acceptance</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Effort</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {result.backlog.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 text-sm">{item.id}</td>
                          <td className="px-4 py-2 text-sm font-medium">{item.title}</td>
                          <td className="px-4 py-2 text-sm">{item.acceptance}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              item.priority === 'P0' ? 'bg-red-100 text-red-800' :
                              item.priority === 'P1' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {item.priority}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              item.effort === 'S' ? 'bg-blue-100 text-blue-800' :
                              item.effort === 'M' ? 'bg-purple-100 text-purple-800' :
                              'bg-pink-100 text-pink-800'
                            }`}>
                              {item.effort}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Raw Response (Collapsible) */}
            <details className="border rounded-lg p-4">
              <summary className="cursor-pointer font-semibold">View Raw Response</summary>
              <pre className="mt-4 whitespace-pre-wrap text-sm text-gray-600">
                {result.raw}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

export default MVPPlanner;