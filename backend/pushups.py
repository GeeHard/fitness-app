import os
import csv
import math

import cv2
import numpy as np
import mediapipe as mp

mp_pose = mp.solutions.pose
LANDMARK_IDX = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 31, 32]
CSV_FILE = 'pushups.csv'

def calculate_angle(a, b, c):
    ba = np.array([a.x - b.x, a.y - b.y, a.z - b.z])
    bc = np.array([c.x - b.x, c.y - b.y, c.z - b.z])
    cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    angle = np.degrees(np.arccos(np.clip(cosine_angle, -1.0, 1.0)))
    return angle

class PushupProcessor:
    def __init__(self):
        self.pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)
        if not os.path.exists(CSV_FILE):
            with open(CSV_FILE, mode='w', newline='') as f:
                writer = csv.writer(f)
                header = []
                for idx in LANDMARK_IDX:
                    header += [f'x{idx}', f'y{idx}', f'z{idx}', f'v{idx}']
                header += ['elbow', 'shoulder', 'hip', 'knee', 'ankle']
                writer.writerow(header)

    def process(self, image_bytes):
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
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
            row = []
            for pt in landmarks_out:
                row += [pt['x'], pt['y'], pt['z'], pt['visibility']]
            row += [angles['elbow'], angles['shoulder'], angles['hip'], angles['knee'], angles['ankle']]
            with open(CSV_FILE, mode='a', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(row)
        return landmarks_out, angles
