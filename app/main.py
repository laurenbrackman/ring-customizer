from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
import os
import json
from datetime import datetime
import base64
from io import BytesIO
from PIL import Image
import uuid
import cv2
import numpy as np

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

@app.route('/api/generate-bezel-path', methods=['POST'])
def generate_bezel_path():
    """Generate SVG path for bezel outline based on gemstone image"""
    try:
        data = request.get_json()
        image_url = data.get('image_url')
        bezel_width = data.get('bezel_width', 8)
        style = data.get('style', 'plain')
        
        print(f"Received image_url: {image_url}")  # Debug log
        
        # Handle different URL formats
        if image_url.startswith('/static/'):
            # Remove leading /static/ and construct path
            relative_path = image_url[8:]  # Remove '/static/'
            image_path = os.path.join('app', 'static', relative_path)
        elif image_url.startswith('static/'):
            # Already relative to app directory
            image_path = os.path.join('app', image_url)
        else:
            # Assume it's a relative path within static
            image_path = os.path.join('app', 'static', image_url.lstrip('/'))
        
        print(f"Looking for image at: {image_path}")  # Debug log
        print(f"File exists: {os.path.exists(image_path)}")  # Debug log
        
        if not os.path.exists(image_path):
            return jsonify({'success': False, 'error': f'Image not found at {image_path}'}), 404
        
        # Load and process image
        img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
        
        if img is None:
            return jsonify({'success': False, 'error': 'Could not load image'}), 400
        
        # Handle different image formats - focus on alpha channel for transparency
        if len(img.shape) == 3 and img.shape[2] == 4:  # RGBA
            alpha = img[:, :, 3]
        elif len(img.shape) == 3 and img.shape[2] == 3:  # RGB - no transparency
            # For RGB images, we'll create an alpha mask by removing the background
            # Assume white or very light colors are background
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            # Create alpha based on non-white areas
            _, alpha = cv2.threshold(gray, 250, 255, cv2.THRESH_BINARY_INV)
        else:  # Grayscale
            # Treat grayscale as alpha
            alpha = img
        
        # Create binary mask from alpha channel - this is the actual gemstone boundary
        # Any pixel with alpha > 0 is considered part of the gemstone
        mask = (alpha > 0).astype(np.uint8) * 255
        
        # Generate outline based on style
        if style == 'plain':
            outline_mask = create_plain_outline(mask, bezel_width)
        elif style == 'serrated':
            outline_mask = create_serrated_outline(mask, bezel_width)
        elif style == 'scalloped':
            outline_mask = create_scalloped_outline(mask, bezel_width)
        else:
            outline_mask = create_plain_outline(mask, bezel_width)
        
        # Convert outline to SVG path
        svg_path = mask_to_svg_path(outline_mask)
        
        return jsonify({
            'success': True,
            'svg_path': svg_path,
            'width': img.shape[1],
            'height': img.shape[0]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def create_plain_outline(mask, width):
    """Create a plain outline by dilating the transparency mask"""
    # Use a smaller, more precise kernel for transparency-based outlines
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (width, width))
    dilated = cv2.dilate(mask, kernel, iterations=1)
    # Subtract original mask to get just the outline/bezel area
    outline = dilated - mask
    return outline

def create_serrated_outline(mask, width):
    """Create a serrated outline with jagged edges based on transparency"""
    # Start with plain outline
    outline = create_plain_outline(mask, width)
    
    # Create serrated pattern using erosion with random pattern
    kernel_small = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    
    # Apply random erosion to create serrated/jagged effect
    h, w = outline.shape
    for i in range(0, h, 6):  # Every 6 pixels
        for j in range(0, w, 6):
            if i+3 < h and j+3 < w:
                if np.random.random() > 0.6:  # 40% chance to create notch
                    outline[i:i+3, j:j+3] = cv2.erode(outline[i:i+3, j:j+3], kernel_small, iterations=1)
    
    return outline

def create_scalloped_outline(mask, width):
    """Create a scalloped outline with rounded edges based on transparency"""
    # Start with plain outline
    outline = create_plain_outline(mask, width)
    
    # Create scalloped pattern using circular morphological operations
    kernel_circle = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (4, 4))
    
    # Apply opening and closing operations to create scalloped effect
    outline = cv2.morphologyEx(outline, cv2.MORPH_OPEN, kernel_circle)
    outline = cv2.morphologyEx(outline, cv2.MORPH_CLOSE, kernel_circle)
    
    # Apply light Gaussian blur for smoother scalloped edges
    outline = cv2.GaussianBlur(outline, (3, 3), 1)
    
    # Re-threshold to maintain binary mask
    _, outline = cv2.threshold(outline, 128, 255, cv2.THRESH_BINARY)
    
    return outline

def mask_to_svg_path(mask):
    """Convert binary mask to SVG path string with better smoothing for transparency-based outlines"""
    # Find contours
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        return ""
    
    # Use the largest contour (should be the main bezel outline)
    largest_contour = max(contours, key=cv2.contourArea)
    
    # Apply more aggressive simplification for cleaner paths from transparency
    epsilon = 0.005 * cv2.arcLength(largest_contour, True)  # Reduced from 0.02 for more precision
    simplified_contour = cv2.approxPolyDP(largest_contour, epsilon, True)
    
    # Convert to SVG path with smooth curves
    if len(simplified_contour) < 3:
        return ""
    
    # Start the path
    first_point = simplified_contour[0][0]
    path_data = f"M {first_point[0]} {first_point[1]}"
    
    # Create smooth curves between points for better bezel appearance
    for i in range(1, len(simplified_contour)):
        point = simplified_contour[i][0]
        x, y = point[0], point[1]
        
        # Use smooth curves for more organic bezel shapes
        if i == 1:
            path_data += f" Q {x} {y} {x} {y}"  # First curve
        else:
            path_data += f" L {x} {y}"  # Line to point
    
    path_data += " Z"  # Close path
    
    return path_data

if __name__ == '__main__':
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    port = int(os.environ.get('FLASK_RUN_PORT', 5001))
    app.run(debug=True, host='0.0.0.0', port=port)