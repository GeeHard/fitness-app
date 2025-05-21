from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from pushups import PushupProcessor

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

processor = PushupProcessor()

@app.post('/frame')
async def process_frame(frame: UploadFile = File(...)):
    image_bytes = await frame.read()
    landmarks, angles = processor.process(image_bytes)
    return {'landmarks': landmarks, 'angles': angles}
 
@app.get('/greeting')
async def get_greeting():
    """Einfacher Endpunkt, um einen Begrüßungstext zu liefern."""
    return {'text': 'Hallo GeeHard'}

if __name__ == '__main__':
    uvicorn.run('main:app', host='0.0.0.0', port=8000, reload=True)
