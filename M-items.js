/**
 * M-items.js - إدارة الأصناف والفئات لنظام Micro ERP
 */

class MItems {
    constructor() {
        this.db = new MDatabase();
        this.items = [];
        this.categories = [];
        this.filteredItems = [];
        this.currentItemId = null;
        this.currentCategoryId = null;
        this.itemModal = null;
        this.categoryModal = null;
    }

    /**
     * تهيئة نظام إدارة الأصناف
     */
    async init() {
        try {
            await this.db.openDB();
            await this.loadData();
            this.setupEventListeners();
            this.setupModals();
            this.updateStats();
        } catch (error) {
            console.error('خطأ في تهيئة نظام الأصناف:', error);
        }
    }

    /**
     * تحميل البيانات
     */
    async loadData() {
        try {
            // تحميل الأصناف
            const itemsData = await this.db.getAll('items');
            this.items = itemsData.filter(item => !item.deleted);
            
            // تحميل الفئات
            const categoriesData = await this.db.getAll('categories');
            this.categories = categoriesData.filter(cat => !cat.deleted);
            
            this.renderItems();
            this.renderCategoryFilter();
            this.renderCategorySelect();
            this.renderParentCategorySelect();
        } catch (error) {
            console.error('خطأ في تحميل البيانات:', error);
        }
    }

    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        // تبديل الثيم
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // أزرار الإضافة
        document.getElementById('addItemBtn').addEventListener('click', () => this.openItemModal());
        document.getElementById('addCategoryBtn').addEventListener('click', () => this.openCategoryModal());
        document.getElementById('addFirstItemBtn').addEventListener('click', () => this.openItemModal());
        
        // البحث والتصفية
        document.getElementById('searchItemsInput').addEventListener('input', (e) => this.filterItems());
        document.getElementById('categoryFilter').addEventListener('change', () => this.filterItems());
        document.getElementById('stockFilter').addEventListener('change', () => this.filterItems());
        document.getElementById('clearFiltersBtn').addEventListener('click', () => this.clearFilters());
        
        // تحديث البيانات
        document.getElementById('refreshItemsBtn').addEventListener('click', () => this.refreshData());
        
        // توليد الأكواد
        document.getElementById('generateCodeBtn').addEventListener('click', () => this.generateItemCode());
        
        // حساب هامش الربح
        document.getElementById('itemCost').addEventListener('input', () => this.calculateMargin());
        document.getElementById('itemPrice').addEventListener('input', () => this.calculateMargin());
        
