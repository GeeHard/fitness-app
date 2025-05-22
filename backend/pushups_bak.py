import os
import csv
import math

import cv2
import numpy as np
import mediapipe as mp

# Pfad der aktuellen Python-Datei
BASE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__))) 

mp_pose = mp.solutions.pose

# Landmarks indices to extract
LANDMARK_IDX = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 31, 32]

# CSV file will be created in the current working directory
CSV_FILE = 'pushups.csv'

def calculate_angle(a, b, c):
    ba = np.array([a.x - b.x, a.y - b.y, a.z - b.z])
    bc = np.array([c.x - b.x, c.y - b.y, c.z - b.z])
    cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    angle = np.degrees(np.arccos(np.clip(cosine_angle, -1.0, 1.0)))
    return angle

class PushupProcessor:
    
    def __init__(self):
        
        # Use lighter pose model for speed
        self.pose = mp_pose.Pose(
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
            model_complexity=0
        )
        
        # Control CSV logging via env var (default off for performance)
        self.log_csv = os.getenv('LOG_TO_CSV', 'false').lower() == 'true'
        
        # initialize frame counter
        self.frame_index = 0
        
        # On startup (each run), overwrite existing CSV if logging enabled
        if self.log_csv:
            # write header, first column is frame index
            with open(CSV_FILE, mode='w', newline='') as f:
                writer = csv.writer(f)
                # header: frame index + landmark coords + angle columns
                header = ['frame']
                for idx in LANDMARK_IDX:
                    header += [f'x{idx}', f'y{idx}', f'z{idx}', f'v{idx}']
                header += ['elbow', 'shoulder', 'hip', 'knee', 'ankle']
                writer.writerow(header)

    def process(self, image_bytes):
        
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Convert color and optionally downscale for faster processing
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # scale factor via env var IMG_SCALE (default 0.5)
        scale = float(os.getenv('IMG_SCALE', '0.5'))
        if scale != 1.0:
            h, w = img_rgb.shape[:2]
            img_rgb = cv2.resize(
                img_rgb,
                (int(w * scale), int(h * scale)),
                interpolation=cv2.INTER_LINEAR
            )
        results = self.pose.process(img_rgb)
        landmarks_out = []
        angles = {}
        if results.pose_landmarks:
            lm = results.pose_landmarks.landmark
            for idx in LANDMARK_IDX:
                l = lm[idx]
                landmarks_out.append({'idx': idx, 'x': l.x, 'y': l.y, 'z': l.z, 'visibility': l.visibility})
            angles['elbow'] = calculate_angle(lm[12], lm[14], lm[16])
            angles['shoulder'] = calculate_angle(lm[24], lm[12], lm[14])
            angles['hip'] = calculate_angle(lm[12], lm[24], lm[26])
            angles['knee'] = calculate_angle(lm[24], lm[26], lm[28])
            angles['ankle'] = calculate_angle(lm[26], lm[28], lm[32])
            
            # prepare CSV row: frame index + flattened landmarks + angles
            self.frame_index += 1
            row = [self.frame_index]
            for pt in landmarks_out:
                row += [pt['x'], pt['y'], pt['z'], pt['visibility']]
            row += [angles['elbow'], angles['shoulder'], angles['hip'], angles['knee'], angles['ankle']]
            
            # Append to CSV only if enabled (may slow down processing)
            if self.log_csv:
                with open(CSV_FILE, mode='a', newline='') as f:
                    writer = csv.writer(f)
                    writer.writerow(row)
        return landmarks_out, angles
    




    
    



