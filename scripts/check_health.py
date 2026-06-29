import json
from app import health

resp = health()
print(resp.get_data(as_text=True))
