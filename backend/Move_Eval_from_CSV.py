import numpy as np
import os
import csv
import pandas as pd
import matplotlib.pyplot as plt
import io
import base64

from matplotlib.colors import ListedColormap


class Move_Eval_from_CSV:     #  Evaluating angle and exercise from CSV file
    
    def __init__(self, dataframe):
        self.df = dataframe
        
        
    def calculate_angle(self, point1, point2, point3):
        """
        Berechnet den Winkel zwischen drei Punkten.
        point2 ist der Scheitelpunkt des Winkels.
        """
        angles = []
        for i in range(len(self.df)):
            x1, y1 = self.df.iloc[i][point1], self.df.iloc[i][f'y{point1[1:]}']
            x2, y2 = self.df.iloc[i][point2], self.df.iloc[i][f'y{point2[1:]}']
            x3, y3 = self.df.iloc[i][point3], self.df.iloc[i][f'y{point3[1:]}']
            
            # Vektoren berechnen
            a = np.array([x1 - x2, y1 - y2])
            b = np.array([x3 - x2, y3 - y2])
            
            # Winkel berechnen
            cos_theta = np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
            angle = np.arccos(np.clip(cos_theta, -1.0, 1.0))
            angle_deg = np.degrees(angle)
            
            angles.append(angle_deg)
        return angles

    def valuating_elbow_angles(self, row):
        angle = row['Elbow_Angle']
        if 160 <= angle <= 180:
            return "perfect"
        elif 140 <= angle < 160 or 180 < angle <= 190:
            return "good"
        elif 120 <= angle < 140 or 190 < angle <= 200:
            return "acceptable"
        elif 100 <= angle < 120 or 200 < angle <= 210:
            return "bad"
        else:
            return "outofrange"

    def valuating_shoulder_angles(self, row):
        angle = row['Shoulder_Angle']   
        if 30 <= angle <= 60:
            return "perfect"
        elif 20 <= angle < 30 or 60 < angle <= 70:
            return "good"
        elif 10 <= angle < 20 or 70 < angle <= 80:
            return "acceptable"
        elif 0 <= angle < 10 or 80 < angle <= 90:
            return "bad"
        else:
            return "outofrange"

    def valuating_hip_angles(self, row):
        angle = row['Hip_Angle']        
        if 175 <= angle <= 185:
            return "perfect"
        elif 170 <= angle < 175 or 185 < angle <= 190:
            return "good"
        elif 165 <= angle < 170 or 190 < angle <= 195:
            return "acceptable"
        elif 150 <= angle < 165 or 195 < angle <= 200:
            return "bad"
        else:
            return "outofrange"

    def valuating_knee_angles(self, row):
        angle = row['Knee_Angle']        
        if 175 <= angle <= 185:
            return "perfect"
        elif 170 <= angle < 175 or 185 < angle <= 190:
            return "good"
        elif 165 <= angle < 170 or 190 < angle <= 195:
            return "acceptable"
        elif 150 <= angle < 165 or 195 < angle <= 200:
            return "bad"
        else:
            return "outofrange"

    def valuating_pose(self, row):
        hip_angle = row['Hip_Angle']
        knee_angle = row['Knee_Angle']
    
        if 175 <= hip_angle <= 180 and 170 <= knee_angle <= 180:
            return "perfect"
        elif 170 <= hip_angle <= 180 and 165 <= knee_angle <= 180:
            return "good"
        elif 165 <= hip_angle <= 180 and 165 <= knee_angle <= 180:
            return "acceptable"
        else:
            return "bad"
        
        # Write ratings to df
    def evaluate_angles(self):       
        self.df['Hip_Rating'] = self.df.apply(self.valuating_hip_angles, axis=1)
        self.df['Knee_Rating'] = self.df.apply(self.valuating_knee_angles, axis=1)
        self.df['Shoulder_Rating'] = self.df.apply(self.valuating_shoulder_angles, axis=1)
        self.df['Elbow_Rating'] = self.df.apply(self.valuating_elbow_angles, axis=1)
        self.df['Straight_Back'] = self.df.apply(self.valuating_pose, axis=1)
        return self.df

        # Hauptfunktion zur Bewertung eines Bewegungsablaufs (ganzer DataFrame)
    def evaluate_pushup_sequence(self, intervall=10, schwelle=0.03):
        results_list = []
        df= self.df

        for i in range(len(df)):
            row = df.iloc[i]
            result = {}
            score = 0

            # 1. Körper in Linie (Schulter–Hüfte–Fuß = gestreckter Rücken)
            try:
                shoulder = [row["x11"], row["y11"]]
                hip = [row["x23"], row["y23"]]
                ankle = [row["x27"], row["y27"]]
                angle_body = self.calculate_angle(shoulder, hip, ankle)
                result["Körper in Linie"] = 170 <= angle_body <= 190
                score += result["Körper in Linie"]
            except:
                result["Körper in Linie"] = False

            # 2. Ellbogenwinkel korrekt (links)
            try:
                shoulder = [row["x11"], row["y11"]]
                elbow = [row["x13"], row["y13"]]
                wrist = [row["x15"], row["y15"]]
                angle_elbow = self.calculate_angle(shoulder, elbow, wrist)
                result["Ellbogenwinkel korrekt"] = 80 <= angle_elbow <= 100
                score += result["Ellbogenwinkel korrekt"]
            except:
                result["Ellbogenwinkel korrekt"] = False

            # 3. Kopf neutral (Nase in Linie mit Wirbelsäule)
            try:
                nose = [row["x0"], row["y0"]]
                shoulder = [row["x11"], row["y11"]]
                hip = [row["x23"], row["y23"]]
                angle_head = self.calculate_angle(shoulder, nose, hip)
                result["Kopf neutral"] = 150 <= angle_head <= 210
                score += result["Kopf neutral"]
            except:
                result["Kopf neutral"] = False

            # 4. Bewegungstiefe ausreichend (Schultery >= 0.45)
            try:
                result["Bewegungstiefe ausreichend"] = row["y11"] >= 0.45
                score += result["Bewegungstiefe ausreichend"]
            except:
                result["Bewegungstiefe ausreichend"] = False

            # 5. Kein Durchhängen im Rücken (Hüfte nicht tiefer als Schulter + Toleranz)
            try:
                result["Kein Durchhängen im Rücken"] = row["y23"] <= (row["y11"] + 0.05)
                score += result["Kein Durchhängen im Rücken"]
            except:
                result["Kein Durchhängen im Rücken"] = False

            # 6. Gleichmäßige Bewegung (Veränderung y11 im Intervall)
            try:
                if i >= intervall:
                    prev_row = df.iloc[i - intervall]
                    delta = abs(row["y11"] - prev_row["y11"])
                    result["Gleichmäßige Bewegung"] = delta < schwelle
                    score += result["Gleichmäßige Bewegung"]
                else:
                    result["Gleichmäßige Bewegung"] = None
            except:
                result["Gleichmäßige Bewegung"] = None

            # 7. Symmetrie (Ellbogenwinkel links ≈ rechts)
            try:
                l_angle = self.calculate_angle([row["x11"], row["y11"]],
                                          [row["x13"], row["y13"]],
                                          [row["x15"], row["y15"]])
                r_angle = self.calculate_angle([row["x12"], row["y12"]],
                                          [row["x14"], row["y14"]],
                                          [row["x16"], row["y16"]])
                result["Symmetrie"] = abs(l_angle - r_angle) <= 10
                score += result["Symmetrie"]
            except:
                result["Symmetrie"] = False

            # Finaler Score
            result["Score (max 7)"] = score
            results_list.append(result)

        self.df = pd.concat([df.reset_index(drop=True), pd.DataFrame(results_list)], axis=1)
        return self.df
        
    def plot_heatmap(self):
        regel_spalten = [
            "Körper in Linie",
            "Ellbogenwinkel korrekt",
            "Kopf neutral",
            "Bewegungstiefe ausreichend",
            "Kein Durchhängen im Rücken",
            "Gleichmäßige Bewegung",
            "Symmetrie"
        ]
        
        # Fülle NaN mit False und wandle Objekttypen in bool um, um Downcasting-Warnung zu vermeiden
        tmp = self.df[regel_spalten].fillna(False)
        # Explizit Objekttypen anpassen bevor in int downgecastet wird
        tmp = tmp.infer_objects(copy=False)
        heatmap_data = tmp.astype(int).to_numpy().T
        frame_count = heatmap_data.shape[1]
        
        grau_cmap = ListedColormap(["#dddddd", "#222222"])
        
        fig, ax = plt.subplots(figsize=(20, 10))  # Größere Figur
        ax.imshow(heatmap_data, aspect='auto', cmap=grau_cmap, interpolation='nearest')
        
        for x in range(1, frame_count):
            ax.axvline(x - 0.5, color='gray', linewidth=0.3)
        
        ax.set_yticks(np.arange(len(regel_spalten)))
        ax.set_yticklabels(regel_spalten, fontsize=24)
        ax.set_xticks([])
        ax.set_xlabel("Frame Index", fontsize=24)
        ax.set_ylabel("", fontsize=24)
        ax.set_title("Regel-Erfüllung je Frame", fontsize=28)
      
        
        # Speichern des Plots in ein BytesIO-Objekt (statt anzeigen)
        buf = io.BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight')
        plt.close(fig)  # Speicher freigeben, nicht anzeigen
        buf.seek(0)
        
        # Optional: Base64-String erzeugen für direkte Rückgabe
        heat_map_base64 = base64.b64encode(buf.read()).decode('utf-8')
        return heat_map_base64
        
        

