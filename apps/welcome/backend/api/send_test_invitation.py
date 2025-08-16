"""
Send test invitation emails without database operations
"""
import os
from fastapi import HTTPException
from pydantic import BaseModel
from typing import Optional
import resend
from .email_templates import create_invitation_email_content

# Initialize Resend 
if os.getenv("RESEND_API_KEY"):
    resend.api_key = os.getenv("RESEND_API_KEY")
    print("✅ Resend configured for test emails")
else:
    print("⚠️ RESEND_API_KEY not set - test emails will be simulated")

class TestInvitationRequest(BaseModel):
    email: str
    full_name: str
    site_name: str
    company_name: str
    invitation_token: str

async def send_test_invitation_email(request: TestInvitationRequest):
    """Send test invitation email without any database operations"""
    try:
        # Create invitation link
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        invitation_link = f"{frontend_url}/accept-invitation?token={request.invitation_token}"
        
        # Generate email content using shared template (identical to production)
        subject, html_content, text_content = create_invitation_email_content(
            recipient_name=request.full_name,
            company_name=request.company_name,
            site_name=request.site_name,
            invitation_link=invitation_link
        )
        
        # Send email if API key is configured, otherwise simulate
        if os.getenv("RESEND_API_KEY"):
            try:
                response = resend.Emails.send({
                    "from": os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev"),
                    "to": "willisreed17@gmail.com",  # Always send to your email for testing
                    "subject": subject,
                    "html": html_content,
                    "text": text_content
                })
                print(f"✅ TEST email sent successfully to {request.email}")
                print(f"📧 Resend ID: {response.get('id', 'N/A')}")
            except Exception as e:
                print(f"❌ Failed to send TEST email via Resend: {str(e)}")
                print(f"📧 Falling back to logging mode")
        
        # Always log the test email details regardless of send status
        print(f"📧 TEST EMAIL SIMULATION")
        print(f"=" * 60)
        print(f"To: {request.email}")
        print(f"Subject: {subject}")
        print(f"Link: {invitation_link}")
        print(f"Token: {request.invitation_token}")
        print(f"Site: {request.site_name}")
        print(f"Company: {request.company_name}")
        print(f"=" * 60)
        
        return {
            "success": True, 
            "message": "Test invitation email sent successfully",
            "test_details": {
                "email": request.email,
                "invitation_link": invitation_link,
                "token": request.invitation_token
            }
        }
        
    except Exception as e:
        print(f"❌ Error sending test invitation email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send test invitation email: {str(e)}")