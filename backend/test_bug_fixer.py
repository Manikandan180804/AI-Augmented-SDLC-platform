import requests
import json

url = "http://127.0.0.1:8000/api/v1/agents/fix-bug"
data = {"bug_report": "The login page crashes when entering an empty email address."}
headers = {"Content-Type": "application/json"}

try:
    response = requests.post(url, json=data, headers=headers)
    print(f"Status Code: {response.status_code}")
    print("Response Body:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
