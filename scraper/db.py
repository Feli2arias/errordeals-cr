import os

from supabase import create_client, Client


def get_client() -> Client:
    url: str = os.environ["SUPABASE_URL"]
    key: str = os.environ["SUPABASE_SERVICE_KEY"]
    return create_client(url, key)
