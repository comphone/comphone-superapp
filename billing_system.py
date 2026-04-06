"""
Billing System - Generate invoices from job data
Version: 1.0
Author: Comphone System
"""

import pandas as pd
from datetime import datetime
from cache_manager import _cache

class BillingSystem:
    """Generate and manage invoices"""
    
    def __init__(self):
        self.default_labor_rate = 500  # Default labor rate per hour
        self.default_markup = 1.2  # 20% markup on equipment cost
    
    def generate_invoice(self, job_id):
        """Generate invoice for a specific job"""
        try:
            jobs_df = _cache.load_jobs()
            if jobs_df is None:
                return None
            
            # Find job
            job = jobs_df[jobs_df['job_id'] == job_id]
            if len(job) == 0:
                return None
            
            job = job.iloc[0]
            
            # Get equipment used
            equipment_used = job.get('equipment_used', '')
            equipment_cost = self.calculate_equipment_cost(equipment_used)
            
            # Calculate labor cost (assume 2 hours default if not specified)
            labor_hours = self.get_labor_hours(job)
            labor_cost = labor_hours * self.default_labor_rate
            
            # Calculate total
            subtotal = labor_cost + equipment_cost
            tax = subtotal * 0.07  # 7% VAT
            total = subtotal + tax
            
            # Create invoice
            invoice = {
                'job_id': job_id,
                'customer_name': job.get('customer_name', ''),
                'date': datetime.now().strftime('%Y-%m-%d'),
                'labor_hours': labor_hours,
                'labor_cost': labor_cost,
                'equipment_cost': equipment_cost,
                'equipment_used': equipment_used,
                'subtotal': subtotal,
                'tax': tax,
                'total': total,
                'status': 'Pending',
                'invoice_id': f'INV-{job_id.replace("-", "")}-{datetime.now().strftime("%Y%m%d")}'
            }
            
            return invoice
            
        except Exception as e:
            print(f'Error generating invoice: {e}')
            return None
    
    def calculate_equipment_cost(self, equipment_used):
        """Calculate cost of equipment used"""
        if not equipment_used or equipment_used == 'nan':
            return 0
        
        try:
            inv_df = _cache.load_inventory()
            if inv_df is None:
                return 0
            
            # Parse equipment_used (comma-separated)
            items = [item.strip() for item in equipment_used.split(',') if item.strip()]
            total_cost = 0
            
            for item in items:
                # Try to find matching item in inventory
                match = inv_df[inv_df['item_name'].str.contains(item, case=False, na=False)]
                if not match.empty:
                    # Use first match
                    cost = match.iloc[0]['cost_price']
                    total_cost += cost
            
            return total_cost
            
        except Exception as e:
            print(f'Error calculating equipment cost: {e}')
            return 0
    
    def get_labor_hours(self, job):
        """Get labor hours from job data (default to 2 hours)"""
        # This could be enhanced to read from a notes field or estimate based on job type
        return 2  # Default 2 hours for now
    
    def create_invoice(self, job_id):
        """Create invoice and save to billing database"""
        invoice = self.generate_invoice(job_id)
        if not invoice:
            return None
        
        # Save to billing database (simulate)
        try:
            billing_df = _cache.load_billing()
            if billing_df is None:
                billing_df = pd.DataFrame(columns=['invoice_id', 'job_id', 'customer_name', 'date', 
                                                  'labor_hours', 'labor_cost', 'equipment_cost', 
                                                  'equipment_used', 'subtotal', 'tax', 'total', 'status'])
            
            new_row = pd.DataFrame([invoice])
            billing_df = pd.concat([billing_df, new_row], ignore_index=True)
            
            # Save back (simulate - in real system would save to CSV)
            # For now, return the invoice data
            
            return invoice
            
        except Exception as e:
            print(f'Error saving invoice: {e}')
            return invoice
    
    def auto_generate_invoices(self):
        """Auto-generate invoices for completed jobs"""
        try:
            jobs_df = _cache.load_jobs()
            if jobs_df is None:
                return 0
            
            # Find completed jobs that don't have invoices
            completed_jobs = jobs_df[(jobs_df['status'] == 'Completed') & (jobs_df['job_id'].notna())]
            
            count = 0
            for _, job in completed_jobs.iterrows():
                job_id = job['job_id']
                # Check if invoice already exists (simple check)
                # In real system would check billing database
                
                invoice = self.generate_invoice(job_id)
                if invoice:
                    print(f'Auto-generated invoice for {job_id}: {invoice.get("total", "N/A")} ฿')
                    count += 1
            
            return count
            
        except Exception as e:
            print(f'Error in auto-generate: {e}')
            return 0
    
    def get_overdue_invoices(self):
        """Get overdue invoices"""
        try:
            # In real system would query billing database
            # For now, return mock data
            return []
        except:
            return []

# Initialize global billing system
_billing_system = BillingSystem()

def generate_invoice(job_id):
    """Public function to generate invoice"""
    return _billing_system.generate_invoice(job_id)

def create_invoice(job_id):
    """Public function to create and save invoice"""
    return _billing_system.create_invoice(job_id)

def auto_generate_invoices():
    """Public function to auto-generate invoices for completed jobs"""
    return _billing_system.auto_generate_invoices()

def get_overdue_invoices():
    """Public function to get overdue invoices"""
    return _billing_system.get_overdue_invoices()
