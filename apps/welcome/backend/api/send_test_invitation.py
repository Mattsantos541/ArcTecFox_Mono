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
    print(f"🧪 TEST EMAIL START - Request received: {request.dict()}")
    
    try:
        # Create invitation link
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        invitation_link = f"{frontend_url}/accept-invitation?token={request.invitation_token}"
        print(f"🧪 TEST EMAIL - Generated invitation link: {invitation_link}")
        
        # Generate email content using shared template (identical to production)
        print(f"🧪 TEST EMAIL - Generating content with template...")
        subject, html_content, text_content = create_invitation_email_content(
            recipient_name=request.full_name,
            company_name=request.company_name,
            site_name=request.site_name,
            invitation_link=invitation_link
        )
        print(f"🧪 TEST EMAIL - Content generated successfully. Subject: {subject}")
        
        # Check email configuration
        resend_api_key = os.getenv("RESEND_API_KEY")
        print(f"🧪 TEST EMAIL - RESEND_API_KEY configured: {'Yes' if resend_api_key else 'No'}")
        
        # Send email if API key is configured, otherwise simulate
        if resend_api_key:
            print(f"🧪 TEST EMAIL - Attempting to send via Resend...")
            try:
                response = resend.Emails.send({
                    "from": os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev"),
                    "to": "willisreed17@gmail.com",  # Always send to your email for testing
                    "subject": subject,
                    "html": html_content,
                    "text": text_content
                })
                print(f"✅ TEST email sent successfully to willisreed17@gmail.com")
                print(f"📧 Resend ID: {response.get('id', 'N/A')}")
                print(f"📧 Resend response: {response}")
            except Exception as e:
                print(f"❌ Failed to send TEST email via Resend: {str(e)}")
                print(f"📧 Error type: {type(e).__name__}")
                import traceback
                print(f"📧 Full traceback: {traceback.format_exc()}")
                # Don't raise - continue to simulation mode
        else:
            print(f"🧪 TEST EMAIL - No API key, using simulation mode")
        
        # Always log the test email details
        print(f"📧 TEST EMAIL DETAILS")
        print(f"=" * 60)
        print(f"Intended Recipient: {request.email}")
        print(f"Actual Send To: willisreed17@gmail.com") 
        print(f"Subject: {subject}")
        print(f"Invitation Link: {invitation_link}")
        print(f"Token: {request.invitation_token}")
        print(f"Site: {request.site_name}")
        print(f"Company: {request.company_name}")
        print(f"Frontend URL: {frontend_url}")
        print(f"HTML Length: {len(html_content)} chars")
        print(f"Text Length: {len(text_content)} chars")
        print(f"=" * 60)
        
        print(f"🧪 TEST EMAIL - Function completed successfully")
        return {
            "success": True, 
            "message": "Test invitation email processed successfully",
            "details": {
                "sent_to": "willisreed17@gmail.com",
                "subject": subject,
                "invitation_link": invitation_link,
                "token": request.invitation_token,
                "resend_configured": bool(resend_api_key)
            }
        }
        
    except Exception as e:
        print(f"❌ CRITICAL ERROR in test email function: {str(e)}")
        print(f"❌ Error type: {type(e).__name__}")
        import traceback
        print(f"❌ Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Test email function failed: {str(e)}")