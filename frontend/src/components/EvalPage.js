import React, { useEffect, useState } from 'react';

const EvalPage = () => {
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('http://localhost:8000/eval')
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(err => console.error('Error fetching eval message:', err));
  }, []);

  return (
    <div className="eval-page" style={{ padding: '20px' }}>
      <textarea
        rows={5}
        readOnly
        style={{ width: '100%', fontSize: '16px' }}
        value={message || 'Loading...'}
      />
    </div>
  );
};

export default EvalPage;