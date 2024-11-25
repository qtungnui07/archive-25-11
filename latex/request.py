import requests

url = "http://127.0.0.1:8000/process_batch/"
data = {
    "equations": [
        {
            "latex": "x \time 2 - 4 ",
            "operation": "solve"
        },
        {
            "latex": "x + y",
            "operation": "subs",
            "substitutions": {"x": 2, "y": 3}
        },
        {
            "latex": "sin(pi/2) + cos(0)",
            "operation": "simplify"
        }
    ]
}

response = requests.post(url, json=data)
print(response.json())
