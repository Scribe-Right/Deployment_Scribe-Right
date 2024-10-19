import cv2
import time
from htr_pipeline import read_page, DetectorConfig, LineClusteringConfig

output_dir = 'output/'
os.makedirs(output_dir, exist_ok=True)

camera = cv2.VideoCapture(0)

while True:
    # Capture image from the camera
    ret, frame = camera.read()
    if not ret:
        print("Failed to capture image")
        continue

    # Convert to grayscale
    gray_img = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # Process with HTR
    read_lines = read_page(gray_img, DetectorConfig(scale=0.4, margin=5), 
                           line_clustering_config=LineClusteringConfig(min_words_per_line=2))

    # Save the output
    timestamp = time.strftime("%Y%m%d-%H%M%S")
    output_file = os.path.join(output_dir, f"output_{timestamp}.txt")
    with open(output_file, 'w') as f:
        for read_line in read_lines:
            line_text = ' '.join(read_word.text for read_word in read_line)
            f.write(line_text + '\n')

    print(f"Captured and processed image, output saved to {output_file}")

    # Wait before capturing the next image
    time.sleep(5)
