from flask import Flask, jsonify, send_from_directory
import pandas as pd
import os

app = Flask(__name__, static_url_path='', static_folder='static')

@app.route('/data')
def get_data():
    # Load the new data format
    file_path = '/Users/J-D/Documents/ART/INPROGRESS/024DDGB/DDGgraph/DDGgraphJDB/data/binaryCleanUserNumberCollections3Test024.xlsx'
    
    # Check if file exists
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return jsonify({"error": f"File not found: {file_path}"}), 404
    
    try:
        # Specify column names manually
        df = pd.read_excel(file_path, header=None, names=['X', 'Y', 'Z', 'Density'])
    except Exception as e:
        print(f"Error reading file: {e}")
        return jsonify({"error": f"Error reading file: {e}"}), 500


    # Print column names for debugging
    print("DataFrame columns:\n", df.columns)

    # Print the first few rows for debugging
    print("DataFrame head:\n", df.head())

    # Filter rows where Density > 0
    df_filtered = df[df['Density'] > 0]
    
    # Print the filtered DataFrame for debugging
    print("Filtered DataFrame:\n", df_filtered)

    return df_filtered.to_json(orient='records')

@app.route('/')
def serve_index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    app.run(debug=True)




