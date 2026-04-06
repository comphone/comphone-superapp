import pandas as pd
import os
import json
from datetime import datetime
from rapidfuzz import process, fuzz

# Path configuration
DB_JOBS = 'shop/DB_JOBS.csv'
DB_INVENTORY = 'shop/DB_INVENTORY.csv'
DB_BILLING = 'shop/DB_BILLING.csv'
DB_LOGS = 'shop/DB_LOGS.csv'
BACKUP_DIR = 'shop/backup/'

def backup_data():
    date_str = datetime.now().strftime('%Y-%m-%d')
    path = os.path.join(BACKUP_DIR, date_str)
    if not os.path.exists(path):
        os.makedirs(path)
    for f in [DB_JOBS, DB_INVENTORY, DB_BILLING]:
        if os.path.exists(f):
            pd.read_csv(f, encoding='utf-8-sig').to_csv(os.path.join(path, os.path.basename(f)), index=False, encoding='utf-8-sig')
    return path

def add_log(user, action, details):
    df_logs = pd.read_csv(DB_LOGS, encoding='utf-8-sig')
    new_log = {
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'user': user,
        'action': action,
        'details': details
    }
    df_logs = pd.concat([df_logs, pd.DataFrame([new_log])], ignore_index=True)
    df_logs.to_csv(DB_LOGS, index=False, encoding='utf-8-sig')

def find_job_by_customer_name(query_name, threshold=75):
    try:
        df_jobs = pd.read_csv(DB_JOBS, encoding='utf-8-sig')
        active_jobs = df_jobs[df_jobs['status'] != 'Completed'].copy()
        if active_jobs.empty:
            return None, "Error: No active jobs found."
        names = active_jobs['customer_name'].astype(str).tolist()
        matches = process.extract(query_name, names, scorer=fuzz.WRatio, limit=5)
        good_matches = [m for m in matches if m[1] >= threshold]
        if not good_matches:
            return None, f"Error: No match for '{query_name}'. Best: {matches[0][0]}"
        best_name = good_matches[0][0]
        job_row = active_jobs[active_jobs['customer_name'] == best_name].iloc[0]
        return job_row['job_id'], best_name
    except Exception as e:
        return None, f"Search Error: {str(e)}"

def process_job_completion(search_query, parts_usage_str, labor_cost, tech_name="Unknown"):
    try:
        job_id, customer_name = find_job_by_customer_name(search_query)
        if not job_id: return json.dumps({"status": "error", "message": customer_name}, ensure_ascii=False)
        
        df_jobs = pd.read_csv(DB_JOBS, encoding='utf-8-sig')
        df_inv = pd.read_csv(DB_INVENTORY, encoding='utf-8-sig')
        df_bill = pd.read_csv(DB_BILLING, encoding='utf-8-sig')
        
        job_idx = df_jobs.index[df_jobs['job_id'] == job_id][0]
        location = df_jobs.loc[job_idx, 'location']
        
        parts_list = parts_usage_str.split(',')
        total_parts_price = 0
        used_items_detail = []
        low_stock_alerts = []
        for p in parts_list:
            if ':' not in p: continue
            item_id, qty = p.split(':')
            qty = float(qty)
            if item_id in df_inv['item_id'].values:
                inv_idx = df_inv.index[df_inv['item_id'] == item_id][0]
                df_inv.loc[inv_idx, 'qty_remaining'] -= qty
                total_parts_price += (df_inv.loc[inv_idx, 'sell_price'] * qty)
                used_items_detail.append(f"{df_inv.loc[inv_idx, 'item_name']} x{qty}")
                if df_inv.loc[inv_idx, 'qty_remaining'] <= df_inv.loc[inv_idx, 'min_stock']:
                    low_stock_alerts.append(f"LOW STOCK: {df_inv.loc[inv_idx, 'item_name']}")
            else: return json.dumps({"status": "error", "message": f"Item {item_id} not found"}, ensure_ascii=False)
        
        total_bill = total_parts_price + labor_cost
        invoice_no = f"INV-{datetime.now().strftime('%Y%m%d')}-{job_id.split('-')[-1]}"
        new_bill = {'job_id': job_id, 'invoice_no': invoice_no, 'parts_list': parts_usage_str, 'labor_cost': labor_cost, 'total': total_bill, 'payment_status': 'Unpaid'}
        df_bill = pd.concat([df_bill, pd.DataFrame([new_bill])], ignore_index=True)
        
        df_jobs.loc[job_idx, 'status'] = 'Completed'
        df_jobs.loc[job_idx, 'parts_used'] = parts_usage_str
        df_jobs.loc[job_idx, 'technician'] = tech_name
        
        df_jobs.to_csv(DB_JOBS, index=False, encoding='utf-8-sig')
        df_inv.to_csv(DB_INVENTORY, index=False, encoding='utf-8-sig')
        df_bill.to_csv(DB_BILLING, index=False, encoding='utf-8-sig')
        backup_data()
        add_log(tech_name, "Job Completed", f"Job: {job_id}, Customer: {customer_name}, Total: {total_bill}")
        
        # Build Report String
        r_list = [
            f"✨ ปิดงานสำเร็จ: {job_id} ✨",
            "",
            f"👤 ลูกค้า: {customer_name}",
            f"📍 ที่อยู่: {location}",
            f"🛠️ อะไหล่: {', '.join(used_items_detail)}",
            f"💰 ค่าแรง: {labor_cost:,.2f} บาท",
            f"💵 ยอดรวม: {total_bill:,.2f} บาท",
            "",
            "⚙️ สถานะ: ✅ เสร็จสิ้น",
            f"👷 ช่าง: {tech_name}",
            "--------------------"
        ]
        
        return json.dumps({"status": "success", "report": r_list, "invoice": invoice_no, "alerts": low_stock_alerts}, ensure_ascii=False)
    except Exception as e: return json.dumps({"status": "error", "message": str(e)}, ensure_ascii=False)

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 3:
        res = process_job_completion(sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4] if len(sys.argv)>4 else "Unknown")
        sys.stdout.buffer.write(res.encode('utf-8'))
