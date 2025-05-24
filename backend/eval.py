from fastapi import APIRouter
import os
import csv
import math
import pandas as pd
import matplotlib
# Use non-interactive Agg backend for headless environments (no Qt)
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io
import base64
from typing import Optional


BASE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__))) 
CSV_FILE = 'pushups.csv'
# Module-level CSV loading removed for dynamic file selection

# Router for evaluation endpoint
router = APIRouter()

@router.get('/csv_files')
async def list_csv_files():
    """
    List all CSV files available in the backend directory.
    """
    try:
        files = [f for f in os.listdir(BASE_PATH) if f.lower().endswith('.csv')]
    except Exception:
        files = []
    return {'files': files}

@router.get("/eval")
async def get_eval(filename: Optional[str] = None):
    """
    Endpoint for pose evaluation page message with CSV preview.
    """
    # Determine which CSV file to load
    chosen = filename if filename else CSV_FILE
    safe_name = os.path.basename(chosen)
    file_path = os.path.join(BASE_PATH, safe_name)
    if os.path.exists(file_path):
        try:
            df_local = pd.read_csv(file_path)
            preview = df_local.head().to_string()
            message = f"CSV Datei: {safe_name}\n\n{preview}"
            return {"message": message}
        except Exception as e:
            return {"error": f"Error reading CSV: {e}"}
    return {"error": "CSV file not found"}




    

def plot_diagram(df):
    # Plotten der Winkel
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.plot(df.index, df['hip'], color='green', label='Hip')
    ax.plot(df.index, df['knee'], color='black', label='Knee')
    ax.plot(df.index, df['shoulder'], color='red', label='Shoulder')
    ax.plot(df.index, df['elbow'], color='yellow', label='Elbow')
    ax.set_xlabel('Video Frames')
    ax.set_ylabel('Angle')
    ax.set_title("Joint Angles from Video")
    ax.legend()

    # Speichern des Plots in ein BytesIO-Objekt (statt anzeigen)
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight')
    plt.close(fig)  # Speicher freigeben, nicht anzeigen
    buf.seek(0)
    
    # Optional: Base64-String erzeugen für direkte Rückgabe
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    return img_base64


@router.get("/plot_image")
async def get_plot_image(filename: Optional[str] = None):
    """
    Return a plot image (base64) for the given CSV (or default) file.
    """
    chosen = filename if filename else CSV_FILE
    safe_name = os.path.basename(chosen)
    file_path = os.path.join(BASE_PATH, safe_name)
    if os.path.exists(file_path):
        try:
            df_local = pd.read_csv(file_path)
            img_base64 = plot_diagram(df_local)
            return {"image_base64": img_base64}
        except Exception as e:
            return {"error": f"Error plotting CSV: {e}"}
    return {"error": "CSV file not found"}



