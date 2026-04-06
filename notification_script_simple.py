"""
Daily Notification Script for Pending Jobs - Simple version without emojis
Run at 06:00 AM daily (GMT+7)
"""

import pandas as pd
from datetime import datetime
import os

def send_notification(message):
    """Print notification (in real implementation would send via LINE)"""
    print(f"[NOTIFICATION] {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(message)

def get_pending_jobs():
    """Get all pending jobs from DB_JOBS.csv"""
    try:
        df = pd.read_csv('C:/Users/Server/.openclaw/workspace/shop/DB_JOBS.csv')
        
        # Filter pending jobs (not completed)
        pending_jobs = df[df['status'] != 'Completed']
        
        # Group by status
        status_counts = pending_jobs['status'].value_counts()
        
        # Get unassigned jobs
        unassigned = pending_jobs[pending_jobs['technician'].isna() | (pending_jobs['technician'] == '')]
        
        # Get urgent jobs
        urgent = pending_jobs[pending_jobs['status'].isin(['Urgent', 'URGENT', 'Priority_Personal'])]
        
        return {
            'total': len(pending_jobs),
            'by_status': status_counts.to_dict(),
            'unassigned': len(unassigned),
            'urgent': len(urgent),
            'urgent_jobs': urgent[['job_id', 'customer_name', 'status']].to_dict('records')
        }
        
    except Exception as e:
        print(f"Error reading jobs: {e}")
        return None

def main():
    """Main notification function"""
    print(f"=== Daily Job Notification ===")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Timezone: Asia/Bangkok (GMT+7)")
    print()
    
    # Get pending jobs
    jobs = get_pending_jobs()
    if not jobs:
        send_notification("ERROR: Cannot fetch job data")
        return
    
    # Build notification message
    message = f"Daily Pending Jobs Report\n"
    message += f"Date: {datetime.now().strftime('%d/%m/%Y')}\n"
    message += f"Time: 06:00\n"
    message += f"---\n"
    message += f"Total pending jobs: {jobs['total']}\n"
    message += f"Unassigned jobs: {jobs['unassigned']}\n"
    message += f"Urgent jobs: {jobs['urgent']}\n"
    message += f"---\n"
    
    # Add status breakdown
    message += f"Status breakdown:\n"
    for status, count in jobs['by_status'].items():
        message += f"  {status}: {count} jobs\n"
    
    # Add urgent jobs details
    if jobs['urgent'] > 0:
        message += f"\nUrgent jobs:\n"
        for job in jobs['urgent_jobs'][:3]:  # Show top 3 urgent jobs
            message += f"  JOB-{job['job_id']}: {job['customer_name']} [{job['status']}]\n"
        
        if jobs['urgent'] > 3:
            message += f"  And {jobs['urgent'] - 3} more urgent jobs\n"
    
    # Add recommendations
    if jobs['unassigned'] > 0:
        message += f"\nRecommendations:\n"
        message += f"  1. Assign unassigned jobs first\n"
        message += f"  2. Consider technician skills and location\n"
    
    message += f"\nComphone & Electronics\n"
    
    # Send notification
    send_notification(message)
    
    print("Notification sent successfully")
    print(f"Total pending jobs: {jobs['total']}")
    print(f"Urgent jobs: {jobs['urgent']}")

if __name__ == "__main__":
    main()