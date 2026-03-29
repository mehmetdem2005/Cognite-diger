import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import io

from fastapi.testclient import TestClient

from app.config import Settings
from app.dependencies import reset_services


@pytest.fixture(autouse=True)
def _reset():
    """Reset singletons between tests."""
    reset_services()
    yield
    reset_services()


@pytest.fixture
def settings():
    return Settings(groq_api_key="test-key-123")


@pytest.fixture
def client():
    """Create a test client with GROQ_API_KEY set."""
    import os

    os.environ["GROQ_API_KEY"] = "test-key-123"
    reset_services()

    from main import create_app

    app = create_app()
    with TestClient(app) as c:
        yield c

    os.environ.pop("GROQ_API_KEY", None)
    reset_services()


@pytest.fixture
def client_no_key():
    """Create a test client without GROQ_API_KEY."""
    import os

    os.environ.pop("GROQ_API_KEY", None)
    os.environ["GROQ_API_KEY"] = ""
    reset_services()

    from main import create_app

    app = create_app()
    with TestClient(app) as c:
        yield c

    reset_services()
