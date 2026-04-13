import os
from unittest.mock import patch, MagicMock


def test_get_client_uses_env_vars():
    with patch("db.create_client") as mock_create:
        mock_create.return_value = MagicMock()
        os.environ["SUPABASE_URL"] = "https://test.supabase.co"
        os.environ["SUPABASE_SERVICE_KEY"] = "test-key"

        from db import get_client
        get_client()

        mock_create.assert_called_once_with("https://test.supabase.co", "test-key")


def test_get_client_raises_if_env_missing():
    env_clean = {k: v for k, v in os.environ.items() if k not in ("SUPABASE_URL", "SUPABASE_SERVICE_KEY")}
    with patch.dict(os.environ, env_clean, clear=True):
        with __import__("pytest").raises(KeyError):
            from importlib import reload
            import db as db_module
            reload(db_module)
            db_module.get_client()
