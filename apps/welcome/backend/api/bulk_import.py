"""
Backend validation API for bulk import of parent assets
"""
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field, validator
from fastapi import APIRouter, HTTPException, Depends

from auth import verify_supabase_token, AuthenticatedUser, get_user_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter()

class ParentAssetData(BaseModel):
    """Model for individual parent asset data validation"""
    name: str = Field(..., max_length=255, min_length=1, description="Asset name (required)")
    make: Optional[str] = Field(None, max_length=100, description="Manufacturer/Make")
    model: Optional[str] = Field(None, max_length=100, description="Model number")
    serial_number: Optional[str] = Field(None, max_length=100, description="Serial number")
    category: Optional[str] = Field(None, max_length=100, description="Asset category")
    purchase_date: Optional[str] = Field(None, description="Purchase date in YYYY-MM-DD format")
    install_date: Optional[str] = Field(None, description="Installation date in YYYY-MM-DD format")
    notes: Optional[str] = Field(None, max_length=1000, description="Additional notes")
    cost_to_replace: Optional[float] = Field(None, ge=0, description="Replacement cost (must be positive)")
    environment: Optional[str] = Field(None, max_length=100, description="Operating environment")

    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Asset name is required and cannot be empty')
        return v.strip()

    @validator('purchase_date', 'install_date')
    def validate_dates(cls, v):
        if v is None or v == '':
            return None
        try:
            # Validate YYYY-MM-DD format
            datetime.strptime(v, '%Y-%m-%d')
            return v
        except ValueError:
            raise ValueError('Date must be in YYYY-MM-DD format')

    @validator('make', 'model', 'serial_number', 'environment', 'category')
    def validate_optional_strings(cls, v):
        if v is None or v == '':
            return None
        return v.strip()

    @validator('notes')
    def validate_notes(cls, v):
        if v is None or v == '':
            return None
        return v.strip()

class BulkValidationRequest(BaseModel):
    """Request model for bulk validation"""
    assets: List[ParentAssetData] = Field(..., description="List of assets to validate")
    site_id: str = Field(..., description="Target site ID for the assets")

class ValidationResult(BaseModel):
    """Result for individual asset validation"""
    row_index: int
    asset_name: str
    status: str  # 'valid', 'warning', 'error'
    errors: List[str]
    warnings: List[str]
    asset_data: Optional[Dict[str, Any]] = None

class BulkValidationResponse(BaseModel):
    """Response model for bulk validation"""
    success: bool
    total_assets: int
    valid_count: int
    warning_count: int
    error_count: int
    results: List[ValidationResult]
    duplicate_serials: List[Dict[str, Any]] = []

async def validate_site_access(site_id: str, user: AuthenticatedUser) -> None:
    """Verify user has access to the specified site"""
    try:
        client = get_user_supabase_client(user.token)
        
        # Check if user has access to this site via site_users table
        result = client.table('site_users')\
            .select("role_id")\
            .eq('user_id', user.id)\
            .eq('site_id', site_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=403, 
                detail=f"No access to site {site_id}"
            )
        
        logger.info(f"User {user.email} has access to site {site_id}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying site access: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Error verifying site access"
        )

async def validate_categories(categories: List[str], user_token: str) -> Dict[str, bool]:
    """Check which categories exist in asset_categories table"""
    try:
        client = get_user_supabase_client(user_token)
        
        # Get all asset categories the user can access
        result = client.table('dim_assets')\
            .select('asset_name')\
            .execute()
        
        if not result.data:
            logger.warning("No asset categories found")
            return {}
        
        # Create lookup for case-insensitive matching
        valid_categories = {cat['asset_name'].lower(): cat['asset_name'] for cat in result.data}
        
        # Check each requested category
        category_validation = {}
        for cat in categories:
            if cat and cat.strip():
                category_validation[cat] = cat.lower() in valid_categories
            
        return category_validation
        
    except Exception as e:
        logger.error(f"Error validating categories: {e}")
        return {}

async def check_duplicate_serials(assets: List[ParentAssetData], site_id: str, user_token: str) -> List[Dict[str, Any]]:
    """Check for duplicate serial numbers within the batch and against existing assets"""
    try:
        client = get_user_supabase_client(user_token)
        
        # Get all serial numbers from the batch (non-empty ones)
        batch_serials = []
        serial_to_rows = {}
        
        for i, asset in enumerate(assets):
            if asset.serial_number and asset.serial_number.strip():
                serial = asset.serial_number.strip()
                batch_serials.append(serial)
                if serial not in serial_to_rows:
                    serial_to_rows[serial] = []
                serial_to_rows[serial].append(i + 1)  # 1-indexed row numbers
        
        duplicates = []
        
        # Check for duplicates within the batch
        for serial, rows in serial_to_rows.items():
            if len(rows) > 1:
                duplicates.append({
                    'serial_number': serial,
                    'type': 'batch_duplicate',
                    'rows': rows,
                    'message': f'Serial number "{serial}" appears in multiple rows: {", ".join(map(str, rows))}'
                })
        
        # Check against existing assets in the database
        if batch_serials:
            result = client.table('parent_assets')\
                .select('serial_number')\
                .eq('site_id', site_id)\
                .in_('serial_number', batch_serials)\
                .execute()
            
            if result.data:
                for existing_asset in result.data:
                    existing_serial = existing_asset['serial_number']
                    if existing_serial in serial_to_rows:
                        duplicates.append({
                            'serial_number': existing_serial,
                            'type': 'database_duplicate',
                            'rows': serial_to_rows[existing_serial],
                            'message': f'Serial number "{existing_serial}" already exists in database'
                        })
        
        return duplicates
        
    except Exception as e:
        logger.error(f"Error checking duplicate serials: {e}")
        return []

