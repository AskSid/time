from flask import Flask, render_template, request, jsonify
import sqlite3
import google.generativeai as genai
import os
import re

app = Flask(__name__)

# **IMPORTANT:** Set your Gemini API key as an environment variable or directly here for MVP.
# For production, use secure methods to manage API keys.
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY") # or replace with your key directly for testing
if not GOOGLE_API_KEY:
    raise ValueError("Please set the GOOGLE_API_KEY environment variable.")
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-pro')

DATABASE_FILE = 'logs.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    return conn

def init_db():
    conn = get_db_connection()
    with app.open_resource('schema.sql', mode='r') as f:
        conn.executescript(f.read())
    conn.commit()
    conn.close()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/process_log', methods=['POST'])
def process_log():
    log_text = request.form['log_text']
    if not log_text:
        return jsonify({'error': 'Log text is required'}), 400

    prompt = f"""
    Analyze the following time log entry and extract structured information into JSON format.
    Identify the 'category', 'sub_category' (if applicable), 'who_with' (if mentioned), and 'notes' summarizing the activity.
    If 'who_with' is not mentioned, use null. Output in JSON format only.

    Log Entry: {log_text}

    JSON Output:
    """

    try:
        response = model.generate_content(prompt)
        structured_data_str = response.text # Get the text part of the response

        structured_data_str = re.sub(r'```(json)?', '', structured_data_str).strip()

        try:
            import json
            structured_data = json.loads(structured_data_str) # Try to parse JSON
        except json.JSONDecodeError:
            structured_data = {'error': 'Could not parse JSON from Gemini response', 'raw_response': structured_data_str}



        if 'error' not in structured_data: # Only save if no error in Gemini response
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO logs (log_text, category, sub_category, who_with, notes)
                VALUES (?, ?, ?, ?, ?)
            """, (log_text,
                  structured_data.get('category'),
                  structured_data.get('sub_category'),
                  structured_data.get('who_with'),
                  structured_data.get('notes')))
            conn.commit()
            conn.close()

        return jsonify(structured_data)

    except Exception as e:
        return jsonify({'error': str(e), 'gemini_error': True}), 500

@app.route('/api/download_csv')
def download_csv():
    """
    API endpoint to download the logs data as a CSV file.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM logs")
        rows = cursor.fetchall()

        if not rows:
            return jsonify({'message': 'No logs data available to download'}), 200 # Or handle no data case differently

        # Create an in-memory text stream
        csv_buffer = io.StringIO()
        csv_writer = csv.writer(csv_buffer)

        # Write header row
        column_names = [description[0] for description in cursor.description]
        csv_writer.writerow(column_names)

        # Write data rows
        csv_writer.writerows(rows)

        conn.close()

        # Prepare response - send the CSV data as a file download
        output = io.BytesIO() # Use BytesIO for binary data
        output.write(csv_buffer.getvalue().encode('utf-8')) # Encode to bytes
        output.seek(0) # Reset stream position to the beginning

        return send_file(
            output,
            mimetype='text/csv',
            download_name='time_logs_export.csv',
            as_attachment=True
        )

    except sqlite3.Error as e:
        return jsonify({'error': f"Database error: {e}"}), 500
    except Exception as e:
        return jsonify({'error': f"Error generating CSV: {e}"}), 500


if __name__ == '__main__':
    if not os.path.exists(DATABASE_FILE):
        init_db()
    app.run(debug=True)