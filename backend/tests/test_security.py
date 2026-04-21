from app.core.security import hash_password, verify_password

def test_password_hashing():
    """Test password hashing and verification"""
    password = "SecurePassword123!"
    hashed = hash_password(password)

    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False