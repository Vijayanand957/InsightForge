import os  # Add this line at the top
import secrets
import string
from datetime import datetime, timedelta
from typing import Optional
import hashlib
import base64
import hmac
from jose import jwt
from passlib.context import CryptContext

from app.config import settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# API key generation
def generate_api_key(length: int = 32) -> str:
    """Generate a secure API key"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def generate_secure_token(length: int = 64) -> str:
    """Generate a secure random token"""
    return secrets.token_urlsafe(length)

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.JWTError:
        return None

def generate_csrf_token() -> str:
    """Generate a CSRF token"""
    return secrets.token_urlsafe(32)

def validate_csrf_token(token: str, csrf_token: str) -> bool:
    """Validate CSRF token"""
    return hmac.compare_digest(token, csrf_token)

def generate_password_reset_token(user_id: int) -> str:
    """Generate a password reset token"""
    data = {
        "user_id": user_id,
        "purpose": "password_reset",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(data, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def verify_password_reset_token(token: str) -> Optional[int]:
    """Verify password reset token and return user_id"""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("purpose") == "password_reset":
            return payload.get("user_id")
    except jwt.JWTError:
        return None
    return None

def generate_email_verification_token(email: str) -> str:
    """Generate an email verification token"""
    data = {
        "email": email,
        "purpose": "email_verification",
        "exp": datetime.utcnow() + timedelta(days=1)
    }
    return jwt.encode(data, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def verify_email_verification_token(token: str) -> Optional[str]:
    """Verify email verification token and return email"""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("purpose") == "email_verification":
            return payload.get("email")
    except jwt.JWTError:
        return None
    return None

def encrypt_sensitive_data(data: str) -> str:
    """Encrypt sensitive data (simplified - for production use proper encryption)"""
    # This is a simplified version. In production, use proper encryption like Fernet
    salt = secrets.token_bytes(16)
    key = hashlib.pbkdf2_hmac('sha256', settings.JWT_SECRET_KEY.encode(), salt, 100000)
    
    # Simple XOR encryption for demonstration
    # In production, use proper encryption libraries
    encrypted = bytes([ord(c) ^ key[i % len(key)] for i, c in enumerate(data)])
    
    return base64.b64encode(salt + encrypted).decode()

def decrypt_sensitive_data(encrypted_data: str) -> str:
    """Decrypt sensitive data"""
    try:
        decoded = base64.b64decode(encrypted_data)
        salt = decoded[:16]
        encrypted = decoded[16:]
        
        key = hashlib.pbkdf2_hmac('sha256', settings.JWT_SECRET_KEY.encode(), salt, 100000)
        
        # Simple XOR decryption
        decrypted = bytes([encrypted[i] ^ key[i % len(key)] for i in range(len(encrypted))])
        
        return decrypted.decode()
    except:
        return ""

def generate_secure_filename(original_filename: str) -> str:
    """Generate a secure filename to prevent path traversal attacks"""
    # Extract extension
    _, extension = os.path.splitext(original_filename)
    
    # Generate random filename
    random_part = secrets.token_urlsafe(16)
    
    # Sanitize extension
    extension = ''.join(c for c in extension if c.isalnum() or c in '._-').lower()
    
    return f"{random_part}{extension}"

def sanitize_input(input_string: str) -> str:
    """Sanitize user input to prevent injection attacks"""
    # Remove potentially dangerous characters
    sanitized = input_string.replace('<', '&lt;').replace('>', '&gt;')
    sanitized = sanitized.replace('"', '&quot;').replace("'", '&#39;')
    sanitized = sanitized.replace('&', '&amp;')
    
    # Remove script tags
    import re
    sanitized = re.sub(r'<script.*?>.*?</script>', '', sanitized, flags=re.IGNORECASE | re.DOTALL)
    
    return sanitized

def validate_file_upload(file_content: bytes, max_size: int, allowed_types: list) -> bool:
    """Validate file upload for security"""
    # Check file size
    if len(file_content) > max_size:
        return False
    
    # Check file type (simple content check)
    # In production, use proper file type validation libraries
    if file_content.startswith(b'%PDF'):
        return 'pdf' in allowed_types
    elif file_content.startswith(b'\x89PNG'):
        return 'png' in allowed_types
    elif file_content.startswith(b'\xff\xd8'):
        return 'jpg' in allowed_types
    elif file_content.startswith(b'PK'):  # ZIP/Excel
        return any(ext in allowed_types for ext in ['zip', 'xlsx', 'docx'])
    
    # For CSV, check if it's mostly text
    try:
        file_content.decode('utf-8')
        return 'csv' in allowed_types or 'txt' in allowed_types
    except:
        pass
    
    return False

def rate_limit_key(client_ip: str, endpoint: str) -> str:
    """Generate a key for rate limiting"""
    return f"rate_limit:{client_ip}:{endpoint}"

def check_rate_limit(redis_client, key: str, limit: int, window: int) -> bool:
    """Check if request is within rate limit"""
    import time
    
    current_time = int(time.time())
    window_start = current_time - window
    
    # Remove old entries
    redis_client.zremrangebyscore(key, 0, window_start)
    
    # Count requests in current window
    request_count = redis_client.zcard(key)
    
    if request_count < limit:
        # Add current request
        redis_client.zadd(key, {str(current_time): current_time})
        redis_client.expire(key, window)
        return True
    
    return False