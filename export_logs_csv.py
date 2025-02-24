import sqlite3
import csv

DATABASE_FILE = 'logs.db'  # Make sure this matches your database file name
CSV_FILE = 'logs_export.csv' # Name for the output CSV file

def export_sqlite_to_csv(db_file, csv_file):
    """
    Exports all data from an SQLite database table (specifically 'logs' table) to a CSV file.
    """
    try:
        conn = sqlite3.connect(db_file)
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM logs") # Select all data from the 'logs' table
        rows = cursor.fetchall()

        if not rows:
            print("No data found in the 'logs' table to export.")
            return

        column_names = [description[0] for description in cursor.description] # Get column names

        with open(csv_file, 'w', newline='', encoding='utf-8') as csvfile:
            csv_writer = csv.writer(csvfile)

            csv_writer.writerow(column_names) # Write header row (column names)
            csv_writer.writerows(rows)        # Write data rows

        print(f"Data exported to '{csv_file}' successfully.")

    except sqlite3.Error as e:
        print(f"SQLite error: {e}")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    export_sqlite_to_csv(DATABASE_FILE, CSV_FILE)