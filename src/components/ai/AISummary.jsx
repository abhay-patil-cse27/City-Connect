import React, { useState } from 'react';
import { generateMeetingSummary } from '../../lib/huggingface';

export default function AISummary({ projectData, meetingNotes }) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await generateMeetingSummary(meetingNotes, {
        name: projectData?.name || 'Current Project',
        participants: projectData?.participants || [],
        phase: projectData?.phase || 'Planning'
      });
      setSummary(result);
    } catch (err) {
      setError('Failed to generate summary. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">AI Summary Generator</h2>
      
      <div className="mb-4">
        <textarea
          className="w-full p-2 border rounded-md"
          rows="6"
          placeholder="Paste your meeting notes here..."
          value={meetingNotes}
          readOnly
        />
      </div>

      <button
        onClick={generateSummary}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Generate Summary'}
      </button>

      {error && (
        <div className="mt-4 text-red-600">
          {error}
        </div>
      )}

      {summary && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-2">Summary</h3>
          <div className="bg-gray-50 p-4 rounded-md">
            <pre className="whitespace-pre-wrap">{summary}</pre>
          </div>
        </div>
      )}
    </div>
  );
} 