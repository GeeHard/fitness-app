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
  // ref for sync processing flag to avoid race conditions
  const processingRef = useRef(false);
  // ref to hold object URL for cleanup to prevent memory leaks
  const objectUrlRef = useRef(null);

  useEffect(() => {
    // reset landmarks and angles when entering file mode
    if (mode === 'file') {
      landmarksRef.current = [];
      setAngles({});
    }
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
      // reset previous landmarks and angles
      landmarksRef.current = [];
      setAngles({});
      // revoke previous object URL if any
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      videoRef.current.srcObject = null;
      videoRef.current.src = url;
      videoRef.current.play();
    }
  };

  const drawLandmarks = landmarks => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'blue';
    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = 2;
    // draw points
    landmarks.forEach(l => {
      const x = l.x * w;
      const y = l.y * h;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
    });
    // optimize skeleton connections with a map lookup
    const landmarkMap = new Map(landmarks.map(l => [l.idx, l]));
    SKELETON_CONNECTIONS.forEach(([i, j]) => {
      const p1 = landmarkMap.get(i);
      const p2 = landmarkMap.get(j);
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(p1.x * w, p1.y * h);
        ctx.lineTo(p2.x * w, p2.y * h);
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

  // Configurable performance parameters
  const UPLOAD_INTERVAL = 200;       // ms between uploads
  const IMAGE_SCALE = 0.5;           // downscale factor for upload
  const JPEG_QUALITY = 0.7;          // 0..1 JPEG compression quality

  // Capture a frame, send to backend, and update landmarks/angles
  const processFrame = async () => {
    const video = videoRef.current;
    if (!video || processingRef.current) return;
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return;
    // sync flag
    processingRef.current = true;
    setProcessing(true);
    const off = document.createElement('canvas');
    const sw = Math.round(video.videoWidth * IMAGE_SCALE);
    const sh = Math.round(video.videoHeight * IMAGE_SCALE);
    off.width = sw;
    off.height = sh;
    const offCtx = off.getContext('2d');
    offCtx.drawImage(video, 0, 0, sw, sh);
    off.toBlob(blob => {
      if (!blob) {
        processingRef.current = false;
        setProcessing(false);
        return;
      }
      const form = new FormData();
      form.append('frame', blob, 'frame.jpg');
      fetch('http://localhost:8000/frame', { method: 'POST', body: form })
        .then(async res => {
          if (!res.ok) throw new Error(`Server error: ${res.status}`);
          return res.json();
        })
        .then(data => {
          setAngles(data.angles);
          landmarksRef.current = data.landmarks || [];
        })
        .catch(e => console.error('Error processing frame:', e))
        .finally(() => {
          processingRef.current = false;
          setProcessing(false);
        });
    }, 'image/jpeg', JPEG_QUALITY);
  };

  // Trigger frame processing periodically in live mode
  useEffect(() => {
    if (mode === 'live' && stream) {
      const id = setInterval(() => { processFrame(); }, UPLOAD_INTERVAL);
      return () => clearInterval(id);
    }
  }, [mode, stream]);

  // Trigger frame processing periodically in file mode
  useEffect(() => {
    if (mode === 'file') {
      const id = setInterval(() => { processFrame(); }, UPLOAD_INTERVAL);
      return () => clearInterval(id);
    }
  }, [mode]);

  // Cleanup object URL on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

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