@router.post("/bulk-import/validate-parent-assets", response_model=BulkValidationResponse)
async def validate_parent_assets(
    request: BulkValidationRequest,
    user: AuthenticatedUser = Depends(verify_supabase_token)
):
    """
    Validate batch data for parent assets bulk import.
    
    This endpoint validates:
    - Site access permissions
    - Required field validation  
    - Data type and format validation
    - Category validation against existing categories
    - Serial number duplicates (within batch and against database)
    - Field length constraints
    """
    try:
        logger.info(f"User {user.email} validating {len(request.assets)} parent assets for site {request.site_id}")
        
        # Validate site access first
        await validate_site_access(request.site_id, user)
        
        if not request.assets:
            raise HTTPException(status_code=400, detail="No assets provided for validation")
        
        if len(request.assets) > 1000:  # Reasonable limit for batch operations
            raise HTTPException(status_code=400, detail="Too many assets (max 1000 per batch)")
        
        # Validate categories
        categories_to_check = [asset.category for asset in request.assets if asset.category]
        category_validation = await validate_categories(categories_to_check, user.token) if categories_to_check else {}
        
        # Check for duplicate serials
        duplicate_serials = await check_duplicate_serials(request.assets, request.site_id, user.token)
        
        # Validate each asset
        results = []
        valid_count = 0
        warning_count = 0
        error_count = 0
        
        for i, asset in enumerate(request.assets):
            errors = []
            warnings = []
            
            # Pydantic validation should have caught most issues, but let's do additional checks
            
            # Category validation
            if asset.category:
                if asset.category not in category_validation:
                    warnings.append(f"Category '{asset.category}' not found in system categories")
                elif not category_validation[asset.category]:
                    warnings.append(f"Category '{asset.category}' not found in system categories")
            
            # Check if this row has duplicate serial number issues
            if asset.serial_number:
                for dup in duplicate_serials:
                    if (i + 1) in dup['rows']:  # Check if this row is affected
                        errors.append(dup['message'])
            
            # Additional business rule validations
            if asset.purchase_date and asset.install_date:
                try:
                    purchase = datetime.strptime(asset.purchase_date, '%Y-%m-%d')
                    install = datetime.strptime(asset.install_date, '%Y-%m-%d')
                    if install < purchase:
                        warnings.append("Install date is before purchase date")
                except ValueError:
                    pass  # Date format errors already caught by Pydantic
            
            # Future date validation
            today = datetime.now().date()
            if asset.purchase_date:
                try:
                    purchase_date = datetime.strptime(asset.purchase_date, '%Y-%m-%d').date()
                    if purchase_date > today:
                        warnings.append("Purchase date is in the future")
                except ValueError:
                    pass
            
            if asset.install_date:
                try:
                    install_date = datetime.strptime(asset.install_date, '%Y-%m-%d').date()
                    if install_date > today:
                        warnings.append("Install date is in the future")
                except ValueError:
                    pass
            
            # Determine status
            if errors:
                status = 'error'
                error_count += 1
            elif warnings:
                status = 'warning' 
                warning_count += 1
            else:
                status = 'valid'
                valid_count += 1
            
            # Prepare clean asset data for valid/warning items
            asset_data = None
            if status != 'error':
                asset_data = {
                    'name': asset.name,
                    'make': asset.make,
                    'model': asset.model,
                    'serial_number': asset.serial_number,
                    'category': asset.category,
                    'purchase_date': asset.purchase_date,
                    'install_date': asset.install_date,
                    'notes': asset.notes,
                    'cost_to_replace': asset.cost_to_replace,
                    'environment': asset.environment,
                    'site_id': request.site_id,
                    'status': 'active',
                    'created_by': user.id
                }
            
            results.append(ValidationResult(
                row_index=i + 1,
                asset_name=asset.name or f"Row {i + 1}",
                status=status,
                errors=errors,
                warnings=warnings,
                asset_data=asset_data
            ))
        
        logger.info(f"Validation complete: {valid_count} valid, {warning_count} warnings, {error_count} errors")
        
        return BulkValidationResponse(
            success=True,
            total_assets=len(request.assets),
            valid_count=valid_count,
            warning_count=warning_count,
            error_count=error_count,
            results=results,
            duplicate_serials=duplicate_serials
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating parent assets: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Validation failed: {str(e)}"
        )