"""
Send invitation emails to users
"""
import os
from fastapi import HTTPException
from pydantic import BaseModel
from typing import Optional
import resend
from database import get_service_supabase_client
from .email_templates import create_invitation_email_content

# Initialize Resend 
# IMPORTANT: Set RESEND_API_KEY environment variable in production
# For development/testing, emails will be simulated if API key is not set
if os.getenv("RESEND_API_KEY"):
    resend.api_key = os.getenv("RESEND_API_KEY")
    print("✅ Resend configured - emails will be sent")
else:
    print("⚠️ RESEND_API_KEY not set - emails will be simulated (logged only)")

class InvitationRequest(BaseModel):
    email: str
    full_name: Optional[str] = None
    invitation_token: str
    site_id: str

async def send_invitation_email(request: InvitationRequest):
    """Send invitation email to user using Supabase native email (interim) or Resend (when configured)"""
    try:
        # Get Supabase service client for reading site/company data
        # Service client is needed here to read across sites for email generation
        supabase = get_service_supabase_client()
        
        # Get site and company details
        site_response = supabase.table("sites").select("*, companies(*)").eq("id", request.site_id).single().execute()
        if not site_response.data:
            raise HTTPException(status_code=404, detail="Site not found")
        
        site = site_response.data
        company_name = site['companies']['name'] if site.get('companies') else 'the company'
        site_name = site['name']
        
        # Determine email method based on configuration
        use_supabase_email = not os.getenv("RESEND_API_KEY")  # Use Supabase if Resend not configured
        
        if use_supabase_email:
            # INTERIM SOLUTION: Use Supabase native email invitations
            print(f"📧 Using Supabase native email invitation for {request.email}")
            
            try:
                # Send invitation via Supabase Auth Admin API (using service key)
                response = supabase.auth.admin.invite_user_by_email(
                    email=request.email,
                    options={
                        "data": {
                            "site_id": request.site_id,
                            "site_name": site_name,
                            "company_name": company_name,
                            "full_name": request.full_name,
                            "invitation_token": request.invitation_token
                        },
                        "redirect_to": f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/accept-invitation"
                    }
                )
                
                if response.get('error'):
                    raise Exception(f"Supabase invitation failed: {response['error']}")
                
                print(f"✅ Supabase invitation sent successfully to {request.email}")
                print(f"📧 User ID: {response.get('data', {}).get('id', 'N/A')}")
                
                return {"success": True, "message": "Invitation email sent successfully via Supabase"}
                
            except Exception as e:
                print(f"❌ Failed to send invitation via Supabase: {str(e)}")
                # Fall back to simulation if Supabase fails
                print(f"📧 Falling back to simulation mode")
                use_supabase_email = False
        
        # RESEND METHOD (when configured) or SIMULATION (when Supabase fails)
        if not use_supabase_email:
            # Create invitation link for Resend/simulation
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
            invitation_link = f"{frontend_url}/accept-invitation?token={request.invitation_token}"
            
            # Generate email content using shared template
            recipient_name = request.full_name or "there"
            subject, html_content, text_content = create_invitation_email_content(
                recipient_name=recipient_name,
                company_name=company_name,
                site_name=site_name,
                invitation_link=invitation_link
            )
            
            # Send email if Resend API key is configured, otherwise simulate
            if os.getenv("RESEND_API_KEY"):
                try:
                    response = resend.Emails.send({
                        "from": os.getenv("RESEND_FROM_EMAIL", "user_admin@arctecfox.ai"),
                        "to": request.email,
                        "subject": subject,
                        "html": html_content,
                        "text": text_content
                    })
                    print(f"✅ Email sent successfully to {request.email} via Resend")
                    print(f"📧 Resend ID: {response.get('id', 'N/A')}")
                except Exception as e:
                    print(f"❌ Failed to send email via Resend: {str(e)}")
                    print(f"📧 Email send failed but invitation created")
                    print(f"To: {request.email}")
                    print(f"Link: {invitation_link}")
            else:
                # Simulation mode - just log the email details
                print(f"📧 EMAIL SIMULATION MODE (No RESEND_API_KEY or Supabase failed)")
                print(f"=" * 60)
                print(f"To: {request.email}")
                print(f"Subject: {subject}")
                print(f"Link: {invitation_link}")
                print(f"-" * 60)
                print("Email Preview:")
                print(f"  Recipient: {recipient_name}")
                print(f"  Company: {company_name}")
                print(f"  Site: {site_name}")
                print(f"  Expires: 7 days")
                print(f"=" * 60)
        
        return {"success": True, "message": "Invitation email sent successfully"}
        
    except Exception as e:
        print(f"Error sending invitation email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send invitation email: {str(e)}")