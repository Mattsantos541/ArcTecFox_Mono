"""
Authentication middleware for FastAPI using Supabase JWTs
"""
import os
import logging
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client
import httpx
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# HTTP Bearer token security scheme
security = HTTPBearer(auto_error=False)

class AuthenticatedUser:
    """Container for authenticated user data"""
    def __init__(self, user_data: Dict[str, Any], token: str):
        self.id = user_data.get('id')
        self.email = user_data.get('email')
        self.user_metadata = user_data.get('user_metadata', {})
        self.app_metadata = user_data.get('app_metadata', {})
        self.token = token
        self.data = user_data  # Keep full user data

async def verify_supabase_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> AuthenticatedUser:
    """
    Verify the Supabase JWT token and return authenticated user.
    This is the main authentication dependency for protected endpoints.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = credentials.credentials
    supabase_url = os.getenv("SUPABASE_URL")
    
    if not supabase_url:
        logger.error("SUPABASE_URL not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service not configured"
        )
    
    # Verify token with Supabase Auth API
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{supabase_url}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": os.getenv("SUPABASE_ANON_KEY")
                }
            )
            
            if response.status_code == 200:
                user_data = response.json()
                logger.info(f"✅ Authenticated user: {user_data.get('email')}")
                return AuthenticatedUser(user_data, token)
            elif response.status_code == 401:
                logger.warning(f"❌ Invalid or expired token")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired token",
                    headers={"WWW-Authenticate": "Bearer"}
                )
            elif response.status_code == 403:
                logger.error(f"❌ Forbidden: Check SUPABASE_ANON_KEY permissions. Response: {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired token",
                    headers={"WWW-Authenticate": "Bearer"}
                )
            else:
                logger.error(f"❌ Unexpected auth response: {response.status_code}, Body: {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Authentication service error"
                )
    except httpx.RequestError as e:
        logger.error(f"❌ Auth service connection error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication error"
        )

def get_user_supabase_client(token: str):
    """
    Create a Supabase client with user's token to respect RLS policies.
    This client will only have access to data the user is authorized to see.
    """
    url = os.getenv("SUPABASE_URL")
    anon_key = os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not anon_key:
        raise ValueError("Supabase configuration missing")
    
    # Create client with user's token - this respects RLS
    return create_client(
        url,
        anon_key,
        options={
            "headers": {
                "Authorization": f"Bearer {token}"
            }
        }
    )

async def verify_site_access(
    site_id: str,
    user: AuthenticatedUser = Depends(verify_supabase_token)
) -> Optional[str]:
    """
    Verify user has access to a specific site and return their role.
    Returns role_id if user has access, raises 403 if not.
    """
    try:
        # Use user's token to check access (respects RLS)
        client = get_user_supabase_client(user.token)
        
        # Check site_users table for user's role at this site
        result = client.table('site_users')\
            .select("role_id, roles(name)")\
            .eq('user_id', user.id)\
            .eq('site_id', site_id)\
            .single()\
            .execute()
        
        if not result.data:
            logger.warning(f"User {user.email} denied access to site {site_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No access to this site"
            )
        
        role_name = result.data.get('roles', {}).get('name') if result.data.get('roles') else result.data.get('role_id')
        logger.info(f"User {user.email} has {role_name} access to site {site_id}")
        return role_name
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking site access: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error verifying site access"
        )

async def require_admin_role(
    user: AuthenticatedUser = Depends(verify_supabase_token)
) -> AuthenticatedUser:
    """
    Verify user has admin role for at least one site.
    Use this for endpoints that require admin privileges.
    """
    try:
        client = get_user_supabase_client(user.token)
        
        # Check if user is admin for any site
        result = client.table('site_users')\
            .select("site_id, roles(name)")\
            .eq('user_id', user.id)\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No site access found"
            )
        
        # Check if user has admin role for any site
        is_admin = any(
            site.get('roles', {}).get('name') == 'admin' 
            for site in result.data
            if site.get('roles')
        )
        
        if not is_admin:
            logger.warning(f"User {user.email} attempted admin action without admin role")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking admin role: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error verifying admin access"
        )

# Optional: Create a dependency for optional authentication
async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[AuthenticatedUser]:
    """
    Optional authentication - returns user if token provided, None otherwise.
    Use for endpoints that have different behavior for authenticated vs anonymous.
    """
    if not credentials:
        return None
    
    try:
        return await verify_supabase_token(credentials)
    except HTTPException:
        return None