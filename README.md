# Fitness App

## Setup

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## Notes

- Place your background image in `frontend/public` and name it `background.jpg` (or adjust `frontend/src/components/LandingPage.css` to use a different filename).
    - Example: `frontend/public/background.jpg`
