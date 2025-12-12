/**
 * M-pos.js - نظام نقطة البيع (POS) لنظام Micro ERP
 * يتكامل مع M-core.js و M-database.js
 */

class MPOS {
    constructor() {
        this.db = new MDatabase();
        this.cart = [];
        this.currentBalance = 0;
        this.taxRate = COMPANY_INFO.FINANCIAL.defaultTaxRate || 0;
        this.discount = { type: 'fixed', value: 0 };
        this.paymentMethod = 'cash';
        this.selectedCustomer = null;
        this.quickSuggestions = [];
        this.isCartVisible = false;
    }

    /**
     * تهيئة نقطة البيع
     */
    async init() {
        try {
            await this.db.openDB();
            await this.loadInitialData();
            this.setupEventListeners();
            this.updateBalance();
            await this.loadQuickSuggestions();
            await this.loadCategories();
            await this.loadCustomers();
        } catch (error) {
            console.error('خطأ في تهيئة نقطة البيع:', error);
            this.showNotification('خطأ في تحميل النظام', 'danger');
        }
    }

    /**
     * تحميل البيانات الأولية
     */
    async loadInitialData() {
        // تحميل رصيد الصندوق
        const cashAccount = await this.db.getAccount('1010');
        this.currentBalance = cashAccount?.balance || 0;
        
        // تحميل إعدادات الضريبة
        const taxSetting = await this.db.getSetting('TAX_RATE');
        if (taxSetting) this.taxRate = taxSetting;
    }

    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        // زر تبديل الثيم
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // البحث عن المنتجات
        const searchInput = document.getElementById('productSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
            searchInput.addEventListener('focus', () => this.showSearchResults());
            searchInput.addEventListener('blur', () => setTimeout(() => this.hideSearchResults(), 200));
        }
        
        // أزرار السلة
        document.getElementById('fabCartBtn').addEventListener('click', () => this.toggleCart(true));
        document.getElementById('closeCartBtn').addEventListener('click', () => this.toggleCart(false));
        document.getElementById('floatingCartBtn').addEventListener('click', () => this.toggleCart(true));
        
        // العودة للفئات
        document.getElementById('backToCategoriesBtn').addEventListener('click', () => this.showCategoriesView());
        
        // أحداث السلة
        document.getElementById('discountType').addEventListener('change', (e) => {
            this.discount.type = e.target.value;
            this.updateCartTotals();
        });
        
        document.getElementById('discountInput').addEventListener('input', (e) => {
            this.discount.value = parseFloat(e.target.value) || 0;
            this.updateCartTotals();
        });
        
        document.getElementById('applyTaxCheckbox').addEventListener('change', (e) => {
            const taxRateInput = document.getElementById('taxRateInput');
            taxRateInput.disabled = !e.target.checked;
            this.updateCartTotals();
        });
        
        document.getElementById('taxRateInput').addEventListener('input', (e) => {
            this.taxRate = parseFloat(e.target.value) || 0;
            this.updateCartTotals();
        });
        
        // اختيار العميل
        document.getElementById('customerSelect').addEventListener('change', (e) => {
            this.selectCustomer(e.target.value);
        });
        
        // اختيار طريقة الدفع
        document.getElementById('paymentMethodSelect').addEventListener('change', (e) => {
            this.paymentMethod = e.target.value;
        });
        
        // حفظ الفاتورة
        document.getElementById('saveInvoiceBtn').addEventListener('click', () => this.finalizeSale());
        
        // طباعة الفاتورة
        document.getElementById('printInvoiceBtn').addEventListener('click', () => this.printInvoice());
        
        // مشاركة عبر واتساب
        document.getElementById('shareWhatsappBtn').addEventListener('click', () => this.shareViaWhatsapp());
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
        
