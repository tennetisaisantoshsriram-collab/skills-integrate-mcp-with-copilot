"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

import json
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).parent
ACTIVITIES_PATH = BASE_DIR / "activities.json"
TEACHERS_PATH = BASE_DIR / "teachers.json"


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def save_json(path: Path, data):
    with path.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=2)


activities = load_json(ACTIVITIES_PATH)
teachers = load_json(TEACHERS_PATH)["teachers"]
security = HTTPBasic()


def reload_activities():
    global activities
    activities = load_json(ACTIVITIES_PATH)


def reload_teachers():
    global teachers
    teachers = load_json(TEACHERS_PATH)["teachers"]


app = FastAPI(
    title="Mergington High School API",
    description="API for viewing and signing up for extracurricular activities",
)

# Mount the static files directory
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")


def authenticate_teacher(credentials: HTTPBasicCredentials):
    reload_teachers()
    teacher = next(
        (
            item
            for item in teachers
            if item["username"] == credentials.username
            and item["password"] == credentials.password
        ),
        None,
    )
    if teacher is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid teacher credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return teacher


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/activities")
def get_activities():
    reload_activities()
    return activities


@app.post("/teachers/login")
def login_teacher(credentials: HTTPBasicCredentials = Depends(security)):
    authenticate_teacher(credentials)
    return {"message": f"Teacher {credentials.username} logged in", "username": credentials.username}


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(
    activity_name: str,
    email: str = Query(...),
    credentials: HTTPBasicCredentials = Depends(security),
):
    """Sign up a student for an activity."""
    authenticate_teacher(credentials)
    reload_activities()

    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    activity = activities[activity_name]
    normalized_email = email.strip().lower()

    if normalized_email in activity["participants"]:
        raise HTTPException(status_code=400, detail="Student is already signed up")

    if len(activity["participants"]) >= activity["max_participants"]:
        raise HTTPException(status_code=400, detail="Activity is full")

    activity["participants"].append(normalized_email)
    save_json(ACTIVITIES_PATH, activities)
    return {"message": f"Signed up {normalized_email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(
    activity_name: str,
    email: str = Query(...),
    credentials: HTTPBasicCredentials = Depends(security),
):
    """Unregister a student from an activity."""
    authenticate_teacher(credentials)
    reload_activities()

    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    activity = activities[activity_name]
    normalized_email = email.strip().lower()

    if normalized_email not in activity["participants"]:
        raise HTTPException(status_code=400, detail="Student is not signed up for this activity")

    activity["participants"].remove(normalized_email)
    save_json(ACTIVITIES_PATH, activities)
    return {"message": f"Unregistered {normalized_email} from {activity_name}"}
