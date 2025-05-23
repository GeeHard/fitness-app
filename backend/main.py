from fastapi import FastAPI, File, UploadFile, Body
import os
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from pushups import PushupProcessor
from repcounter import repetition_counter  # Globale Instanz importieren
from eval import router as eval_router

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# include evaluation router
app.include_router(eval_router)

processor = PushupProcessor()

@app.post('/frame')
async def process_frame(frame: UploadFile = File(...)):
    image_bytes = await frame.read()

    # Analyse des Bildes
    landmarks, angles = processor.process(image_bytes)

    # Beispiel: Ellbogenwinkel als Input für Wiederholungszähler
    elbow_angle = angles.get('elbow', None)
    reps = None
    if elbow_angle is not None:
        reps = repetition_counter.update(elbow_angle)

    # include repetition-counter state for frontend convenience
    return {
        'landmarks': landmarks,
        'angles': angles,
        'repetitions': reps,
        'state_sequence': repetition_counter.state_tracker['state_seq'],
        'current_state': repetition_counter.state_tracker['curr_state'],
        'previous_state': repetition_counter.state_tracker['prev_state'],
        'improper_moves': repetition_counter.state_tracker['IMPROPER_MOVE'],
    }

@app.get('/greeting')
async def get_greeting():
    return {
        'repetitions': repetition_counter.state_tracker['REPETITIONS'],
        'state_sequence': repetition_counter.state_tracker['state_seq'],
        'current_state': repetition_counter.state_tracker['curr_state'],
        'previous_state': repetition_counter.state_tracker['prev_state'],
        'improper_moves': repetition_counter.state_tracker['IMPROPER_MOVE']
    }
@app.post('/reset')
async def reset_counter():
    """
    Reset the repetition counter state to initial values.
    """
    repetition_counter.reset()
    return {'status': 'ok'}
@app.post('/posejs_csv', summary='Save PoseJS CSV on server')
async def save_posejs_csv(csv_data: str = Body(..., media_type='text/csv')):
    """
    Save the uploaded CSV data to PoseJS.csv in the backend folder, overwriting existing file.
    """
    # Determine file path in this backend directory
    file_path = os.path.join(os.path.dirname(__file__), 'PoseJS.csv')
    # Write CSV data, overwrite if exists
    with open(file_path, 'w', encoding='utf-8', newline='') as f:
        f.write(csv_data)
    return {'status': 'saved', 'path': file_path}


if __name__ == '__main__':
    uvicorn.run('main:app', host='0.0.0.0', port=8000, reload=True)