        // منتقي الإيموجي
        document.getElementById('emojiPickerBtn').addEventListener('click', () => this.toggleEmojiPicker());
        document.getElementById('categoryEmojiBtn').addEventListener('click', () => this.toggleCategoryEmojiPicker());
    }

    /**
     * إعداد النوافذ المنبثقة
     */
    setupModals() {
        this.itemModal = new bootstrap.Modal(document.getElementById('itemModal'));
        this.categoryModal = new bootstrap.Modal(document.getElementById('categoryModal'));
        
        // حفظ المنتج
        document.getElementById('saveItemBtn').addEventListener('click', () => this.saveItem());
        
        // حفظ الفئة
        document.getElementById('saveCategoryBtn').addEventListener('click', () => this.saveCategory());
        
        // إغلاق النوافذ
        document.getElementById('itemModal').addEventListener('hidden.bs.modal', () => this.resetItemForm());
        document.getElementById('categoryModal').addEventListener('hidden.bs.modal', () => this.resetCategoryForm());
    }

    /**
     * تبديل الوضع الداكن/الفاتح
     */
    toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        html.setAttribute('data-bs-theme', newTheme);
        
        const icon = document.getElementById('themeIcon');
        icon.className = newTheme === 'light' ? 'bi bi-sun' : 'bi bi-moon';
    }

    /**
     * عرض الأصناف في الجدول
     */
    renderItems() {
        const tbody = document.getElementById('itemsTableBody');
        const loading = document.getElementById('itemsLoading');
        const noItems = document.getElementById('noItemsMessage');
        
        if (this.filteredItems.length === 0) {
            this.filteredItems = this.items;
        }
        
        if (this.filteredItems.length === 0) {
            tbody.innerHTML = '';
            loading.style.display = 'none';
            noItems.style.display = 'block';
            return;
        }
        
        tbody.innerHTML = '';
        loading.style.display = 'none';
        noItems.style.display = 'none';
        
        this.filteredItems.forEach((item, index) => {
            const category = this.categories.find(cat => cat.id === item.categoryId);
            const stockStatus = this.getStockStatus(item.stock, item.minStock || 5);
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><span class="badge bg-secondary">${item.code}</span></td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="me-2">${item.emoji || '📦'}</div>
                        <div>
                            <div class="fw-bold">${item.name}</div>
                            ${item.description ? `<div class="small text-muted">${item.description.substring(0, 50)}...</div>` : ''}
                        </div>
                    </div>
                </td>
                <td>
                    ${category ? `<span class="badge bg-info">${category.name}</span>` : '<span class="text-muted">-</span>'}
                </td>
                <td class="text-nowrap">${item.cost?.toFixed(2) || '0.00'} ر.ي</td>
                <td class="text-nowrap">
                    <span class="fw-bold text-success">${item.salePrice?.toFixed(2) || '0.00'} ر.ي</span>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="me-2">${item.stock || 0}</div>
                        <div class="small text-muted">${item.unit || 'حبة'}</div>
                    </div>
                </td>
                <td>
                    ${this.getStockBadge(item.stock, item.minStock || 5)}
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="itemsSystem.editItem(${item.id})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="itemsSystem.adjustStock(${item.id})">
                            <i class="bi bi-plus-slash-minus"></i>
                        </button>
                        ${item.stock <= 0 ? '' : `
                            <button class="btn btn-outline-warning" onclick="itemsSystem.quickSale(${item.id})">
                                <i class="bi bi-cart"></i>
                            </button>
                        `}
                        <button class="btn btn-outline-danger" onclick="itemsSystem.deleteItem(${item.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        this.updateStats();
    }

    /**
     * الحصول على حالة المخزون
     */
    getStockStatus(stock, minStock) {
        if (stock <= 0) return 'out';
        if (stock <= minStock) return 'low';
        if (stock <= minStock * 3) return 'medium';
        return 'high';
    }

    /**
     * الحصول على شارة المخزون
     */
    getStockBadge(stock, minStock) {
        const status = this.getStockStatus(stock, minStock);
        const statusText = {
            'out': { text: 'نافذ', class: 'danger' },
            'low': { text: 'منخفض', class: 'warning' },
            'medium': { text: 'متوسط', class: 'info' },
            'high': { text: 'جيد', class: 'success' }
        };
        
        return `<span class="badge bg-${statusText[status].class}">${statusText[status].text}</span>`;
    }

    /**
     * تصفية الأصناف
     */
    filterItems() {
        const searchTerm = document.getElementById('searchItemsInput').value.toLowerCase();
        const categoryId = document.getElementById('categoryFilter').value;
        const stockFilter = document.getElementById('stockFilter').value;
        
        this.filteredItems = this.items.filter(item => {
            // البحث النصي
            const matchesSearch = !searchTerm || 
                item.name.toLowerCase().includes(searchTerm) ||
                item.code.toLowerCase().includes(searchTerm) ||
                (item.description && item.description.toLowerCase().includes(searchTerm));
            
            // التصفية بالفئة
            const matchesCategory = !categoryId || item.categoryId == categoryId;
            
            // التصفية بحالة المخزون
            let matchesStock = true;
            if (stockFilter) {
                const status = this.getStockStatus(item.stock, item.minStock || 5);
                matchesStock = status === stockFilter;
            }
            
            return matchesSearch && matchesCategory && matchesStock;
        });
        
        this.renderItems();
    }

    /**
     * مسح الفلاتر
     */
    clearFilters() {
        document.getElementById('searchItemsInput').value = '';
        document.getElementById('categoryFilter').value = '';
        document.getElementById('stockFilter').value = '';
        this.filteredItems = this.items;
        this.renderItems();
    }

    /**
     * تحديث البيانات
     */
    async refreshData() {
        document.getElementById('itemsLoading').style.display = 'block';
        await this.loadData();
    }

    /**
     * تحديث الإحصائيات
     */
    updateStats() {
        // إجمالي الأصناف والفئات
        document.getElementById('totalItems').textContent = this.items.length;
        document.getElementById('totalCategories').textContent = this.categories.length;
        
        // إحصائيات المخزون
        const totalStock = this.items.reduce((sum, item) => sum + (item.stock || 0), 0);
        const totalValue = this.items.reduce((sum, item) => sum + ((item.stock || 0) * (item.cost || 0)), 0);
        const lowStockItems = this.items.filter(item => this.getStockStatus(item.stock, item.minStock || 5) === 'low').length;
        const outOfStockItems = this.items.filter(item => this.getStockStatus(item.stock, item.minStock || 5) === 'out').length;
        
        document.getElementById('totalStockValue').textContent = totalStock;
        document.getElementById('totalInventoryValue').textContent = totalValue.toFixed(2) + ' ر.ي';
        document.getElementById('lowStockItems').textContent = lowStockItems;
        document.getElementById('outOfStockItems').textContent = outOfStockItems;
    }

    /**
     * عرض نافذة إضافة/تعديل منتج
     */
    async openItemModal(itemId = null) {
        this.currentItemId = itemId;
        const modalTitle = document.getElementById('itemModalTitle');
        const form = document.getElementById('itemForm');
        
        if (itemId) {
            modalTitle.textContent = 'تعديل المنتج';
            const item = await this.db.get('items', itemId);
            
            if (item) {
                document.getElementById('itemId').value = item.id;
                document.getElementById('itemName').value = item.name;
                document.getElementById('itemCode').value = item.code;
                document.getElementById('itemCategory').value = item.categoryId || '';
                document.getElementById('itemEmoji').value = item.emoji || '';
                document.getElementById('itemCost').value = item.cost || 0;
                document.getElementById('itemPrice').value = item.salePrice || 0;
                document.getElementById('itemUnit').value = item.unit || 'حبة';
                document.getElementById('itemMinStock').value = item.minStock || 5;
                document.getElementById('itemStock').value = item.stock || 0;
                document.getElementById('itemBarcode').value = item.barcode || '';
                document.getElementById('itemDescription').value = item.description || '';
                document.getElementById('itemActive').checked = !item.deleted;
                
                this.calculateMargin();
            }
        } else {
            modalTitle.textContent = 'إضافة منتج جديد';
            this.generateItemCode();
        }
        
        this.itemModal.show();
    }

    /**
     * توليد كود منتج تلقائي
     */
    generateItemCode() {
        const prefix = 'ITEM-';
        const date = new Date();
        const year = date.getFullYear().toString().substring(2);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        document.getElementById('itemCode').value = `${prefix}${year}${month}${random}`;
    }

    /**
     * حساب هامش الربح
     */
    calculateMargin() {
        const cost = parseFloat(document.getElementById('itemCost').value) || 0;
        const price = parseFloat(document.getElementById('itemPrice').value) || 0;
        
        if (cost > 0 && price > cost) {
            const margin = ((price - cost) / cost * 100).toFixed(2);
            document.getElementById('itemMargin').value = margin;
        } else {
            document.getElementById('itemMargin').value = '0.00';
        }
    }

    /**
     * تبديل منتقي الإيموجي
     */
    toggleEmojiPicker() {
        const picker = document.getElementById('emojiPicker');
        if (picker.style.display === 'none') {
            this.populateEmojiPicker('itemEmoji');
            picker.style.display = 'grid';
        } else {
            picker.style.display = 'none';
        }
    }

    /**
     * ملء منتقي الإيموجي
     */
    populateEmojiPicker(targetInputId) {
        const picker = document.getElementById('emojiPicker');
        const emojis = ['📦', '🍎', '🍌', '🥤', '📱', '💻', '👕', '👖', '👟', '📚', '✏️', '🎮', '🎧', '⌚', '🛒', '💰', '🔧', '💡', '📷', '🎁'];
        
        picker.innerHTML = '';
        emojis.forEach(emoji => {
            const option = document.createElement('div');
            option.className = 'emoji-option';
            option.textContent = emoji;
            option.addEventListener('click', () => {
                document.getElementById(targetInputId).value = emoji;
                picker.style.display = 'none';
            });
            picker.appendChild(option);
        });
    }

    /**
     * حفظ المنتج
     */
    async saveItem() {
        const form = document.getElementById('itemForm');
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        const itemData = {
            name: document.getElementById('itemName').value,
            code: document.getElementById('itemCode').value,
            categoryId: parseInt(document.getElementById('itemCategory').value) || null,
            emoji: document.getElementById('itemEmoji').value || null,
            cost: parseFloat(document.getElementById('itemCost').value) || 0,
            salePrice: parseFloat(document.getElementById('itemPrice').value) || 0,
            unit: document.getElementById('itemUnit').value,
            minStock: parseInt(document.getElementById('itemMinStock').value) || 5,
            stock: parseInt(document.getElementById('itemStock').value) || 0,
            barcode: document.getElementById('itemBarcode').value || null,
            description: document.getElementById('itemDescription').value || null,
            active: document.getElementById('itemActive').checked,
            deleted: !document.getElementById('itemActive').checked,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        const itemId = document.getElementById('itemId').value;
        
        try {
            if (itemId) {
                // تحديث منتج موجود
                const existingItem = await this.db.get('items', parseInt(itemId));
                if (existingItem) {
                    itemData.id = existingItem.id;
                    itemData.createdAt = existingItem.createdAt;
                    await this.db.put('items', itemData);
                }
            } else {
                // إضافة منتج جديد
                await this.db.put('items', itemData);
            }
            
            this.itemModal.hide();
            await this.loadData();
            this.showNotification('تم حفظ المنتج بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في حفظ المنتج:', error);
            this.showNotification('فشل في حفظ المنتج', 'danger');
        }
    }

    /**
     * إعادة تعيين نموذج المنتج
     */
    resetItemForm() {
        const form = document.getElementById('itemForm');
        form.reset();
        form.classList.remove('was-validated');
        document.getElementById('itemId').value = '';
        document.getElementById('emojiPicker').style.display = 'none';
    }

    /**
     * تعديل المنتج
     */
    editItem(itemId) {
        this.openItemModal(itemId);
    }

    /**
     * ضبط المخزون
     */
    async adjustStock(itemId) {
        const item = await this.db.get('items', itemId);
        if (!item) return;
        
        const newStock = prompt(`الكمية الحالية: ${item.stock || 0}\nأدخل الكمية الجديدة:`, item.stock || 0);
        if (newStock === null) return;
        
        const stockValue = parseInt(newStock);
        if (isNaN(stockValue) || stockValue < 0) {
            this.showNotification('الكمية غير صالحة', 'danger');
            return;
        }
        
        try {
            item.stock = stockValue;
            item.updatedAt = new Date().toISOString();
            await this.db.put('items', item);
            
            await this.loadData();
            this.showNotification('تم تحديث المخزون بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في تحديث المخزون:', error);
            this.showNotification('فشل في تحديث المخزون', 'danger');
        }
    }

    /**
     * بيع سريع
     */
    quickSale(itemId) {
        // توجيه لنقطة البيع
        localStorage.setItem('quickSaleItemId', itemId);
        window.location.href = 'M-pos.html';
    }

    /**
     * حذف المنتج
     */
    async deleteItem(itemId) {
        if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
        
        try {
            await this.db.softDelete('items', itemId);
            await this.loadData();
            this.showNotification('تم حذف المنتج بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في حذف المنتج:', error);
            this.showNotification('فشل في حذف المنتج', 'danger');
        }
    }

    /**
     * عرض نافذة إضافة/تعديل فئة
     */
    async openCategoryModal(categoryId = null) {
        this.currentCategoryId = categoryId;
        const modalTitle = document.getElementById('categoryModalTitle');
        
        if (categoryId) {
            modalTitle.textContent = 'تعديل الفئة';
            const category = await this.db.get('categories', categoryId);
            
            if (category) {
                document.getElementById('categoryId').value = category.id;
                document.getElementById('categoryName').value = category.name;
                document.getElementById('categoryParent').value = category.parentId || '';
                document.getElementById('categoryIcon').value = category.icon || '';
                document.getElementById('categoryDescription').value = category.description || '';
                document.getElementById('categoryActive').checked = !category.deleted;
            }
        } else {
            modalTitle.textContent = 'إضافة فئة جديدة';
        }
        
        this.categoryModal.show();
    }

    /**
     * حفظ الفئة
     */
    async saveCategory() {
        const form = document.getElementById('categoryForm');
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        const categoryData = {
            name: document.getElementById('categoryName').value,
            parentId: document.getElementById('categoryParent').value ? 
                parseInt(document.getElementById('categoryParent').value) : null,
            icon: document.getElementById('categoryIcon').value || null,
            description: document.getElementById('categoryDescription').value || null,
            active: document.getElementById('categoryActive').checked,
            deleted: !document.getElementById('categoryActive').checked,
            productCount: 0, // سيتم تحديثه لاحقاً
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        const categoryId = document.getElementById('categoryId').value;
        
        try {
            if (categoryId) {
                // تحديث فئة موجودة
                const existingCategory = await this.db.get('categories', parseInt(categoryId));
                if (existingCategory) {
                    categoryData.id = existingCategory.id;
                    categoryData.createdAt = existingCategory.createdAt;
                    categoryData.productCount = existingCategory.productCount;
                    await this.db.put('categories', categoryData);
                }
            } else {
                // إضافة فئة جديدة
                await this.db.put('categories', categoryData);
            }
            
            this.categoryModal.hide();
            await this.loadData();
            this.showNotification('تم حفظ الفئة بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في حفظ الفئة:', error);
            this.showNotification('فشل في حفظ الفئة', 'danger');
        }
    }

    /**
     * إعادة تعيين نموذج الفئة
     */
    resetCategoryForm() {
        const form = document.getElementById('categoryForm');
        form.reset();
        form.classList.remove('was-validated');
        document.getElementById('categoryId').value = '';
    }

    /**
     * عرض منتقي إيموجي الفئة
     */
    toggleCategoryEmojiPicker() {
        const emoji = prompt('أدخل الإيموجي:', '📁');
        if (emoji) {
            document.getElementById('categoryIcon').value = emoji;
        }
    }

    /**
     * عرض قائمة الفئات في التصفية
     */
    renderCategoryFilter() {
        const select = document.getElementById('categoryFilter');
        select.innerHTML = '<option value="">جميع الفئات</option>';
        
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    }

    /**
     * عرض قائمة الفئات في الاختيار
     */
    renderCategorySelect() {
        const select = document.getElementById('itemCategory');
        select.innerHTML = '<option value="">اختر الفئة</option>';
        
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    }

    /**
     * عرض قائمة الفئات الرئيسية
     */
    renderParentCategorySelect() {
        const select = document.getElementById('categoryParent');
        select.innerHTML = '<option value="">فئة رئيسية</option>';
        
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    }

    /**
     * إظهار إشعار
     */
    showNotification(message, type = 'success') {
        // يمكن إضافة مكتبة إشعارات هنا
        alert(message);
    }
}

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.itemsSystem = new MItems();
    window.itemsSystem.init();
});