from fastapi import APIRouter
from api.generate_pm_plan import router as pm_plan_router

# Delegate routing to generate_pm_plan.py
router = APIRouter()
router.include_router(pm_plan_router)
