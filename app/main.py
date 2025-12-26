from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
import os
import json
from datetime import datetime
import base64
from io import BytesIO
from PIL import Image
import uuid

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
app.config['UPLOAD_FOLDER'] = os.environ.get('UPLOAD_FOLDER', 'static/uploads')

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    """Main ring customizer interface"""
    return render_template('index.html')

@app.route('/api/save-design', methods=['POST'])
def save_design():
    """Save the current ring design configuration"""
    try:
        design_data = request.get_json()
        
        # Generate unique design ID
        design_id = str(uuid.uuid4())
        
        # Save design metadata
        design_info = {
            'id': design_id,
            'name': design_data.get('name', f'Design {datetime.now().strftime("%Y%m%d_%H%M%S")}'),
            'created_at': datetime.now().isoformat(),
            'canvas_data': design_data.get('canvas_data'),
            'elements': design_data.get('elements', [])
        }
        
        # Save to file (in production, use database)
        designs_dir = os.path.join(app.config['UPLOAD_FOLDER'], 'designs')
        os.makedirs(designs_dir, exist_ok=True)
        
        with open(os.path.join(designs_dir, f'{design_id}.json'), 'w') as f:
            json.dump(design_info, f)
        
        return jsonify({'success': True, 'design_id': design_id})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/load-design/<design_id>')
def load_design(design_id):
    """Load a saved ring design"""
    try:
        designs_dir = os.path.join(app.config['UPLOAD_FOLDER'], 'designs')
        design_path = os.path.join(designs_dir, f'{design_id}.json')
        
        if not os.path.exists(design_path):
            return jsonify({'success': False, 'error': 'Design not found'}), 404
        
        with open(design_path, 'r') as f:
            design_data = json.load(f)
        
        return jsonify({'success': True, 'design': design_data})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/export-image', methods=['POST'])
def export_image():
    """Export the ring design as an image"""
    try:
        data = request.get_json()
        image_data = data.get('image_data')
        
        if not image_data:
            return jsonify({'success': False, 'error': 'No image data provided'}), 400
        
        # Remove the data URL prefix
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
        
        # Decode base64 image
        image_bytes = base64.b64decode(image_data)
        
        # Generate filename
        filename = f"ring_design_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # Save image
        with open(filepath, 'wb') as f:
            f.write(image_bytes)
        
        return jsonify({
            'success': True, 
            'filename': filename,
            'download_url': f'/download/{filename}'
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/download/<filename>')
def download_file(filename):
    """Download exported image"""
    try:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if os.path.exists(filepath):
            return send_file(filepath, as_attachment=True)
        else:
            return "File not found", 404
    except Exception as e:
        return f"Error: {str(e)}", 500

@app.route('/api/upload-element', methods=['POST'])
def upload_element():
    """Upload a custom design element"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            # Add timestamp to avoid conflicts
            name, ext = os.path.splitext(filename)
            filename = f"{name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{ext}"
            
            filepath = os.path.join('app/static/images/elements', filename)
            file.save(filepath)
            
            return jsonify({
                'success': True, 
                'filename': filename,
                'url': f'/static/images/elements/{filename}'
            })
        
        return jsonify({'success': False, 'error': 'Invalid file type'}), 400
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    port = int(os.environ.get('FLASK_RUN_PORT', 5001))
    app.run(debug=True, host='0.0.0.0', port=port)