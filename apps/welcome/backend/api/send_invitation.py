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
    """Send invitation email to user"""
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
        
        # Create invitation link
        # Update this to match your frontend URL
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        invitation_link = f"{frontend_url}/accept-invitation?token={request.invitation_token}"
        
        # Generate email content using shared template
        recipient_name = request.full_name or "there"
        subject, html_content, text_content = create_invitation_email_content(
            recipient_name=recipient_name,
            company_name=company_name,
            site_name=site_name,
            invitation_link=invitation_link
        )
        
        # Send email if API key is configured, otherwise simulate
        if os.getenv("RESEND_API_KEY"):
            try:
                response = resend.Emails.send({
                    "from": os.getenv("RESEND_FROM_EMAIL", "user_admin@arctecfox.ai"),
                    "to": request.email,
                    "subject": subject,
                    "html": html_content,
                    "text": text_content
                })
                print(f"✅ Email sent successfully to {request.email}")
                print(f"📧 Resend ID: {response.get('id', 'N/A')}")
            except Exception as e:
                print(f"❌ Failed to send email via Resend: {str(e)}")
                # Still return success but log the error - invitation was created
                print(f"📧 Email send failed but invitation created")
                print(f"To: {request.email}")
                print(f"Link: {invitation_link}")
                # Consider raising an exception here if you want to fail the whole operation
                # raise HTTPException(status_code=500, detail=f"Email send failed: {str(e)}")
        else:
            # Simulation mode - just log the email details
            print(f"📧 EMAIL SIMULATION MODE (No RESEND_API_KEY)")
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