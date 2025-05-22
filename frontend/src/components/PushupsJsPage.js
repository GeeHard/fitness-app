import React, { useRef, useState, useEffect } from 'react';
import './PushupsPage.css';

/* global Pose, Camera */

// indices for landmarks we care about
const LANDMARK_IDX = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 31, 32];
// skeleton connections limited to those landmarks
const SKELETON_CONNECTIONS = [
  [11, 23], [12, 24], [11, 12], [23, 24], [23, 25], [24, 26],
  [25, 27], [26, 28], [11, 13], [12, 14], [13, 15], [14, 16],
  [27, 31], [28, 32]
];

// Port of Python ProcessStatefromAngle for JS rep counting
class ProcessStatefromAngle {
  constructor() {
    this.Reps_Count_joint = 'Elbow_Angle';
    this.state_tracker = {
      state_seq: [],
      prev_state: 0,
      curr_state: 0,
      REPETITIONS: 0,
      GENERAL_COUNT: 0,
      IMPROPER_MOVE: 0
    };
  }
  _updateStateSequence(state) {
    const seq = this.state_tracker.state_seq;
    if (state === 1) {
      this.state_tracker.state_seq = [1];
    } else if (state === 2) {
      if ((!seq.includes(3) && seq.filter(x => x === 2).length === 0) ||
          (seq.includes(3) && seq.filter(x => x === 2).length === 1)) {
        seq.push(2);
      }
    } else if (state === 3) {
      if (seq.includes(2) && !seq.includes(3)) {
        seq.push(3);
      }
    }
    if (seq.length === 3 && seq[0] === 1 && seq[1] === 2 && seq[2] === 3) {
      this.state_tracker.REPETITIONS += 1;
      this.state_tracker.state_seq = [];
    }
    return this.state_tracker.REPETITIONS;
  }
  _getState(jointAngle) {
    let state = 0;
    if (this.Reps_Count_joint === 'Elbow_Angle') {
      if (jointAngle >= 40 && jointAngle <= 90) state = 1;
      else if (jointAngle >= 91 && jointAngle <= 110) state = 2;
      else if (jointAngle >= 111 && jointAngle <= 130) state = 3;
    }
    this.state_tracker.curr_state = state;
    return state;
  }
  update(jointAngle) {
    const state = this._getState(jointAngle);
    return this._updateStateSequence(state);
  }
  reset() {
    this.state_tracker = {
      state_seq: [],
      prev_state: 0,
      curr_state: 0,
      REPETITIONS: 0,
      GENERAL_COUNT: 0,
      IMPROPER_MOVE: 0
    };
  }
}
// global instance
const repetitionCounter = new ProcessStatefromAngle();
const PushupsJsPage = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  // ref to hold Mediapipe Pose instance for file seek processing
  const poseRef = useRef(null);
  const [mode, setMode] = useState('live');
  const [angles, setAngles] = useState({});
  const [reps, setReps] = useState(0);
  const [currState, setCurrState] = useState(0);
  const [stateSeq, setStateSeq] = useState([]);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const fileUrlRef = useRef(null);
  // reset counter and time tracking when switching mode
  useEffect(() => {
    repetitionCounter.reset();
    setReps(0);
    setCurrState(0);
    setStateSeq([]);
    setVideoDuration(0);
    setCurrentTime(0);
  }, [mode]);
  // handle file-mode video metadata and time updates
  // handle file-mode video metadata and time updates: also trigger pose process on seek
  useEffect(() => {
    const video = videoRef.current;
    if (mode === 'file' && video) {
      const onLoaded = () => setVideoDuration(video.duration);
      const onTimeUpdate = () => setCurrentTime(video.currentTime);
      const onSeeked = () => {
        // process current frame on seek
        if (poseRef.current) poseRef.current.send({ image: video });
      };
      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('timeupdate', onTimeUpdate);
      video.addEventListener('seeked', onSeeked);
      return () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('timeupdate', onTimeUpdate);
        video.removeEventListener('seeked', onSeeked);
      };
    }
  }, [mode]);

  const getAngle = (a, b, c) => {
    const ab = { x: a.x - b.x, y: a.y - b.y };
    const cb = { x: c.x - b.x, y: c.y - b.y };
    const dot = ab.x * cb.x + ab.y * cb.y;
    const normA = Math.hypot(ab.x, ab.y);
    const normC = Math.hypot(cb.x, cb.y);
    const cosine = dot / (normA * normC + 1e-6);
    return Math.acos(Math.min(Math.max(cosine, -1), 1)) * (180 / Math.PI);
  };


  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    const ctx = canvasElement.getContext('2d');

    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });
    // store pose instance for seeking processing
    poseRef.current = pose;
    pose.setOptions({
      modelComplexity: 0,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    pose.onResults((results) => {
      if (!results.poseLandmarks) return;
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      // draw only selected landmarks and connections
      const w = videoElement.videoWidth;
      const h = videoElement.videoHeight;
      const fullLm = results.poseLandmarks;
      // map selected landmarks
      const landmarkMap = new Map(LANDMARK_IDX.map(i => [i, fullLm[i]]));
      ctx.fillStyle = 'blue';
      ctx.strokeStyle = 'yellow';
      ctx.lineWidth = 2;
      // draw points
      landmarkMap.forEach(l => {
        const x = l.x * w;
        const y = l.y * h;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();
      });
      // draw connections
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
      const lm = fullLm;
      const newAngles = {
        elbow: getAngle(lm[12], lm[14], lm[16]),
        shoulder: getAngle(lm[24], lm[12], lm[14]),
        hip: getAngle(lm[12], lm[24], lm[26]),
        knee: getAngle(lm[24], lm[26], lm[28]),
        ankle: getAngle(lm[26], lm[28], lm[32]),
      };
      setAngles(newAngles);
      // update rep counter with new elbow angle
      const newCount = repetitionCounter.update(newAngles.elbow);
      setReps(newCount);
      // update current state and state sequence for display
      setCurrState(repetitionCounter.state_tracker.curr_state);
      setStateSeq([...repetitionCounter.state_tracker.state_seq]);
    });

    let camera;
    if (mode === 'live') {
      camera = new Camera(videoElement, {
        onFrame: async () => { await pose.send({ image: videoElement }); },
        width: 640,
        height: 480,
      });
      camera.start();
    } else {
      let rafId;
      const onPlay = async () => {
        if (videoElement.paused || videoElement.ended) return;
        await pose.send({ image: videoElement });
        rafId = requestAnimationFrame(onPlay);
      };
      videoElement.addEventListener('play', onPlay);
      return () => {
        videoElement.removeEventListener('play', onPlay);
        if (rafId) cancelAnimationFrame(rafId);
      };
    }
    return () => {
      if (camera) camera.stop();
    };
  }, [mode]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
    const url = URL.createObjectURL(file);
    fileUrlRef.current = url;
    const video = videoRef.current;
    video.srcObject = null;
    video.src = url;
    video.play();
    // reset repetition counter for new video
    repetitionCounter.reset();
    setReps(0);
    setCurrState(0);
    setStateSeq([]);
    setAngles({});
  };

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
      </div>
      <div className="video-container">
        <video ref={videoRef} className="video" autoPlay muted playsInline />
        <canvas ref={canvasRef} className="overlay" />
      </div>
      {/* file-mode playback controls (repeat & seek) */}
      {mode === 'file' && (
        <div className="file-controls">
          <button onClick={() => {
            // replay from start
            if (videoRef.current) {
              videoRef.current.currentTime = 0;
              videoRef.current.play();
            }
            // reset counters
            repetitionCounter.reset();
            setReps(0);
            setCurrState(0);
            setStateSeq([]);
            setAngles({});
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
        <textarea className="angles-text" rows={5} readOnly value={
          `Elbow: ${angles.elbow?.toFixed(2) || ''}\n` +
          `Shoulder: ${angles.shoulder?.toFixed(2) || ''}\n` +
          `Hip: ${angles.hip?.toFixed(2) || ''}\n` +
          `Knee: ${angles.knee?.toFixed(2) || ''}\n` +
          `Ankle: ${angles.ankle?.toFixed(2) || ''}`
        } />
        <textarea
          className="greeting-text"
          rows={5}
          readOnly
          value={
            `Reps: ${reps}\n` +
            `Seq: [${stateSeq.join(', ')}]\n` +
            `State: ${currState}`
          }
        />
      </div>
    </div>
  );
};

export default PushupsJsPage;
