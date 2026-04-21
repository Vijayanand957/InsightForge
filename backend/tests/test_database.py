import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.database_models import User

def test_database_connection():
    """Test database connection and model creation"""
    engine = create_engine("postgresql://insightforge:password123@localhost:5432/insightforge")
    TestingSessionLocal = sessionmaker(bind=engine)
    db = TestingSessionLocal()

    # Fix: Use text() for raw SQL
    result = db.execute(text("SELECT 1")).scalar()
    assert result == 1
    db.close()

def test_user_model():
    """Test User model creation and retrieval"""
    # Use main database for this test
    engine = create_engine("postgresql://insightforge:password123@localhost:5432/insightforge")
    TestingSessionLocal = sessionmaker(bind=engine)
    db = TestingSessionLocal()

    # Clean up any existing test user
    db.execute(text("DELETE FROM users WHERE email = 'model@example.com'"))
    db.commit()

    # Create test user
    user = User(
        email="model@example.com",
        full_name="Model Test",
        hashed_password="hashed_pw"
    )
    db.add(user)
    db.commit()

    # Retrieve and verify
    retrieved = db.query(User).filter(User.email == "model@example.com").first()
    assert retrieved is not None
    assert retrieved.full_name == "Model Test"

    # Cleanup
    db.delete(retrieved)
    db.commit()
    db.close()