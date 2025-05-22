from fastapi import APIRouter

# Router for evaluation endpoint
router = APIRouter()

@router.get("/eval")
async def get_eval():
    """
    Endpoint for pose evaluation page message.
    """
    return {"message": "This is your pose evaluation page"}