import React, { useEffect, useState } from 'react';

const TrainerChatPage = () => {
  const [csvFiles, setCsvFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [question, setQuestion] = useState('Frag den Trainer zu Pushups');
  const [response, setResponse] = useState('');

  // Fetch available CSV files on mount
  useEffect(() => {
    fetch('/csv_files')
      .then(res => res.json())
      .then(data => setCsvFiles(Array.isArray(data.files) ? data.files : []))
      .catch(err => console.error('Error fetching CSV files:', err));
  }, []);

  // Fetch trainer response when file or question changes
  useEffect(() => {
    if (!question) return;
    const params = new URLSearchParams();
    if (selectedFile) params.append('filename', selectedFile);
    params.append('question', question);
    fetch(`/trainer_chat?${params.toString()}`)
      .then(res => res.json())
      .then(data => setResponse(data.response || ''))
      .catch(err => console.error('Error fetching trainer chat:', err));
  }, [selectedFile, question]);

  return (
    <div className="trainer-chat-page" style={{ padding: '20px' }}>
      <div style={{ marginBottom: '10px' }}>
        <label htmlFor="csv-select">
          Auswahl CSV Datei:{' '}
          <select
            id="csv-select"
            value={selectedFile}
            onChange={e => setSelectedFile(e.target.value)}
          >
            <option value="">Default ({csvFiles.includes('pushups.csv') ? 'pushups.csv' : ''})</option>
            {csvFiles.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>
      </div>
      <textarea
        rows={4}
        style={{
          width: 'calc(100% - 200px)',
          fontSize: '16px',
          whiteSpace: 'pre',
          overflowX: 'auto',
          overflowY: 'scroll',
          margin: '20px auto',
        }}
        value={question}
        onChange={e => setQuestion(e.target.value)}
      />
      <textarea
        rows={10}
        readOnly
        style={{
          width: 'calc(100% - 200px)',
          fontSize: '16px',
          whiteSpace: 'pre',
          overflowX: 'auto',
          overflowY: 'scroll',
          margin: '20px auto',
        }}
        value={response || 'Loading...'}
      />
    </div>
  );
};

export default TrainerChatPage;