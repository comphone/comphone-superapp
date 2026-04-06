import os

files = ['shop/DB_BILLING.csv', 'shop/DB_CUSTOMERS.csv', 'shop/DB_INVENTORY.csv', 'shop/DB_JOBS.csv']
encodings_to_try = ['cp874', 'tis-620', 'utf-8', 'utf-16']

def fix_encoding(file_path):
    if not os.path.exists(file_path):
        print(f"Skipping {file_path}")
        return

    content = None
    success_enc = None
    for enc in encodings_to_try:
        try:
            with open(file_path, 'r', encoding=enc) as f:
                content = f.read()
                success_enc = enc
                break
        except:
            continue
    
    if content:
        with open(file_path, 'w', encoding='utf-8-sig') as f:
            f.write(content)
        print(f"DONE: {file_path} from {success_enc}")

if __name__ == "__main__":
    for f in files:
        fix_encoding(f)
