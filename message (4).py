import os
import random
import numpy as np
from PIL import Image, ImageDraw, ImageFont

def create_text_image(text, font_path, font_size=60, padding=10):
    font = ImageFont.truetype(font_path, font_size)
    
    # Calculate text size
    dummy_draw = ImageDraw.Draw(Image.new('RGB', (1, 1)))
    bbox = dummy_draw.textbbox((0, 0), text, font=font)
    width = bbox[2] - bbox[0] + (2 * padding)
    height = bbox[3] - bbox[1] + (2 * padding)
    
    image = Image.new('RGB', (int(width), int(height)), 'white')
    draw = ImageDraw.Draw(image)
    draw.text((padding - bbox[0], padding - bbox[1]), text, font=font, fill='black')
    
    return image

def invert_image(img):
    img_array = np.array(img)
    inverted = 255 - img_array
    return Image.fromarray(inverted)

def process_images(images):
    max_height = max(img.size[1] for img in images)
    resized_images = []
    
    for img in images:
        aspect = img.size[0] / img.size[1]
        new_width = int(max_height * aspect)
        resized_images.append(img.resize((new_width, max_height), Image.Resampling.LANCZOS))
    
    total_width = sum(img.size[0] for img in resized_images)
    merged = Image.new('RGB', (total_width, max_height), 'white')
    
    x_offset = 0
    for img in resized_images:
        merged.paste(img, (x_offset, 0))
        x_offset += img.size[0]
    
    return merged

def process_sentence(sentence, token, image_folder, font_path):
    words = sentence.split()
    insert_position = random.randint(0, len(words))
    words.insert(insert_position, token)
    
    random_image = Image.open(os.path.join(image_folder, random.choice(os.listdir(image_folder))))
    inverted_image = invert_image(random_image)
    
    if insert_position == 0:
        images = [inverted_image, create_text_image(" ".join(words[1:]), font_path)]
    elif insert_position == len(words) - 1:
        images = [create_text_image(" ".join(words[:-1]), font_path), inverted_image]
    else:
        images = [
            create_text_image(" ".join(words[:insert_position]), font_path),
            inverted_image,
            create_text_image(" ".join(words[insert_position+1:]), font_path)
        ]
    
    return process_images(images)

def resize_to_average(images):
    # Tính kích thước trung bình
    avg_width = sum(img.width for img in images) // len(images)
    avg_height = sum(img.height for img in images) // len(images)

    resized_images = []
    for img in images:
        aspect_ratio = img.width / img.height
        
        if img.width > img.height:
            new_width = avg_width
            new_height = int(new_width / aspect_ratio)
        else:
            new_height = avg_height
            new_width = int(new_height * aspect_ratio)
        
        resized_images.append(img.resize((new_width, new_height), Image.Resampling.LANCZOS))
    
    return resized_images

def create_and_merge_images(sentence, token, image_folder, font_path, num_images=5):
    images = []
    for _ in range(num_images):
        image = process_sentence(sentence, token, image_folder, font_path)
        images.append(image)
    
    # Resize tất cả ảnh về kích thước trung bình
    resized_images = resize_to_average(images)
    
    total_height = sum(image.height for image in resized_images)
    max_width = max(image.width for image in resized_images)
    
    merged_image = Image.new('RGB', (max_width, total_height), 'white')
    
    current_height = 0
    for image in resized_images:
        new_image = Image.new('RGB', (max_width, image.height), 'white')
        new_image.paste(image, (0, 0))
        merged_image.paste(new_image, (0, current_height))
        current_height += new_image.height
    
    return merged_image

def main():
    sentence = "Hôm nay trời đẹp quá"
    token = "[MASK]"
    image_folder = "filtered_images"
    font_path = "font/1.ttf"
    
    result_image = create_and_merge_images(sentence, token, image_folder, font_path, num_images=5)
    result_image.save('merged_image.jpg')
    result_image.show()

if __name__ == "__main__":
    main()
