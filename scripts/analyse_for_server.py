import time
import os
import cv2
import htr_pipeline
from htr_pipeline import read_page, DetectorConfig, LineClusteringConfig
import google.generativeai as genai
import pandas as pd
from datetime import datetime
import argparse
import json

# Initialize the Gemini model
genai.configure(api_key="AIzaSyBPhRoY7S2I35q460jQTcbLVYcxccPB2Go")
model = genai.GenerativeModel('gemini-1.5-flash')

# Dictionaries to store letter counts
incorrect_letter_counts = {}
total_letter_counts = {}

# Initialize Excel file path
excel_file = '../output/letter_incorrect_percentage.xlsx'

def compare_and_track_incorrect_letters(extracted_sentence, corrected_sentence):
    global total_letter_counts, incorrect_letter_counts

    # Split the sentences into words
    extracted_words = extracted_sentence.lower().split()
    corrected_words = corrected_sentence.lower().split()

    # Compare words between the extracted and corrected sentences
    for original_word, corrected_word in zip(extracted_words, corrected_words):
        min_length = min(len(original_word), len(corrected_word))
        max_length = max(len(original_word), len(corrected_word))

        # Compare letters in both words, up to the length of the shorter word
        for i in range(min_length):
            original_letter = original_word[i]
            corrected_letter = corrected_word[i]
            if original_letter.isalpha():  # Ensure the character is a letter
                total_letter_counts[original_letter] = total_letter_counts.get(original_letter, 0) + 1
                if original_letter != corrected_letter:
                    incorrect_letter_counts[original_letter] = incorrect_letter_counts.get(original_letter, 0) + 1

        # If the original word is longer, count the extra letters as incorrect
        if len(original_word) > len(corrected_word):
            for i in range(min_length, max_length):
                original_letter = original_word[i]
                if original_letter.isalpha():
                    total_letter_counts[original_letter] = total_letter_counts.get(original_letter, 0) + 1
                    incorrect_letter_counts[original_letter] = incorrect_letter_counts.get(original_letter, 0) + 1

        # If the corrected word is longer, add the extra letters to total counts (but they aren't incorrect)
        if len(corrected_word) > len(original_word):
            for i in range(min_length, max_length):
                corrected_letter = corrected_word[i]
                if corrected_letter.isalpha():
                    total_letter_counts[corrected_letter] = total_letter_counts.get(corrected_letter, 0) + 1

def read_text_from_file(file_path):
    with open(file_path, 'r') as file:
        return file.read()

def analyze_and_return_results():
    letters_to_practice = []

    analysis_results = {
        "letter_analysis": [],
        "letters_to_practice": []
    }

    for letter in 'abcdefghijklmnopqrstuvwxyz':
        total_count = total_letter_counts.get(letter, 0)
        incorrect_count = incorrect_letter_counts.get(letter, 0)
        inaccuracy_percentage = (incorrect_count / total_count) * 100 if total_count > 0 else 0

        analysis_results["letter_analysis"].append({
            "letter": letter,
            "total_occurrences": total_count,
            "incorrect_occurrences": incorrect_count,
            "percentage_of_inaccuracy": round(inaccuracy_percentage, 2)
        })

        if inaccuracy_percentage > 50:
            letters_to_practice.append(letter)

    analysis_results["letters_to_practice"] = letters_to_practice

    return analysis_results

def process_image(image_path):
    global total_letter_counts, incorrect_letter_counts

    # Initialize a dictionary to store the result
    result = {
        "status": "success",
        "message": "",
        "data": {}
    }

    print(f"Processing image: {image_path}")

    # Read the image as grayscale
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)

    # Check if the image was loaded successfully
    if img is None:
        result["status"] = "error"
        result["message"] = f"Failed to load image: {image_path}. Please check the file path or image integrity."
        return result

    # Perform text recognition on the image
    read_lines = read_page(img, DetectorConfig(scale=0.4, margin=5), 
                           line_clustering_config=LineClusteringConfig(min_words_per_line=1))

    # Save the recognized text to a .txt file
    filename = os.path.basename(image_path)
    txt_file_path = os.path.join('..\output', filename + '.txt')
    with open(txt_file_path, 'w') as f:
        for read_line in read_lines:
            line_text = ' '.join(read_word.text for read_word in read_line)
            f.write(line_text + '\n')

    print(f"Text saved to {txt_file_path}")

    # Read the recognized text
    extracted_sentence = read_text_from_file(txt_file_path).replace('\n', ' ')

    # Get the corrected sentence from Gemini
    response = model.generate_content("correct the given sentence, make sure to not increase the number of words too much and just give me the corrected sentence as the response: " + extracted_sentence)
    corrected_sentence = response.text.strip()

    print(f"Extracted Sentence: {extracted_sentence}")
    print(f"Corrected Sentence: {corrected_sentence}")

    # Compare the extracted sentence with the corrected sentence and track incorrect letters
    compare_and_track_incorrect_letters(extracted_sentence.lower(), corrected_sentence.lower())

    # Create a dictionary to hold the percentages for each letter
    letter_percentages = {letter: 0 for letter in 'abcdefghijklmnopqrstuvwxyz'}
    for letter, total_count in total_letter_counts.items():
        incorrect_count = incorrect_letter_counts.get(letter, 0)
        letter_percentages[letter] = (incorrect_count / total_count) * 100 if total_count > 0 else 0

    # Add the current timestamp
    letter_percentages['timestamp'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # Load existing data if the Excel file exists, otherwise create a new DataFrame
    if os.path.exists(excel_file):
        try:
            df = pd.read_excel(excel_file)
        except Exception as e:
            result["status"] = "error"
            result["message"] = f"Failed to read the Excel file: {e}"
            return result
    else:
        df = pd.DataFrame(columns=['timestamp'] + list('abcdefghijklmnopqrstuvwxyz'))

    # Create a new DataFrame for the current row
    new_row = pd.DataFrame([letter_percentages])

    # Concatenate the new row to the existing DataFrame
    df = pd.concat([df, new_row], ignore_index=True)

    # Save the updated DataFrame to the Excel file
    try:
        df.to_excel(excel_file, index=False)
        print(f"Data successfully saved to {excel_file}")
    except Exception as e:
        result["status"] = "error"
        result["message"] = f"Failed to save data to the Excel file: {e}"
        return result

    # Analyze and get the results
    analysis_results = analyze_and_return_results()

    # Add the analysis results to the result dictionary
    result["data"] = {
        "extracted_sentence": extracted_sentence,
        "corrected_sentence": corrected_sentence,
        "letter_analysis": analysis_results["letter_analysis"],
        "letters_to_practice": analysis_results["letters_to_practice"]
    }

    # Reset the incorrect letter counts and total letters count for the next image
    incorrect_letter_counts.clear()
    total_letter_counts.clear()

    return result

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process an image for OCR and text correction.")
    parser.add_argument("image_path", help="Path to the image file to process")

    args = parser.parse_args()

    if not os.path.exists(args.image_path):
        print(json.dumps({"status": "error", "message": f"The file {args.image_path} does not exist."}))
        exit(1)

    # Process the image provided as a command-line argument
    result = process_image(args.image_path)
    print(json.dumps(result, indent=4))
    #return result