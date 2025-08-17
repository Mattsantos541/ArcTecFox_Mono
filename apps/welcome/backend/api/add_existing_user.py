"""
Add Existing User to Site API Endpoint

This endpoint adds an existing authenticated user directly to a site without requiring
an email invitation. This is Track 2 of the dual-track user management system.
"""

import logging
from fastapi import HTTPException, Depends
from pydantic import BaseModel, EmailStr
from auth import AuthenticatedUser, verify_supabase_token
from database import get_user_supabase_client

logger = logging.getLogger(__name__)

class AddExistingUserRequest(BaseModel):
    """Request model for adding existing user to site"""
    email: EmailStr
    site_id: str
    role_id: str = None  # Optional, defaults to basic user role
    can_edit: bool = False

class AddExistingUserResponse(BaseModel):
    """Response model for add existing user"""
    success: bool
    message: str
    user_id: str = None
    site_user_id: str = None

async def add_existing_user_to_site(
    request: AddExistingUserRequest,
    admin_user: AuthenticatedUser = Depends(verify_supabase_token)
) -> AddExistingUserResponse:
    """
    Add an existing authenticated user directly to a site.
    
    This endpoint:
    1. Validates the requesting user is an admin for the target site
    2. Finds the existing user by email 
    3. Validates the user is within the same company scope
    4. Adds them directly to the site_users table
    5. Records audit trail of how they were added
    
    Args:
        request: Details of user to add and target site
        admin_user: Authenticated admin making the request
        
    Returns:
        AddExistingUserResponse with success status and details
        
    Raises:
        HTTPException: If validation fails or operation is not permitted
    """
    
    try:
        logger.info(f"Admin {admin_user.email} requesting to add existing user {request.email} to site {request.site_id}")
        
        # Get user-scoped Supabase client (respects RLS)
        supabase = get_user_supabase_client(admin_user.token)
        
        # 1. Validate admin has permission for this site
        admin_check = await supabase.table('site_users').select(
            'id, role_id, roles(name)'
        ).eq('user_id', admin_user.user_id).eq('site_id', request.site_id).execute()
        
        if not admin_check.data:
            raise HTTPException(
                status_code=403, 
                detail="You do not have permission to manage users for this site"
            )
        
        admin_role = admin_check.data[0]['roles']['name']
        if admin_role not in ['company_admin', 'super_admin']:
            raise HTTPException(
                status_code=403,
                detail="You must be an admin to add users to sites"
            )
        
        # 2. Find the existing user by email
        existing_user_check = await supabase.table('users').select(
            'id, email, full_name'
        ).eq('email', request.email).execute()
        
        if not existing_user_check.data:
            raise HTTPException(
                status_code=404,
                detail=f"No user found with email {request.email}. Use the invitation system for new users."
            )
        
        target_user = existing_user_check.data[0]
        target_user_id = target_user['id']
        
        logger.info(f"Found existing user: {target_user_id} ({target_user['email']})")
        
        # 3. Check if user is already a member of this site
        existing_membership = await supabase.table('site_users').select(
            'id'
        ).eq('user_id', target_user_id).eq('site_id', request.site_id).execute()
        
        if existing_membership.data:
            raise HTTPException(
                status_code=409,
                detail="This user is already a member of the selected site"
            )
        
        # 4. Validate company scope - ensure target user is within same company
        # Get the target site's company
        site_info = await supabase.table('sites').select(
            'company_id, companies(name)'
        ).eq('id', request.site_id).execute()
        
        if not site_info.data:
            raise HTTPException(status_code=404, detail="Site not found")
        
        target_company_id = site_info.data[0]['company_id']
        target_company_name = site_info.data[0]['companies']['name']
        
        logger.info(f"Target site belongs to company: {target_company_id} ({target_company_name})")
        
        # Check if target user belongs to the same company (through any site membership)
        user_company_check = await supabase.table('site_users').select(
            'sites(company_id, companies(name))'
        ).eq('user_id', target_user_id).execute()
        
        user_companies = set()
        if user_company_check.data:
            for membership in user_company_check.data:
                if membership['sites'] and membership['sites']['company_id']:
                    user_companies.add(membership['sites']['company_id'])
        
        # If user has no company associations, check invitation history
        if not user_companies:
            logger.info("User has no current company associations, checking invitation history...")
            
            invitation_check = await supabase.table('invitations').select(
                'invited_by, sites(company_id)'
            ).eq('email', request.email).eq('accepted_at', None, operator='is not').execute()
            
            if invitation_check.data:
                for invitation in invitation_check.data:
                    if invitation['sites'] and invitation['sites']['company_id']:
                        user_companies.add(invitation['sites']['company_id'])
        
        # Validate user belongs to same company
        if target_company_id not in user_companies and user_companies:
            raise HTTPException(
                status_code=403,
                detail=f"This user belongs to a different company and cannot be added to {target_company_name} sites"
            )
        
        # If user has no company associations at all, allow admin to add them (first-time setup)
        if not user_companies:
            logger.info("User has no company associations - allowing admin to add them (first-time company assignment)")
        
        # 5. Get default role if not specified
        role_id = request.role_id
        if not role_id:
            default_role = await supabase.table('roles').select(
                'id'
            ).eq('name', 'user').execute()
            
            if default_role.data:
                role_id = default_role.data[0]['id']
            else:
                raise HTTPException(status_code=500, detail="Default user role not found")
        
        # 6. Add user to site
        new_membership = await supabase.table('site_users').insert([{
            'user_id': target_user_id,
            'site_id': request.site_id,
            'role_id': role_id,
            'can_edit': request.can_edit,
            'added_by': admin_user.user_id,  # Audit trail
            'added_method': 'direct_addition'  # Track how they were added vs invitation
        }]).execute()
        
        if not new_membership.data:
            raise HTTPException(status_code=500, detail="Failed to add user to site")
        
        site_user_id = new_membership.data[0]['id']
        
        logger.info(f"✅ Successfully added user {target_user_id} to site {request.site_id} as site_user {site_user_id}")
        
        return AddExistingUserResponse(
            success=True,
            message=f"Successfully added {target_user['full_name'] or target_user['email']} to {target_company_name}",
            user_id=target_user_id,
            site_user_id=site_user_id
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error adding existing user to site: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to add user to site: {str(e)}"
        )