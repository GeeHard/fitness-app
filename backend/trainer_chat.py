from fastapi import APIRouter, Query
import os

# Router for trainer chat endpoints
router = APIRouter()

# Base directory for CSV files
BASE_PATH = os.path.abspath(os.path.dirname(__file__))
CSV_FILE = 'pushups.csv'

@router.get("/trainer_chat")
async def trainer_chat(
    question: str = Query(..., description="User question for the trainer"),
    filename: str = Query(None, description="Optional CSV filename to contextualize the chat")
):
    """
    Simple trainer chat endpoint. Returns a placeholder response based on the question and CSV context.
    """
    # Determine which CSV file to use
    chosen = filename if filename else CSV_FILE
    safe_name = os.path.basename(chosen)
    file_path = os.path.join(BASE_PATH, safe_name)
    if not os.path.exists(file_path):
        return {"response": f"CSV-Datei nicht gefunden: {safe_name}"}

    # Placeholder chat logic
    response_text = (
        f"Du hast gefragt: '{question}'.\n\n"
        f"(Trainerantwort für Datei {safe_name} ist hier ein Platzhalter.)"
    )
    return {"response": response_text}