"""
Access Request API endpoints for email authentication workflow
"""
import os
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import uuid

# Reuse existing auth and database infrastructure
from auth import verify_supabase_token, AuthenticatedUser
from database import get_service_supabase_client
# Email templates import removed - using Supabase invite system

router = APIRouter()

class AccessRequestCreate(BaseModel):
    email: EmailStr
    full_name: str
    lead_id: uuid.UUID

class AccessRequestResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    requested_at: str
    status: str
    lead_data: Optional[dict] = None

class ApprovalRequest(BaseModel):
    request_id: str
    company_id: str
    role_id: str
    notes: Optional[str] = None

class RejectionRequest(BaseModel):
    request_id: str
    rejection_reason: str

# Custom signup models removed - using Supabase's standard invite flow

# Custom approval email function removed - now using Supabase's built-in invite system

async def send_notification_email(email: str, full_name: str, company_name: str = None):
    """Send email notification to support when user requests access"""
    import resend

    # Check if RESEND_KEY is configured
    if not os.getenv("RESEND_KEY"):
        print("Warning: RESEND_KEY not configured, simulating access request notification")
        print(f"Simulated notification to support@arctecfox.co:")
        print(f"  New access request from: {full_name} ({email})")
        print(f"  Company: {company_name or 'Not specified'}")
        return {"status": "simulated"}

    # Initialize Resend
    resend.api_key = os.getenv("RESEND_KEY")

    # Create access request notification email
    subject = f"New Access Request - {full_name} from {company_name or 'Unknown Company'}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #f97316; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
            .content {{ background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }}
            .info-box {{ margin: 15px 0; padding: 15px; background: white; border-left: 4px solid #f97316; }}
            .button {{ display: inline-block; padding: 15px 30px; background-color: #4A90E2; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }}
            .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔔 New Access Request</h1>
            </div>
            <div class="content">
                <p>A user has requested access to ArcTecFox PM Planner:</p>

                <div class="info-box">
                    <strong>Requestor Details:</strong><br>
                    <strong>Name:</strong> {full_name}<br>
                    <strong>Email:</strong> {email}<br>
                    <strong>Company:</strong> {company_name or 'Not specified'}<br>
                    <strong>Requested:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}
                </div>

                <p><strong>Action Required:</strong></p>
                <ul>
                    <li>Review the access request in the admin dashboard</li>
                    <li>Verify the user's identity and company affiliation</li>
                    <li>Approve or reject the request</li>
                </ul>

                <div style="text-align: center;">
                    <a href="https://arctecfox-mono.vercel.app/admin/super-admins?tab=access-requests" class="button">Review Access Requests</a>
                </div>

                <div class="footer">
                    <p>This is an automated notification from ArcTecFox PM Planner.</p>
                    <p>Please do not reply to this email.</p>
                    <p>&copy; 2024 ArcTecFox. All rights reserved.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

    try:
        # Send email using Resend
        response = resend.Emails.send({
            "from": "ArcTecFox PM Planner <notifications@arctecfox.ai>",
            "to": ["support@arctecfox.ai"],
            "subject": subject,
            "html": html_content
        })

        print(f"✅ Access request notification sent to support@arctecfox.co: {response}")
        return {"status": "sent", "email_id": response.get("id")}

    except Exception as e:
        print(f"❌ Error sending access request notification: {str(e)}")
        # Don't fail the request if email fails - the access request is still saved
        return {"status": "failed", "error": str(e)}

@router.post("/request-access", response_model=dict)
async def create_access_request(request: AccessRequestCreate):
    """Public endpoint to create access request - linked to test plan"""
    try:
        supabase = get_service_supabase_client()
        
        # Check if email already has a pending request
        existing_request = supabase.table("access_requests").select("*").eq("email", request.email).eq("status", "pending").execute()
        
        if existing_request.data:
            raise HTTPException(status_code=400, detail="An access request is already pending for this email")
        
        # Check if user already exists in auth
        try:
            existing_user = supabase.auth.admin.get_user_by_email(request.email)
            if existing_user.data:
                raise HTTPException(status_code=400, detail="An account with this email already exists")
        except Exception:
            # User doesn't exist, which is what we want
            pass
        
        # Get company name from lead if available
        company_name = None
        if request.lead_id:
            try:
                lead_data = supabase.table("pm_leads").select("org_name").eq("id", str(request.lead_id)).single().execute()
                company_name = lead_data.data.get("org_name") if lead_data.data else None
            except Exception:
                pass
        
        # Create access request
        access_request_data = {
            "email": request.email,
            "full_name": request.full_name,
            "lead_id": str(request.lead_id) if request.lead_id else None,
            "status": "pending"
        }
        
        result = supabase.table("access_requests").insert(access_request_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create access request")
        
        # Send notification email to support
        await send_notification_email(request.email, request.full_name, company_name)
        
        return {
            "success": True,
            "message": "Access request submitted successfully. You will receive an email when your request is reviewed."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating access request: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create access request")

@router.get("/access-requests", response_model=List[AccessRequestResponse])
async def get_access_requests(
    status: Optional[str] = "pending",
    current_user: AuthenticatedUser = Depends(verify_supabase_token)
):
    """Get access requests - super admin only"""
    try:
        supabase = get_service_supabase_client()
        
        # Check if user is super admin - reuse existing auth pattern
        user_roles = supabase.table("company_users")\
            .select("roles!inner(name)")\
            .eq("user_id", current_user.id)\
            .execute()
        
        is_super_admin = any(
            role["roles"]["name"] == "super_admin" 
            for role in user_roles.data
        )
        
        if not is_super_admin:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        # Get access requests - simplified without pm_leads join since schema changed
        query = supabase.table("access_requests")\
            .select("*")\
            .order("requested_at", desc=True)
        
        if status:
            query = query.eq("status", status)
        
        result = query.execute()
        
        # Format response
        requests = []
        for req in result.data:
            lead_data = req.get("pm_leads")
            requests.append(AccessRequestResponse(
                id=req["id"],
                email=req["email"],
                full_name=req.get("full_name"),
                requested_at=req["requested_at"],
                status=req["status"],
                lead_data=lead_data
            ))
        
        return requests
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching access requests: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch access requests")

@router.post("/approve-access")
async def approve_access_request(
    approval: ApprovalRequest,
    current_user: AuthenticatedUser = Depends(verify_supabase_token)
):
    """Approve access request and create user account - super admin only"""
    try:
        supabase = get_service_supabase_client()
        
        # Check super admin permission
        user_roles = supabase.table("company_users")\
            .select("roles!inner(name)")\
            .eq("user_id", current_user.id)\
            .execute()
        
        is_super_admin = any(
            role["roles"]["name"] == "super_admin" 
            for role in user_roles.data
        )
        
        if not is_super_admin:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        # Get access request
        request_result = supabase.table("access_requests")\
            .select("*")\
            .eq("id", approval.request_id)\
            .eq("status", "pending")\
            .single()\
            .execute()
        
        if not request_result.data:
            raise HTTPException(status_code=404, detail="Access request not found or already processed")
        
        access_request = request_result.data

        # Create Supabase auth user with invite
        try:
            # Create auth user and send Supabase invite email
            auth_response = supabase.auth.admin.create_user({
                "email": access_request["email"],
                "email_confirm": False,  # Will be confirmed when user sets password via invite
                "user_metadata": {
                    "full_name": access_request.get("full_name")
                }
            })

            if not auth_response.user:
                raise HTTPException(status_code=500, detail="Failed to create user account")

            user_id = auth_response.user.id
            print(f"✅ Auth user created: {user_id}")

        except Exception as e:
            print(f"❌ Failed to create auth user: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to create account: {str(e)}")

        # Create user record
        user_data = {
            "id": user_id,
            "email": access_request["email"],
            "full_name": access_request.get("full_name")
        }
        supabase.table("users").insert(user_data).execute()

        # Create company_users record
        company_user_data = {
            "user_id": user_id,
            "company_id": approval.company_id,
            "role_id": approval.role_id
        }
        supabase.table("company_users").insert(company_user_data).execute()

        # Update access request status
        supabase.table("access_requests")\
            .update({
                "status": "approved",
                "approved_at": datetime.now().isoformat(),
                "approved_by": current_user.id,
                "assigned_company_id": approval.company_id,
                "assigned_role_id": approval.role_id,
                "notes": approval.notes
            })\
            .eq("id", approval.request_id)\
            .execute()

        # Send Supabase invite email with correct redirect URL
        try:
            # Get frontend URL from environment (production URL)
            frontend_url = os.getenv("FRONTEND_URL", "https://arctecfox-mono.vercel.app")

            invite_response = supabase.auth.admin.invite_user_by_email(
                access_request["email"],
                {"redirect_to": f"{frontend_url}/login"}
            )
            print(f"✅ Supabase invite sent to {access_request['email']}: {invite_response}")
        except Exception as e:
            print(f"⚠️ Failed to send Supabase invite: {str(e)} (user account created)")

        print(f"✅ Access request approved for {access_request['email']}")

        return {
            "success": True,
            "message": f"Access approved for {access_request['email']}. User will receive account setup instructions via email.",
            "user_id": user_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error approving access request: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to approve access request")

@router.post("/reject-access")
async def reject_access_request(
    rejection: RejectionRequest,
    current_user: AuthenticatedUser = Depends(verify_supabase_token)
):
    """Reject access request - super admin only"""
    try:
        supabase = get_service_supabase_client()
        
        # Check super admin permission
        user_roles = supabase.table("company_users")\
            .select("roles!inner(name)")\
            .eq("user_id", current_user.id)\
            .execute()
        
        is_super_admin = any(
            role["roles"]["name"] == "super_admin" 
            for role in user_roles.data
        )
        
        if not is_super_admin:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        # Update access request status
        result = supabase.table("access_requests")\
            .update({
                "status": "rejected",
                "approved_by": current_user.id,
                "rejection_reason": rejection.rejection_reason
            })\
            .eq("id", rejection.request_id)\
            .eq("status", "pending")\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Access request not found or already processed")
        
        return {
            "success": True,
            "message": "Access request rejected"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error rejecting access request: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to reject access request")

# Custom signup token verification removed - using Supabase's standard invite flow

# Custom approved signup endpoint removed - using Supabase's standard invite flow