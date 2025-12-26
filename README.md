# Ring Customizer

A Python Flask web application for customizing ring designs with an interactive artboard interface.

## Features

- **Interactive Canvas**: Drag and drop elements onto ring designs using Fabric.js
- **Layer Management**: Organize design elements with a visual layer panel
- **Element Library**: Built-in collection of rings, stones, and design elements
- **Custom Uploads**: Upload your own images to use as design elements
- **Text Tool**: Add custom text with font, size, and color controls
- **Export**: High-resolution PNG export of your designs
- **Save/Load**: Save designs and reload them later
- **Undo/Redo**: Full history management with keyboard shortcuts

## Technology Stack

- **Backend**: Python Flask
- **Frontend**: HTML5, CSS3, JavaScript
- **Canvas Library**: Fabric.js for interactive graphics
- **Image Processing**: PIL (Pillow) for server-side image handling
- **Styling**: Custom CSS with responsive design

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd ring-customizer
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

## Running the Application

1. **Activate virtual environment**:
   ```bash
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Start the Flask development server**:
   ```bash
   python app/main.py
   ```

3. **Open in browser**:
   Navigate to `http://localhost:5000`

## Usage

### Basic Workflow

1. **Choose a Ring Base**: Click on a ring style from the left panel
2. **Add Elements**: 
   - Click stones, decorative elements, or text from the toolbox
   - Upload custom images using the upload button
3. **Customize**: 
   - Select elements on the canvas to move, resize, or rotate
   - Use the properties panel to adjust opacity, rotation, and other settings
4. **Layer Management**: 
   - View all elements in the layer panel on the right
   - Reorder layers by selecting objects
   - Delete or duplicate elements
5. **Save & Export**: 
   - Save your design for later editing
   - Export high-resolution PNG files

### Keyboard Shortcuts

- `Ctrl/Cmd + S`: Save design
- `Ctrl/Cmd + Z`: Undo
- `Ctrl/Cmd + Y`: Redo
- `Delete/Backspace`: Delete selected element

### Canvas Controls

- **Zoom In/Out**: Use the zoom buttons in the bottom toolbar
- **Pan**: Click and drag on empty canvas areas
- **Reset View**: Return to default zoom and position
