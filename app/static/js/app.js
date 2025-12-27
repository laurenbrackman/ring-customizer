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
                const gemstoneType = item.dataset.gemstone;
                this.addElement(src, name, type, gemstoneType);
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

    async addBezelToSelected() {
        if (!this.selectedObject || this.selectedObject.type !== 'gemstone') {
            alert('Please select a gemstone first');
            return;
        }
        
        if (!this.selectedBezelStyle || !this.selectedBezelMetal) {
            alert('Please select both bezel style and metal');
            return;
        }
        
        let originalText = 'Add Bezel';
        
        try {
            // Show loading state
            const addBezelBtn = document.getElementById('add-bezel-btn');
            originalText = addBezelBtn?.textContent || 'Add Bezel';
            if (addBezelBtn) {
                addBezelBtn.textContent = 'Creating...';
                addBezelBtn.disabled = true;
            }
            
            // Create bezel using simple shape duplication with color overlay
            const bezel = await this.createSimpleBezel(
                this.selectedObject, 
                this.selectedBezelStyle, 
                this.selectedBezelMetal
            );
            
            if (bezel) {
                // Remove any existing bezels for this gemstone
                const gemstoneId = this.selectedObject.id || this.generateId();
                if (!this.selectedObject.id) {
                    this.selectedObject.id = gemstoneId;
                }
                
                this.removeExistingBezels(gemstoneId);
                
                // Add bezel behind the gemstone
                this.canvas.add(bezel);
                this.canvas.sendToBack(bezel);
                
                this.canvas.renderAll();
                this.saveState();
                
                // Reset bezel selections
                document.querySelectorAll('.bezel-option').forEach(o => o.classList.remove('selected'));
                document.querySelectorAll('.bezel-metal').forEach(m => m.classList.remove('selected'));
                this.selectedBezelStyle = null;
                this.selectedBezelMetal = null;
                this.updateBezelButton();
                
                // Update the properties panel
                this.updatePropertiesPanel();
            }
            
        } catch (error) {
            console.error('Error adding bezel:', error);
            alert('Failed to create bezel. Please try again.');
        } finally {
            // Reset button
            const addBezelBtn = document.getElementById('add-bezel-btn');
            if (addBezelBtn) {
                addBezelBtn.textContent = originalText || 'Add Bezel';
                addBezelBtn.disabled = false;
            }
        }
    }

    async createSimpleBezel(gemstone, style, metal) {
        return new Promise((resolve) => {
            // Get the image URL from the gemstone object
            const imageUrl = gemstone.getSrc();
            
            // Create a new image for the bezel that's slightly larger
            fabric.Image.fromURL(imageUrl, (bezelImg) => {
                // Calculate bezel size (10% larger than gemstone)
                const bezelScale = (gemstone.scaleX || 1) * 1.1;
                
                bezelImg.set({
                    left: gemstone.left,
                    top: gemstone.top,
                    originX: 'center',
                    originY: 'center',
                    scaleX: bezelScale,
                    scaleY: bezelScale,
                    selectable: true,
                    type: 'bezel',
                    gemstoneId: gemstone.id || this.generateId(),
                    bezelStyle: style,
                    bezelMetal: metal,
                    name: `${metal} ${style} Bezel`,
                    angle: gemstone.angle || 0
                });

                // Apply solid color filter to create bezel effect
                this.applyBezelFilter(bezelImg, metal, style);
                
                resolve(bezelImg);
            });
        });
    }

    applyBezelFilter(bezelImg, metal, style) {
        bezelImg.filters = [];
        
        // Get bezel colors
        const colors = this.getBezelColors(metal, style);
        
        // Apply color matrix to make it solid colored
        const colorMatrix = [
            0, 0, 0, 0, colors.r/255,  // Red channel
            0, 0, 0, 0, colors.g/255,  // Green channel  
            0, 0, 0, 0, colors.b/255,  // Blue channel
            0, 0, 0, 1, 0              // Keep alpha (transparency)
        ];
        
        bezelImg.filters.push(new fabric.Image.filters.ColorMatrix({ matrix: colorMatrix }));
        
        // Add style-specific effects
        this.addBezelStyleEffect(bezelImg, style);
        
        bezelImg.applyFilters();
    }

    getBezelColors(metal, style) {
        const colorMap = {
            gold: {
                plain: { r: 255, g: 215, b: 0 },     // Pure gold
                serrated: { r: 218, g: 165, b: 32 }, // Darker gold
                scalloped: { r: 255, g: 223, b: 0 }  // Bright gold
            },
            silver: {
                plain: { r: 192, g: 192, b: 192 },   // Silver
                serrated: { r: 169, g: 169, b: 169 }, // Dark gray
                scalloped: { r: 211, g: 211, b: 211 } // Light gray
            }
        };
        
        return colorMap[metal]?.[style] || colorMap[metal]?.plain || { r: 192, g: 192, b: 192 };
    }

    addBezelStyleEffect(bezelImg, style) {
        switch(style) {
            case 'serrated':
                // Add slight pixelate effect for jagged appearance
                bezelImg.filters.push(new fabric.Image.filters.Pixelate({ blocksize: 2 }));
                break;
            case 'scalloped':
                // Add slight blur for softer, rounded appearance
                bezelImg.filters.push(new fabric.Image.filters.Blur({ blur: 0.1 }));
                break;
            case 'plain':
            default:
                // No additional effects for plain bezel
                break;
        }
    }

    removeExistingBezels(gemstoneId) {
        const existingBezels = this.canvas.getObjects().filter(obj => 
            obj.type === 'bezel' && obj.gemstoneId === gemstoneId
        );
        
        existingBezels.forEach(bezel => {
            this.canvas.remove(bezel);
        });
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    addElement(src, name, type, gemstoneType = null) {
        // Load actual gemstone images
        fabric.Image.fromURL(src, (img) => {
            img.set({
                left: this.canvas.width / 2,
                top: this.canvas.height / 2,
                originX: 'center',
                originY: 'center',
                selectable: true,
                name: name,
                type: 'gemstone',
                gemstoneType: gemstoneType || name.toLowerCase(),
                lockScalingX: true,
                lockScalingY: true
            });
            
            // Scale gemstones to consistent size
            const maxSize = 80;
            const scale = Math.min(maxSize / img.width, maxSize / img.height);
            img.scale(scale);
            
            this.canvas.add(img);
            this.canvas.setActiveObject(img);
            this.canvas.renderAll();
            this.saveState();
        }, {
            // Handle image load errors
            crossOrigin: 'anonymous'
        });
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