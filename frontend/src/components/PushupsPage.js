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
  // ref for sync processing flag to avoid race conditions
  const processingRef = useRef(false);
  // ref to hold object URL for cleanup to prevent memory leaks
  const objectUrlRef = useRef(null);
  // video duration and current play time for file-mode controls
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  // recording state and references for MediaRecorder
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const startTimeRef = useRef(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const timeIntervalRef = useRef(null);

  // format seconds to mm:ss
  const formatTime = time => {
    const total = Math.floor(time);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };
  // cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
    };
  }, []);
  // greeting text (from backend state_tracker via /frame)
  const [greeting, setGreeting] = useState('');
  
  // helper to reset counter state on backend and clear greeting
  const resetCounter = () => {
    fetch('http://localhost:8000/reset', { method: 'POST' })
      .then(() => setGreeting(''))
      .catch(err => console.error('Error resetting counter:', err));
  };
  
  // reset counter whenever mode changes (live <-> file)
  useEffect(() => {
    resetCounter();
  }, [mode]);
  // handlers to start and stop recording the raw camera stream
  const handleStartRecording = () => {
    if (!stream) return;
    // reset recorded data and timer
    recordedChunksRef.current = [];
    setRecordingTime(0);
    startTimeRef.current = Date.now();
    timeIntervalRef.current = setInterval(() => {
      setRecordingTime((Date.now() - startTimeRef.current) / 1000);
    }, 100);
    // choose supported mime type, prefer MP4
    let options = {};
    if (MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.42E01E"')) {
      options = { mimeType: 'video/mp4; codecs="avc1.42E01E"' };
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      options = { mimeType: 'video/mp4' };
    } else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9')) {
      options = { mimeType: 'video/webm; codecs=vp9' };
    } else if (MediaRecorder.isTypeSupported('video/webm')) {
      options = { mimeType: 'video/webm' };
    }
    const mediaRecorder = new MediaRecorder(stream, options);
    recorderRef.current = mediaRecorder;
    mediaRecorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    mediaRecorder.onstop = () => {
      clearInterval(timeIntervalRef.current);
      const finalType = mediaRecorder.mimeType || options.mimeType;
      const blob = new Blob(recordedChunksRef.current, { type: finalType });
      const ext = finalType.includes('mp4') ? 'mp4' : 'webm';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `pushups_recording.${ext}`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    };
    mediaRecorder.start();
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    clearInterval(timeIntervalRef.current);
    setIsRecording(false);
  };

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

  const handleFileChange = async e => {
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
        // clear existing pushups CSV on server
        try {
          await fetch('http://localhost:8000/clear_pushups_csv', { method: 'POST' });
        } catch (err) {
          console.error('Error clearing pushups CSV:', err);
        }
      // reset repetition counter state for new file
      resetCounter();
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
          // update landmarks and angles overlay
          setAngles(data.angles);
          landmarksRef.current = data.landmarks || [];
          // update greeting/info text from state tracker fields
          const reps = data.repetitions ?? '';
          const seq = Array.isArray(data.state_sequence) ? data.state_sequence.join(', ') : '';
          const curr = data.current_state ?? '';
          const prev = data.previous_state ?? '';
          const imp = data.improper_moves ?? '';
          const text =
            `Repetitions: ${reps}\n` +
            `State sequence: [${seq}]\n` +
            `Current state: ${curr}\n` +
            `Previous state: ${prev}\n` +
            `Improper moves: ${imp}`;
          setGreeting(text);
        })
        .catch(e => console.error('Error processing frame:', e))
        .finally(() => {
          processingRef.current = false;
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

  // Dynamically adjust aspect ratio of video and overlay to fit container
  useEffect(() => {
    const updateVideoSize = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && video.videoWidth && video.videoHeight) {
        const ratio = video.videoWidth / video.videoHeight;
        video.style.aspectRatio = `${ratio}`;
        if (canvas) canvas.style.aspectRatio = `${ratio}`;
      }
    };
    const videoEl = videoRef.current;
    if (mode === 'file' && videoEl) {
      videoEl.onloadedmetadata = updateVideoSize;
    }
    let interval;
    if (mode === 'live' && stream) {
      interval = setInterval(updateVideoSize, 500);
    }
    return () => {
      if (videoEl) videoEl.onloadedmetadata = null;
      if (interval) clearInterval(interval);
    };
  }, [mode, stream]);

  // handle video metadata and time updates in file mode for playback controls
  useEffect(() => {
    const video = videoRef.current;
    if (mode !== 'file' || !video) return;
    const onLoaded = () => setVideoDuration(video.duration);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('timeupdate', onTimeUpdate);
    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [mode]);

  return (
    <div className="pushups-page">
      <div className="controls">
        <button
          onClick={() => setMode('live')}
          disabled={mode === 'live'}
          className={`mode-btn ${mode === 'live' ? 'active' : ''}`}
        >
          Live
        </button>
        <button
          onClick={() => setMode('file')}
          disabled={mode === 'file'}
          className={`mode-btn ${mode === 'file' ? 'active' : ''}`}
        >
          File
        </button>
        {mode === 'file' && (
          <input
            type="file"
            accept=".mp4,.mov"
            onChange={handleFileChange}
          />
        )}
        {mode === 'live' && (
          <>
            <button onClick={isRecording ? handleStopRecording : handleStartRecording}>
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            {isRecording && (
              <span className="recording-timer">
                {formatTime(recordingTime)}
              </span>
            )}
          </>
        )}
      </div>
      <div className="video-container">
        <video ref={videoRef} className="video" autoPlay muted playsInline />
        <canvas ref={canvasRef} className="overlay" />
      </div>
      {mode === 'file' && (
        <div className="file-controls">
          <button onClick={() => {
            // reset counter on replay
            resetCounter();
            if (videoRef.current) {
              videoRef.current.currentTime = 0;
              videoRef.current.play();
            }
          }}>
            Wiederholen
          </button>
          <input
            type="range"
            min="0"
            max={videoDuration}
            step="0.1"
            value={currentTime}
            onChange={e => {
              const t = parseFloat(e.target.value);
              if (videoRef.current) videoRef.current.currentTime = t;
            }}
            style={{ width: '100%' }}
          />
        </div>
      )}
      <div className="info-row">
        <textarea
          className="angles-text"
          rows={5}
          readOnly
          value={
            `Elbow: ${angles.elbow?.toFixed(2) || ''}\n` +
            `Shoulder: ${angles.shoulder?.toFixed(2) || ''}\n` +
            `Hip: ${angles.hip?.toFixed(2) || ''}\n` +
            `Knee: ${angles.knee?.toFixed(2) || ''}\n` +
            `Ankle: ${angles.ankle?.toFixed(2) || ''}`
          }
        />
        <textarea
          className="greeting-text"
          rows={5}
          readOnly
          value={greeting}
        />
      </div>
    </div>
  );
};

export default PushupsPage;
