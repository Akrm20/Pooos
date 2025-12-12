/**
 * M-accounting.js - نظام المحاسبة لنظام Micro ERP
 * يتكامل مع M-core.js و M-database.js
 */

class MAccounting {
    constructor() {
        this.db = new MDatabase();
        this.currentPeriod = ACCOUNTING_PERIOD.CURRENT_PERIOD;
        this.accounts = [];
        this.transactions = [];
        this.journalEntries = [];
        this.selectedAccount = null;
        this.quickActions = {
            collectFromCustomers: null,
            paySuppliers: null,
            salesReturn: null,
            purchaseReturn: null
        };
    }

    /**
     * تهيئة نظام المحاسبة
     */
    async init() {
        try {
            await this.db.openDB();
            await this.loadAccounts();
            await this.loadTransactions();
            this.setupEventListeners();
            this.setupModals();
            this.updateCurrentPeriod();
            this.updateAccountTotals();
            this.loadAccountSelectOptions();
            this.setupJournalEntry();
        } catch (error) {
            console.error('خطأ في تهيئة نظام المحاسبة:', error);
            this.showNotification('خطأ في تحميل النظام', 'danger');
        }
    }

    /**
     * تحميل الحسابات
     */
    async loadAccounts() {
        try {
            this.accounts = await this.db.getAllAccounts();
            this.renderAccountsTree();
        } catch (error) {
            console.error('خطأ في تحميل الحسابات:', error);
        }
    }

    /**
     * تحميل المعاملات
     */
    async loadTransactions() {
        try {
            this.transactions = await this.db.getAll('transactions');
            this.renderRecentJournals();
            this.renderAllJournals();
        } catch (error) {
            console.error('خطأ في تحميل المعاملات:', error);
        }
    }

    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        // تبديل الثيم
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // أزرار شجرة الحسابات
        document.getElementById('refreshAccountsBtn').addEventListener('click', () => this.loadAccounts());
        document.getElementById('saveAccountBtn').addEventListener('click', () => this.saveAccount());
        document.getElementById('resetAccountBtn').addEventListener('click', () => this.resetAccountForm());
        document.getElementById('expandAllBtn').addEventListener('click', () => this.expandAllAccounts());
        document.getElementById('collapseAllBtn').addEventListener('click', () => this.collapseAllAccounts());
        
        // البحث في الحسابات
        document.getElementById('accountCode').addEventListener('change', (e) => {
            this.checkAccountCode(e.target.value);
        });
        
        // اختيار نوع الحساب
        document.getElementById('accountType').addEventListener('change', (e) => {
            this.updateParentAccounts(e.target.value);
        });
        
        // أحداث القيود اليومية
        document.getElementById('saveJournalBtn').addEventListener('click', () => this.saveJournalEntry());
        document.getElementById('addJournalLineBtn').addEventListener('click', () => this.addJournalLine());
        document.getElementById('quickReceiptBtn').addEventListener('click', () => this.quickReceipt());
        document.getElementById('quickPaymentBtn').addEventListener('click', () => this.quickPayment());
        document.getElementById('quickTransferBtn').addEventListener('click', () => this.quickTransfer());
        
        // أحداث الاستاذ العام
        document.getElementById('ledgerAccountSelect').addEventListener('change', (e) => {
            this.updateAccountInfo(e.target.value);
        });
        document.getElementById('showLedgerBtn').addEventListener('click', () => this.showLedger());
        document.getElementById('printLedgerBtn').addEventListener('click', () => this.printLedger());
        
        // أحداث ميزان المراجعة
        document.getElementById('generateTrialBalanceBtn').addEventListener('click', () => this.generateTrialBalance());
        document.getElementById('printTrialBalanceBtn').addEventListener('click', () => this.printTrialBalance());
        
        // أحداث الضرائب
        document.getElementById('settleTaxBtn').addEventListener('click', () => this.settleTax());
        document.getElementById('refreshTaxSettlementsBtn').addEventListener('click', () => this.loadTaxSettlements());
        document.getElementById('generateTaxReportBtn').addEventListener('click', () => this.generateTaxReport());
        
        // الأزرار السريعة
        document.getElementById('collectFromCustomersBtn').addEventListener('click', () => this.openCollectModal());
        document.getElementById('paySuppliersBtn').addEventListener('click', () => this.openPaymentModal());
        document.getElementById('salesReturnBtn').addEventListener('click', () => this.openSalesReturnModal());
        document.getElementById('purchaseReturnBtn').addEventListener('click', () => this.openPurchaseReturnModal());
        
