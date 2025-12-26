// Ring Customizer App
class RingCustomizer {
    constructor() {
        this.canvas = null;
        this.layers = [];
        this.selectedObject = null;
        this.history = [];
        this.historyIndex = -1;
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setupToolbox();
        this.updateLayerPanel();
    }

    setupCanvas() {
        // Initialize Fabric.js canvas
        this.canvas = new fabric.Canvas('ring-canvas', {
            width: 800,
            height: 600,
            backgroundColor: '#ffffff',
            selection: true,
            preserveObjectStacking: true,
            uniformScaling: false
        });

        // Canvas event listeners
        this.canvas.on('selection:created', (e) => this.onObjectSelected(e));
        this.canvas.on('selection:updated', (e) => this.onObjectSelected(e));
        this.canvas.on('selection:cleared', () => this.onObjectDeselected());
        this.canvas.on('object:modified', () => this.saveState());
        this.canvas.on('object:added', () => this.updateLayerPanel());
        this.canvas.on('object:removed', () => this.updateLayerPanel());

        // Initialize with blank canvas - no default ring
        this.saveState();
    }



    setupEventListeners() {
        // Save design
        document.getElementById('save-design').addEventListener('click', () => {
            this.saveDesign();
        });

        // Export design
        document.getElementById('export-design').addEventListener('click', () => {
            this.exportDesign();
        });

        // Canvas controls
        document.getElementById('zoom-in').addEventListener('click', () => {
            const zoom = this.canvas.getZoom();
            this.canvas.setZoom(zoom * 1.1);
        });

        document.getElementById('zoom-out').addEventListener('click', () => {
            const zoom = this.canvas.getZoom();
            this.canvas.setZoom(zoom * 0.9);
        });

        document.getElementById('reset-view').addEventListener('click', () => {
            this.canvas.setZoom(1);
            this.canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
            this.canvas.renderAll();
        });

        // Layer controls
        document.getElementById('delete-selected').addEventListener('click', () => {
            this.deleteSelected();
        });

        document.getElementById('duplicate-selected').addEventListener('click', () => {
            this.duplicateSelected();
        });

        // Custom upload
        document.getElementById('upload-btn').addEventListener('click', () => {
            document.getElementById('custom-upload').click();
        });

        document.getElementById('custom-upload').addEventListener('change', (e) => {
            this.handleFileUpload(e);
        });

        // Text modal
        this.setupTextModal();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'z':
                        e.preventDefault();
                        this.undo();
                        break;
                    case 'y':
                        e.preventDefault();
                        this.redo();
                        break;
                    case 's':
                        e.preventDefault();
                        this.saveDesign();
                        break;
                }
            }
            
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (this.selectedObject) {
                    e.preventDefault();
                    this.deleteSelected();
                }
            }
        });
    }

    setupToolbox() {
        // Gemstone elements
        const gemstones = document.querySelectorAll('#gemstones .element-item');
        gemstones.forEach(item => {
            item.addEventListener('click', () => {
                if (item.dataset.text) {
                    this.showTextModal();
                } else {
                    const src = item.dataset.src;
                    const name = item.querySelector('span').textContent;
                    const type = item.dataset.type;
                    this.addElement(src, name, type);
                }
            });
        });
    }



    addElement(src, name, type) {
        // Create gemstone shapes directly with Fabric.js based on type
        let element;
        
        switch(src) {
            case 'diamond':
                const diamondPoints = [
                    {x: 30, y: 5}, {x: 45, y: 20}, {x: 30, y: 55}, {x: 15, y: 20}
                ];
                element = new fabric.Polygon(diamondPoints, {
                    fill: '#DDDDDD',
                    stroke: '#999999',
                    strokeWidth: 2,
                    lockScalingX: true,
                    lockScalingY: true
                });
                break;
                
            case 'ruby':
            case 'amethyst':
                element = new fabric.Circle({
                    radius: 20,
                    fill: src === 'ruby' ? '#DC143C' : '#9C27B0',
                    stroke: src === 'ruby' ? '#B91C2C' : '#6A1B9A',
                    strokeWidth: 2,
                    lockScalingX: true,
                    lockScalingY: true
                });
                break;
                
            case 'emerald':
                element = new fabric.Rect({
                    width: 30,
                    height: 30,
                    fill: '#50CD1E',
                    stroke: '#2E7D32',
                    strokeWidth: 2,
                    originX: 'center',
                    originY: 'center',
                    lockScalingX: true,
                    lockScalingY: true
                });
                break;
                
            case 'sapphire':
                element = new fabric.Ellipse({
                    rx: 20,
                    ry: 15,
                    fill: '#007FFF',
                    stroke: '#005FBF',
                    strokeWidth: 2,
                    lockScalingX: true,
                    lockScalingY: true
                });
                break;
                
            case 'topaz':
                const topazPoints = [
                    {x: 30, y: 8}, {x: 46, y: 18}, {x: 46, y: 42}, 
                    {x: 30, y: 52}, {x: 14, y: 42}, {x: 14, y: 18}
                ];
                element = new fabric.Polygon(topazPoints, {
                    fill: '#FFA500',
                    stroke: '#E69500',
                    strokeWidth: 2,
                    lockScalingX: true,
                    lockScalingY: true
                });
                break;
                
            default:
                // Handle custom images
                if (src.includes('data:image/svg+xml')) {
                    // Handle SVG fallback
                    const svgData = atob(src.split(',')[1]);
                    fabric.loadSVGFromString(svgData, (objects, options) => {
                        const element = fabric.util.groupSVGElements(objects, options);
                        element.set({
                            left: this.canvas.width / 2,
                            top: this.canvas.height / 2,
                            originX: 'center',
                            originY: 'center',
                            selectable: true,
                            name: name,
                            type: type
                        });
                        
                        this.canvas.add(element);
                        this.canvas.setActiveObject(element);
                        this.canvas.renderAll();
                        this.saveState();
                    });
                    return;
                } else {
                    // Handle image
                    fabric.Image.fromURL(src, (img) => {
                        img.set({
                            left: this.canvas.width / 2,
                            top: this.canvas.height / 2,
                            originX: 'center',
                            originY: 'center',
                            selectable: true,
                            name: name,
                            type: type
                        });
                        
                        // Scale to appropriate size for gemstones
                        const maxSize = type === 'gemstone' ? 60 : 80;
                        const scale = Math.min(maxSize / img.width, maxSize / img.height);
                        img.scale(scale);
                        
                        this.canvas.add(img);
                        this.canvas.setActiveObject(img);
                        this.canvas.renderAll();
                        this.saveState();
                    });
                    return;
                }
        }
        
        if (element) {
            element.set({
                left: this.canvas.width / 2,
                top: this.canvas.height / 2,
                originX: 'center',
                originY: 'center',
                selectable: true,
                name: name,
                type: type
            });
            
            this.canvas.add(element);
            this.canvas.setActiveObject(element);
            this.canvas.renderAll();
            this.saveState();
        }
    }

    setupTextModal() {
        const modal = document.getElementById('text-modal');
        const closeBtn = modal.querySelector('.close');
        const addTextBtn = document.getElementById('add-text-btn');
        const textInput = document.getElementById('text-input');
        const fontSizeRange = document.getElementById('font-size');
        const fontSizeValue = document.getElementById('font-size-value');

        // Font size display update
        fontSizeRange.addEventListener('input', () => {
            fontSizeValue.textContent = fontSizeRange.value + 'px';
        });

        // Close modal
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // Add text
        addTextBtn.addEventListener('click', () => {
            this.addText();
            modal.style.display = 'none';
        });

        // Enter key to add text
        textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addText();
                modal.style.display = 'none';
            }
        });
    }

    showTextModal() {
        const modal = document.getElementById('text-modal');
        const textInput = document.getElementById('text-input');
        
        modal.style.display = 'block';
        textInput.focus();
        textInput.value = '';
    }

    addText() {
        const textInput = document.getElementById('text-input');
        const fontSize = document.getElementById('font-size').value;
        const fontFamily = document.getElementById('font-family').value;
        const textColor = document.getElementById('text-color').value;
        
        if (!textInput.value.trim()) return;

        const text = new fabric.Text(textInput.value, {
            left: this.canvas.width / 2,
            top: this.canvas.height / 2,
            originX: 'center',
            originY: 'center',
            fontFamily: fontFamily,
            fontSize: parseInt(fontSize),
            fill: textColor,
            selectable: true,
            name: `Text: ${textInput.value}`,
            type: 'text'
        });

        this.canvas.add(text);
        this.canvas.setActiveObject(text);
        this.canvas.renderAll();
        this.saveState();
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        fetch('/api/upload-element', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.addElement(data.url, file.name, 'custom');
            } else {
                alert('Upload failed: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Upload error:', error);
            alert('Upload failed');
        });
    }

    onObjectSelected(e) {
        this.selectedObject = e.selected[0] || e.target;
        this.updateLayerPanel();
        this.updatePropertiesPanel();
        
        // Enable layer controls
        document.getElementById('delete-selected').disabled = false;
        document.getElementById('duplicate-selected').disabled = false;
    }

    onObjectDeselected() {
        this.selectedObject = null;
        this.updateLayerPanel();
        this.updatePropertiesPanel();
        
        // Disable layer controls
        document.getElementById('delete-selected').disabled = true;
        document.getElementById('duplicate-selected').disabled = true;
    }

    updateLayerPanel() {
        const layerList = document.getElementById('layer-list');
        layerList.innerHTML = '';

        const objects = this.canvas.getObjects().slice().reverse(); // Reverse for proper layer order

        objects.forEach((obj, index) => {
            const layerItem = document.createElement('div');
            layerItem.className = 'layer-item';
            if (obj === this.selectedObject) {
                layerItem.classList.add('selected');
            }

            const thumbnail = document.createElement('div');
            thumbnail.className = 'layer-thumbnail';
            
            // Set thumbnail icon based on type
            const iconMap = {
                'gemstone': '💎',
                'text': '🔤',
                'custom': '🖼️'
            };
            thumbnail.textContent = iconMap[obj.type] || '📷';

            const info = document.createElement('div');
            info.className = 'layer-info';

            const name = document.createElement('div');
            name.className = 'layer-name';
            name.textContent = obj.name || 'Unnamed Layer';

            const type = document.createElement('div');
            type.className = 'layer-type';
            type.textContent = (obj.type || 'object').toUpperCase();

            info.appendChild(name);
            info.appendChild(type);
            layerItem.appendChild(thumbnail);
            layerItem.appendChild(info);

            // Click to select
            layerItem.addEventListener('click', () => {
                this.canvas.setActiveObject(obj);
                this.canvas.renderAll();
            });

            layerList.appendChild(layerItem);
        });
    }

    updatePropertiesPanel() {
        const propertiesDiv = document.getElementById('element-properties');
        
        if (!this.selectedObject) {
            propertiesDiv.innerHTML = '<p class="no-selection">Select an element to edit properties</p>';
            return;
        }

        const obj = this.selectedObject;
        
        propertiesDiv.innerHTML = `
            <div class="property-group">
                <label class="property-label">Name:</label>
                <input type="text" class="property-control" id="prop-name" value="${obj.name || ''}" maxlength="50">
            </div>
            <div class="property-group">
                <label class="property-label">Opacity:</label>
                <input type="range" class="property-control" id="prop-opacity" min="0" max="1" step="0.1" value="${obj.opacity || 1}">
            </div>
            <div class="property-group">
                <label class="property-label">Rotation:</label>
                <input type="range" class="property-control" id="prop-rotation" min="0" max="360" value="${obj.angle || 0}">
            </div>
        `;

        // Add color control for text
        if (obj.type === 'text') {
            propertiesDiv.innerHTML += `
                <div class="property-group">
                    <label class="property-label">Color:</label>
                    <input type="color" class="property-control" id="prop-color" value="${obj.fill || '#000000'}">
                </div>
            `;
        }

        // Set up property change handlers
        this.setupPropertyHandlers();
    }

    setupPropertyHandlers() {
        const nameInput = document.getElementById('prop-name');
        const opacityInput = document.getElementById('prop-opacity');
        const rotationInput = document.getElementById('prop-rotation');
        const colorInput = document.getElementById('prop-color');

        if (nameInput) {
            nameInput.addEventListener('input', () => {
                this.selectedObject.set('name', nameInput.value);
                this.updateLayerPanel();
            });
        }

        if (opacityInput) {
            opacityInput.addEventListener('input', () => {
                this.selectedObject.set('opacity', parseFloat(opacityInput.value));
                this.canvas.renderAll();
            });
        }

        if (rotationInput) {
            rotationInput.addEventListener('input', () => {
                this.selectedObject.set('angle', parseInt(rotationInput.value));
                this.canvas.renderAll();
            });
        }

        if (colorInput && this.selectedObject.type === 'text') {
            colorInput.addEventListener('input', () => {
                this.selectedObject.set('fill', colorInput.value);
                this.canvas.renderAll();
            });
        }
    }

    deleteSelected() {
        if (this.selectedObject) {
            this.canvas.remove(this.selectedObject);
            this.selectedObject = null;
            this.canvas.renderAll();
            this.saveState();
        }
    }

    duplicateSelected() {
        if (this.selectedObject) {
            this.selectedObject.clone((cloned) => {
                cloned.set({
                    left: cloned.left + 20,
                    top: cloned.top + 20,
                    name: (cloned.name || 'Copy') + ' Copy'
                });
                this.canvas.add(cloned);
                this.canvas.setActiveObject(cloned);
                this.canvas.renderAll();
                this.saveState();
            });
        }
    }

    saveState() {
        const state = JSON.stringify(this.canvas.toJSON(['name', 'type']));
        
        // Remove states after current index
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Add new state
        this.history.push(state);
        this.historyIndex++;
        
        // Limit history size
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.loadState(this.history[this.historyIndex]);
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.loadState(this.history[this.historyIndex]);
        }
    }

    loadState(state) {
        this.canvas.loadFromJSON(state, () => {
            this.canvas.renderAll();
            this.updateLayerPanel();
            this.selectedObject = null;
            this.updatePropertiesPanel();
        });
    }

    saveDesign() {
        const designData = {
            name: prompt('Enter design name:') || 'Untitled Design',
            canvas_data: this.canvas.toJSON(['name', 'type']),
            elements: this.canvas.getObjects().map(obj => ({
                name: obj.name,
                type: obj.type,
                properties: {
                    left: obj.left,
                    top: obj.top,
                    scaleX: obj.scaleX,
                    scaleY: obj.scaleY,
                    angle: obj.angle,
                    opacity: obj.opacity
                }
            }))
        };

        fetch('/api/save-design', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(designData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(`Design saved successfully! ID: ${data.design_id}`);
            } else {
                alert('Save failed: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Save error:', error);
            alert('Save failed');
        });
    }

    exportDesign() {
        // Create high-resolution export
        const originalZoom = this.canvas.getZoom();
        const originalWidth = this.canvas.width;
        const originalHeight = this.canvas.height;
        
        // Set export parameters
        const exportScale = 2; // 2x resolution
        
        // Get the image data
        const dataURL = this.canvas.toDataURL({
            format: 'png',
            quality: 1,
            multiplier: exportScale
        });

        fetch('/api/export-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image_data: dataURL
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Create download link
                const link = document.createElement('a');
                link.href = data.download_url;
                link.download = data.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                alert('Export failed: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Export error:', error);
            alert('Export failed');
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ringCustomizer = new RingCustomizer();
});