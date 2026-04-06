import pandas as pd
import os

DB_INVENTORY = "shop/DB_INVENTORY.csv"

def check_all_low_stock():
    if not os.path.exists(DB_INVENTORY):
        return "ERROR: DB_INVENTORY not found."
    
    df_inv = pd.read_csv(DB_INVENTORY, encoding="utf-8-sig")
    low_items = df_inv[df_inv["qty_remaining"] <= df_inv["min_stock"]]
    
    if low_items.empty:
        return "ALL STOCK OK."
    
    report = ["LOW STOCK ALERT!"]
    for _, row in low_items.iterrows():
        report.append(f"- {row['item_name']}: {row['qty_remaining']} (Min: {row['min_stock']})")
    
    return "
".join(report)

if __name__ == "__main__":
    print(check_all_low_stock())
