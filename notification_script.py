"""
Daily Notification Script for Pending Jobs
Run at 06:00 AM daily (GMT+7)
"""

import pandas as pd
from datetime import datetime
import sys
import os

def send_notification(message):
    """Simulate sending notification to LINE group"""
    print(f"[NOTIFICATION] {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(message)
    # In real implementation, would use LINE API to send message

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
        send_notification("❌ Error: Cannot fetch job data")
        return
    
    # Build notification message
    message = f"📋 **รายงานงานค้างวันนี้**\n"
    message += f"📅 วันที่: {datetime.now().strftime('%d/%m/%Y')}\n"
    message += f"⏰ เวลา: 06:00 น.\n"
    message += f"---\n"
    message += f"📊 **สถานะงานรวม:** {jobs['total']} งาน\n"
    message += f"⚠️ **งานที่ยังไม่ได้มอบหมาย:** {jobs['unassigned']} งาน\n"
    message += f"🔥 **งานเร่งด่วน:** {jobs['urgent']} งาน\n"
    message += f"---\n"
    
    # Add status breakdown
    message += f"📈 **รายละเอียดสถานะ:**\n"
    for status, count in jobs['by_status'].items():
        icon = "🔥" if status in ['Urgent', 'URGENT'] else "📋"
        message += f"  {icon} {status}: {count} งาน\n"
    
    # Add urgent jobs details
    if jobs['urgent'] > 0:
        message += f"\n🚨 **งานเร่งด่วนที่ต้องดำเนินการ:**\n"
        for job in jobs['urgent_jobs'][:3]:  # Show top 3 urgent jobs
            message += f"  • JOB-{job['job_id']}: {job['customer_name']} [{job['status']}]\n"
        
        if jobs['urgent'] > 3:
            message += f"  และอีก {jobs['urgent'] - 3} งาน...\n"
    
    # Add recommendations
    if jobs['unassigned'] > 0:
        message += f"\n💡 **คำแนะนำ:**\n"
        message += f"  • จัดการงานที่ยังไม่ได้มอบหมายก่อน\n"
        message += f"  • พิจารณามอบหมายให้ช่างที่มีความเหมาะสม\n"
    
    message += f"\n📍 **ร้านคอมโฟน & Electronics**\n"
    
    # Send notification
    send_notification(message)
    
    print("✅ Notification sent successfully")
    print(f"📊 Total pending jobs: {jobs['total']}")
    print(f"🔥 Urgent jobs: {jobs['urgent']}")

if __name__ == "__main__":
    main()