        // حفظ الإعداد
        this.db.saveSetting('THEME', newTheme);
    }

    /**
     * تحديث رصيد الصندوق
     */
    async updateBalance() {
        try {
            const cashAccount = await this.db.getAccount('1010');
            this.currentBalance = cashAccount?.balance || 0;
            
            // تحديث الواجهة
            document.getElementById('currentBalance').textContent = `${this.currentBalance.toFixed(2)} ر.ي`;
            document.getElementById('posBalance').textContent = `${this.currentBalance.toFixed(2)} ر.ي`;
        } catch (error) {
            console.error('خطأ في تحديث الرصيد:', error);
        }
    }

    /**
     * تحميل الاقتراحات السريعة
     */
    async loadQuickSuggestions() {
        try {
            const items = await this.db.getAll('items');
            // ترشيح الأصناف المتاحة وذات الكمية
            this.quickSuggestions = items
                .filter(item => !item.deleted && item.stock > 0)
                .slice(0, 10);
            
            this.renderQuickSuggestions();
        } catch (error) {
            console.error('خطأ في تحميل الاقتراحات:', error);
        }
    }

    /**
     * عرض الاقتراحات السريعة
     */
    renderQuickSuggestions() {
        const container = document.getElementById('quickSuggestions');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.quickSuggestions.forEach(item => {
            const suggestion = document.createElement('div');
            suggestion.className = 'suggestion-item';
            suggestion.innerHTML = `
                <div class="suggestion-emoji">${item.emoji || '📦'}</div>
                <div class="suggestion-name">${item.name}</div>
            `;
            suggestion.addEventListener('click', () => this.addToCart(item));
            container.appendChild(suggestion);
        });
    }

    /**
     * تحميل الفئات
     */
    async loadCategories() {
        try {
            const categories = await this.db.getAll('categories');
            const activeCategories = categories.filter(cat => !cat.deleted);
            this.renderCategories(activeCategories);
        } catch (error) {
            console.error('خطأ في تحميل الفئات:', error);
        }
    }

    /**
     * عرض الفئات
     */
    renderCategories(categories) {
        const container = document.getElementById('categoriesGrid');
        if (!container) return;
        
        container.innerHTML = '';
        
        categories.forEach(category => {
            const col = document.createElement('div');
            col.className = 'col-6 col-md-4 col-lg-3 mb-3';
            col.innerHTML = `
                <div class="category-card" data-category-id="${category.id}">
                    <div class="category-icon">${category.icon || '📁'}</div>
                    <div class="category-name">${category.name}</div>
                    <div class="category-count">${category.productCount || 0} منتج</div>
                </div>
            `;
            
            col.querySelector('.category-card').addEventListener('click', () => {
                this.showProductsByCategory(category.id);
            });
            
            container.appendChild(col);
        });
    }

    /**
     * تحميل العملاء
     */
    async loadCustomers() {
        try {
            const customers = await this.db.getAll('customers');
            const activeCustomers = customers.filter(c => !c.deleted);
            this.renderCustomersSelect(activeCustomers);
        } catch (error) {
            console.error('خطأ في تحميل العملاء:', error);
        }
    }

    /**
     * عرض قائمة العملاء في الاختيار
     */
    renderCustomersSelect(customers) {
        const select = document.getElementById('customerSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">عميل نقدي</option>';
        
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.name;
            select.appendChild(option);
        });
    }

    /**
     * البحث عن المنتجات
     */
    async handleSearch(query) {
        if (!query.trim()) {
            this.hideSearchResults();
            return;
        }
        
        try {
            const items = await this.db.getAll('items');
            const results = items.filter(item => 
                !item.deleted && 
                item.stock > 0 &&
                (item.name.toLowerCase().includes(query.toLowerCase()) || 
                 item.code.toLowerCase().includes(query.toLowerCase()))
            ).slice(0, 10);
            
            this.renderSearchResults(results);
        } catch (error) {
            console.error('خطأ في البحث:', error);
        }
    }

    /**
     * عرض نتائج البحث
     */
    renderSearchResults(results) {
        const container = document.getElementById('posSearchResults');
        if (!container) return;
        
        if (results.length === 0) {
            container.innerHTML = '<div class="p-3 text-center text-muted">لا توجد نتائج</div>';
            container.style.display = 'block';
            return;
        }
        
        container.innerHTML = '';
        
        results.forEach(item => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item p-3 border-bottom';
            resultItem.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="me-3">${item.emoji || '📦'}</div>
                    <div class="flex-grow-1">
                        <div class="fw-bold">${item.name}</div>
                        <div class="small text-muted">${item.code}</div>
                        <div class="small">المخزون: ${item.stock}</div>
                    </div>
                    <div class="text-success fw-bold">${item.salePrice.toFixed(2)} ر.ي</div>
                </div>
            `;
            
            resultItem.addEventListener('click', () => {
                this.addToCart(item);
                this.hideSearchResults();
                document.getElementById('productSearchInput').value = '';
            });
            
            container.appendChild(resultItem);
        });
        
        container.style.display = 'block';
    }

    /**
     * إظهار نتائج البحث
     */
    showSearchResults() {
        const container = document.getElementById('posSearchResults');
        const query = document.getElementById('productSearchInput').value;
        
        if (container && query.trim()) {
            container.style.display = 'block';
        }
    }

    /**
     * إخفاء نتائج البحث
     */
    hideSearchResults() {
        const container = document.getElementById('posSearchResults');
        if (container) {
            container.style.display = 'none';
        }
    }

    /**
     * عرض المنتجات حسب الفئة
     */
    async showProductsByCategory(categoryId) {
        this.currentCategoryId = categoryId;
        
        try {
            const items = await this.db.getAll('items');
            const categoryItems = items.filter(item => 
                !item.deleted && item.categoryId == categoryId && item.stock > 0
            );
            
            const category = await this.db.get('categories', categoryId);
            
            // تحديث العنوان
            document.getElementById('currentCategoryTitle').textContent = category?.name || 'المنتجات';
            document.getElementById('productsCount').textContent = `${categoryItems.length} منتج`;
            
            this.renderProducts(categoryItems);
            
            // تبديل العرض
            document.getElementById('categoriesView').style.display = 'none';
            document.getElementById('productsView').style.display = 'block';
        } catch (error) {
            console.error('خطأ في عرض المنتجات:', error);
        }
    }

    /**
     * عرض المنتجات
     */
    renderProducts(products) {
        const container = document.getElementById('productsGrid');
        if (!container) return;
        
        container.innerHTML = '';
        
        products.forEach(product => {
            const cartItem = this.cart.find(item => item.id === product.id);
            const quantity = cartItem ? cartItem.quantity : 0;
            
            const col = document.createElement('div');
            col.className = 'col-6 col-md-4 col-lg-3 mb-3';
            col.innerHTML = `
                <div class="product-card ${quantity > 0 ? 'added' : ''}" data-product-id="${product.id}">
                    ${quantity > 0 ? `<div class="quantity-badge">${quantity}</div>` : ''}
                    <div class="product-image-container">
                        ${product.imageUrl ? 
                            `<img src="${product.imageUrl}" class="product-image-real" alt="${product.name}">` :
                            `<div class="product-emoji-placeholder">${product.emoji || '📦'}</div>`
                        }
                    </div>
                    <div class="product-info">
                        <div class="product-name">${product.name}</div>
                        <div class="product-code">${product.code}</div>
                        <div class="product-details">
                            <div class="product-price">${product.salePrice.toFixed(2)} ر.ي</div>
                            <div class="product-stock ${product.stock <= 5 ? 'bg-danger text-white' : 'bg-light'}">
                                ${product.stock}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            col.querySelector('.product-card').addEventListener('click', () => {
                this.addToCart(product);
            });
            
            container.appendChild(col);
        });
    }

    /**
     * عرض عرض الفئات
     */
    showCategoriesView() {
        document.getElementById('categoriesView').style.display = 'block';
        document.getElementById('productsView').style.display = 'none';
    }

    /**
     * إضافة منتج إلى السلة
     */
    addToCart(product) {
        // التحقق من المخزون
        if (product.stock <= 0) {
            this.showNotification('المنتج غير متوفر في المخزون', 'danger');
            return;
        }
        
        const existingItem = this.cart.find(item => item.id === product.id);
        
        if (existingItem) {
            // التحقق من أن الكمية المطلوبة لا تتجاوز المخزون
            if (existingItem.quantity >= product.stock) {
                this.showNotification('لا يوجد كمية كافية في المخزون', 'warning');
                return;
            }
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                id: product.id,
                name: product.name,
                code: product.code,
                emoji: product.emoji,
                price: product.salePrice,
                cost: product.costPrice || 0,
                quantity: 1,
                stock: product.stock,
                taxRate: this.taxRate
            });
        }
        
        this.showNotification(`تم إضافة ${product.name} إلى السلة`, 'success');
        this.updateCartUI();
        this.updateProductCards();
    }

    /**
     * تحديث واجهة السلة
     */
    updateCartUI() {
        // تحديث العداد
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        document.getElementById('cartCounter').textContent = totalItems;
        
        // عرض عناصر السلة
        const container = document.getElementById('cartItemsList');
        if (!container) return;
        
        if (this.cart.length === 0) {
            container.innerHTML = '<div class="text-center text-muted p-4">السلة فارغة</div>';
            this.updateCartTotals();
            return;
        }
        
        container.innerHTML = '';
        
        this.cart.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item mb-3 p-3 border rounded';
            itemElement.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div class="d-flex align-items-center">
                        <div class="me-2">${item.emoji || '📦'}</div>
                        <div>
                            <div class="fw-bold">${item.name}</div>
                            <div class="small text-muted">${item.code}</div>
                            <div class="small">${item.price.toFixed(2)} ر.ي × ${item.quantity}</div>
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold text-success mb-2">${(item.price * item.quantity).toFixed(2)} ر.ي</div>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-secondary" data-action="decrease" data-index="${index}">
                                <i class="bi bi-dash"></i>
                            </button>
                            <span class="btn btn-light">${item.quantity}</span>
                            <button class="btn btn-outline-secondary" data-action="increase" data-index="${index}">
                                <i class="bi bi-plus"></i>
                            </button>
                            <button class="btn btn-outline-danger" data-action="remove" data-index="${index}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // إضافة الأحداث
            itemElement.querySelectorAll('[data-action]').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = e.currentTarget.dataset.action;
                    const itemIndex = parseInt(e.currentTarget.dataset.index);
                    
                    switch (action) {
                        case 'increase':
                            if (this.cart[itemIndex].quantity < this.cart[itemIndex].stock) {
                                this.cart[itemIndex].quantity += 1;
                            } else {
                                this.showNotification('لا يوجد كمية كافية في المخزون', 'warning');
                            }
                            break;
                        case 'decrease':
                            if (this.cart[itemIndex].quantity > 1) {
                                this.cart[itemIndex].quantity -= 1;
                            } else {
                                this.cart.splice(itemIndex, 1);
                            }
                            break;
                        case 'remove':
                            this.cart.splice(itemIndex, 1);
                            break;
                    }
                    
                    this.updateCartUI();
                    this.updateProductCards();
                });
            });
            
            container.appendChild(itemElement);
        });
        
        this.updateCartTotals();
    }

    /**
     * تحديث بطاقات المنتجات بعد التعديل في السلة
     */
    updateProductCards() {
        document.querySelectorAll('.product-card').forEach(card => {
            const productId = parseInt(card.dataset.productId);
            const cartItem = this.cart.find(item => item.id === productId);
            
            if (cartItem) {
                card.classList.add('added');
                const badge = card.querySelector('.quantity-badge');
                if (badge) {
                    badge.textContent = cartItem.quantity;
                } else {
                    const badgeElement = document.createElement('div');
                    badgeElement.className = 'quantity-badge';
                    badgeElement.textContent = cartItem.quantity;
                    card.appendChild(badgeElement);
                }
            } else {
                card.classList.remove('added');
                const badge = card.querySelector('.quantity-badge');
                if (badge) badge.remove();
            }
        });
    }

    /**
     * تحديث الإجماليات
     */
    updateCartTotals() {
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // حساب الخصم
        let discountAmount = 0;
        if (this.discount.type === 'fixed') {
            discountAmount = this.discount.value;
        } else {
            discountAmount = subtotal * (this.discount.value / 100);
        }
        
        // حساب الضريبة
        const applyTax = document.getElementById('applyTaxCheckbox').checked;
        const taxRate = applyTax ? this.taxRate : 0;
        const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
        
        // الإجمالي النهائي
        const total = subtotal - discountAmount + taxAmount;
        
        // تحديث الواجهة
        document.getElementById('cartSubtotal').textContent = `${subtotal.toFixed(2)} ر.ي`;
        document.getElementById('cartDiscount').textContent = `-${discountAmount.toFixed(2)} ر.ي`;
        document.getElementById('cartTax').textContent = `${taxAmount.toFixed(2)} ر.ي`;
        document.getElementById('cartTotal').textContent = `${total.toFixed(2)} ر.ي`;
        
        // تحديث السلة العائمة
        document.getElementById('floatingCartTotal').textContent = `${total.toFixed(2)} ر.ي`;
        
        // إظهار/إخفاء السلة العائمة
        const floatingCart = document.getElementById('floatingCartBtn');
        if (this.cart.length > 0) {
            floatingCart.style.display = 'flex';
        } else {
            floatingCart.style.display = 'none';
        }
    }

    /**
     * فتح/إغلاق السلة
     */
    toggleCart(show) {
        const cart = document.getElementById('posCart');
        if (show) {
            cart.classList.add('show');
            this.isCartVisible = true;
        } else {
            cart.classList.remove('show');
            this.isCartVisible = false;
        }
    }

    /**
     * اختيار عميل
     */
    selectCustomer(customerId) {
        if (!customerId) {
            this.selectedCustomer = null;
            return;
        }
        
        this.db.get('customers', parseInt(customerId))
            .then(customer => {
                this.selectedCustomer = customer;
            })
            .catch(error => {
                console.error('خطأ في اختيار العميل:', error);
            });
    }

    /**
     * إتمام عملية البيع
     */
    async finalizeSale() {
        if (this.cart.length === 0) {
            this.showNotification('السلة فارغة', 'warning');
            return;
        }
        
        // التحقق من المخزون
        for (const item of this.cart) {
            const dbItem = await this.db.get('items', item.id);
            if (!dbItem || dbItem.stock < item.quantity) {
                this.showNotification(`الكمية غير متوفرة للمنتج: ${item.name}`, 'danger');
                return;
            }
        }
        
        // حساب الإجماليات
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        let discountAmount = 0;
        if (this.discount.type === 'fixed') {
            discountAmount = this.discount.value;
        } else {
            discountAmount = subtotal * (this.discount.value / 100);
        }
        
        const applyTax = document.getElementById('applyTaxCheckbox').checked;
        const taxRate = applyTax ? this.taxRate : 0;
        const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
        const total = subtotal - discountAmount + taxAmount;
        
        // إنشاء الفاتورة
        const invoice = {
            invoiceNumber: this.generateInvoiceNumber(),
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('ar-SA'),
            customerId: this.selectedCustomer?.id || null,
            customerName: this.selectedCustomer?.name || 'نقدي',
            items: this.cart.map(item => ({
                itemId: item.id,
                name: item.name,
                code: item.code,
                quantity: item.quantity,
                unitPrice: item.price,
                totalPrice: item.price * item.quantity,
                cost: item.cost
            })),
            subtotal: subtotal,
            discount: discountAmount,
            tax: taxAmount,
            total: total,
            paymentMethod: this.paymentMethod,
            status: this.paymentMethod === 'credit' ? 'pending' : 'paid',
            createdAt: new Date().toISOString(),
            createdBy: 'POS System'
        };
        
        try {
            // 1. حفظ الفاتورة
            await this.db.put('invoices', invoice);
            
            // 2. تحديث المخزون
            for (const item of this.cart) {
                const dbItem = await this.db.get('items', item.id);
                dbItem.stock -= item.quantity;
                dbItem.lastSold = new Date().toISOString();
                await this.db.put('items', dbItem);
            }
            
            // 3. تسجيل القيد المحاسبي
            await this.recordAccountingTransaction(invoice);
            
            // 4. إذا كان الدفع نقدياً، تحديث رصيد الصندوق
            if (this.paymentMethod === 'cash') {
                await this.updateCashBalance(total);
            }
            
            // 5. إشعار النجاح
            this.showNotification('تم إتمام عملية البيع بنجاح!', 'success');
            
            // 6. طباعة الفاتورة
            this.printInvoice(invoice);
            
            // 7. إعادة تعيين السلة
            this.cart = [];
            this.updateCartUI();
            this.updateProductCards();
            this.toggleCart(false);
            
            // 8. تحديث البيانات
            await this.updateBalance();
            await this.loadQuickSuggestions();
            
        } catch (error) {
            console.error('خطأ في إتمام عملية البيع:', error);
            this.showNotification('فشل في إتمام عملية البيع', 'danger');
        }
    }

    /**
     * تسجيل القيد المحاسبي
     */
    async recordAccountingTransaction(invoice) {
        const transaction = {
            date: invoice.date,
            type: 'sale',
            description: `فاتورة مبيعات ${invoice.invoiceNumber}`,
            reference: invoice.invoiceNumber,
            entries: []
        };
        
        // حساب تكلفة البضاعة المباعة
        const cogs = this.cart.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
        
        // إدخالات القيد
        if (this.paymentMethod === 'cash') {
            // نقدي: من ح/ الصندوق
            transaction.entries.push({
                accountCode: '1010', // الصندوق
                debit: invoice.total,
                credit: 0,
                description: `دفع نقدي - ${invoice.invoiceNumber}`
            });
        } else if (this.paymentMethod === 'credit') {
            // آجل: من ح/ العملاء
            transaction.entries.push({
                accountCode: '1040', // العملاء
                debit: invoice.total,
                credit: 0,
                description: `بيع آجل - ${invoice.invoiceNumber}`
            });
        }
        
        // إلى ح/ المبيعات
        transaction.entries.push({
            accountCode: '4010', // المبيعات
            debit: 0,
            credit: invoice.subtotal - invoice.discount,
            description: `إيرادات مبيعات - ${invoice.invoiceNumber}`
        });
        
        // إذا كان هناك خصم
        if (invoice.discount > 0) {
            transaction.entries.push({
                accountCode: '4030', // خصومات المبيعات
                debit: 0,
                credit: invoice.discount,
                description: `خصم مبيعات - ${invoice.invoiceNumber}`
            });
        }
        
        // إذا كان هناك ضريبة
        if (invoice.tax > 0) {
            transaction.entries.push({
                accountCode: '2041', // ضريبة المخرجات
                debit: 0,
                credit: invoice.tax,
                description: `ضريبة مبيعات - ${invoice.invoiceNumber}`
            });
        }
        
        // قيد تكلفة البضاعة المباعة
        transaction.entries.push({
            accountCode: '5010', // تكلفة البضاعة المباعة
            debit: cogs,
            credit: 0,
            description: `تكلفة بضاعة مباعة - ${invoice.invoiceNumber}`
        });
        
        transaction.entries.push({
            accountCode: '1030', // المخزون
            debit: 0,
            credit: cogs,
            description: `تخفيض مخزون - ${invoice.invoiceNumber}`
        });
        
        // حفظ القيد
        await this.db.addTransaction(transaction);
    }

    /**
     * تحديث رصيد الصندوق
     */
    async updateCashBalance(amount) {
        try {
            const cashAccount = await this.db.getAccount('1010');
            cashAccount.balance += amount;
            await this.db.saveAccount(cashAccount);
            this.currentBalance = cashAccount.balance;
            this.updateBalance();
        } catch (error) {
            console.error('خطأ في تحديث رصيد الصندوق:', error);
        }
    }

    /**
     * إنشاء رقم فاتورة
     */
    generateInvoiceNumber() {
        const prefix = SALES_CONFIG.INVOICE.prefix;
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        return `${prefix}${year}${month}${day}-${random}`;
    }

    /**
     * طباعة الفاتورة
     */
    printInvoice(invoice) {
        const printWindow = window.open('', '_blank');
        
        const content = `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>فاتورة ${invoice.invoiceNumber}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .invoice-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    .company-name { font-size: 24px; font-weight: bold; margin: 0; }
                    .invoice-info { margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                    th { background-color: #f2f2f2; }
                    .totals { float: left; width: 300px; border: 1px solid #ddd; padding: 15px; margin-top: 20px; }
                    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                ${printInvoiceHeader(invoice)}
                <div class="invoice-info">
                    <p><strong>رقم الفاتورة:</strong> ${invoice.invoiceNumber}</p>
                    <p><strong>التاريخ:</strong> ${invoice.date} ${invoice.time}</p>
                    <p><strong>العميل:</strong> ${invoice.customerName}</p>
                    <p><strong>طريقة الدفع:</strong> ${this.paymentMethod === 'cash' ? 'نقدي' : 'آجل'}</p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>المنتج</th>
                            <th>الكمية</th>
                            <th>السعر</th>
                            <th>الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.items.map((item, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${item.name}<br><small>${item.code}</small></td>
                                <td>${item.quantity}</td>
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
                </div>
                
                ${printInvoiceFooter()}
                
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
     * مشاركة عبر واتساب
     */
    shareViaWhatsapp(invoice) {
        const message = `فاتورة ${invoice.invoiceNumber}\nالإجمالي: ${invoice.total.toFixed(2)} ر.ي\nشكراً لتعاملكم معنا!`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }

    /**
     * إظهار إشعار
     */
    showNotification(message, type = 'success') {
        const notification = document.getElementById('temporaryNotification');
        const productName = document.getElementById('notificationProductName');
        
        notification.style.backgroundColor = type === 'success' ? 'green' : 
                                           type === 'warning' ? '#ffc107' : '#dc3545';
        
        productName.textContent = message;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
}

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.posSystem = new MPOS();
    window.posSystem.init();
});