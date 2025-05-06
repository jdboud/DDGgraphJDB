from flask import Flask, jsonify, send_from_directory
import pandas as pd
import os

app = Flask(__name__, static_url_path='', static_folder='static')

@app.route('/parse', methods=['POST'])
def parse_text():
    text = request.get_data(as_text=True)
    import re
    recs = []
    for line in text.splitlines():
        m = re.search(
          r'Y1:\s*(\d+)\s*Y2:\s*(\d+).*?Receiver\s*1:\s*([\d,\s]+)\s*-\s*PotVals:\s*([\d,\s]+)',
          line
        )
        if not m: continue
        X, Y = map(int, m.groups()[:2])
        zs = [int(z) for z in m.group(3).split(',')]
        ds = [int(d) for d in m.group(4).split(',')]
        for z,d in zip(zs, ds):
            if d>0: recs.append({'X':X,'Y':Y,'Z':z,'Density':d})
    return jsonify(recs)

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