        // أحداث النوافذ المنبثقة
        document.getElementById('confirmCollectBtn').addEventListener('click', () => this.confirmCollect());
        document.getElementById('confirmPaymentBtn').addEventListener('click', () => this.confirmPayment());
        document.getElementById('confirmSalesReturnBtn').addEventListener('click', () => this.confirmSalesReturn());
        document.getElementById('confirmPurchaseReturnBtn').addEventListener('click', () => this.confirmPurchaseReturn());
    }

    /**
     * إعداد النوافذ المنبثقة
     */
    setupModals() {
        // نوافذ العمليات السريعة
        this.collectModal = new bootstrap.Modal(document.getElementById('collectFromCustomersModal'));
        this.paymentModal = new bootstrap.Modal(document.getElementById('paySuppliersModal'));
        this.salesReturnModal = new bootstrap.Modal(document.getElementById('salesReturnModal'));
        this.purchaseReturnModal = new bootstrap.Modal(document.getElementById('purchaseReturnModal'));
    }

    /**
     * إعداد نموذج القيد اليومي
     */
    setupJournalEntry() {
        // تعيين التاريخ الافتراضي
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('journalDate').value = today;
        document.getElementById('journalReference').value = `JE-${Date.now().toString().substr(-6)}`;
        
        // إضافة سطرين افتراضيين
        this.addJournalLine();
        this.addJournalLine();
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
     * تحديث الفترة الحالية
     */
    updateCurrentPeriod() {
        document.getElementById('currentPeriod').textContent = this.currentPeriod.periodName;
        
        // تعيين التواريخ في الحقول
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('trialBalanceDate').value = today;
        document.getElementById('taxReportFromDate').value = this.currentPeriod.startDate;
        document.getElementById('taxReportToDate').value = today;
    }

    /**
     * ========== شجرة الحسابات ==========
     */

    /**
     * عرض شجرة الحسابات
     */
    renderAccountsTree() {
        const tbody = document.getElementById('accountsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        // تصنيف الحسابات حسب النوع
        const accountTypes = {
            'asset': { name: 'الأصول', accounts: [] },
            'liability': { name: 'الخصوم', accounts: [] },
            'equity': { name: 'حقوق الملكية', accounts: [] },
            'revenue': { name: 'الإيرادات', accounts: [] },
            'expense': { name: 'المصروفات', accounts: [] }
        };
        
        // تجميع الحسابات حسب النوع
        this.accounts.forEach(account => {
            if (accountTypes[account.type]) {
                accountTypes[account.type].accounts.push(account);
            }
        });
        
        // عرض الحسابات حسب النوع
        for (const [type, data] of Object.entries(accountTypes)) {
            if (data.accounts.length > 0) {
                // رأس النوع
                const headerRow = document.createElement('tr');
                headerRow.className = 'account-type-header';
                headerRow.innerHTML = `
                    <td colspan="5">
                        <strong>${data.name}</strong>
                        <span class="badge bg-secondary float-end">${data.accounts.length}</span>
                    </td>
                `;
                tbody.appendChild(headerRow);
                
                // الحسابات الفرعية
                data.accounts.forEach(account => {
                    const row = this.createAccountRow(account);
                    tbody.appendChild(row);
                });
            }
        }
        
        this.updateAccountTotals();
    }

    /**
     * إنشاء صف حساب
     */
    createAccountRow(account) {
        const row = document.createElement('tr');
        row.className = 'account-row';
        if (account.parent) row.classList.add('child-account');
        
        const typeNames = {
            'asset': 'أصول',
            'liability': 'خصوم',
            'equity': 'حقوق ملكية',
            'revenue': 'إيرادات',
            'expense': 'مصروفات'
        };
        
        const balance = account.balance || 0;
        const balanceClass = balance >= 0 ? 'text-success' : 'text-danger';
        const balanceText = Math.abs(balance).toFixed(2);
        
        row.innerHTML = `
            <td>
                ${account.parent ? '<span class="child-indent">↳</span>' : ''}
                <strong>${account.accountCode}</strong>
            </td>
            <td>
                ${account.parent ? '<span class="child-indent"></span>' : ''}
                ${account.name}
                ${account.description ? `<br><small class="text-muted">${account.description}</small>` : ''}
            </td>
            <td><span class="badge bg-secondary">${typeNames[account.type] || account.type}</span></td>
            <td class="text-end ${balanceClass}">${balanceText} ر.ي</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="accountingSystem.editAccount('${account.accountCode}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-info" onclick="accountingSystem.showLedgerForAccount('${account.accountCode}')">
                        <i class="bi bi-book"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="accountingSystem.deleteAccount('${account.accountCode}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        return row;
    }

    /**
     * تحديث إجماليات الحسابات
     */
    updateAccountTotals() {
        let assetsTotal = 0;
        let liabilitiesTotal = 0;
        let equityTotal = 0;
        let revenueTotal = 0;
        let expenseTotal = 0;
        
        this.accounts.forEach(account => {
            const balance = account.balance || 0;
            
            switch (account.type) {
                case 'asset':
                    assetsTotal += balance;
                    break;
                case 'liability':
                    liabilitiesTotal += balance;
                    break;
                case 'equity':
                    equityTotal += balance;
                    break;
                case 'revenue':
                    revenueTotal += balance;
                    break;
                case 'expense':
                    expenseTotal += balance;
                    break;
            }
        });
        
        const netProfit = revenueTotal - expenseTotal;
        
        document.getElementById('assetsTotal').textContent = assetsTotal.toFixed(2);
        document.getElementById('liabilitiesTotal').textContent = liabilitiesTotal.toFixed(2);
        document.getElementById('equityTotal').textContent = equityTotal.toFixed(2);
        document.getElementById('netProfit').textContent = netProfit.toFixed(2);
    }

    /**
     * توسيع جميع الحسابات
     */
    expandAllAccounts() {
        document.querySelectorAll('.child-account').forEach(row => {
            row.style.display = 'table-row';
        });
    }

    /**
     * طي جميع الحسابات
     */
    collapseAllAccounts() {
        document.querySelectorAll('.child-account').forEach(row => {
            row.style.display = 'none';
        });
    }

    /**
     * تحديث قائمة الحسابات الرئيسية
     */
    updateParentAccounts(accountType) {
        const select = document.getElementById('accountParent');
        select.innerHTML = '<option value="">حساب رئيسي</option>';
        
        // تصفية الحسابات المناسبة حسب النوع
        const validParents = this.accounts.filter(account => {
            // يمكن أن يكون الحساب رئيساً إذا كان من نفس النوع أو من أنواع معينة
            if (!account.parent) {
                if (accountType === 'asset' && account.type === 'asset') return true;
                if (accountType === 'liability' && account.type === 'liability') return true;
                if (accountType === 'equity' && account.type === 'equity') return true;
                if (accountType === 'revenue' && account.type === 'revenue') return true;
                if (accountType === 'expense' && account.type === 'expense') return true;
            }
            return false;
        });
        
        validParents.forEach(account => {
            const option = document.createElement('option');
            option.value = account.accountCode;
            option.textContent = `${account.accountCode} - ${account.name}`;
            select.appendChild(option);
        });
    }

    /**
     * التحقق من كود الحساب
     */
    checkAccountCode(code) {
        if (!code) return;
        
        const existingAccount = this.accounts.find(account => account.accountCode === code);
        if (existingAccount) {
            this.showNotification('كود الحساب موجود مسبقاً', 'warning');
            this.editAccount(code);
        }
    }

    /**
     * حفظ الحساب
     */
    async saveAccount() {
        const form = document.getElementById('accountForm');
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        const accountData = {
            accountCode: document.getElementById('accountCode').value,
            name: document.getElementById('accountName').value,
            type: document.getElementById('accountType').value,
            parent: document.getElementById('accountParent').value || null,
            description: document.getElementById('accountDescription').value || null,
            openingBalance: parseFloat(document.getElementById('accountOpeningBalance').value) || 0,
            balance: parseFloat(document.getElementById('accountOpeningBalance').value) || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        try {
            await this.db.saveAccount(accountData);
            await this.loadAccounts();
            this.resetAccountForm();
            this.showNotification('تم حفظ الحساب بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في حفظ الحساب:', error);
            this.showNotification('فشل في حفظ الحساب', 'danger');
        }
    }

    /**
     * تعديل الحساب
     */
    async editAccount(accountCode) {
        const account = await this.db.getAccount(accountCode);
        if (!account) return;
        
        document.getElementById('accountId').value = account.accountCode;
        document.getElementById('accountCode').value = account.accountCode;
        document.getElementById('accountCode').readOnly = true;
        document.getElementById('accountName').value = account.name;
        document.getElementById('accountType').value = account.type;
        document.getElementById('accountParent').value = account.parent || '';
        document.getElementById('accountDescription').value = account.description || '';
        document.getElementById('accountOpeningBalance').value = account.openingBalance || 0;
        
        this.updateParentAccounts(account.type);
        this.showNotification('تم تحميل بيانات الحساب', 'info');
    }

    /**
     * حذف الحساب
     */
    async deleteAccount(accountCode) {
        if (!confirm('هل أنت متأكد من حذف هذا الحساب؟ سيتم حذف جميع الحركات المرتبطة به.')) {
            return;
        }
        
        try {
            // التحقق من عدم وجود حركات للحساب
            const transactions = await this.db.getAll('transactions');
            const hasTransactions = transactions.some(transaction => 
                transaction.entries && transaction.entries.some(entry => 
                    entry.accountCode === accountCode
                )
            );
            
            if (hasTransactions) {
                this.showNotification('لا يمكن حذف الحساب لأنه يحتوي على حركات', 'danger');
                return;
            }
            
            await this.db.delete('accounts', accountCode);
            await this.loadAccounts();
            this.showNotification('تم حذف الحساب بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في حذف الحساب:', error);
            this.showNotification('فشل في حذف الحساب', 'danger');
        }
    }

    /**
     * إعادة تعيين نموذج الحساب
     */
    resetAccountForm() {
        const form = document.getElementById('accountForm');
        form.reset();
        form.classList.remove('was-validated');
        document.getElementById('accountId').value = '';
        document.getElementById('accountCode').readOnly = false;
        document.getElementById('accountParent').innerHTML = '<option value="">حساب رئيسي</option>';
    }

    /**
     * ========== القيود اليومية ==========
     */

    /**
     * إضافة سطر إلى القيد اليومي
     */
    addJournalLine() {
        const container = document.getElementById('journalEntriesContainer');
        const index = container.children.length;
        
        const line = document.createElement('div');
        line.className = 'journal-line row mb-2';
        line.innerHTML = `
            <div class="col-md-5">
                <select class="form-select account-select" required>
                    <option value="">اختر الحساب...</option>
                </select>
            </div>
            <div class="col-md-3">
                <input type="number" class="form-control debit-input" value="0" min="0" step="0.01" placeholder="0.00">
            </div>
            <div class="col-md-3">
                <input type="number" class="form-control credit-input" value="0" min="0" step="0.01" placeholder="0.00">
            </div>
            <div class="col-md-1">
                <button type="button" class="btn btn-outline-danger btn-sm remove-line-btn" ${index < 2 ? 'disabled' : ''}>
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        
        container.appendChild(line);
        
        // ملء قائمة الحسابات
        this.fillAccountSelect(line.querySelector('.account-select'));
        
        // إضافة أحداث
        const debitInput = line.querySelector('.debit-input');
        const creditInput = line.querySelector('.credit-input');
        const removeBtn = line.querySelector('.remove-line-btn');
        
        debitInput.addEventListener('input', () => {
            if (parseFloat(debitInput.value) > 0) {
                creditInput.value = 0;
                creditInput.disabled = true;
            } else {
                creditInput.disabled = false;
            }
            this.updateJournalBalance();
        });
        
        creditInput.addEventListener('input', () => {
            if (parseFloat(creditInput.value) > 0) {
                debitInput.value = 0;
                debitInput.disabled = true;
            } else {
                debitInput.disabled = false;
            }
            this.updateJournalBalance();
        });
        
        removeBtn.addEventListener('click', () => {
            line.remove();
            this.updateJournalBalance();
            this.updateRemoveButtons();
        });
        
        this.updateRemoveButtons();
        this.updateJournalBalance();
    }

    /**
     * ملء قائمة اختيار الحسابات
     */
    fillAccountSelect(selectElement) {
        selectElement.innerHTML = '<option value="">اختر الحساب...</option>';
        
        this.accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.accountCode;
            option.textContent = `${account.accountCode} - ${account.name}`;
            selectElement.appendChild(option);
        });
    }

    /**
     * تحديث أزرار الحذف
     */
    updateRemoveButtons() {
        const lines = document.querySelectorAll('.journal-line');
        lines.forEach((line, index) => {
            const removeBtn = line.querySelector('.remove-line-btn');
            removeBtn.disabled = lines.length <= 2;
        });
    }

    /**
     * تحديث رصيد القيد اليومي
     */
    updateJournalBalance() {
        let totalDebit = 0;
        let totalCredit = 0;
        
        document.querySelectorAll('.journal-line').forEach(line => {
            const debit = parseFloat(line.querySelector('.debit-input').value) || 0;
            const credit = parseFloat(line.querySelector('.credit-input').value) || 0;
            
            totalDebit += debit;
            totalCredit += credit;
        });
        
        const difference = totalDebit - totalCredit;
        const isBalanced = Math.abs(difference) < 0.01; // تسامح 0.01
        
        document.getElementById('totalDebit').textContent = totalDebit.toFixed(2);
        document.getElementById('totalCredit').textContent = totalCredit.toFixed(2);
        document.getElementById('balanceDifference').textContent = difference.toFixed(2);
        
        const balanceStatus = document.getElementById('journalBalanceStatus');
        const saveBtn = document.getElementById('saveJournalBtn');
        
        if (isBalanced) {
            balanceStatus.innerHTML = '<span class="badge bg-success">متوازن</span>';
            saveBtn.disabled = false;
        } else {
            balanceStatus.innerHTML = '<span class="badge bg-danger">غير متوازن</span>';
            saveBtn.disabled = true;
        }
    }

    /**
     * حفظ القيد اليومي
     */
    async saveJournalEntry() {
        const form = document.getElementById('journalEntryForm');
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        // التحقق من التوازن
        const totalDebit = parseFloat(document.getElementById('totalDebit').textContent) || 0;
        const totalCredit = parseFloat(document.getElementById('totalCredit').textContent) || 0;
        const difference = Math.abs(totalDebit - totalCredit);
        
        if (difference > 0.01) {
            this.showNotification('القيد غير متوازن', 'danger');
            return;
        }
        
        // جمع بيانات القيد
        const journalData = {
            date: document.getElementById('journalDate').value,
            reference: document.getElementById('journalReference').value,
            description: document.getElementById('journalDescription').value,
            type: 'manual',
            entries: [],
            createdAt: new Date().toISOString(),
            createdBy: 'Accounting System'
        };
        
        // جمع الأسطر
        let hasValidEntries = false;
        document.querySelectorAll('.journal-line').forEach(line => {
            const accountCode = line.querySelector('.account-select').value;
            const debit = parseFloat(line.querySelector('.debit-input').value) || 0;
            const credit = parseFloat(line.querySelector('.credit-input').value) || 0;
            
            if (accountCode && (debit > 0 || credit > 0)) {
                journalData.entries.push({
                    accountCode: accountCode,
                    debit: debit,
                    credit: credit,
                    description: journalData.description
                });
                hasValidEntries = true;
            }
        });
        
        if (!hasValidEntries) {
            this.showNotification('يجب إدخال حركات على الأقل', 'warning');
            return;
        }
        
        try {
            // حفظ القيد
            const transactionId = await this.db.addTransaction(journalData);
            
            // تحديث أرصدة الحسابات
            for (const entry of journalData.entries) {
                await this.updateAccountBalance(entry.accountCode, entry.debit - entry.credit);
            }
            
            this.showNotification('تم حفظ القيد اليومي بنجاح', 'success');
            this.resetJournalForm();
            await this.loadTransactions();
            await this.loadAccounts();
        } catch (error) {
            console.error('خطأ في حفظ القيد اليومي:', error);
            this.showNotification('فشل في حفظ القيد اليومي', 'danger');
        }
    }

    /**
     * تحديث رصيد الحساب
     */
    async updateAccountBalance(accountCode, amount) {
        try {
            const account = await this.db.getAccount(accountCode);
            if (!account) return;
            
            account.balance = (account.balance || 0) + amount;
            account.updatedAt = new Date().toISOString();
            
            await this.db.saveAccount(account);
        } catch (error) {
            console.error('خطأ في تحديث رصيد الحساب:', error);
        }
    }

    /**
     * إعادة تعيين نموذج القيد
     */
    resetJournalForm() {
        const container = document.getElementById('journalEntriesContainer');
        container.innerHTML = '';
        
        // إضافة سطرين جديدين
        this.addJournalLine();
        this.addJournalLine();
        
        // إعادة تعيين الحقول الأخرى
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('journalDate').value = today;
        document.getElementById('journalReference').value = `JE-${Date.now().toString().substr(-6)}`;
        document.getElementById('journalDescription').value = '';
        
        this.updateJournalBalance();
    }

    /**
     * عرض القيود الأخيرة
     */
    renderRecentJournals() {
        const container = document.getElementById('recentJournalsList');
        if (!container) return;
        
        container.innerHTML = '';
        
        // أخذ آخر 5 قيود
        const recentJournals = this.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
        
        if (recentJournals.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">لا توجد قيود</p>';
            return;
        }
        
        recentJournals.forEach(journal => {
            const totalDebit = journal.entries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
            const totalCredit = journal.entries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
            
            const item = document.createElement('div');
            item.className = 'recent-journal-item';
            item.innerHTML = `
                <div class="d-flex justify-content-between">
                    <div>
                        <strong>${journal.reference}</strong>
                        <div class="small text-muted">${journal.date}</div>
                    </div>
                    <div class="text-end">
                        <div class="text-success">${totalDebit.toFixed(2)}</div>
                        <div class="text-primary">${totalCredit.toFixed(2)}</div>
                    </div>
                </div>
                <div class="small">${journal.description}</div>
            `;
            
            item.addEventListener('click', () => {
                this.viewJournalDetails(journal.id);
            });
            
            container.appendChild(item);
        });
    }

    /**
     * عرض جميع القيود
     */
    renderAllJournals() {
        const tbody = document.getElementById('journalsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (this.transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">لا توجد قيود</td>
                </tr>
            `;
            return;
        }
        
        this.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .forEach(journal => {
                const totalDebit = journal.entries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
                const totalCredit = journal.entries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${journal.date}</td>
                    <td><strong>${journal.reference}</strong></td>
                    <td>${journal.description}</td>
                    <td class="text-end text-success">${totalDebit.toFixed(2)}</td>
                    <td class="text-end text-primary">${totalCredit.toFixed(2)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-info" onclick="accountingSystem.viewJournalDetails(${journal.id})">
                            <i class="bi bi-eye"></i>
                        </button>
                    </td>
                `;
                
                tbody.appendChild(row);
            });
    }

    /**
     * عرض تفاصيل القيد
     */
    async viewJournalDetails(journalId) {
        const journal = await this.db.get('transactions', journalId);
        if (!journal) return;
        
        let details = `
            <strong>رقم القيد:</strong> ${journal.reference}<br>
            <strong>التاريخ:</strong> ${journal.date}<br>
            <strong>الوصف:</strong> ${journal.description}<br><br>
            <strong>الحركات:</strong><br>
        `;
        
        journal.entries.forEach((entry, index) => {
            const account = this.accounts.find(acc => acc.accountCode === entry.accountCode);
            const accountName = account ? account.name : entry.accountCode;
            
            details += `
                ${index + 1}. ${accountName}: 
                ${entry.debit > 0 ? `مدين ${entry.debit.toFixed(2)}` : `دائن ${entry.credit.toFixed(2)}`}<br>
            `;
        });
        
        alert(details);
    }

    /**
     * ========== العمليات السريعة ==========
     */

    /**
     * قيد سند قبض سريع
     */
    quickReceipt() {
        document.getElementById('journalDescription').value = 'سند قبض نقدي';
        this.resetJournalForm();
        
        // إضافة سطور افتراضية
        const container = document.getElementById('journalEntriesContainer');
        container.innerHTML = '';
        
        // سطر المدين (الصندوق)
        const line1 = this.createQuickJournalLine('1010', 1000, 0);
        container.appendChild(line1);
        
        // سطر الدائن (الإيرادات)
        const line2 = this.createQuickJournalLine('4010', 0, 1000);
        container.appendChild(line2);
        
        this.updateJournalBalance();
    }

    /**
     * قيد سند صرف سريع
     */
    quickPayment() {
        document.getElementById('journalDescription').value = 'سند صرف نقدي';
        this.resetJournalForm();
        
        // إضافة سطور افتراضية
        const container = document.getElementById('journalEntriesContainer');
        container.innerHTML = '';
        
        // سطر المدين (المصروفات)
        const line1 = this.createQuickJournalLine('5020', 500, 0);
        container.appendChild(line1);
        
        // سطر الدائن (الصندوق)
        const line2 = this.createQuickJournalLine('1010', 0, 500);
        container.appendChild(line2);
        
        this.updateJournalBalance();
    }

    /**
     * قيد تحويل سريع
     */
    quickTransfer() {
        document.getElementById('journalDescription').value = 'تحويل نقدي';
        this.resetJournalForm();
        
        // إضافة سطور افتراضية
        const container = document.getElementById('journalEntriesContainer');
        container.innerHTML = '';
        
        // سطر المدين (البنك)
        const line1 = this.createQuickJournalLine('1020', 2000, 0);
        container.appendChild(line1);
        
        // سطر الدائن (الصندوق)
        const line2 = this.createQuickJournalLine('1010', 0, 2000);
        container.appendChild(line2);
        
        this.updateJournalBalance();
    }

    /**
     * إنشاء سطر قيد سريع
     */
    createQuickJournalLine(accountCode, debit, credit) {
        const line = document.createElement('div');
        line.className = 'journal-line row mb-2';
        line.innerHTML = `
            <div class="col-md-5">
                <select class="form-select account-select" required>
                    <option value="">اختر الحساب...</option>
                </select>
            </div>
            <div class="col-md-3">
                <input type="number" class="form-control debit-input" value="${debit}" min="0" step="0.01">
            </div>
            <div class="col-md-3">
                <input type="number" class="form-control credit-input" value="${credit}" min="0" step="0.01">
            </div>
            <div class="col-md-1">
                <button type="button" class="btn btn-outline-danger btn-sm remove-line-btn">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        
        // ملء واختيار الحساب
        const select = line.querySelector('.account-select');
        this.fillAccountSelect(select);
        setTimeout(() => {
            select.value = accountCode;
        }, 100);
        
        return line;
    }

    /**
     * ========== الاستاذ العام ==========
     */

    /**
     * تحميل خيارات اختيار الحساب
     */
    loadAccountSelectOptions() {
        const select = document.getElementById('ledgerAccountSelect');
        select.innerHTML = '<option value="">اختر الحساب...</option>';
        
        this.accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.accountCode;
            option.textContent = `${account.accountCode} - ${account.name}`;
            select.appendChild(option);
        });
    }

    /**
     * تحديث معلومات الحساب
     */
    async updateAccountInfo(accountCode) {
        if (!accountCode) return;
        
        const account = await this.db.getAccount(accountCode);
        if (!account) return;
        
        document.getElementById('selectedAccountName').textContent = account.name;
        document.getElementById('openingBalance').textContent = (account.openingBalance || 0).toFixed(2);
        
        // حساب الرصيد الحالي من الحركات
        const transactions = await this.db.getAll('transactions');
        let balance = account.openingBalance || 0;
        let movementCount = 0;
        
        transactions.forEach(transaction => {
            transaction.entries.forEach(entry => {
                if (entry.accountCode === accountCode) {
                    balance += (entry.debit || 0) - (entry.credit || 0);
                    movementCount++;
                }
            });
        });
        
        document.getElementById('currentBalance').textContent = balance.toFixed(2);
        document.getElementById('totalMovements').textContent = movementCount;
    }

    /**
     * عرض الاستاذ العام
     */
    async showLedger() {
        const accountCode = document.getElementById('ledgerAccountSelect').value;
        const fromDate = document.getElementById('ledgerFromDate').value;
        const toDate = document.getElementById('ledgerToDate').value;
        
        if (!accountCode) {
            this.showNotification('يجب اختيار حساب', 'warning');
            return;
        }
        
        const account = await this.db.getAccount(accountCode);
        if (!account) return;
        
        const transactions = await this.db.getAll('transactions');
        const tbody = document.getElementById('ledgerTableBody');
        tbody.innerHTML = '';
        
        let runningBalance = account.openingBalance || 0;
        let totalDebit = 0;
        let totalCredit = 0;
        
        // فرز الحركات حسب التاريخ
        const entries = [];
        
        transactions.forEach(transaction => {
            transaction.entries.forEach(entry => {
                if (entry.accountCode === accountCode) {
                    // تصفية حسب التاريخ إذا كان محدداً
                    if (fromDate && transaction.date < fromDate) return;
                    if (toDate && transaction.date > toDate) return;
                    
                    entries.push({
                        date: transaction.date,
                        reference: transaction.reference,
                        description: entry.description || transaction.description,
                        debit: entry.debit || 0,
                        credit: entry.credit || 0
                    });
                }
            });
        });
        
        // ترتيب حسب التاريخ
        entries.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // إضافة الرصيد الافتتاحي
        if (runningBalance !== 0) {
            const openingRow = document.createElement('tr');
            openingRow.className = 'table-info';
            openingRow.innerHTML = `
                <td>${account.createdAt ? account.createdAt.split('T')[0] : ''}</td>
                <td>افتتاحي</td>
                <td>رصيد افتتاحي</td>
                <td class="text-end">${runningBalance > 0 ? runningBalance.toFixed(2) : ''}</td>
                <td class="text-end">${runningBalance < 0 ? Math.abs(runningBalance).toFixed(2) : ''}</td>
                <td class="text-end">${runningBalance.toFixed(2)}</td>
            `;
            tbody.appendChild(openingRow);
        }
        
        // إضافة الحركات
        entries.forEach(entry => {
            runningBalance += entry.debit - entry.credit;
            totalDebit += entry.debit;
            totalCredit += entry.credit;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.date}</td>
                <td>${entry.reference}</td>
                <td>${entry.description}</td>
                <td class="text-end">${entry.debit > 0 ? entry.debit.toFixed(2) : ''}</td>
                <td class="text-end">${entry.credit > 0 ? entry.credit.toFixed(2) : ''}</td>
                <td class="text-end">${runningBalance.toFixed(2)}</td>
            `;
            tbody.appendChild(row);
        });
        
        // تحديث المجاميع
        document.getElementById('ledgerTotalDebit').textContent = totalDebit.toFixed(2);
        document.getElementById('ledgerTotalCredit').textContent = totalCredit.toFixed(2);
        document.getElementById('ledgerFinalBalance').textContent = runningBalance.toFixed(2);
    }

    /**
     * عرض الاستاذ العام لحساب محدد
     */
    async showLedgerForAccount(accountCode) {
        // التبديل إلى تبويب الاستاذ العام
        const ledgerTab = document.getElementById('ledger-tab');
        new bootstrap.Tab(ledgerTab).show();
        
        // اختيار الحساب
        document.getElementById('ledgerAccountSelect').value = accountCode;
        await this.updateAccountInfo(accountCode);
        await this.showLedger();
    }

    /**
     * طباعة الاستاذ العام
     */
    printLedger() {
        window.print();
    }

    /**
     * ========== ميزان المراجعة ==========
     */

    /**
     * توليد ميزان المراجعة
     */
    async generateTrialBalance() {
        const date = document.getElementById('trialBalanceDate').value || new Date().toISOString().split('T')[0];
        
        const tbody = document.getElementById('trialBalanceTableBody');
        tbody.innerHTML = '';
        
        let openingDebitTotal = 0;
        let openingCreditTotal = 0;
        let movementDebitTotal = 0;
        let movementCreditTotal = 0;
        let closingDebitTotal = 0;
        let closingCreditTotal = 0;
        
        const accounts = await this.db.getAllAccounts();
        const transactions = await this.db.getAll('transactions');
        
        for (const account of accounts) {
            let openingDebit = 0;
            let openingCredit = 0;
            let movementDebit = 0;
            let movementCredit = 0;
            let closingDebit = 0;
            let closingCredit = 0;
            
            // حساب الأرصدة الافتتاحية
            const openingBalance = account.openingBalance || 0;
            if (openingBalance > 0) {
                openingDebit = openingBalance;
            } else if (openingBalance < 0) {
                openingCredit = Math.abs(openingBalance);
            }
            
            // حساب الحركات حتى التاريخ المحدد
            transactions.forEach(transaction => {
                if (transaction.date <= date) {
                    transaction.entries.forEach(entry => {
                        if (entry.accountCode === account.accountCode) {
                            movementDebit += entry.debit || 0;
                            movementCredit += entry.credit || 0;
                        }
                    });
                }
            });
            
            // حساب الأرصدة الختامية
            const closingBalance = openingBalance + movementDebit - movementCredit;
            if (closingBalance > 0) {
                closingDebit = closingBalance;
            } else if (closingBalance < 0) {
                closingCredit = Math.abs(closingBalance);
            }
            
            // تحديث المجاميع
            openingDebitTotal += openingDebit;
            openingCreditTotal += openingCredit;
            movementDebitTotal += movementDebit;
            movementCreditTotal += movementCredit;
            closingDebitTotal += closingDebit;
            closingCreditTotal += closingCredit;
            
            // إضافة الصف إذا كان هناك حركات
            if (openingDebit > 0 || openingCredit > 0 || movementDebit > 0 || movementCredit > 0) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${account.accountCode}</td>
                    <td>${account.name}</td>
                    <td class="text-center">${openingDebit.toFixed(2)}</td>
                    <td class="text-center">${openingCredit.toFixed(2)}</td>
                    <td class="text-center">${movementDebit.toFixed(2)}</td>
                    <td class="text-center">${movementCredit.toFixed(2)}</td>
                    <td class="text-center">${closingDebit.toFixed(2)}</td>
                    <td class="text-center">${closingCredit.toFixed(2)}</td>
                `;
                tbody.appendChild(row);
            }
        }
        
        // تحديث المجاميع
        document.getElementById('tbOpeningDebit').textContent = openingDebitTotal.toFixed(2);
        document.getElementById('tbOpeningCredit').textContent = openingCreditTotal.toFixed(2);
        document.getElementById('tbMovementDebit').textContent = movementDebitTotal.toFixed(2);
        document.getElementById('tbMovementCredit').textContent = movementCreditTotal.toFixed(2);
        document.getElementById('tbClosingDebit').textContent = closingDebitTotal.toFixed(2);
        document.getElementById('tbClosingCredit').textContent = closingCreditTotal.toFixed(2);
        
        // التحقق من التوازن
        this.checkTrialBalance(
            openingDebitTotal, openingCreditTotal,
            movementDebitTotal, movementCreditTotal,
            closingDebitTotal, closingCreditTotal
        );
        
        // حساب المجموعات الرئيسية
        this.calculateAccountGroups(accounts, transactions, date);
    }

    /**
     * التحقق من توازن ميزان المراجعة
     */
    checkTrialBalance(od, oc, md, mc, cd, cc) {
        const openingDiff = Math.abs(od - oc);
        const movementDiff = Math.abs(md - mc);
        const closingDiff = Math.abs(cd - cc);
        
        document.getElementById('checkOpening').textContent = 
            `${od.toFixed(2)} = ${oc.toFixed(2)} ${openingDiff < 0.01 ? '✓' : '✗'}`;
        
        document.getElementById('checkMovements').textContent = 
            `${md.toFixed(2)} = ${mc.toFixed(2)} ${movementDiff < 0.01 ? '✓' : '✗'}`;
        
        document.getElementById('checkClosing').textContent = 
            `${cd.toFixed(2)} = ${cc.toFixed(2)} ${closingDiff < 0.01 ? '✓' : '✗'}`;
        
        const resultElement = document.getElementById('balanceCheckResult');
        if (openingDiff < 0.01 && movementDiff < 0.01 && closingDiff < 0.01) {
            resultElement.className = 'alert alert-success';
            resultElement.innerHTML = '✓ الميزان متوازن';
        } else {
            resultElement.className = 'alert alert-danger';
            resultElement.innerHTML = '✗ الميزان غير متوازن';
        }
    }

    /**
     * حساب المجموعات الرئيسية للحسابات
     */
    async calculateAccountGroups(accounts, transactions, date) {
        let assetsTotal = 0;
        let liabilitiesTotal = 0;
        let equityTotal = 0;
        let revenueTotal = 0;
        let expenseTotal = 0;
        
        for (const account of accounts) {
            let balance = account.openingBalance || 0;
            
            // حساب الحركات حتى التاريخ المحدد
            transactions.forEach(transaction => {
                if (transaction.date <= date) {
                    transaction.entries.forEach(entry => {
                        if (entry.accountCode === account.accountCode) {
                            balance += (entry.debit || 0) - (entry.credit || 0);
                        }
                    });
                }
            });
            
            switch (account.type) {
                case 'asset':
                    assetsTotal += balance;
                    break;
                case 'liability':
                    liabilitiesTotal += balance;
                    break;
                case 'equity':
                    equityTotal += balance;
                    break;
                case 'revenue':
                    revenueTotal += balance;
                    break;
                case 'expense':
                    expenseTotal += balance;
                    break;
            }
        }
        
        const netIncome = revenueTotal - expenseTotal;
        
        document.getElementById('tbAssetsTotal').textContent = assetsTotal.toFixed(2);
        document.getElementById('tbLiabilitiesTotal').textContent = liabilitiesTotal.toFixed(2);
        document.getElementById('tbEquityTotal').textContent = equityTotal.toFixed(2);
        document.getElementById('tbRevenueTotal').textContent = revenueTotal.toFixed(2);
        document.getElementById('tbExpenseTotal').textContent = expenseTotal.toFixed(2);
        document.getElementById('tbNetIncome').textContent = netIncome.toFixed(2);
    }

    /**
     * طباعة ميزان المراجعة
     */
    printTrialBalance() {
        const printWindow = window.open('', '_blank');
        const date = document.getElementById('trialBalanceDate').value;
        
        const content = `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>ميزان المراجعة - ${date}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    .company-name { font-size: 24px; font-weight: bold; margin: 0; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                    th { background-color: #f2f2f2; }
                    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
                    .totals { font-weight: bold; background-color: #f8f9fa; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1 class="company-name">${COMPANY_INFO.BASIC.name}</h1>
                    <h2>ميزان المراجعة</h2>
                    <p>تاريخ: ${date}</p>
                    <p>${COMPANY_INFO.CONTACT.address.street}, ${COMPANY_INFO.CONTACT.address.city}</p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>رقم الحساب</th>
                            <th>اسم الحساب</th>
                            <th>مدين افتتاحي</th>
                            <th>دائن افتتاحي</th>
                            <th>مدين حركات</th>
                            <th>دائن حركات</th>
                            <th>مدين ختامي</th>
                            <th>دائن ختامي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${document.getElementById('trialBalanceTableBody').innerHTML}
                    </tbody>
                    <tfoot class="totals">
                        <tr>
                            <td colspan="2">المجموع</td>
                            <td>${document.getElementById('tbOpeningDebit').textContent}</td>
                            <td>${document.getElementById('tbOpeningCredit').textContent}</td>
                            <td>${document.getElementById('tbMovementDebit').textContent}</td>
                            <td>${document.getElementById('tbMovementCredit').textContent}</td>
                            <td>${document.getElementById('tbClosingDebit').textContent}</td>
                            <td>${document.getElementById('tbClosingCredit').textContent}</td>
                        </tr>
                    </tfoot>
                </table>
                
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
     * ========== الضرائب ==========
     */

    /**
     * تحديث أرصدة الضرائب
     */
    async updateTaxBalances() {
        try {
            // حساب ضريبة المخرجات (2041)
            const outputTaxAccount = await this.db.getAccount('2041');
            const outputTaxBalance = outputTaxAccount?.balance || 0;
            document.getElementById('taxOutputBalance').textContent = outputTaxBalance.toFixed(2);
            
            // حساب ضريبة المدخلات (1070)
            const inputTaxAccount = await this.db.getAccount('1070');
            const inputTaxBalance = inputTaxAccount?.balance || 0;
            document.getElementById('taxInputBalance').textContent = inputTaxBalance.toFixed(2);
            
            // حساب صافي الضريبة المستحقة
            const netTax = outputTaxBalance - inputTaxBalance;
            document.getElementById('netTaxPayable').textContent = netTax.toFixed(2);
            
            // تحديث حالة التسوية
            const statusElement = document.getElementById('taxSettlementStatus');
            if (netTax > 0) {
                statusElement.className = 'badge bg-danger';
                statusElement.textContent = 'مستحقة';
            } else if (netTax < 0) {
                statusElement.className = 'badge bg-success';
                statusElement.textContent = 'قابلة للاسترداد';
            } else {
                statusElement.className = 'badge bg-secondary';
                statusElement.textContent = 'مدفوعة';
            }
        } catch (error) {
            console.error('خطأ في تحديث أرصدة الضرائب:', error);
        }
    }

    /**
     * تسوية الضريبة
     */
    async settleTax() {
        const form = document.getElementById('taxSettlementForm');
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        const date = document.getElementById('taxSettlementDate').value;
        const amount = parseFloat(document.getElementById('taxSettlementAmount').value);
        const method = document.getElementById('taxPaymentMethod').value;
        const reference = document.getElementById('taxSettlementReference').value || `TAX-${Date.now().toString().substr(-6)}`;
        const notes = document.getElementById('taxSettlementNotes').value;
        
        if (amount <= 0) {
            this.showNotification('المبلغ يجب أن يكون أكبر من صفر', 'warning');
            return;
        }
        
        try {
            // حساب صافي الضريبة المستحقة
            const outputTaxAccount = await this.db.getAccount('2041');
            const inputTaxAccount = await this.db.getAccount('1070');
            const netTax = (outputTaxAccount?.balance || 0) - (inputTaxAccount?.balance || 0);
            
            if (amount > Math.abs(netTax)) {
                this.showNotification('المبلغ أكبر من صافي الضريبة المستحقة', 'warning');
                return;
            }
            
            // إنشاء قيد تسوية الضريبة
            const transaction = {
                date: date,
                type: 'tax_settlement',
                description: `تسوية ضريبة - ${notes || 'تسوية ضريبة دورية'}`,
                reference: reference,
                entries: []
            };
            
            if (netTax > 0) {
                // ضريبة مستحقة الدفع
                transaction.entries.push({
                    accountCode: '2041', // ضريبة المخرجات
                    debit: 0,
                    credit: amount,
                    description: `تسوية ضريبة مستحقة - ${reference}`
                });
                
                transaction.entries.push({
                    accountCode: method === 'cash' ? '1010' : '1020', // الصندوق أو البنك
                    debit: amount,
                    credit: 0,
                    description: `دفع ضريبة - ${reference}`
                });
            } else if (netTax < 0) {
                // ضريبة قابلة للاسترداد
                transaction.entries.push({
                    accountCode: '1070', // ضريبة المدخلات
                    debit: amount,
                    credit: 0,
                    description: `استرداد ضريبة - ${reference}`
                });
                
                transaction.entries.push({
                    accountCode: method === 'cash' ? '1010' : '1020', // الصندوق أو البنك
                    debit: 0,
                    credit: amount,
                    description: `استلام ضريبة - ${reference}`
                });
            }
            
            // حفظ القيد
            await this.db.addTransaction(transaction);
            
            // تحديث أرصدة الحسابات
            for (const entry of transaction.entries) {
                await this.updateAccountBalance(entry.accountCode, entry.debit - entry.credit);
            }
            
            // حفظ سجل التسوية
            const settlementRecord = {
                date: date,
                amount: amount,
                method: method,
                reference: reference,
                notes: notes,
                type: netTax > 0 ? 'payment' : 'refund',
                status: 'completed',
                createdAt: new Date().toISOString()
            };
            
            await this.db.put('tax_settlements', settlementRecord);
            
            this.showNotification('تم تسوية الضريبة بنجاح', 'success');
            this.updateTaxBalances();
            await this.loadTaxSettlements();
            
            // إعادة تعيين النموذج
            form.reset();
            
        } catch (error) {
            console.error('خطأ في تسوية الضريبة:', error);
            this.showNotification('فشل في تسوية الضريبة', 'danger');
        }
    }

    /**
     * تحميل سجل تسويات الضرائب
     */
    async loadTaxSettlements() {
        try {
            const settlements = await this.db.getAll('tax_settlements') || [];
            const tbody = document.getElementById('taxSettlementsTableBody');
            tbody.innerHTML = '';
            
            if (settlements.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-muted">لا توجد تسويات</td>
                    </tr>
                `;
                return;
            }
            
            settlements
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .forEach(settlement => {
                    const typeClass = settlement.type === 'payment' ? 'badge bg-danger' : 'badge bg-success';
                    const typeText = settlement.type === 'payment' ? 'دفع' : 'استرداد';
                    
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${settlement.date}</td>
                        <td class="text-end">${settlement.amount.toFixed(2)} ر.ي</td>
                        <td>${settlement.method === 'cash' ? 'نقدي' : 'بنكي'}</td>
                        <td><span class="${typeClass}">${typeText}</span></td>
                        <td>
                            <button class="btn btn-sm btn-outline-info" onclick="accountingSystem.viewSettlementDetails(${settlement.id})">
                                <i class="bi bi-eye"></i>
                            </button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
        } catch (error) {
            console.error('خطأ في تحميل تسويات الضرائب:', error);
        }
    }

    /**
     * عرض تفاصيل التسوية
     */
    async viewSettlementDetails(settlementId) {
        const settlement = await this.db.get('tax_settlements', settlementId);
        if (!settlement) return;
        
        const details = `
            <strong>تاريخ التسوية:</strong> ${settlement.date}<br>
            <strong>المبلغ:</strong> ${settlement.amount.toFixed(2)} ر.ي<br>
            <strong>طريقة الدفع:</strong> ${settlement.method === 'cash' ? 'نقدي' : 'بنكي'}<br>
            <strong>نوع التسوية:</strong> ${settlement.type === 'payment' ? 'دفع' : 'استرداد'}<br>
            <strong>المرجع:</strong> ${settlement.reference}<br>
            <strong>الملاحظات:</strong> ${settlement.notes || 'لا توجد'}<br>
        `;
        
        alert(details);
    }

    /**
     * توليد تقرير الضريبة
     */
    async generateTaxReport() {
        const fromDate = document.getElementById('taxReportFromDate').value;
        const toDate = document.getElementById('taxReportToDate').value;
        
        if (!fromDate || !toDate) {
            this.showNotification('يجب تحديد فترة التقرير', 'warning');
            return;
        }
        
        try {
            const transactions = await this.db.getTransactionsByDateRange(fromDate, toDate);
            
            let totalTaxSales = 0;
            let totalTaxPurchases = 0;
            
            transactions.forEach(transaction => {
                if (transaction.type === 'sale') {
                    // البحث عن ضريبة المبيعات
                    transaction.entries.forEach(entry => {
                        if (entry.accountCode === '2041') {
                            totalTaxSales += entry.credit || 0;
                        }
                    });
                } else if (transaction.type === 'purchase') {
                    // البحث عن ضريبة المشتريات
                    transaction.entries.forEach(entry => {
                        if (entry.accountCode === '1070') {
                            totalTaxPurchases += entry.debit || 0;
                        }
                    });
                }
            });
            
            const netTax = totalTaxSales - totalTaxPurchases;
            
            document.getElementById('totalTaxSales').textContent = totalTaxSales.toFixed(2);
            document.getElementById('totalTaxPurchases').textContent = totalTaxPurchases.toFixed(2);
            document.getElementById('reportNetTax').textContent = netTax.toFixed(2);
            
            this.showNotification('تم توليد التقرير بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في توليد تقرير الضريبة:', error);
            this.showNotification('فشل في توليد التقرير', 'danger');
        }
    }

    /**
     * ========== العمليات السريعة (الأزرار الأربعة) ==========
     */

    /**
     * فتح نافذة تحصيل من العملاء
     */
    async openCollectModal() {
        // تعبئة قائمة العملاء
        const customers = await this.db.getAllCustomers(true);
        const select = document.getElementById('collectCustomerSelect');
        select.innerHTML = '<option value="">اختر العميل...</option>';
        
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = `${customer.name} - رصيد: ${(customer.balance || 0).toFixed(2)} ر.ي`;
            select.appendChild(option);
        });
        
        // تعيين التاريخ الافتراضي
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('collectDate').value = today;
        document.getElementById('collectReference').value = `REC-${Date.now().toString().substr(-6)}`;
        
        // إضافة حدث عند تغيير العميل
        select.addEventListener('change', async (e) => {
            if (e.target.value) {
                const customer = customers.find(c => c.id == e.target.value);
                if (customer) {
                    document.getElementById('customerCurrentBalance').textContent = (customer.balance || 0).toFixed(2);
                    
                    const amount = parseFloat(document.getElementById('collectAmount').value) || 0;
                    const newBalance = (customer.balance || 0) - amount;
                    document.getElementById('customerBalanceAfter').textContent = newBalance.toFixed(2);
                }
            }
        });
        
        // إضافة حدث عند تغيير المبلغ
        document.getElementById('collectAmount').addEventListener('input', () => {
            const selectedCustomerId = select.value;
            if (selectedCustomerId) {
                const customer = customers.find(c => c.id == selectedCustomerId);
                if (customer) {
                    const amount = parseFloat(document.getElementById('collectAmount').value) || 0;
                    const newBalance = (customer.balance || 0) - amount;
                    document.getElementById('customerBalanceAfter').textContent = newBalance.toFixed(2);
                }
            }
        });
        
        this.collectModal.show();
    }

    /**
     * تأكيد تحصيل من العملاء
     */
    async confirmCollect() {
        const form = document.getElementById('collectForm');
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        const customerId = document.getElementById('collectCustomerSelect').value;
        const amount = parseFloat(document.getElementById('collectAmount').value);
        const date = document.getElementById('collectDate').value;
        const method = document.getElementById('collectPaymentMethod').value;
        const reference = document.getElementById('collectReference').value || `REC-${Date.now().toString().substr(-6)}`;
        const notes = document.getElementById('collectNotes').value;
        
        if (amount <= 0) {
            this.showNotification('المبلغ يجب أن يكون أكبر من صفر', 'warning');
            return;
        }
        
        try {
            // الحصول على بيانات العميل
            const customer = await this.db.get('customers', parseInt(customerId));
            if (!customer) {
                this.showNotification('العميل غير موجود', 'danger');
                return;
            }
            
            // إنشاء قيد التحصيل
            const transaction = {
                date: date,
                type: 'receipt',
                description: `تحصيل من ${customer.name} - ${notes || 'تحصيل نقدي'}`,
                reference: reference,
                entries: []
            };
            
            // حساب التحصيل من حساب العميل
            transaction.entries.push({
                accountCode: '1040', // العملاء
                debit: 0,
                credit: amount,
                description: `تحصيل من ${customer.name} - ${reference}`
            });
            
            // إضافة إلى الصندوق أو البنك
            const cashAccount = method === 'cash' ? '1010' : '1020';
            transaction.entries.push({
                accountCode: cashAccount,
                debit: amount,
                credit: 0,
                description: `تحصيل من ${customer.name} - ${reference}`
            });
            
            // حفظ القيد
            await this.db.addTransaction(transaction);
            
            // تحديث أرصدة الحسابات
            for (const entry of transaction.entries) {
                await this.updateAccountBalance(entry.accountCode, entry.debit - entry.credit);
            }
            
            // تحديث رصيد العميل
            customer.balance = (customer.balance || 0) - amount;
            customer.updatedAt = new Date().toISOString();
            await this.db.put('customers', customer);
            
            this.showNotification('تم التحصيل بنجاح', 'success');
            this.collectModal.hide();
            form.reset();
            
        } catch (error) {
            console.error('خطأ في التحصيل:', error);
            this.showNotification('فشل في التحصيل', 'danger');
        }
    }

    /**
     * فتح نافذة سداد الموردين
     */
    async openPaymentModal() {
        // تعبئة قائمة الموردين
        const suppliers = await this.db.getAllSuppliers(true);
        const select = document.getElementById('paymentSupplierSelect');
        select.innerHTML = '<option value="">اختر المورد...</option>';
        
        suppliers.forEach(supplier => {
            const option = document.createElement('option');
            option.value = supplier.id;
            option.textContent = `${supplier.name} - رصيد: ${(supplier.balance || 0).toFixed(2)} ر.ي`;
            select.appendChild(option);
        });
        
        // تعيين التاريخ الافتراضي
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('paymentDate').value = today;
        document.getElementById('paymentReference').value = `PAY-${Date.now().toString().substr(-6)}`;
        
        // إضافة حدث عند تغيير المورد
        select.addEventListener('change', async (e) => {
            if (e.target.value) {
                const supplier = suppliers.find(s => s.id == e.target.value);
                if (supplier) {
                    document.getElementById('supplierCurrentBalance').textContent = (supplier.balance || 0).toFixed(2);
                    
                    const amount = parseFloat(document.getElementById('paymentAmount').value) || 0;
                    const newBalance = (supplier.balance || 0) - amount;
                    document.getElementById('supplierBalanceAfter').textContent = newBalance.toFixed(2);
                }
            }
        });
        
        // إضافة حدث عند تغيير المبلغ
        document.getElementById('paymentAmount').addEventListener('input', () => {
            const selectedSupplierId = select.value;
            if (selectedSupplierId) {
                const supplier = suppliers.find(s => s.id == selectedSupplierId);
                if (supplier) {
                    const amount = parseFloat(document.getElementById('paymentAmount').value) || 0;
                    const newBalance = (supplier.balance || 0) - amount;
                    document.getElementById('supplierBalanceAfter').textContent = newBalance.toFixed(2);
                }
            }
        });
        
        this.paymentModal.show();
    }

    /**
     * تأكيد سداد الموردين
     */
    async confirmPayment() {
        const form = document.getElementById('paymentForm');
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        const supplierId = document.getElementById('paymentSupplierSelect').value;
        const amount = parseFloat(document.getElementById('paymentAmount').value);
        const date = document.getElementById('paymentDate').value;
        const method = document.getElementById('paymentPaymentMethod').value;
        const reference = document.getElementById('paymentReference').value || `PAY-${Date.now().toString().substr(-6)}`;
        const notes = document.getElementById('paymentNotes').value;
        
        if (amount <= 0) {
            this.showNotification('المبلغ يجب أن يكون أكبر من صفر', 'warning');
            return;
        }
        
        try {
            // الحصول على بيانات المورد
            const supplier = await this.db.get('suppliers', parseInt(supplierId));
            if (!supplier) {
                this.showNotification('المورد غير موجود', 'danger');
                return;
            }
            
            // إنشاء قيد السداد
            const transaction = {
                date: date,
                type: 'payment',
                description: `سداد إلى ${supplier.name} - ${notes || 'سداد نقدي'}`,
                reference: reference,
                entries: []
            };
            
            // خصم من الصندوق أو البنك
            const cashAccount = method === 'cash' ? '1010' : '1020';
            transaction.entries.push({
                accountCode: cashAccount,
                debit: 0,
                credit: amount,
                description: `سداد إلى ${supplier.name} - ${reference}`
            });
            
            // خصم من رصيد المورد
            transaction.entries.push({
                accountCode: '2010', // الموردين
                debit: amount,
                credit: 0,
                description: `سداد إلى ${supplier.name} - ${reference}`
            });
            
            // حفظ القيد
            await this.db.addTransaction(transaction);
            
            // تحديث أرصدة الحسابات
            for (const entry of transaction.entries) {
                await this.updateAccountBalance(entry.accountCode, entry.debit - entry.credit);
            }
            
            // تحديث رصيد المورد
            supplier.balance = (supplier.balance || 0) - amount;
            supplier.updatedAt = new Date().toISOString();
            await this.db.put('suppliers', supplier);
            
            this.showNotification('تم السداد بنجاح', 'success');
            this.paymentModal.hide();
            form.reset();
            
        } catch (error) {
            console.error('خطأ في السداد:', error);
            this.showNotification('فشل في السداد', 'danger');
        }
    }

    /**
     * فتح نافذة مرتجع مبيعات
     */
    async openSalesReturnModal() {
        // تعبئة قائمة العملاء
        const customers = await this.db.getAllCustomers(true);
        const select = document.getElementById('salesReturnCustomerSelect');
        select.innerHTML = '<option value="">اختر العميل...</option>';
        
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = `${customer.name}`;
            select.appendChild(option);
        });
        
        // تعبئة قائمة الفواتير
        const invoices = await this.db.getAllInvoices(true);
        const invoiceSelect = document.getElementById('salesReturnInvoiceSelect');
        invoiceSelect.innerHTML = '<option value="">اختر الفاتورة...</option>';
        
        invoices.filter(inv => inv.type !== 'purchase').forEach(invoice => {
            const option = document.createElement('option');
            option.value = invoice.id;
            option.textContent = `${invoice.invoiceNumber} - ${invoice.total.toFixed(2)} ر.ي`;
            select.appendChild(option);
        });
        
        // تعيين التاريخ الافتراضي
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('salesReturnDate').value = today;
        
        this.salesReturnModal.show();
    }

    /**
     * تأكيد مرتجع مبيعات
     */
    async confirmSalesReturn() {
        const form = document.getElementById('salesReturnForm');
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        const customerId = document.getElementById('salesReturnCustomerSelect').value;
        const invoiceId = document.getElementById('salesReturnInvoiceSelect').value;
        const amount = parseFloat(document.getElementById('salesReturnAmount').value);
        const date = document.getElementById('salesReturnDate').value;
        const reason = document.getElementById('salesReturnReason').value;
        const details = document.getElementById('salesReturnDetails').value;
        
        if (amount <= 0) {
            this.showNotification('المبلغ يجب أن يكون أكبر من صفر', 'warning');
            return;
        }
        
        try {
            // الحصول على بيانات العميل
            const customer = await this.db.get('customers', parseInt(customerId));
            if (!customer) {
                this.showNotification('العميل غير موجود', 'danger');
                return;
            }
            
            // إنشاء قيد مرتجع المبيعات
            const transaction = {
                date: date,
                type: 'sales_return',
                description: `مرتجع مبيعات من ${customer.name} - ${reason}`,
                reference: `SR-${Date.now().toString().substr(-6)}`,
                entries: []
            };
            
            // إرجاع المبلغ للعميل
            transaction.entries.push({
                accountCode: '1040', // العملاء
                debit: amount,
                credit: 0,
                description: `مرتجع مبيعات - ${reason}`
            });
            
            // خصم من إيرادات المبيعات
            transaction.entries.push({
                accountCode: '4010', // المبيعات
                debit: 0,
                credit: amount,
                description: `مرتجع مبيعات - ${reason}`
            });
            
            // إذا كان هناك ضريبة
            const taxAmount = amount * (COMPANY_INFO.FINANCIAL.defaultTaxRate / 100);
            if (taxAmount > 0) {
                transaction.entries.push({
                    accountCode: '2041', // ضريبة المخرجات
                    debit: taxAmount,
                    credit: 0,
                    description: `مرتجع ضريبة مبيعات - ${reason}`
                });
            }
            
            // حفظ القيد
            await this.db.addTransaction(transaction);
            
            // تحديث أرصدة الحسابات
            for (const entry of transaction.entries) {
                await this.updateAccountBalance(entry.accountCode, entry.debit - entry.credit);
            }
            
            // تحديث رصيد العميل
            customer.balance = (customer.balance || 0) + amount;
            customer.updatedAt = new Date().toISOString();
            await this.db.put('customers', customer);
            
            // تسجيل المرتجع
            const returnRecord = {
                type: 'sales',
                customerId: customerId,
                invoiceId: invoiceId || null,
                amount: amount,
                date: date,
                reason: reason,
                details: details,
                status: 'completed',
                createdAt: new Date().toISOString()
            };
            
            await this.db.put('returns', returnRecord);
            
            this.showNotification('تم تسجيل مرتجع المبيعات بنجاح', 'success');
            this.salesReturnModal.hide();
            form.reset();
            
        } catch (error) {
            console.error('خطأ في تسجيل مرتجع المبيعات:', error);
            this.showNotification('فشل في تسجيل المرتجع', 'danger');
        }
    }

    /**
     * فتح نافذة مرتجع مشتريات
     */
    async openPurchaseReturnModal() {
        // تعبئة قائمة الموردين
        const suppliers = await this.db.getAllSuppliers(true);
        const select = document.getElementById('purchaseReturnSupplierSelect');
        select.innerHTML = '<option value="">اختر المورد...</option>';
        
        suppliers.forEach(supplier => {
            const option = document.createElement('option');
            option.value = supplier.id;
            option.textContent = `${supplier.name}`;
            select.appendChild(option);
        });
        
        // تعبئة قائمة فواتير الشراء
        const invoices = await this.db.getAllInvoices(true);
        const invoiceSelect = document.getElementById('purchaseReturnInvoiceSelect');
        invoiceSelect.innerHTML = '<option value="">اختر الفاتورة...</option>';
        
        invoices.filter(inv => inv.type === 'purchase').forEach(invoice => {
            const option = document.createElement('option');
            option.value = invoice.id;
            option.textContent = `${invoice.invoiceNumber} - ${invoice.total.toFixed(2)} ر.ي`;
            select.appendChild(option);
        });
        
        // تعيين التاريخ الافتراضي
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('purchaseReturnDate').value = today;
        
        this.purchaseReturnModal.show();
    }

    /**
     * تأكيد مرتجع مشتريات
     */
    async confirmPurchaseReturn() {
        const form = document.getElementById('purchaseReturnForm');
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        const supplierId = document.getElementById('purchaseReturnSupplierSelect').value;
        const invoiceId = document.getElementById('purchaseReturnInvoiceSelect').value;
        const amount = parseFloat(document.getElementById('purchaseReturnAmount').value);
        const date = document.getElementById('purchaseReturnDate').value;
        const reason = document.getElementById('purchaseReturnReason').value;
        const details = document.getElementById('purchaseReturnDetails').value;
        
        if (amount <= 0) {
            this.showNotification('المبلغ يجب أن يكون أكبر من صفر', 'warning');
            return;
        }
        
        try {
            // الحصول على بيانات المورد
            const supplier = await this.db.get('suppliers', parseInt(supplierId));
            if (!supplier) {
                this.showNotification('المورد غير موجود', 'danger');
                return;
            }
            
            // إنشاء قيد مرتجع المشتريات
            const transaction = {
                date: date,
                type: 'purchase_return',
                description: `مرتجع مشتريات إلى ${supplier.name} - ${reason}`,
                reference: `PR-${Date.now().toString().substr(-6)}`,
                entries: []
            };
            
            // خصم من رصيد المورد
            transaction.entries.push({
                accountCode: '2010', // الموردين
                debit: 0,
                credit: amount,
                description: `مرتجع مشتريات - ${reason}`
            });
            
            // إرجاع إلى المخزون أو المصروفات
            transaction.entries.push({
                accountCode: '1030', // المخزون
                debit: amount,
                credit: 0,
                description: `مرتجع مشتريات - ${reason}`
            });
            
            // إذا كان هناك ضريبة
            const taxAmount = amount * (COMPANY_INFO.FINANCIAL.defaultTaxRate / 100);
            if (taxAmount > 0) {
                transaction.entries.push({
                    accountCode: '1070', // ضريبة المدخلات
                    debit: 0,
                    credit: taxAmount,
                    description: `مرتجع ضريبة مشتريات - ${reason}`
                });
            }
            
            // حفظ القيد
            await this.db.addTransaction(transaction);
            
            // تحديث أرصدة الحسابات
            for (const entry of transaction.entries) {
                await this.updateAccountBalance(entry.accountCode, entry.debit - entry.credit);
            }
            
            // تحديث رصيد المورد
            supplier.balance = (supplier.balance || 0) - amount;
            supplier.updatedAt = new Date().toISOString();
            await this.db.put('suppliers', supplier);
            
            // تسجيل المرتجع
            const returnRecord = {
                type: 'purchase',
                supplierId: supplierId,
                invoiceId: invoiceId || null,
                amount: amount,
                date: date,
                reason: reason,
                details: details,
                status: 'completed',
                createdAt: new Date().toISOString()
            };
            
            await this.db.put('returns', returnRecord);
            
            this.showNotification('تم تسجيل مرتجع المشتريات بنجاح', 'success');
            this.purchaseReturnModal.hide();
            form.reset();
            
        } catch (error) {
            console.error('خطأ في تسجيل مرتجع المشتريات:', error);
            this.showNotification('فشل في تسجيل المرتجع', 'danger');
        }
    }

    /**
     * ========== أدوات مساعدة ==========
     */

    /**
     * إظهار إشعار
     */
    showNotification(message, type = 'success') {
        // إنشاء عنصر الإشعار
        const notification = document.createElement('div');
        notification.className = `toast-notification toast-${type}`;
        notification.innerHTML = `
            <div class="toast-message">${message}</div>
            <button class="toast-close">&times;</button>
        `;
        
        // إضافة إلى الصفحة
        document.body.appendChild(notification);
        
        // إضافة حدث الإغلاق
        notification.querySelector('.toast-close').addEventListener('click', () => {
            notification.remove();
        });
        
        // الإزالة التلقائية بعد 5 ثواني
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * تنسيق الرقم
     */
    formatNumber(num) {
        return new Intl.NumberFormat('ar-EG', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    }

    /**
     * تنسيق التاريخ
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.accountingSystem = new MAccounting();
    window.accountingSystem.init();
});