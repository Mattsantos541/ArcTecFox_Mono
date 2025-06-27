import os
from dotenv import load_dotenv
from supabase import create_client
import logging

logger = logging.getLogger(__name__)
load_dotenv()

def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")

    if not url or not key:
        logger.error("❌ Missing Supabase credentials")
        raise ValueError("Missing Supabase credentials")

    logger.info("✅ Supabase client initialized")
    return create_client(url, key)

def get_assets():
    try:
        supabase = get_supabase_client()
        response = supabase.table('assets').select("*").execute()

        if response and "data" in response:
            logger.info(f"✅ Supabase response: {response.data}")
            return response.data
        else:
            logger.warning("⚠️ No data found in assets table.")
            return []

    except Exception as e:
        logger.error(f"❌ Database error: {str(e)}")
        raise Exception(f"Failed to fetch assets: {str(e)}")
