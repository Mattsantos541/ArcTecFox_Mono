import os
from typing import Optional
from dotenv import load_dotenv
from supabase import create_client
import logging

logger = logging.getLogger(__name__)
load_dotenv()

def get_user_supabase_client(token: str):
    """
    Create a Supabase client with user's token to respect RLS policies.
    This should be the primary method for database access.
    
    Args:
        token: User's JWT token from Supabase Auth
    
    Returns:
        Supabase client that respects RLS policies
    """
    url = os.getenv("SUPABASE_URL")
    anon_key = os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not anon_key:
        logger.error("❌ Missing Supabase URL or anon key")
        raise ValueError("Missing Supabase credentials")
    
    # Create client with user's token - this respects RLS
    client = create_client(
        url,
        anon_key,
        options={
            "headers": {
                "Authorization": f"Bearer {token}"
            }
        }
    )
    logger.info("✅ User-scoped Supabase client initialized")
    return client

def get_service_supabase_client():
    """
    Create a Supabase client with service key that bypasses RLS.
    
    ⚠️ WARNING: Only use for system operations that require admin access:
    - Sending invitation emails (needs to read all sites/companies)
    - System maintenance tasks
    - Background jobs
    
    All usage should be logged for security auditing.
    """
    url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_KEY")  # Use same key name as existing system
    
    if not url or not service_key:
        logger.error("❌ Missing Supabase service credentials")
        raise ValueError("Missing Supabase service credentials")
    
    logger.warning("⚠️ Service Supabase client initialized - bypasses RLS")
    return create_client(url, service_key)

# Deprecated: Keep for backward compatibility but log usage
def get_supabase_client():
    """
    DEPRECATED: Use get_user_supabase_client() or get_service_supabase_client() instead.
    This function uses service key and bypasses RLS - migrate to user-scoped clients.
    """
    logger.warning("⚠️ DEPRECATED: get_supabase_client() called - migrate to get_user_supabase_client()")
    return get_service_supabase_client()

def get_assets(user_token: Optional[str] = None):
    """
    Fetch assets with optional user context.
    
    Args:
        user_token: Optional user JWT token. If provided, respects RLS.
                   If not provided, uses service key (deprecated).
    """
    try:
        if user_token:
            supabase = get_user_supabase_client(user_token)
            logger.info("Fetching assets with user context")
        else:
            logger.warning("⚠️ Fetching assets without user context - migrate to authenticated calls")
            supabase = get_service_supabase_client()
        
        response = supabase.table('assets').select("*").execute()

        if response and response.data:
            logger.info(f"✅ Found {len(response.data)} assets")
            return response.data
        else:
            logger.warning("⚠️ No data found in assets table.")
            return []

    except Exception as e:
        logger.error(f"❌ Database error: {str(e)}")
        raise Exception(f"Failed to fetch assets: {str(e)}")
