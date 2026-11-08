import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from src.app import app

ACTIVITIES_PATH = Path(__file__).resolve().parents[1] / "src" / "activities.json"
BASE_ACTIVITIES = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"],
        "category": "Academic",
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"],
        "category": "Technology",
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"],
        "category": "Athletics",
    },
    "Soccer Team": {
        "description": "Join the school soccer team and compete in matches",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM",
        "max_participants": 22,
        "participants": ["liam@mergington.edu", "noah@mergington.edu"],
        "category": "Athletics",
    },
    "Basketball Team": {
        "description": "Practice and play basketball with the school team",
        "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["ava@mergington.edu", "mia@mergington.edu"],
        "category": "Athletics",
    },
    "Art Club": {
        "description": "Explore your creativity through painting and drawing",
        "schedule": "Thursdays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["amelia@mergington.edu", "harper@mergington.edu"],
        "category": "Arts",
    },
    "Drama Club": {
        "description": "Act, direct, and produce plays and performances",
        "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 20,
        "participants": ["ella@mergington.edu", "scarlett@mergington.edu"],
        "category": "Arts",
    },
    "Math Club": {
        "description": "Solve challenging problems and participate in math competitions",
        "schedule": "Tuesdays, 3:30 PM - 4:30 PM",
        "max_participants": 10,
        "participants": ["james@mergington.edu", "benjamin@mergington.edu"],
        "category": "Academic",
    },
    "Debate Team": {
        "description": "Develop public speaking and argumentation skills",
        "schedule": "Fridays, 4:00 PM - 5:30 PM",
        "max_participants": 12,
        "participants": ["charlotte@mergington.edu", "henry@mergington.edu"],
        "category": "Leadership",
    },
    "GitHub Skills": {
        "description": "Learn practical coding, Git workflows, and collaboration skills through GitHub projects",
        "schedule": "Wednesdays, 3:30 PM - 5:00 PM",
        "max_participants": 18,
        "participants": [],
        "category": "Technology",
    },
}

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_activities_file():
    with ACTIVITIES_PATH.open("w", encoding="utf-8") as file:
        json.dump(BASE_ACTIVITIES, file, indent=2)
    yield
    with ACTIVITIES_PATH.open("w", encoding="utf-8") as file:
        json.dump(BASE_ACTIVITIES, file, indent=2)


def test_activities_include_github_skills():
    response = client.get("/activities")
    assert response.status_code == 200
    activities = response.json()
    assert "GitHub Skills" in activities


def test_teacher_signup_requires_authentication():
    response = client.post(
        "/activities/GitHub Skills/signup?email=student@mergington.edu"
    )
    assert response.status_code == 401


def test_teacher_can_unregister_student():
    teacher_auth = ("teacher", "teacherpass")

    response = client.post(
        "/activities/GitHub Skills/signup?email=first-student@mergington.edu",
        auth=teacher_auth,
    )
    assert response.status_code == 200

    response = client.delete(
        "/activities/GitHub Skills/unregister?email=first-student@mergington.edu",
        auth=teacher_auth,
    )
    assert response.status_code == 200
