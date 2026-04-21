from app.config import settings

def test_config_loaded():
    """Test that configuration loads correctly"""
    assert settings.APP_NAME == "InsightForge"
    assert settings.DEBUG is True
    assert settings.DATABASE_URL is not None