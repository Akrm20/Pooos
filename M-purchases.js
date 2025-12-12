/**
 * M-purchases.js - نظام المشتريات لنظام Micro ERP
 * يتكامل مع M-core.js و M-database.js
 */

class MPurchases {
    constructor() {
        this.db = new MDatabase();
        this.cart = [];
        this.selectedSupplier = null;
        this.invoiceType = 'cash';
        this.tax = { type: 'percentage', value: COMPANY_INFO.FINANCIAL.defaultTaxRate || 0 };
        this.discount = { type: 'percentage', value: 0 };
        this.currentView = 'supplierSelection'; // 'supplierSelection' or 'purchasing'
    }

    /**
     * تهيئة نظام المشتريات
     */
    async init() {
        try {
            await this.db.openDB();
            await this.loadSuppliers();
            await this.loadCategories();
            this.setupEventListeners();
            this.updateUI();
        } catch (error) {
            console.error('خطأ في تهيئة نظام المشتريات:', error);
            this.showNotification('خطأ في تحميل النظام', 'danger');
        }
    }

    /**
     * تحميل الموردين
     */
    async loadSuppliers() {
        try {
            const suppliers = await this.db.getAllSuppliers(true);
            this.renderSuppliersSelect(suppliers);
        } catch (error) {
            console.error('خطأ في تحميل الموردين:', error);
        }
    }

    /**
     * عرض الموردين في القائمة المنسدلة
     */
    renderSuppliersSelect(suppliers) {
        const select = document.getElementById('supplierSelect');
        if (!select) return;

        select.innerHTML = '<option value="">اختر المورد...</option>';
        
        suppliers.forEach(supplier => {
            const option = document.createElement('option');
            option.value = supplier.id;
            option.textContent = `${supplier.name} - ${supplier.phone || 'لا يوجد هاتف'}`;
            select.appendChild(option);
        });

        // إضافة زر لإضافة مورد جديد
        const newOption = document.createElement('option');
        newOption.value = 'new';
        newOption.textContent = '➕ إضافة مورد جديد';
        select.appendChild(newOption);
    }

    /**
     * تحميل الفئات
     */
    async loadCategories() {
        try {
            const categories = await this.db.getAllCategories(true);
            this.renderCategoriesFilter(categories);
        } catch (error) {
            console.error('خطأ في تحميل الفئات:', error);
        }
    }

    /**
     * عرض الفئات في عامل التصفية
     */
    renderCategoriesFilter(categories) {
        const select = document.getElementById('categoryFilterSelect');
        if (!select) return;

        select.innerHTML = '<option value="">جميع الفئات</option>';
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    }

    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        // تبديل الثيم
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // اختيار المورد
        document.getElementById('supplierSelect').addEventListener('change', (e) => {
            this.handleSupplierSelect(e.target.value);
        });
        
        // تأكيد اختيار المورد
        document.getElementById('selectSupplierBtn').addEventListener('click', () => this.confirmSupplierSelection());
        
        // تغيير المورد
        document.getElementById('changeSupplierBtn').addEventListener('click', () => this.changeSupplier());
        
        // إضافة منتجات
        document.getElementById('addItemsBtn').addEventListener('click', () => this.startPurchasing());
        
        // البحث عن المنتجات
        document.getElementById('itemSearchInput').addEventListener('input', (e) => this.searchItems(e.target.value));
        
        // تصفية الفئات
        document.getElementById('categoryFilterSelect').addEventListener('change', () => this.filterItems());
        
        // مسح البحث
        document.getElementById('clearSearchBtn').addEventListener('click', () => this.clearSearch());
        
        // أحداث السلة
        document.getElementById('invoiceTypeSelect').addEventListener('change', (e) => {
            this.invoiceType = e.target.value;
            this.updateCartTotals();
        });
        
        document.getElementById('taxTypeSelect').addEventListener('change', (e) => {
            this.tax.type = e.target.value;
            this.updateCartTotals();
        });
        
        document.getElementById('taxValueInput').addEventListener('input', (e) => {
            this.tax.value = parseFloat(e.target.value) || 0;
            this.updateCartTotals();
        });
        
