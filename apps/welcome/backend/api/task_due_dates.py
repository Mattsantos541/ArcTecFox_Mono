from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from typing import Optional, List, Dict
import logging
from supabase import create_client, Client
import os

logger = logging.getLogger("main")

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)


def parse_maintenance_interval(interval_str: str) -> int:
    """
    Parse maintenance interval string to get number of months.
    Expected format: "# months" (e.g., "3 months", "12 months")
    """
    try:
        if not interval_str:
            return 0
        
        # Remove 'months' and any extra whitespace
        interval_str = interval_str.lower().replace('months', '').replace('month', '').strip()
        
        # Convert to integer
        return int(float(interval_str))
    except (ValueError, AttributeError) as e:
        logger.error(f"Error parsing maintenance interval '{interval_str}': {e}")
        return 0


def adjust_for_weekend(date_obj: datetime) -> datetime:
    """
    If date falls on weekend, move to previous Friday.
    Saturday (5) -> Friday
    Sunday (6) -> Friday
    """
    weekday = date_obj.weekday()
    
    if weekday == 5:  # Saturday
        return date_obj - timedelta(days=1)
    elif weekday == 6:  # Sunday
        return date_obj - timedelta(days=2)
    
    return date_obj


def calculate_due_date(start_date: str, interval_months: int, from_date: Optional[str] = None) -> str:
    """
    Calculate the next due date based on start date and interval.
    
    Args:
        start_date: The plan start date (ISO format string)
        interval_months: Number of months between maintenance
        from_date: Optional date to calculate from (for next occurrence after completion)
    
    Returns:
        ISO format date string adjusted for weekends
    """
    try:
        if from_date:
            base_date = datetime.fromisoformat(from_date.replace('Z', '+00:00')).replace(tzinfo=None)
        else:
            base_date = datetime.fromisoformat(start_date.replace('Z', '+00:00')).replace(tzinfo=None)
        
        # Add the interval months
        next_date = base_date + relativedelta(months=interval_months)
        
        # Adjust for weekend
        next_date = adjust_for_weekend(next_date)
        
        return next_date.date().isoformat()
    
    except Exception as e:
        logger.error(f"Error calculating due date: {e}")
        # Return a default date (30 days from now) if calculation fails
        default_date = datetime.now() + timedelta(days=30)
        return adjust_for_weekend(default_date).date().isoformat()


async def create_initial_task_signoff(pm_plan_id: str, user_id: str):
    """
    Create initial task_signoff records when a PM plan is created.
    This will calculate the first due date for each task based on the child asset's plan_start_date.
    """
    try:
        # Get the PM plan with child asset details
        plan_result = supabase.table('pm_plans').select(
            '*, child_assets!inner(plan_start_date)'
        ).eq('id', pm_plan_id).single().execute()
        
        if not plan_result.data:
            logger.error(f"PM plan {pm_plan_id} not found")
            return
        
        plan = plan_result.data
        plan_start_date = plan['child_assets']['plan_start_date']
        
        if not plan_start_date:
            # Use today's date if no plan_start_date is set
            plan_start_date = datetime.now().date().isoformat()
            logger.warning(f"No plan_start_date for child asset, using today's date")
        
        # Get all tasks for this PM plan
        tasks_result = supabase.table('pm_tasks').select('*').eq('pm_plan_id', pm_plan_id).execute()
        
        if not tasks_result.data:
            logger.warning(f"No tasks found for PM plan {pm_plan_id}")
            return
        
        # Create task_signoff records for each task
        signoff_records = []
        for task in tasks_result.data:
            interval_months = parse_maintenance_interval(task.get('maintenance_interval', ''))
            
            if interval_months > 0:
                due_date = calculate_due_date(plan_start_date, interval_months)
                
                signoff_record = {
                    'task_id': task['id'],
                    'due_date': due_date,
                    'created_by': user_id,
                    'status': 'pending'
                }
                signoff_records.append(signoff_record)
        
        if signoff_records:
            # Insert all signoff records
            result = supabase.table('task_signoff').insert(signoff_records).execute()
            logger.info(f"Created {len(signoff_records)} task_signoff records for PM plan {pm_plan_id}")
            return result.data
        
    except Exception as e:
        logger.error(f"Error creating task_signoff records: {e}")
        raise


async def update_task_due_date(task_id: str, new_due_date: str, user_id: str):
    """
    Update the due date for a task in the task_signoff table.
    Used when user manually changes a task's due date.
    """
    try:
        # Check if signoff record exists
        existing = supabase.table('task_signoff').select('*').eq('task_id', task_id).eq('status', 'pending').execute()
        
        if existing.data:
            # Update existing record
            result = supabase.table('task_signoff').update({
                'due_date': new_due_date,
                'updated_by': user_id,
                'updated_at': datetime.now().isoformat()
            }).eq('task_id', task_id).eq('status', 'pending').execute()
        else:
            # Create new record
            result = supabase.table('task_signoff').insert({
                'task_id': task_id,
                'due_date': new_due_date,
                'created_by': user_id,
                'status': 'pending'
            }).execute()
        
        logger.info(f"Updated due date for task {task_id} to {new_due_date}")
        return result.data
        
    except Exception as e:
        logger.error(f"Error updating task due date: {e}")
        raise


async def create_next_task_signoff(task_id: str, completion_date: str, user_id: str):
    """
    Create the next task_signoff record after a task is completed.
    Calculates the next due date based on completion date and interval.
    """
    try:
        # Get the task with its maintenance interval
        task_result = supabase.table('pm_tasks').select('*, pm_plans!inner(child_assets!inner(plan_start_date))').eq('id', task_id).single().execute()
        
        if not task_result.data:
            logger.error(f"Task {task_id} not found")
            return
        
        task = task_result.data
        interval_months = parse_maintenance_interval(task.get('maintenance_interval', ''))
        
        if interval_months > 0:
            # Calculate next due date from completion date
            next_due_date = calculate_due_date(
                task['pm_plans']['child_assets']['plan_start_date'],
                interval_months,
                from_date=completion_date
            )
            
            # Create new signoff record for next occurrence
            signoff_record = {
                'task_id': task_id,
                'due_date': next_due_date,
                'created_by': user_id,
                'status': 'pending'
            }
            
            result = supabase.table('task_signoff').insert(signoff_record).execute()
            logger.info(f"Created next task_signoff for task {task_id}, due: {next_due_date}")
            return result.data
        
    except Exception as e:
        logger.error(f"Error creating next task_signoff: {e}")
        raise


def get_pending_task_signoffs(user_id: str) -> List[Dict]:
    """
    Get all pending task signoffs for tasks the user has access to.
    This is used by the task view to show upcoming due dates.
    """
    try:
        # Get signoffs with task and plan details
        result = supabase.table('task_signoff').select(
            '''
            *,
            pm_tasks!inner(
                *,
                pm_plans!inner(
                    *,
                    child_assets!inner(
                        *,
                        parent_assets!inner(*)
                    )
                )
            )
            '''
        ).eq('status', 'pending').execute()
        
        return result.data if result.data else []
        
    except Exception as e:
        logger.error(f"Error fetching pending task signoffs: {e}")
        return []