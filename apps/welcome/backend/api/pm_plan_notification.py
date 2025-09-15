"""
PM Plan Generation Notification Email
Sends notification to support when a user generates a PM plan
"""

from fastapi import APIRouter
from pydantic import BaseModel
import resend
import os
from typing import Optional

router = APIRouter()

# Initialize Resend with API key - reuse existing pattern
if os.getenv("RESEND_KEY"):
    resend.api_key = os.getenv("RESEND_KEY")
    print("✅ Resend configured for PM plan notifications")
else:
    print("⚠️ RESEND_KEY not set - PM plan notifications will be simulated")

class PMPlanNotificationRequest(BaseModel):
    user_name: str
    user_email: str
    company_name: str
    asset_name: Optional[str] = None
    asset_type: Optional[str] = None

async def send_pm_plan_notification_email(request: PMPlanNotificationRequest):
    """
    Send notification email to support when a user generates a PM plan
    This is a utility function that can be called from other endpoints
    """
    try:
        # Check if RESEND_KEY is configured
        if not os.getenv("RESEND_KEY"):
            print("Warning: RESEND_KEY not configured, simulating PM plan notification")
            print(f"Simulated notification: {request.user_name} ({request.user_email}) from {request.company_name}")
            return {
                "success": True,
                "message": "Email notification simulated (not configured)"
            }

        # Prepare the email content
        subject = f"PM Plan Generated - {request.company_name}"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #4A90E2; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
                .content {{ background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }}
                .info-row {{ margin: 10px 0; padding: 10px; background: white; border-left: 3px solid #4A90E2; }}
                .label {{ font-weight: bold; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>PM Plan Generation Notification</h2>
                </div>
                <div class="content">
                    <p>A user has generated a new PM plan. Details below:</p>

                    <div class="info-row">
                        <span class="label">User Name:</span> {request.user_name}
                    </div>

                    <div class="info-row">
                        <span class="label">User Email:</span> {request.user_email}
                    </div>

                    <div class="info-row">
                        <span class="label">Company:</span> {request.company_name}
                    </div>

                    {f'''<div class="info-row">
                        <span class="label">Asset Name:</span> {request.asset_name}
                    </div>''' if request.asset_name else ''}

                    {f'''<div class="info-row">
                        <span class="label">Asset Type:</span> {request.asset_type}
                    </div>''' if request.asset_type else ''}
                </div>
            </div>
        </body>
        </html>
        """

        # Send email using Resend
        response = resend.Emails.send({
            "from": "ArcTecFox PM Planner <notifications@arctecfox.ai>",
            "to": ["support@arctecfox.ai"],
            "subject": subject,
            "html": html_content
        })

        print(f"PM plan notification email sent successfully: {response}")

        return {
            "success": True,
            "message": "Notification sent successfully",
            "email_id": response.get("id") if response else None
        }

    except Exception as e:
        print(f"Error sending PM plan notification: {str(e)}")
        # Don't fail the PM plan generation if email fails
        return {
            "success": False,
            "message": f"Email notification failed: {str(e)}"
        }

@router.post("/api/pm-plan-notification")
async def pm_plan_notification_endpoint(request: PMPlanNotificationRequest):
    """
    Public endpoint for PM plan notification emails
    No authentication required for public PM plan generation
    """
    return await send_pm_plan_notification_email(request)