        document.getElementById('discountTypeSelect').addEventListener('change', (e) => {
            this.discount.type = e.target.value;
            this.updateCartTotals();
        });
        
        document.getElementById('discountValueInput').addEventListener('input', (e) => {
            this.discount.value = parseFloat(e.target.value) || 0;
            this.updateCartTotals();
        });
        
        // إتمام عملية الشراء
        document.getElementById('completePurchaseBtn').addEventListener('click', () => this.completePurchase());
        
        // تفريغ السلة
        document.getElementById('clearCartBtn').addEventListener('click', () => this.clearCart());
        
        // حفظ المورد الجديد
        document.getElementById('saveSupplierBtn').addEventListener('click', () => this.saveNewSupplier());
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
        
        this.db.saveSetting('THEME', newTheme);
    }

    /**
     * معالجة اختيار المورد
     */
    handleSupplierSelect(supplierId) {
        const selectBtn = document.getElementById('selectSupplierBtn');
        
        if (supplierId === 'new') {
            // فتح نافذة إضافة مورد جديد
            const modal = new bootstrap.Modal(document.getElementById('addSupplierModal'));
            modal.show();
            selectBtn.disabled = true;
        } else if (supplierId) {
            selectBtn.disabled = false;
        } else {
            selectBtn.disabled = true;
        }
    }

    /**
     * تأكيد اختيار المورد
     */
    async confirmSupplierSelection() {
        const supplierId = document.getElementById('supplierSelect').value;
        
        try {
            const supplier = await this.db.get('suppliers', parseInt(supplierId));
            this.selectedSupplier = supplier;
            
            this.showSupplierInfo(supplier);
            this.showNotification(`تم اختيار المورد: ${supplier.name}`, 'success');
            this.updateUI();
        } catch (error) {
            console.error('خطأ في اختيار المورد:', error);
            this.showNotification('خطأ في اختيار المورد', 'danger');
        }
    }

    /**
     * عرض معلومات المورد المختار
     */
    showSupplierInfo(supplier) {
        const container = document.getElementById('selectedSupplierInfo');
        if (!container) return;

        container.innerHTML = `
            <div class="col-md-4">
                <div class="mb-3">
                    <label class="form-label">اسم المورد:</label>
                    <input type="text" class="form-control" value="${supplier.name}" readonly>
                </div>
            </div>
            <div class="col-md-4">
                <div class="mb-3">
                    <label class="form-label">الهاتف:</label>
                    <input type="text" class="form-control" value="${supplier.phone || 'لا يوجد'}" readonly>
                </div>
            </div>
            <div class="col-md-4">
                <div class="mb-3">
                    <label class="form-label">الرصيد:</label>
                    <input type="text" class="form-control" value="${(supplier.balance || 0).toFixed(2)} ر.ي" readonly>
                </div>
            </div>
            <div class="col-12">
                <div class="mb-3">
                    <label class="form-label">العنوان:</label>
                    <textarea class="form-control" rows="2" readonly>${supplier.address || 'لا يوجد'}</textarea>
                </div>
            </div>
        `;
        
        document.getElementById('supplierSelectionView').style.display = 'block';
        document.getElementById('supplierBalance').textContent = `رصيد المورد: ${(supplier.balance || 0).toFixed(2)} ر.ي`;
    }

    /**
     * تغيير المورد
     */
    changeSupplier() {
        this.selectedSupplier = null;
        document.getElementById('supplierSelectionView').style.display = 'none';
        document.getElementById('purchasingView').style.display = 'none';
        document.getElementById('supplierSelect').value = '';
        document.getElementById('selectSupplierBtn').disabled = true;
        document.getElementById('addItemsBtn').disabled = true;
        this.updateUI();
    }

    /**
     * بدء عملية الشراء
     */
    startPurchasing() {
        this.currentView = 'purchasing';
        document.getElementById('purchasingView').style.display = 'block';
        this.loadItems();
    }

    /**
     * تحميل المنتجات
     */
    async loadItems() {
        try {
            const items = await this.db.getAllItems(true);
            this.allItems = items;
            this.renderItems(items);
        } catch (error) {
            console.error('خطأ في تحميل المنتجات:', error);
        }
    }

    /**
     * عرض المنتجات
     */
    renderItems(items) {
        const container = document.getElementById('itemsGrid');
        const countElement = document.getElementById('itemsCount');
        const noItemsElement = document.getElementById('noItemsFound');
        
        if (!container) return;

        container.innerHTML = '';
        
        if (items.length === 0) {
            countElement.textContent = '0 منتج';
            noItemsElement.style.display = 'block';
            return;
        }
        
        countElement.textContent = `${items.length} منتج`;
        noItemsElement.style.display = 'none';

        items.forEach(item => {
            const cartItem = this.cart.find(cartItem => cartItem.id === item.id);
            const quantity = cartItem ? cartItem.quantity : 0;
            
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4';
            col.innerHTML = `
                <div class="item-card ${quantity > 0 ? 'selected' : ''}" data-item-id="${item.id}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <div class="fw-bold">${item.name}</div>
                            <div class="small text-muted">${item.code}</div>
                            <div class="stock-info">المخزون: ${item.stock || 0}</div>
                        </div>
                        <div class="text-end">
                            <div class="fw-bold text-success mb-2">${(item.cost || 0).toFixed(2)} ر.ي</div>
                            <div class="quantity-controls">
                                <button class="btn btn-sm btn-outline-secondary" data-action="decrease" ${quantity === 0 ? 'disabled' : ''}>
                                    <i class="bi bi-dash"></i>
                                </button>
                                <span class="px-2">${quantity}</span>
                                <button class="btn btn-sm btn-outline-secondary" data-action="increase">
                                    <i class="bi bi-plus"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    ${item.description ? `<div class="small text-muted mt-2">${item.description.substring(0, 50)}...</div>` : ''}
                </div>
            `;
            
            // إضافة الأحداث
            col.querySelector('[data-action="increase"]').addEventListener('click', (e) => {
                e.stopPropagation();
                this.addToCart(item);
            });
            
            col.querySelector('[data-action="decrease"]').addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFromCart(item.id);
            });
            
            container.appendChild(col);
        });
    }

    /**
     * البحث عن المنتجات
     */
    async searchItems(query) {
        if (!this.allItems) return;
        
        const filteredItems = this.allItems.filter(item => {
            const searchTerm = query.toLowerCase();
            return item.name.toLowerCase().includes(searchTerm) || 
                   item.code.toLowerCase().includes(searchTerm);
        });
        
        this.renderItems(filteredItems);
    }

    /**
     * تصفية المنتجات حسب الفئة
     */
    async filterItems() {
        const categoryId = document.getElementById('categoryFilterSelect').value;
        
        if (!categoryId) {
            this.renderItems(this.allItems);
            return;
        }
        
        const filteredItems = this.allItems.filter(item => item.categoryId == categoryId);
        this.renderItems(filteredItems);
    }

    /**
     * مسح البحث والتصفية
     */
    clearSearch() {
        document.getElementById('itemSearchInput').value = '';
        document.getElementById('categoryFilterSelect').value = '';
        this.renderItems(this.allItems);
    }

    /**
     * إضافة منتج إلى السلة
     */
    addToCart(item) {
        const existingItem = this.cart.find(cartItem => cartItem.id === item.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
            existingItem.totalCost = existingItem.quantity * existingItem.cost;
        } else {
            this.cart.push({
                id: item.id,
                name: item.name,
                code: item.code,
                cost: item.cost || 0,
                quantity: 1,
                totalCost: item.cost || 0,
                stock: item.stock || 0,
                unit: item.unit || 'حبة'
            });
        }
        
        this.updateCartUI();
        this.updateItemsDisplay();
        this.updateUI();
    }

    /**
     * إزالة منتج من السلة
     */
    removeFromCart(itemId) {
        const itemIndex = this.cart.findIndex(item => item.id === itemId);
        
        if (itemIndex === -1) return;
        
        if (this.cart[itemIndex].quantity > 1) {
            this.cart[itemIndex].quantity -= 1;
            this.cart[itemIndex].totalCost = this.cart[itemIndex].quantity * this.cart[itemIndex].cost;
        } else {
            this.cart.splice(itemIndex, 1);
        }
        
        this.updateCartUI();
        this.updateItemsDisplay();
        this.updateUI();
    }

    /**
     * تحديث عرض المنتجات بعد التعديل في السلة
     */
    updateItemsDisplay() {
        document.querySelectorAll('.item-card').forEach(card => {
            const itemId = parseInt(card.dataset.itemId);
            const cartItem = this.cart.find(item => item.id === itemId);
            
            if (cartItem) {
                card.classList.add('selected');
                const quantitySpan = card.querySelector('.quantity-controls span');
                const decreaseBtn = card.querySelector('[data-action="decrease"]');
                
                if (quantitySpan) quantitySpan.textContent = cartItem.quantity;
                if (decreaseBtn) decreaseBtn.disabled = false;
            } else {
                card.classList.remove('selected');
                const quantitySpan = card.querySelector('.quantity-controls span');
                const decreaseBtn = card.querySelector('[data-action="decrease"]');
                
                if (quantitySpan) quantitySpan.textContent = '0';
                if (decreaseBtn) decreaseBtn.disabled = true;
            }
        });
    }

    /**
     * تحديث واجهة السلة
     */
    updateCartUI() {
        const container = document.getElementById('purchaseCartItems');
        const completeBtn = document.getElementById('completePurchaseBtn');
        
        if (!container) return;

        if (this.cart.length === 0) {
            container.innerHTML = '<div class="text-center text-muted p-3">السلة فارغة</div>';
            completeBtn.disabled = true;
            this.updateCartTotals();
            return;
        }
        
        container.innerHTML = '';
        completeBtn.disabled = false;
        
        this.cart.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'receipt-item';
            itemElement.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-bold">${item.name}</div>
                        <div class="small text-muted">${item.code}</div>
                        <div class="small">${item.cost.toFixed(2)} ر.ي × ${item.quantity} ${item.unit}</div>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold text-success">${item.totalCost.toFixed(2)} ر.ي</div>
                        <button class="btn btn-sm btn-outline-danger mt-1" data-index="${index}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            
            // حدث حذف المنتج
            itemElement.querySelector('button').addEventListener('click', (e) => {
                e.stopPropagation();
                this.cart.splice(index, 1);
                this.updateCartUI();
                this.updateItemsDisplay();
                this.updateUI();
            });
            
            container.appendChild(itemElement);
        });
        
        this.updateCartTotals();
    }

    /**
     * تحديث الإجماليات
     */
    updateCartTotals() {
        const subtotal = this.cart.reduce((sum, item) => sum + item.totalCost, 0);
        
        // حساب الخصم
        let discountAmount = 0;
        if (this.discount.type === 'fixed') {
            discountAmount = this.discount.value;
        } else {
            discountAmount = subtotal * (this.discount.value / 100);
        }
        
        // حساب الضريبة
        let taxAmount = 0;
        if (this.tax.type === 'fixed') {
            taxAmount = this.tax.value;
        } else {
            taxAmount = (subtotal - discountAmount) * (this.tax.value / 100);
        }
        
        // الإجمالي النهائي
        const total = subtotal - discountAmount + taxAmount;
        
        // تحديث الواجهة
        document.getElementById('purchaseSubtotal').textContent = `${subtotal.toFixed(2)} ر.ي`;
        document.getElementById('purchaseDiscount').textContent = `-${discountAmount.toFixed(2)} ر.ي`;
        document.getElementById('purchaseTax').textContent = `${taxAmount.toFixed(2)} ر.ي`;
        document.getElementById('purchaseTotal').textContent = `${total.toFixed(2)} ر.ي`;
        
        // تحديث البادج
        document.getElementById('cartTotalBadge').textContent = `السلة: ${total.toFixed(2)} ر.ي`;
    }

    /**
     * تفريغ السلة
     */
    clearCart() {
        if (this.cart.length === 0) return;
        
        if (confirm('هل أنت متأكد من تفريغ سلة المشتريات؟')) {
            this.cart = [];
            this.updateCartUI();
            this.updateItemsDisplay();
            this.updateUI();
            this.showNotification('تم تفريغ السلة', 'info');
        }
    }

    /**
     * إتمام عملية الشراء
     */
    async completePurchase() {
        if (this.cart.length === 0) {
            this.showNotification('السلة فارغة', 'warning');
            return;
        }
        
        if (!this.selectedSupplier) {
            this.showNotification('يجب اختيار مورد أولاً', 'warning');
            return;
        }
        
        // حساب الإجماليات
        const subtotal = this.cart.reduce((sum, item) => sum + item.totalCost, 0);
        
        let discountAmount = 0;
        if (this.discount.type === 'fixed') {
            discountAmount = this.discount.value;
        } else {
            discountAmount = subtotal * (this.discount.value / 100);
        }
        
        let taxAmount = 0;
        if (this.tax.type === 'fixed') {
            taxAmount = this.tax.value;
        } else {
            taxAmount = (subtotal - discountAmount) * (this.tax.value / 100);
        }
        
        const total = subtotal - discountAmount + taxAmount;
        
        // إنشاء فاتورة الشراء
        const invoice = {
            invoiceNumber: this.generateInvoiceNumber(),
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('ar-SA'),
            type: 'purchase',
            supplierId: this.selectedSupplier.id,
            supplierName: this.selectedSupplier.name,
            items: this.cart.map(item => ({
                itemId: item.id,
                name: item.name,
                code: item.code,
                quantity: item.quantity,
                unitPrice: item.cost,
                totalPrice: item.totalCost,
                unit: item.unit
            })),
            subtotal: subtotal,
            discount: discountAmount,
            tax: taxAmount,
            total: total,
            paymentMethod: this.invoiceType,
            status: this.invoiceType === 'cash' ? 'paid' : 'pending',
            createdAt: new Date().toISOString(),
            createdBy: 'Purchase System'
        };
        
        try {
            // 1. حفظ فاتورة الشراء (في مخزن invoices مع نوع purchase)
            await this.db.put('invoices', invoice);
            
            // 2. تحديث المخزون
            for (const item of this.cart) {
                const dbItem = await this.db.get('items', item.id);
                dbItem.stock = (dbItem.stock || 0) + item.quantity;
                dbItem.cost = item.cost; // تحديث سعر التكلفة
                dbItem.lastPurchased = new Date().toISOString();
                await this.db.put('items', dbItem);
            }
            
            // 3. تسجيل القيد المحاسبي
            await this.recordPurchaseTransaction(invoice);
            
            // 4. تحديث رصيد المورد إذا كان الشراء آجل
            if (this.invoiceType === 'credit') {
                await this.updateSupplierBalance(this.selectedSupplier.id, total);
            }
            
            // 5. إشعار النجاح
            this.showNotification('تم إتمام عملية الشراء بنجاح!', 'success');
            
            // 6. طباعة الفاتورة
            this.printPurchaseInvoice(invoice);
            
            // 7. إعادة تعيين النظام
            this.cart = [];
            this.updateCartUI();
            this.updateItemsDisplay();
            this.updateUI();
            
        } catch (error) {
            console.error('خطأ في إتمام عملية الشراء:', error);
            this.showNotification('فشل في إتمام عملية الشراء', 'danger');
        }
    }

    /**
     * تسجيل القيد المحاسبي للشراء
     */
    async recordPurchaseTransaction(invoice) {
        const transaction = {
            date: invoice.date,
            type: 'purchase',
            description: `فاتورة مشتريات ${invoice.invoiceNumber} من ${invoice.supplierName}`,
            reference: invoice.invoiceNumber,
            entries: []
        };
        
        // حساب تكلفة المشتريات
        const purchaseTotal = invoice.subtotal - invoice.discount;
        
        if (invoice.paymentMethod === 'cash') {
            // نقدي: إلى ح/ الصندوق
            transaction.entries.push({
                accountCode: '1010', // الصندوق
                debit: 0,
                credit: invoice.total,
                description: `دفع نقدي - ${invoice.invoiceNumber}`
            });
        } else if (invoice.paymentMethod === 'credit') {
            // آجل: إلى ح/ الموردين
            transaction.entries.push({
                accountCode: '2010', // الموردين
                debit: 0,
                credit: invoice.total,
                description: `شراء آجل - ${invoice.invoiceNumber}`
            });
        }
        
        // من ح/ المخزون (تحديث سعر التكلفة)
        transaction.entries.push({
            accountCode: '1030', // المخزون
            debit: purchaseTotal,
            credit: 0,
            description: `زيادة مخزون - ${invoice.invoiceNumber}`
        });
        
        // إذا كان هناك خصم
        if (invoice.discount > 0) {
            transaction.entries.push({
                accountCode: '4030', // خصومات المبيعات (يمكن إنشاء حساب خاص بخصومات المشتريات)
                debit: invoice.discount,
                credit: 0,
                description: `خصم مشتريات - ${invoice.invoiceNumber}`
            });
        }
        
        // إذا كان هناك ضريبة
        if (invoice.tax > 0) {
            transaction.entries.push({
                accountCode: '1070', // ضريبة المدخلات
                debit: invoice.tax,
                credit: 0,
                description: `ضريبة مشتريات - ${invoice.invoiceNumber}`
            });
        }
        
        // حفظ القيد
        await this.db.addTransaction(transaction);
    }

    /**
     * تحديث رصيد المورد
     */
    async updateSupplierBalance(supplierId, amount) {
        try {
            const supplier = await this.db.get('suppliers', supplierId);
            supplier.balance = (supplier.balance || 0) + amount;
            await this.db.put('suppliers', supplier);
            
            // تحديث العرض
            this.selectedSupplier = supplier;
            document.getElementById('supplierBalance').textContent = `رصيد المورد: ${(supplier.balance || 0).toFixed(2)} ر.ي`;
        } catch (error) {
            console.error('خطأ في تحديث رصيد المورد:', error);
        }
    }

    /**
     * إنشاء رقم فاتورة
     */
    generateInvoiceNumber() {
        const prefix = 'PUR-';
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        return `${prefix}${year}${month}${day}-${random}`;
    }

    /**
     * طباعة فاتورة الشراء
     */
    printPurchaseInvoice(invoice) {
        const printWindow = window.open('', '_blank');
        
        const content = `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>فاتورة مشتريات ${invoice.invoiceNumber}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .invoice-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    .company-name { font-size: 24px; font-weight: bold; margin: 0; }
                    .invoice-info { margin-bottom: 20px; background: #f8f9fa; padding: 15px; border-radius: 5px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                    th { background-color: #f2f2f2; }
                    .totals { float: left; width: 300px; border: 1px solid #ddd; padding: 15px; margin-top: 20px; }
                    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
                    .purchase-title { color: #198754; }
                </style>
            </head>
            <body>
                <div class="invoice-header">
                    <h1 class="company-name">${COMPANY_INFO.BASIC.name}</h1>
                    <h2 class="purchase-title">فاتورة مشتريات</h2>
                    <p>${COMPANY_INFO.CONTACT.address.street}, ${COMPANY_INFO.CONTACT.address.city}</p>
                    <p>هاتف: ${COMPANY_INFO.CONTACT.phone.primary}</p>
                </div>
                
                <div class="invoice-info">
                    <div class="row">
                        <div class="col">
                            <p><strong>رقم الفاتورة:</strong> ${invoice.invoiceNumber}</p>
                            <p><strong>التاريخ:</strong> ${invoice.date} ${invoice.time}</p>
                        </div>
                        <div class="col">
                            <p><strong>المورد:</strong> ${invoice.supplierName}</p>
                            <p><strong>طريقة الدفع:</strong> ${invoice.paymentMethod === 'cash' ? 'نقدي' : 'آجل'}</p>
                        </div>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>المنتج</th>
                            <th>الكمية</th>
                            <th>سعر الوحدة</th>
                            <th>الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.items.map((item, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${item.name}<br><small>${item.code}</small></td>
                                <td>${item.quantity} ${item.unit}</td>
                                <td>${item.unitPrice.toFixed(2)} ر.ي</td>
                                <td>${item.totalPrice.toFixed(2)} ر.ي</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="totals">
                    <p><strong>المجموع الفرعي:</strong> ${invoice.subtotal.toFixed(2)} ر.ي</p>
                    <p><strong>الخصم:</strong> ${invoice.discount.toFixed(2)} ر.ي</p>
                    <p><strong>الضريبة:</strong> ${invoice.tax.toFixed(2)} ر.ي</p>
                    <p><strong>الإجمالي النهائي:</strong> ${invoice.total.toFixed(2)} ر.ي</p>
                    <p><strong>المبلغ بالكتابة:</strong> ${this.numberToArabicWords(invoice.total)} ريال يمني فقط لا غير</p>
                </div>
                
                <div class="footer">
                    <p>شكراً لتعاملكم معنا</p>
                    <p>${COMPANY_INFO.REPORTING.invoiceFooter.contactInfo}</p>
                    <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')}</p>
                </div>
                
                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `;
        
        printWindow.document.write(content);
        printWindow.document.close();
    }

    /**
     * حفظ مورد جديد
     */
    async saveNewSupplier() {
        const name = document.getElementById('supplierName').value;
        const phone = document.getElementById('supplierPhone').value;
        const email = document.getElementById('supplierEmail').value;
        const address = document.getElementById('supplierAddress').value;
        const balance = parseFloat(document.getElementById('supplierBalance').value) || 0;
        const notes = document.getElementById('supplierNotes').value;
        
        if (!name.trim()) {
            this.showNotification('اسم المورد مطلوب', 'warning');
            return;
        }
        
        try {
            const supplier = {
                name: name,
                phone: phone,
                email: email,
                address: address,
                balance: balance,
                notes: notes,
                createdAt: new Date().toISOString(),
                active: true
            };
            
            await this.db.saveSupplier(supplier);
            
            // إغلاق النافذة
            const modal = bootstrap.Modal.getInstance(document.getElementById('addSupplierModal'));
            modal.hide();
            
            // تحديث قائمة الموردين
            await this.loadSuppliers();
            
            // اختيار المورد الجديد
            const suppliers = await this.db.getAllSuppliers(true);
            const newSupplier = suppliers.find(s => s.name === name && s.phone === phone);
            
            if (newSupplier) {
                document.getElementById('supplierSelect').value = newSupplier.id;
                this.handleSupplierSelect(newSupplier.id);
            }
            
            this.showNotification('تم إضافة المورد بنجاح', 'success');
            
        } catch (error) {
            console.error('خطأ في حفظ المورد:', error);
            this.showNotification('خطأ في حفظ المورد', 'danger');
        }
    }

    /**
     * تحويل الرقم إلى كلمات عربية
     */
    numberToArabicWords(number) {
        // دالة مبسطة لتحويل الأرقام إلى كلمات
        const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
        const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
        
        if (number === 0) return 'صفر';
        
        const intPart = Math.floor(number);
        const decPart = Math.round((number - intPart) * 100);
        
        let words = '';
        
        if (intPart > 0) {
            words += this.convertNumberToWords(intPart);
        }
        
        if (decPart > 0) {
            if (words) words += ' و ';
            words += this.convertNumberToWords(decPart) + ' قرش';
        }
        
        return words;
    }

    /**
     * دالة مساعدة لتحويل الأرقام
     */
    convertNumberToWords(num) {
        // تنفيذ مبسط - في التطبيق الحقيقي تحتاج لدالة كاملة
        if (num < 10) {
            const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
            return units[num] || '';
        }
        return num.toString();
    }

    /**
     * تحديث واجهة المستخدم
     */
    updateUI() {
        const selectSupplierBtn = document.getElementById('selectSupplierBtn');
        const addItemsBtn = document.getElementById('addItemsBtn');
        
        if (this.selectedSupplier) {
            addItemsBtn.disabled = false;
        } else {
            addItemsBtn.disabled = true;
        }
        
        if (document.getElementById('supplierSelect').value && document.getElementById('supplierSelect').value !== 'new') {
            selectSupplierBtn.disabled = false;
        }
    }

    /**
     * إظهار إشعار
     */
    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        
        notification.textContent = message;
        notification.className = 'toast-notification';
        
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#198754';
                break;
            case 'warning':
                notification.style.backgroundColor = '#ffc107';
                break;
            case 'danger':
                notification.style.backgroundColor = '#dc3545';
                break;
            case 'info':
                notification.style.backgroundColor = '#0dcaf0';
                break;
        }
        
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
}

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.purchaseSystem = new MPurchases();
    window.purchaseSystem.init();
});