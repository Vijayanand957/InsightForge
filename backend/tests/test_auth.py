import pytest
from fastapi.testclient import TestClient
from app.main import app
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

client = TestClient(app)

def test_register_user():
    """Test user registration endpoint"""
    # First, clean up any existing test user
    engine = create_engine("postgresql://insightforge:password123@localhost:5432/insightforge")
    Session = sessionmaker(bind=engine)
    db = Session()
    db.execute(text("DELETE FROM users WHERE email = 'test@example.com'"))
    db.commit()
    db.close()

    # Now test registration
    response = client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "full_name": "Test User",
        "password": "Test123!"
    })
    assert response.status_code in [200, 201]
    assert "id" in response.json()

def test_login_user():
    """Test user login endpoint"""
    response = client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "Test123!"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()