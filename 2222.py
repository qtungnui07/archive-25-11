import base64

# Đọc ảnh và mã hóa thành base64
with open("75_leo.bmp", "rb") as image_file:
    encoded_image = base64.b64encode(image_file.read()).decode('utf-8')

import requests

# URL của API
url = "https://8000-01jcw1786zb4s3zn2vdy00tba0.cloudspaces.litng.ai/api/comer/prediction/"

# Dữ liệu gửi đi (JSON)
data = {
    "payload": encoded_image  # Base64 ảnh
}

# Gửi yêu cầu POST
response = requests.post(url, json=data)

# Kiểm tra kết quả trả về
if response.status_code == 200:
    print("Response from API:", response.json())
else:
    print(f"Request failed with status code {response.status_code}")