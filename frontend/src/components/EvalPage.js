import React, { useEffect, useState } from 'react';

const EvalPage = () => {
  const [message, setMessage] = useState('');
  const [plotImage, setPlotImage] = useState('');
  const [csvFiles, setCsvFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [evalData, setEvalData] = useState('');
  const [heatmapImage, setHeatmapImage] = useState('');

  // Fetch list of available CSV files on mount
  useEffect(() => {
    fetch('/csv_files')
      .then(res => res.json())
      .then(data => setCsvFiles(Array.isArray(data.files) ? data.files : []))
      .catch(err => console.error('Error fetching CSV files:', err));
  }, []);

  // Fetch evaluation message and plot based on selected CSV (or default)
  useEffect(() => {
    const query = selectedFile ? `?filename=${encodeURIComponent(selectedFile)}` : '';
    fetch(`/eval${query}`)
      .then(res => res.json())
      .then(data => setMessage(data.message || data.error || ''))
      .catch(err => console.error('Error fetching eval message:', err));

    fetch(`/plot_image${query}`)
      .then(res => res.json())
      .then(data => setPlotImage(data.image_base64 || ''))
      .catch(err => console.error('Error fetching plot image:', err));
    // fetch move evaluation DataFrame and heatmap
    fetch(`/move_eval${query}`)
      .then(res => res.json())
      .then(data => {
        setEvalData(data.eval_df || data.error || '');
        setHeatmapImage(data.heat_map_base64 || '');
      })
      .catch(err => console.error('Error fetching move eval:', err));
  }, [selectedFile]);

  return (
    <div className="eval-page" style={{ padding: '20px' }}>
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
        rows={10}
        readOnly
        style={{
          width: 'calc(100% - 200px)',
          fontSize: '16px',
          whiteSpace: 'pre',     // preserve text, disable wrapping
          overflowX: 'auto',     // horizontal scrollbar when needed
          overflowY: 'scroll',   // always show vertical scrollbar
          margin: '20px auto',   // 100px left/right margins via auto centering
        }}
        value={message || 'Loading...'}
      />
      {/* Plot of joint angles (between the two text fields) */}
      {plotImage && (
        <div style={{ padding: '20px' }}>
          <img
            src={`data:image/png;base64,${plotImage}`}
            alt="Joint Angles Plot"
            style={{ width: '100%' }}
          />
        </div>
      )}
      {/* Evaluated move DataFrame preview */}
      <textarea
        rows={10}
        readOnly
        style={{
          width: 'calc(100% - 200px)',
          fontSize: '16px',
          whiteSpace: 'pre',
          overflowX: 'auto',
          overflowY: 'scroll',
          margin: '20px auto',   // 100px left/right margins via auto centering
        }}
        value={evalData || 'Loading move evaluation...'}
      />
      {/* Heatmap of rule fulfillment */}
      {heatmapImage && (
        <div style={{ padding: '20px' }}>
          <img
            src={`data:image/png;base64,${heatmapImage}`}
            alt="Heatmap of Rule Fulfillment"
            style={{ width: '100%' }}
          />
        </div>
      )}
    </div>
  );
};

export default EvalPage;