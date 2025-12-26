// Ring Customizer App
class RingCustomizer {
    constructor() {
        this.canvas = null;
        this.layers = [];
        this.selectedObject = null;
        this.history = [];
        this.historyIndex = -1;
        this.selectedBezelStyle = null;
        this.selectedBezelMetal = null;
        
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
                const src = item.dataset.src;
                const name = item.querySelector('span').textContent;
                const type = item.dataset.type;
                this.addElement(src, name, type);
            });
        });
    }

    setupBezelControlsInPanel() {
        // Bezel style selection
        const bezelOptions = document.querySelectorAll('.bezel-option');
        bezelOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove previous selection
                bezelOptions.forEach(o => o.classList.remove('selected'));
                // Add selection to clicked option
                option.classList.add('selected');
                this.selectedBezelStyle = option.dataset.style;
                this.updateBezelButton();
            });
        });

        // Bezel metal selection
        const bezelMetals = document.querySelectorAll('.bezel-metal');
        bezelMetals.forEach(metal => {
            metal.addEventListener('click', () => {
                // Remove previous selection
                bezelMetals.forEach(m => m.classList.remove('selected'));
                // Add selection to clicked metal
                metal.classList.add('selected');
                this.selectedBezelMetal = metal.dataset.metal;
                this.updateBezelButton();
            });
        });

        // Add bezel button
        const addBezelBtn = document.getElementById('add-bezel-btn');
        if (addBezelBtn) {
            addBezelBtn.addEventListener('click', () => {
                this.addBezelToSelected();
            });
        }
    }

    updateBezelButton() {
        const addBezelBtn = document.getElementById('add-bezel-btn');
        if (!addBezelBtn) return; // Exit if button doesn't exist
        
        const hasSelection = this.selectedObject && this.selectedObject.type === 'gemstone';
        const hasBezelConfig = this.selectedBezelStyle && this.selectedBezelMetal;
        
        addBezelBtn.disabled = !hasSelection || !hasBezelConfig;
    }

    addBezelToSelected() {
        if (!this.selectedObject || this.selectedObject.type !== 'gemstone') return;
        if (!this.selectedBezelStyle || !this.selectedBezelMetal) return;

        const gemstone = this.selectedObject;
        const bezelColor = this.selectedBezelMetal === 'gold' ? '#FFD700' : '#C0C0C0';
        
        // Calculate bezel size based on gemstone
        let bezelRadius;
        
        // Get the bounding box of the gemstone to calculate appropriate bezel size
        const gemstoneType = gemstone.gemstoneType;
        
        switch(gemstoneType) {
            case 'diamond':
            case 'topaz':
                bezelRadius = 30; // Polygon shapes
                break;
            case 'ruby':
            case 'amethyst':
                bezelRadius = gemstone.radius + 5;
                break;
            case 'emerald':
                bezelRadius = 25; // Rectangle shape
                break;
            case 'sapphire':
                bezelRadius = Math.max(gemstone.rx, gemstone.ry) + 5;
                break;
            default:
                bezelRadius = 25; // Default size
        }

        let bezel;
        
        // Create bezel based on style
        switch(this.selectedBezelStyle) {
            case 'plain':
                bezel = new fabric.Circle({
                    radius: bezelRadius,
                    fill: 'transparent',
                    stroke: bezelColor,
                    strokeWidth: 4,
                    left: gemstone.left,
                    top: gemstone.top,
                    originX: 'center',
                    originY: 'center',
                    selectable: true,
                    name: `${this.selectedBezelMetal} Plain Bezel`,
                    type: 'bezel',
                    lockScalingX: true,
                    lockScalingY: true
                });
                break;
                
            case 'serrated':
                bezel = new fabric.Circle({
                    radius: bezelRadius,
                    fill: 'transparent',
                    stroke: bezelColor,
                    strokeWidth: 4,
                    strokeDashArray: [3, 2],
                    left: gemstone.left,
                    top: gemstone.top,
                    originX: 'center',
                    originY: 'center',
                    selectable: true,
                    name: `${this.selectedBezelMetal} Serrated Bezel`,
                    type: 'bezel',
                    lockScalingX: true,
                    lockScalingY: true
                });
                break;
                
            case 'scalloped':
                bezel = new fabric.Circle({
                    radius: bezelRadius,
                    fill: 'transparent',
                    stroke: bezelColor,
                    strokeWidth: 6,
                    strokeDashArray: [4, 3],
                    left: gemstone.left,
                    top: gemstone.top,
                    originX: 'center',
                    originY: 'center',
                    selectable: true,
                    name: `${this.selectedBezelMetal} Scalloped Bezel`,
                    type: 'bezel',
                    lockScalingX: true,
                    lockScalingY: true
                });
                break;
        }

        if (bezel) {
            // Add bezel behind the gemstone
            const gemstoneIndex = this.canvas.getObjects().indexOf(gemstone);
            this.canvas.insertAt(bezel, gemstoneIndex);
            
            this.canvas.setActiveObject(bezel);
            this.canvas.renderAll();
            this.saveState();
            
            // Reset bezel selections
            document.querySelectorAll('.bezel-option').forEach(o => o.classList.remove('selected'));
            document.querySelectorAll('.bezel-metal').forEach(m => m.classList.remove('selected'));
            this.selectedBezelStyle = null;
            this.selectedBezelMetal = null;
            this.updateBezelButton();
            
            // Update the properties panel to refresh the bezel controls
            this.updatePropertiesPanel();
        }
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
                    lockScalingY: true,
                    type: 'gemstone',
                    gemstoneType: 'diamond'
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
                    lockScalingY: true,
                    type: 'gemstone',
                    gemstoneType: src
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
                    lockScalingY: true,
                    type: 'gemstone',
                    gemstoneType: 'emerald'
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
                    lockScalingY: true,
                    type: 'gemstone',
                    gemstoneType: 'sapphire'
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
                    lockScalingY: true,
                    type: 'gemstone',
                    gemstoneType: 'topaz'
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
                name: name
                // Don't override the type - keep the 'gemstone' type we set earlier
            });
            
            this.canvas.add(element);
            this.canvas.setActiveObject(element);
            this.canvas.renderAll();
            this.saveState();
        }
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
        this.updateBezelButton();
        
        // Enable layer controls
        document.getElementById('delete-selected').disabled = false;
        document.getElementById('duplicate-selected').disabled = false;
    }

    onObjectDeselected() {
        this.selectedObject = null;
        this.updateLayerPanel();
        this.updatePropertiesPanel();
        this.updateBezelButton();
        
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
                'bezel': '⭕',
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
        
        let propertiesHTML = `
            <div class="property-group">
                <label class="property-label">Rotation:</label>
                <input type="range" class="property-control" id="prop-rotation" min="0" max="360" value="${obj.angle || 0}">
            </div>
        `;

        // Add bezel controls if this is a gemstone
        if (obj.type === 'gemstone') {
            propertiesHTML += `
                <div class="bezel-section">
                    <h4><i class="fas fa-circle-notch"></i> Add Bezel</h4>
                    <div class="bezel-controls">
                        <div class="bezel-style-section">
                            <label class="property-label">Style:</label>
                            <div class="bezel-style-grid">
                                <div class="bezel-option" data-style="plain">
                                    <svg width="35" height="35" viewBox="0 0 40 40">
                                        <circle cx="20" cy="20" r="15" fill="none" stroke="#888" stroke-width="3"/>
                                    </svg>
                                    <span>Plain</span>
                                </div>
                                <div class="bezel-option" data-style="serrated">
                                    <svg width="35" height="35" viewBox="0 0 40 40">
                                        <circle cx="20" cy="20" r="15" fill="none" stroke="#888" stroke-width="3" stroke-dasharray="2,1"/>
                                    </svg>
                                    <span>Serrated</span>
                                </div>
                                <div class="bezel-option" data-style="scalloped">
                                    <svg width="35" height="35" viewBox="0 0 40 40">
                                        <circle cx="20" cy="20" r="15" fill="none" stroke="#888" stroke-width="3" stroke-dasharray="3,2"/>
                                    </svg>
                                    <span>Scalloped</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bezel-metal-section">
                            <label class="property-label">Metal:</label>
                            <div class="bezel-metal-grid">
                                <div class="bezel-metal" data-metal="gold">
                                    <div class="metal-swatch" style="background: #FFD700;"></div>
                                    <span>Gold</span>
                                </div>
                                <div class="bezel-metal" data-metal="silver">
                                    <div class="metal-swatch" style="background: #C0C0C0;"></div>
                                    <span>Silver</span>
                                </div>
                            </div>
                        </div>
                        
                        <button id="add-bezel-btn" class="btn btn-primary" disabled>
                            <i class="fas fa-plus"></i> Add Bezel
                        </button>
                    </div>
                </div>
            `;
        }

        propertiesDiv.innerHTML = propertiesHTML;

        // Set up property change handlers
        this.setupPropertyHandlers();
        
        // Set up bezel controls if this is a gemstone
        if (obj.type === 'gemstone') {
            this.setupBezelControlsInPanel();
        }
    }

    setupPropertyHandlers() {
        const rotationInput = document.getElementById('prop-rotation');

        if (rotationInput) {
            rotationInput.addEventListener('input', () => {
                this.selectedObject.set('angle', parseInt(rotationInput.value));
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