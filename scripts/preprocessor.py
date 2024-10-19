import cv2
import numpy as np

def crop_to_text(image_path):
    # Step 1: Read the image
    image = cv2.imread(image_path)
    
    # Step 2: Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Step 3: Apply adaptive thresholding
    binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                   cv2.THRESH_BINARY_INV, 11, 30)

    # Step 4: Use morphological operations to reduce noise and close gaps between text
    kernel = np.ones((5, 5), np.uint8)  # Adjust kernel size as needed
    closing = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

    # Step 5: Find contours
    contours, _ = cv2.findContours(closing, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Step 6: Combine contours to find the bounding box around all text
    if contours:
        # Create an empty mask to draw contours on
        mask = np.zeros_like(binary)

        # Draw all contours on the mask
        for contour in contours:
            cv2.drawContours(mask, [contour], -1, (255), thickness=cv2.FILLED)

        # Find contours again on the filled mask
        combined_contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        # Get the bounding box of the combined contours
        x, y, w, h = cv2.boundingRect(combined_contours[0])

        # Step 7: Crop the image using the combined bounding box
        cropped_image = image[y:y+h, x:x+w]

        # Display or save the cropped image
        cv2.imshow('Cropped Image', cropped_image)
        cv2.waitKey(0)
        cv2.destroyAllWindows()

        return cropped_image
    else:
        print("No contours found!")
        return None

# Example usage
cropped_image = crop_to_text('../data/images/4.jpg')
