"""
Cache Manager - Reduce API calls by caching database reads
Version: 2.0
Author: Comphone System
"""

import pandas as pd
import json
import time
from datetime import datetime, timedelta
import os

class ComphoneCache:
    def __init__(self, cache_dir='C:/Users/Server/.openclaw/workspace/cache'):
        self.cache_dir = cache_dir
        self.cache = {}
        self.timestamps = {}
        self.ttl = 3600  # 1 hour cache
        
        if not os.path.exists(cache_dir):
            os.makedirs(cache_dir)
    
    def load_jobs(self):
        """Load jobs with cache (1 hour TTL)"""
        if self._is_cache_valid('jobs'):
            return self.cache['jobs']
        
        try:
            df = pd.read_csv('C:/Users/Server/.openclaw/workspace/shop/DB_JOBS.csv')
            self.cache['jobs'] = df
            self.timestamps['jobs'] = time.time()
            return df
        except Exception as e:
            print(f'Error loading jobs: {e}')
            return None
    
    def load_customers(self):
        """Load customers with cache"""
        if self._is_cache_valid('customers'):
            return self.cache['customers']
        
        try:
            df = pd.read_csv('C:/Users/Server/.openclaw/workspace/shop/DB_CUSTOMERS.csv')
            self.cache['customers'] = df
            self.timestamps['customers'] = time.time()
            return df
        except Exception as e:
            print(f'Error loading customers: {e}')
            return None
    
    def load_inventory(self):
        """Load inventory with cache"""
        if self._is_cache_valid('inventory'):
            return self.cache['inventory']
        
        try:
            df = pd.read_csv('C:/Users/Server/.openclaw/workspace/shop/DB_INVENTORY.csv')
            self.cache['inventory'] = df
            self.timestamps['inventory'] = time.time()
            return df
        except Exception as e:
            print(f'Error loading inventory: {e}')
            return None
    
    def get_pending_jobs(self):
        """Get pending jobs (no API call needed)"""
        jobs_df = self.load_jobs()
        if jobs_df is None:
            return None
        
        pending = jobs_df[jobs_df['status'] != 'Completed']
        return {
            'total': len(pending),
            'by_status': pending['status'].value_counts().to_dict(),
            'unassigned': len(pending[pending['technician'].isna()]),
            'in_progress': len(pending[pending['status'] == 'In_Progress'])
        }
    
    def get_job_count(self):
        """Quick job count (direct from cache)"""
        jobs_df = self.load_jobs()
        if jobs_df is None:
            return None
        
        return {
            'total': len(jobs_df),
            'completed': len(jobs_df[jobs_df['status'] == 'Completed']),
            'pending': len(jobs_df[jobs_df['status'] != 'Completed'])
        }
    
    def get_low_stock_items(self, threshold=5):
        """Get low stock items"""
        inv_df = self.load_inventory()
        if inv_df is None:
            return []
        
        try:
            low_stock = inv_df[inv_df['qty_remaining'] < threshold]
            return low_stock[['item_name', 'qty_remaining']].to_dict('records')
        except:
            return []
    
    def _is_cache_valid(self, key):
        """Check if cache is still valid"""
        if key not in self.cache:
            return False
        
        if key not in self.timestamps:
            return False
        
        age = time.time() - self.timestamps[key]
        return age < self.ttl
    
    def clear_cache(self, key=None):
        """Clear cache (specific or all)"""
        if key:
            if key in self.cache:
                del self.cache[key]
            if key in self.timestamps:
                del self.timestamps[key]
        else:
            self.cache = {}
            self.timestamps = {}

# Initialize global cache
_cache = ComphoneCache()

def quick_status():
    """Get quick system status (no API call)"""
    try:
        counts = _cache.get_job_count()
        pending_info = _cache.get_pending_jobs()
        low_stock = _cache.get_low_stock_items()
        
        return {
            'jobs': counts,
            'pending': pending_info,
            'low_stock': low_stock,
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        return {'error': str(e)}

def update_cache_ttl(minutes=60):
    """Update cache TTL"""
    _cache.ttl = minutes * 60
