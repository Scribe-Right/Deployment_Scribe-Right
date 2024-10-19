# gemini key :AIzaSyBPhRoY7S2I35q460jQTcbLVYcxccPB2Go
import google.generativeai as genai
import os
import time
genai.configure(api_key="AIzaSyBPhRoY7S2I35q460jQTcbLVYcxccPB2Go")

model = genai.GenerativeModel('gemini-1.5-flash')
sentence=""

# Function to read the text from the latest .txt file
def read_new_txt_file(directory, processed_files):
    txt_files = {f for f in os.listdir(directory) if f.endswith('.txt')}
    new_files = txt_files - processed_files

    if not new_files:
        return "", processed_files

    # Process the first new file found
    new_file = new_files.pop()
    file_path = os.path.join(directory, new_file)
    with open(file_path, 'r') as f:
        content = f.read()

    # Add this file to the processed set
    processed_files.add(new_file)
    return content, processed_files

# Define the output directory
output_directory = 'output/'
processed_files = set()  # Keep track of files that have been processed

while True:
    sentence, processed_files = read_new_txt_file(output_directory, processed_files)
    
    if sentence:  # If there's content in the new file
        response = model.generate_content("Guess the correct sentence and just give me the corrected sentence as the response: " + sentence)
        print(response.text)
    
    # Wait for a short period before checking again
    time.sleep(5)
