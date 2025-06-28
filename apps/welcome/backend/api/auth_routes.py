from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from database import get_supabase_client
from datetime import datetime, timedelta
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError

# Secret key for JWT (Change this in production)
SECRET_KEY = "your_secret_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# ✅ Function to Generate JWT Token
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ✅ Complete Profile API
@router.post("/complete-profile")
async def complete_profile(
    user_id: str, 
    email: str, 
    full_name: str, 
    role: str, 
    company_name: str, 
    industry: str, 
    company_size: str
):
    supabase = get_supabase_client()

    # ✅ Ensure user exists in `auth.users`
    user_query = supabase.auth.admin.list_users()
    user_data = next((user for user in user_query.get("data", {}).get("users", []) if user.get("email") == email), None)

    if not user_data:
        raise HTTPException(status_code=400, detail="User not found in authentication system.")

    user_id = user_data["id"]

    # ✅ Check if company exists in `public.companies`
    company_query = supabase.table("companies").select("id").eq("name", company_name).execute()
    company_data = company_query.get("data")

    if not company_data:
        # ✅ Insert new company if it does not exist
        company_insert = supabase.table("companies").insert({
            "name": company_name,
            "industry": industry,
            "company_size": company_size
        }).execute()

        if company_insert.get("error"):
            raise HTTPException(status_code=500, detail="Error creating company.")

        company_id = company_insert.get("data", [{}])[0].get("id")
    else:
        company_id = company_data[0]["id"]

    # ✅ Insert or Update user profile in `public.users`
    profile_update = supabase.table("users").upsert({
        "id": user_id,
        "email": email,
        "full_name": full_name,
        "role": role,
        "company_id": company_id,
        "industry": industry,
        "company_size": company_size,
        "company_name": company_name,
        "profile_completed": True  # ✅ Marks profile as completed
    }).execute()

    if profile_update.get("error"):
        raise HTTPException(status_code=400, detail="Error updating profile.")

    return {"message": "Profile updated successfully. Redirecting to dashboard."}

# ✅ Get Authenticated User Session API
@router.get("/api/user-session")
async def get_user_session(token: str = Depends(oauth2_scheme)):
    supabase = get_supabase_client()

    try:
        # ✅ Decode JWT token
        decoded_token = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = decoded_token.get("sub")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token.")

        # ✅ Fetch user details from `public.users`
        user_info = supabase.table("users").select("*").eq("id", user_id).execute()
        if not user_info.get("data"):
            raise HTTPException(status_code=404, detail="User profile not found.")

        return {"user": user_info["data"][0]}

    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired. Please log in again.")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user session: {str(e)}")

# ✅ User Login API
@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    supabase = get_supabase_client()

    # ✅ Authenticate user in Supabase Auth
    auth_response = supabase.auth.sign_in_with_password({
        "email": form_data.username,
        "password": form_data.password
    })

    if auth_response.get("error"):
        raise HTTPException(status_code=400, detail="Invalid credentials or email not confirmed.")

    user_data = auth_response.get("data", {}).get("user", {})
    user_id = user_data.get("id")
    email = user_data.get("email")

    if not user_id:
        raise HTTPException(status_code=400, detail="Authentication failed.")

    # ✅ Check if user exists in `public.users`
    user_info = supabase.table("users").select("*").eq("id", user_id).execute()

    if not user_info.get("data"):
        return {"message": "Profile incomplete. Redirecting to profile completion.", "redirect": "/complete-profile"}

    # ✅ Generate token after successful login
    token = create_access_token(data={"sub": user_id})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_info["data"][0]
    }

# ✅ Logout API
@router.post("/logout")
async def logout():
    supabase = get_supabase_client()

    try:
        # ✅ Revoke the session in Supabase
        logout_response = supabase.auth.sign_out()

        if logout_response.get("error"):
            raise HTTPException(status_code=400, detail="Logout failed.")

        return {"message": "User successfully logged out."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error logging out: {str(e)}")
