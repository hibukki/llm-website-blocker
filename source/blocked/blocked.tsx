import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

const BlockedPage: React.FC = () => {
  const [reason, setReason] = useState('');
  const [blockedUrl, setBlockedUrl] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reasonParam = urlParams.get('reason');
    const urlParam = urlParams.get('url');
    setReason(decodeURIComponent(reasonParam || 'No reason provided.'));
    setBlockedUrl(decodeURIComponent(urlParam || 'Unknown URL'));
  }, []);

  return (
    <div>
      <h1>Site Blocked</h1>
      <p>
        You have chosen to block access to: <strong>{blockedUrl}</strong>
      </p>
      <p>
        Your reason: <em>{reason}</em>
      </p>
    </div>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <BlockedPage />
  </React.StrictMode>,
  document.getElementById('root')
); 