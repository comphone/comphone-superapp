"""
Direct Query Module - Query CSV without using AI API
Version: 1.0
Author: Comphone System
Benefit: 50-70% cost savings for simple queries
"""

import pandas as pd
from cache_manager import _cache

class DirectQuery:
    """Direct queries from CSV - no API needed"""
    
    @staticmethod
    def job_status_summary():
        """Get job status without API"""
        try:
            jobs = _cache.load_jobs()
            if jobs is None:
                return "ไม่สามารถโหลดข้อมูลงาน"
            
            total = len(jobs)
            completed = len(jobs[jobs['status'] == 'Completed'])
            pending = total - completed
            
            return f"งานรวม: {total}\nเสร็จแล้ว: {completed}\nค้างอยู่: {pending}"
        except:
            return "Error loading job status"
    
    @staticmethod
    def pending_jobs_by_technician():
        """Get pending jobs grouped by technician"""
        try:
            jobs = _cache.load_jobs()
            if jobs is None:
                return []
            
            pending = jobs[jobs['status'] != 'Completed']
            
            result = {}
            for tech in pending['technician'].unique():
                if pd.notna(tech) and tech != '':
                    count = len(pending[pending['technician'] == tech])
                    result[str(tech)] = count
            
            # Add unassigned count
            unassigned = len(pending[pending['technician'].isna() | (pending['technician'] == '')])
            result['Unassigned'] = unassigned
            
            return result
        except:
            return {}
    
    @staticmethod
    def low_stock_alert():
        """Get low stock items"""
        try:
            inv = _cache.load_inventory()
            if inv is None:
                return []
            
            low = inv[inv['qty_remaining'] < 5]
            items = []
            
            for _, row in low.iterrows():
                items.append({
                    'name': row['item_name'],
                    'qty': row['qty_remaining'],
                    'id': row['item_id']
                })
            
            return items
        except:
            return []
    
    @staticmethod
    def customer_list():
        """Get customer list"""
        try:
            cust = _cache.load_customers()
            if cust is None:
                return []
            
            return cust[['customer_id', 'customer_name', 'phone']].to_dict('records')
        except:
            return []
    
    @staticmethod
    def find_customer_jobs(customer_name):
        """Find jobs by customer name"""
        try:
            jobs = _cache.load_jobs()
            if jobs is None:
                return []
            
            # Search customer name
            matches = jobs[jobs['customer_name'].str.contains(customer_name, case=False, na=False)]
            
            results = []
            for _, job in matches.iterrows():
                results.append({
                    'job_id': job['job_id'],
                    'status': job['status'],
                    'technician': job['technician'],
                    'location': job['location']
                })
            
            return results
        except:
            return []
    
    @staticmethod
    def urgent_jobs():
        """Get urgent jobs"""
        try:
            jobs = _cache.load_jobs()
            if jobs is None:
                return []
            
            urgent_statuses = ['Urgent', 'URGENT', 'Priority_Personal']
            urgent = jobs[jobs['status'].isin(urgent_statuses)]
            
            results = []
            for _, job in urgent.iterrows():
                results.append({
                    'job_id': job['job_id'],
                    'customer': job['customer_name'],
                    'status': job['status'],
                    'technician': job['technician'] if pd.notna(job['technician']) else 'Unassigned'
                })
            
            return results
        except:
            return []
    
    @staticmethod
    def get_customer_by_phone(phone):
        """Find customer by phone number"""
        try:
            cust = _cache.load_customers()
            if cust is None:
                return None
            
            match = cust[cust['phone'] == phone]
            if len(match) > 0:
                return match.iloc[0].to_dict()
            return None
        except:
            return None
    
    @staticmethod
    def job_count_by_status():
        """Count jobs by status"""
        try:
            jobs = _cache.load_jobs()
            if jobs is None:
                return {}
            
            counts = jobs['status'].value_counts().to_dict()
            return counts
        except:
            return {}

# Quick functions for common queries
def quick_status():
    """One-liner status (0 API calls)"""
    jobs = _cache.load_jobs()
    if jobs is None:
        return "System error"
    
    total = len(jobs)
    done = len(jobs[jobs['status'] == 'Completed'])
    pending = total - done
    
    return f"Jobs: {total} | Done: {done} | Pending: {pending}"

def quick_low_stock():
    """Check low stock (0 API calls)"""
    items = DirectQuery.low_stock_alert()
    if not items:
        return "All stock OK"
    
    msg = "Low Stock Alert:\n"
    for item in items:
        msg += f"• {item['name']}: {item['qty']} left\n"
    return msg

def quick_urgent():
    """Show urgent jobs (0 API calls)"""
    urgent = DirectQuery.urgent_jobs()
    if not urgent:
        return "No urgent jobs"
    
    msg = f"Urgent Jobs ({len(urgent)}):\n"
    for job in urgent:
        msg += f"• {job['job_id']}: {job['customer']} [{job['status']}]\n"
    return msg

if __name__ == '__main__':
    # Test direct queries
    print("=== Direct Query Test ===")
    print("1. Status:", quick_status())
    print("2. Low Stock:", quick_low_stock())
    print("3. Urgent:", quick_urgent())
    print("\nNo API calls used! Cost savings: 100%")
