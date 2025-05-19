import React, { useRef, useState, useEffect } from 'react';
import './PushupsPage.css';

const SKELETON_CONNECTIONS = [
  [11, 23], [12, 24], [11, 12], [23, 24], [23, 25], [24, 26],
  [25, 27], [26, 28], [11, 13], [12, 14], [13, 15], [14, 16],
  [27, 31], [28, 32]
];

const PushupsPage = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [mode, setMode] = useState('live');
  const [stream, setStream] = useState(null);
  const [angles, setAngles] = useState({});
  const landmarksRef = useRef([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // manage webcam stream on mode change
    let localStream;
    let mounted = true;
    if (mode === 'live') {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(s => {
          if (!mounted) return;
          setStream(s);
          localStream = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(console.error);
    }
    return () => {
      mounted = false;
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
      setStream(null);
    };
  }, [mode]);

  const handleFileChange = e => {
    const file = e.target.files[0];
    if (file && videoRef.current) {
      const url = URL.createObjectURL(file);
      videoRef.current.srcObject = null;
      videoRef.current.src = url;
      videoRef.current.play();
    }
  };

  const drawLandmarks = landmarks => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'blue';
    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = 2;
    landmarks.forEach(l => {
      const x = l.x * canvas.width;
      const y = l.y * canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
    });
    SKELETON_CONNECTIONS.forEach(([i, j]) => {
      const p1 = landmarks.find(l => l.idx === i);
      const p2 = landmarks.find(l => l.idx === j);
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
        ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
        ctx.stroke();
      }
    });
  };

  // Continuous drawing loop: render latest landmarks overlay on video
  useEffect(() => {
    const drawLoop = () => {
      if (videoRef.current && canvasRef.current) {
        drawLandmarks(landmarksRef.current);
      }
      requestAnimationFrame(drawLoop);
    };
    requestAnimationFrame(drawLoop);
  }, []);

  // Fetch and process frames at interval
  useEffect(() => {
    let interval;
    const processFrame = async () => {
      if (!videoRef.current || !canvasRef.current || processing) return;
      setProcessing(true);
      const off = document.createElement('canvas');
      const video = videoRef.current;
      off.width = video.videoWidth;
      off.height = video.videoHeight;
      const offCtx = off.getContext('2d');
      offCtx.drawImage(video, 0, 0, off.width, off.height);
      off.toBlob(async blob => {
        const form = new FormData();
        form.append('frame', blob, 'frame.jpg');
        try {
          const res = await fetch('http://localhost:8000/frame', { method: 'POST', body: form });
          const data = await res.json();
          setAngles(data.angles);
          landmarksRef.current = data.landmarks || [];
        } catch (e) {
          console.error(e);
        } finally {
          setProcessing(false);
        }
      }, 'image/jpeg');
    };
    if ((mode === 'live' && stream) || mode === 'file') {
      interval = setInterval(processFrame, 200);
    }
    return () => clearInterval(interval);
  }, [mode, stream, processing]);

  return (
    <div className="pushups-page">
      <div className="controls">
        <button onClick={() => setMode('live')} disabled={mode === 'live'}>Live</button>
        <button onClick={() => setMode('file')} disabled={mode === 'file'}>File</button>
        {mode === 'file' && <input type="file" accept="video/mp4,video/mov" onChange={handleFileChange} />}
      </div>
      <div className="video-container">
        <video ref={videoRef} className="video" autoPlay muted playsInline />
        <canvas ref={canvasRef} className="overlay" />
      </div>
      <div className="angles-container">
        <textarea
          rows={3}
          readOnly
          value={
            `Elbow: ${angles.elbow?.toFixed(2) || ''}\n` +
            `Shoulder: ${angles.shoulder?.toFixed(2) || ''}\n` +
            `Hip: ${angles.hip?.toFixed(2) || ''}\n` +
            `Knee: ${angles.knee?.toFixed(2) || ''}\n` +
            `Ankle: ${angles.ankle?.toFixed(2) || ''}`
          }
        />
      </div>
    </div>
  );
};

export default PushupsPage;
