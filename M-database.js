/**
 * M-database.js
 * 
 * واجهة التخزين المحلي IndexDB للنظام المحاسبي.
 * تعتمد على IndexedDB API وتوفر دوال مبسطة لإدارة البيانات.
 * 
 * تم التحديث لإضافة مخازن جديدة لدعم نظام نقطة البيع وإدارة الأصناف.
 */

class MDatabase {
    constructor(dbName = 'M_Accounting_DB', dbVersion = 2) {
        this.dbName = dbName;
        this.dbVersion = dbVersion; // تم تحديث الإصدار إلى 2
        this.db = null;
        this.objectStores = [
            'settings',     // إعدادات النظام (COMPANY_INFO, ACCOUNTING_PERIOD, إلخ)
            'accounts',     // شجرة الحسابات (CHART_OF_ACCOUNTS)
            'transactions', // القيود اليومية/المعاملات المحاسبية
            'customers',    // بيانات العملاء
            'suppliers',    // بيانات الموردين
            'items',        // بيانات الأصناف/المخزون
            'categories',   // فئات المنتجات - تمت الإضافة
            'invoices',     // فواتير المبيعات - تمت الإضافة
            'users'         // بيانات المستخدمين - تمت الإضافة
        ];
    }

    /**
     * يفتح اتصال قاعدة البيانات IndexDB.
     * يتم إنشاء وتحديث مخازن الكائنات (Object Stores) هنا.
     * @returns {Promise<IDBDatabase>} وعد بقاعدة البيانات المفتوحة.
     */
    openDB() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                resolve(this.db);
                return;
            }

            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error("خطأ في فتح قاعدة البيانات:", event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = async (event) => {
                this.db = event.target.result;
                console.log("تم فتح قاعدة البيانات بنجاح.");
                
                // تهيئة الحسابات الافتراضية بعد فتح قاعدة البيانات
                try {
                    await this.initializeDefaultAccounts();
                } catch (initError) {
                    console.warn('تحذير: فشل تهيئة الحسابات الافتراضية:', initError);
                }
                
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log(`تحديث قاعدة البيانات من الإصدار ${event.oldVersion} إلى ${event.newVersion}`);

                // إنشاء أو تحديث مخازن الكائنات
                this.objectStores.forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        let store;
                        if (storeName === 'accounts') {
                            // مخزن الحسابات: المفتاح هو رقم الحساب
                            store = db.createObjectStore(storeName, { keyPath: 'accountCode' });
                            store.createIndex('name', 'name', { unique: false });
                            store.createIndex('type', 'type', { unique: false });
                            store.createIndex('parent', 'parent', { unique: false });
                        } else if (storeName === 'transactions') {
                            // مخزن المعاملات: مفتاح تلقائي، وفهارس للتاريخ ونوع المعاملة
                            store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                            store.createIndex('date', 'date', { unique: false });
                            store.createIndex('type', 'type', { unique: false });
                            store.createIndex('reference', 'reference', { unique: false });
                        } else if (storeName === 'settings') {
                            // مخزن الإعدادات: المفتاح هو اسم الإعداد (مثل 'COMPANY_INFO')
                            store = db.createObjectStore(storeName, { keyPath: 'key' });
                        } else if (storeName === 'categories') {
                            // مخزن الفئات: مفتاح تلقائي
                            store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                            store.createIndex('name', 'name', { unique: false });
                            store.createIndex('parentId', 'parentId', { unique: false });
                        } else if (storeName === 'invoices') {
                            // مخزن الفواتير: مفتاح تلقائي، وفهارس للرقم والتاريخ
                            store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                            store.createIndex('invoiceNumber', 'invoiceNumber', { unique: true });
                            store.createIndex('date', 'date', { unique: false });
                            store.createIndex('customerId', 'customerId', { unique: false });
                            store.createIndex('status', 'status', { unique: false });
                            store.createIndex('paymentMethod', 'paymentMethod', { unique: false });
                        } else if (storeName === 'items') {
                            // مخزن الأصناف: مفتاح تلقائي
                            store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                            store.createIndex('code', 'code', { unique: true });
                            store.createIndex('name', 'name', { unique: false });
                            store.createIndex('categoryId', 'categoryId', { unique: false });
                            store.createIndex('barcode', 'barcode', { unique: true });
                        } else if (storeName === 'customers') {
                            // مخزن العملاء: مفتاح تلقائي
                            store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                            store.createIndex('name', 'name', { unique: false });
                            store.createIndex('phone', 'phone', { unique: false });
                            store.createIndex('code', 'code', { unique: true });
                        } else if (storeName === 'suppliers') {
                            // مخزن الموردين: مفتاح تلقائي
                            store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                            store.createIndex('name', 'name', { unique: false });
                            store.createIndex('phone', 'phone', { unique: false });
                            store.createIndex('code', 'code', { unique: true });
                        } else if (storeName === 'users') {
                            // مخزن المستخدمين: مفتاح تلقائي
                            store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                            store.createIndex('username', 'username', { unique: true });
                            store.createIndex('email', 'email', { unique: true });
                        } else {
                            // مخازن عامة: مفتاح تلقائي
                            store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                        }
                        
                        // إضافة فهرس للحذف المنطقي لجميع المخازن باستثناء الإعدادات والحسابات
                        if (storeName !== 'settings' && storeName !== 'accounts') {
                            store.createIndex('deleted', 'deleted', { unique: false });
                        }
                        console.log(`تم إنشاء مخزن الكائنات: ${storeName}`);
                    }
                });
            };
        });
    }

    /**
     * تهيئة جميع الحسابات من CHART_OF_ACCOUNTS إذا لم تكن موجودة
     */
    async initializeDefaultAccounts() {
        try {
            const accounts = await this.getAllAccounts();
            
            if (accounts.length === 0) {
                console.log('جارٍ تهيئة شجرة الحسابات الكاملة...');
                
                let accountsCreated = 0;
                
                // الطريقة 1: استخدام CHART_OF_ACCOUNTS إذا كان متاحاً
                if (window.CHART_OF_ACCOUNTS && typeof window.CHART_OF_ACCOUNTS === 'object') {
                    console.log('تم العثور على CHART_OF_ACCOUNTS، جارٍ تحميل جميع الحسابات...');
                    
                    for (const category in window.CHART_OF_ACCOUNTS) {
                        for (const code in window.CHART_OF_ACCOUNTS[category]) {
                            try {
                                const account = { ...window.CHART_OF_ACCOUNTS[category][code] };
                                
                                // تأكد من وجود القيم الأساسية
                                if (!account.accountCode) account.accountCode = code;
                                if (!account.name) account.name = `حساب ${code}`;
                                if (typeof account.balance !== 'number') account.balance = 0;
                                if (!account.createdAt) account.createdAt = new Date().toISOString();
                                
                                await this.saveAccount(account);
                                accountsCreated++;
                            } catch (accountError) {
                                console.error(`خطأ في حفظ الحساب ${code}:`, accountError);
                            }
                        }
                    }
                    
                    console.log(`تم تحميل ${accountsCreated} حساب من CHART_OF_ACCOUNTS`);
                } 
                // الطريقة 2: إذا لم يكن CHART_OF_ACCOUNTS متاحاً، أنشئ الحسابات الأساسية
                else {
                    console.warn('لم يتم العثور على CHART_OF_ACCOUNTS، جارٍ إنشاء الحسابات الأساسية...');
                    
                    const basicAccounts = this.getBasicAccounts();
                    for (const account of basicAccounts) {
                        await this.saveAccount(account);
                        accountsCreated++;
                    }
                    
                    console.log(`تم إنشاء ${accountsCreated} حساب أساسي`);
                }
                
                return accountsCreated > 0;
            }
            
            console.log(`تم العثور على ${accounts.length} حساب في قاعدة البيانات`);
            return false;
        } catch (error) {
            console.error('خطأ في تهيئة الحسابات الافتراضية:', error);
            return false;
        }
    }

    /**
     * إرجاع الحسابات الأساسية (للطريقة الاحتياطية)
     */
    getBasicAccounts() {
        return [
            // الأصول (1xxx)
            { accountCode: '1000', name: 'الأصول', type: 'asset', parent: null, balance: 0, description: 'مجموع الأصول' },
            { accountCode: '1010', name: 'الصندوق', type: 'asset', parent: '1000', balance: 0, description: 'النقدية في الصندوق' },
            { accountCode: '1020', name: 'البنك', type: 'asset', parent: '1000', balance: 0, description: 'الحسابات البنكية' },
            { accountCode: '1030', name: 'المخزون', type: 'asset', parent: '1000', balance: 0, description: 'بضاعة المخزن' },
            { accountCode: '1040', name: 'العملاء', type: 'asset', parent: '1000', balance: 0, description: 'ذمم العملاء المدينة' },
            { accountCode: '1050', name: 'أصول ثابتة', type: 'asset', parent: '1000', balance: 0, description: 'المباني، المعدات، السيارات' },
            { accountCode: '1070', name: 'ضريبة المدخلات', type: 'asset', parent: '1000', balance: 0, description: 'ضريبة المشتريات' },
            
            // الخصوم (2xxx)
            { accountCode: '2000', name: 'الخصوم', type: 'liability', parent: null, balance: 0, description: 'مجموع الخصوم' },
            { accountCode: '2010', name: 'الموردين', type: 'liability', parent: '2000', balance: 0, description: 'ذمم الموردين الدائنة' },
            { accountCode: '2040', name: 'ضرائب مستحقة', type: 'liability', parent: '2000', balance: 0, description: 'مجموع الضرائب المستحقة' },
            { accountCode: '2041', name: 'ضريبة المخرجات', type: 'liability', parent: '2040', balance: 0, description: 'ضريبة المبيعات' },
            
            // حقوق الملكية (3xxx)
            { accountCode: '3000', name: 'حقوق الملكية', type: 'equity', parent: null, balance: 0, description: 'مجموع حقوق الملكية' },
            { accountCode: '3010', name: 'رأس المال', type: 'equity', parent: '3000', balance: 0, description: 'رأس مال المالك' },
            { accountCode: '3040', name: 'مسحوبات شخصية', type: 'equity', parent: '3000', balance: 0, description: 'السحوبات الشخصية للمالك' },
            
            // الإيرادات (4xxx)
            { accountCode: '4000', name: 'الإيرادات', type: 'revenue', parent: null, balance: 0, description: 'مجموع الإيرادات' },
            { accountCode: '4010', name: 'مبيعات', type: 'revenue', parent: '4000', balance: 0, description: 'إيرادات المبيعات' },
            { accountCode: '4030', name: 'خصومات مبيعات', type: 'revenue', parent: '4000', balance: 0, description: 'الخصومات على المبيعات' },
            
            // المصروفات (5xxx)
            { accountCode: '5000', name: 'المصروفات', type: 'expense', parent: null, balance: 0, description: 'مجموع المصروفات' },
            { accountCode: '5010', name: 'تكلفة البضاعة المباعة', type: 'expense', parent: '5000', balance: 0, description: 'تكلفة البيع' },
            { accountCode: '5020', name: 'مصاريف تشغيل', type: 'expense', parent: '5000', balance: 0, description: 'مصاريف التشغيل' },
            { accountCode: '5030', name: 'رواتب وأجور', type: 'expense', parent: '5000', balance: 0, description: 'رواتب الموظفين' },
            { accountCode: '5110', name: 'مصاريف الضرائب', type: 'expense', parent: '5000', balance: 0, description: 'مصاريف الضرائب' }
        ];
    }

    /**
     * يحصل على معاملة (Transaction) لقاعدة البيانات.
     * @param {string|string[]} storeNames - اسم مخزن الكائنات أو قائمة بالأسماء.
     * @param {string} mode - وضع المعاملة ('readonly' أو 'readwrite').
     * @returns {IDBTransaction} المعاملة.
     */
    getTransaction(storeNames, mode) {
        if (!this.db) {
            throw new Error("قاعدة البيانات غير مفتوحة. يرجى استدعاء openDB أولاً.");
        }
        return this.db.transaction(storeNames, mode);
    }

    /**
     * دالة مساعدة عامة لإجراء عملية على مخزن كائنات واحد.
     * @param {string} storeName - اسم مخزن الكائنات.
     * @param {string} mode - وضع المعاملة.
     * @param {function(IDBObjectStore): IDBRequest} operation - الدالة التي تنفذ العملية.
     * @returns {Promise<any>} وعد بنتيجة العملية.
     */
    async execute(storeName, mode, operation) {
        await this.openDB();
        const transaction = this.getTransaction(storeName, mode);
        const store = transaction.objectStore(storeName);

        return new Promise((resolve, reject) => {
            const request = operation(store);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = (event) => {
                console.error(`خطأ في عملية ${storeName}:`, event.target.error);
                reject(event.target.error);
            };

            transaction.oncomplete = () => {
                // يمكن أن يكون مفيدًا لعمليات الكتابة المتعددة
            };
        });
    }

    // ==================== دوال متقدمة ====================

    /**
     * يحصل على كائنات من المخزن باستخدام فهرس ونطاق مفاتيح.
     * @param {string} storeName - اسم المخزن.
     * @param {string} indexName - اسم الفهرس.
     * @param {IDBKeyRange} range - نطاق المفاتيح (مثلاً IDBKeyRange.only('value')).
     * @returns {Promise<any[]>} وعد بقائمة الكائنات.
     */
    async filter(storeName, indexName, range) {
        return this.execute(storeName, 'readonly', (store) => {
            const index = store.index(indexName);
            return index.getAll(range);
        });
    }

    /**
     * يحذف كائنًا منطقيًا (Soft Delete) عن طريق إضافة خاصية 'deleted: true'.
     * @param {string} storeName - اسم المخزن.
     * @param {any} key - مفتاح الكائن.
     * @returns {Promise<any>} وعد بالكائن المحدث.
     */
    async softDelete(storeName, key) {
        const record = await this.get(storeName, key);
        if (!record) {
            throw new Error(`لم يتم العثور على سجل بالمفتاح ${key} في المخزن ${storeName}`);
        }
        record.deleted = true;
        record.deletedAt = new Date().toISOString();
        return this.put(storeName, record);
    }

    /**
     * يصدر جميع بيانات مخزن معين إلى سلسلة نصية JSON.
     * @param {string} storeName - اسم المخزن.
     * @returns {Promise<string>} وعد بسلسلة JSON.
     */
    async exportStoreToJson(storeName) {
        const data = await this.getAll(storeName);
        return JSON.stringify(data, null, 2);
    }

    /**
     * يصدر قاعدة البيانات بأكملها إلى كائن JSON للنسخ الاحتياطي.
     * @returns {Promise<object>} وعد بكائن النسخ الاحتياطي.
     */
    async backupDatabase() {
        const backup = {};
        for (const storeName of this.objectStores) {
            backup[storeName] = await this.getAll(storeName);
        }
        return backup;
    }

    /**
     * يستعيد قاعدة البيانات من كائن النسخ الاحتياطي.
     * @param {object} backupData - كائن النسخ الاحتياطي.
     * @returns {Promise<void>} وعد عند اكتمال الاستعادة.
     */
    async restoreDatabase(backupData) {
        await this.openDB();
        const transaction = this.getTransaction(this.objectStores, 'readwrite');
        const promises = [];

        for (const storeName of this.objectStores) {
            if (backupData[storeName] && Array.isArray(backupData[storeName])) {
                const store = transaction.objectStore(storeName);
                // مسح المخزن الحالي قبل الاستعادة
                promises.push(new Promise((resolve, reject) => {
                    const clearRequest = store.clear();
                    clearRequest.onsuccess = resolve;
                    clearRequest.onerror = reject;
                }));

                // إضافة البيانات المستعادة
                for (const record of backupData[storeName]) {
                    promises.push(new Promise((resolve, reject) => {
                        const putRequest = store.put(record);
                        putRequest.onsuccess = resolve;
                        putRequest.onerror = reject;
                    }));
                }
            }
        }

        await Promise.all(promises);
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => {
                console.log("تمت استعادة قاعدة البيانات بنجاح.");
                resolve();
            };
            transaction.onerror = (event) => {
                console.error("خطأ في استعادة قاعدة البيانات:", event.target.error);
                reject(event.target.error);
            };
        });
    }

    // ==================== دوال CRUD العامة ====================

    /**
     * يحصل على كائن واحد من المخزن باستخدام مفتاحه.
     * @param {string} storeName - اسم المخزن.
     * @param {any} key - مفتاح الكائن.
     * @returns {Promise<any>} وعد بالكائن.
     */
    get(storeName, key) {
        return this.execute(storeName, 'readonly', (store) => store.get(key));
    }

    /**
     * يحصل على جميع الكائنات من المخزن.
     * @param {string} storeName - اسم المخزن.
     * @returns {Promise<any[]>} وعد بقائمة الكائنات.
     */
    getAll(storeName) {
        return this.execute(storeName, 'readonly', (store) => store.getAll());
    }

    /**
     * يضيف أو يحدث كائنًا في المخزن.
     * @param {string} storeName - اسم المخزن.
     * @param {object} value - الكائن المراد إضافته/تحديثه.
     * @returns {Promise<any>} وعد بمفتاح الكائن الذي تم إضافته/تحديثه.
     */
    put(storeName, value) {
        return this.execute(storeName, 'readwrite', (store) => store.put(value));
    }

    /**
     * يحذف كائنًا من المخزن باستخدام مفتاحه.
     * @param {string} storeName - اسم المخزن.
     * @param {any} key - مفتاح الكائن.
     * @returns {Promise<void>} وعد عند اكتمال الحذف.
     */
    delete(storeName, key) {
        return this.execute(storeName, 'readwrite', (store) => store.delete(key));
    }

    /**
     * يحصل على عدد السجلات في المخزن.
     * @param {string} storeName - اسم المخزن.
     * @returns {Promise<number>} وعد بعدد السجلات.
     */
    count(storeName) {
        return this.execute(storeName, 'readonly', (store) => store.count());
    }

    /**
     * يمسح جميع البيانات من المخزن.
     * @param {string} storeName - اسم المخزن.
     * @returns {Promise<void>} وعد عند اكتمال المسح.
     */
    clear(storeName) {
        return this.execute(storeName, 'readwrite', (store) => store.clear());
    }

    // ==================== دوال خاصة بالإعدادات ====================

    /**
     * يحفظ إعدادًا معينًا (مثل COMPANY_INFO).
     * @param {string} key - مفتاح الإعداد (مثلاً 'COMPANY_INFO').
     * @param {object} value - قيمة الإعداد.
     * @returns {Promise<any>}
     */
    saveSetting(key, value) {
        return this.put('settings', { key, value });
    }

    /**
     * يحصل على قيمة إعداد معين.
     * @param {string} key - مفتاح الإعداد.
     * @returns {Promise<any>} وعد بقيمة الإعداد.
     */
    getSetting(key) {
        return this.get('settings', key).then(item => item ? item.value : null);
    }

    // ==================== دوال خاصة بشجرة الحسابات ====================

    /**
     * يحفظ حسابًا جديدًا أو يحدث حسابًا موجودًا.
     * @param {object} account - كائن الحساب (يجب أن يحتوي على accountCode).
     * @returns {Promise<any>}
     */
    saveAccount(account) {
        return this.put('accounts', account);
    }

    /**
     * يحصل على حساب معين باستخدام رقم الحساب.
     * @param {string} accountCode - رقم الحساب.
     * @returns {Promise<object>} وعد بكائن الحساب.
     */
    getAccount(accountCode) {
        return this.get('accounts', accountCode);
    }

    /**
     * يحصل على جميع الحسابات.
     * @returns {Promise<object[]>} وعد بقائمة الحسابات.
     */
    getAllAccounts() {
        return this.getAll('accounts');
    }

    /**
     * يحصل على حسابات فرعية بناءً على الحساب الرئيسي.
     * @param {string} parentCode - رقم الحساب الرئيسي.
     * @returns {Promise<object[]>} وعد بقائمة الحسابات الفرعية.
     */
    async getAccountsByParent(parentCode) {
        return this.filter('accounts', 'parent', IDBKeyRange.only(parentCode));
    }

    // ==================== دوال خاصة بالمعاملات ====================

    /**
     * يسجل معاملة محاسبية جديدة (قيد يومية).
     * @param {object} transaction - كائن المعاملة.
     * @returns {Promise<number>} وعد بمفتاح المعاملة (ID).
     */
    async addTransaction(transaction) {
        // تأكد من وجود التاريخ
        if (!transaction.date) {
            transaction.date = new Date().toISOString().split('T')[0];
        }
        
        // تأكد من وجود معرف فريد
        if (!transaction.reference) {
            transaction.reference = `TR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        return this.put('transactions', transaction);
    }

    /**
     * يحصل على جميع المعاملات في نطاق زمني معين.
     * @param {string} startDate - تاريخ البداية (YYYY-MM-DD).
     * @param {string} endDate - تاريخ النهاية (YYYY-MM-DD).
     * @returns {Promise<object[]>} وعد بقائمة المعاملات.
     */
    async getTransactionsByDateRange(startDate, endDate) {
        return this.execute('transactions', 'readonly', (store) => {
            const index = store.index('date');
            const range = IDBKeyRange.bound(startDate, endDate);
            return index.getAll(range);
        });
    }

    /**
     * يحصل على المعاملات حسب النوع.
     * @param {string} type - نوع المعاملة (sale, purchase, journal, etc.).
     * @returns {Promise<object[]>} وعد بقائمة المعاملات.
     */
    async getTransactionsByType(type) {
        return this.filter('transactions', 'type', IDBKeyRange.only(type));
    }

    // ==================== دوال خاصة بالأصناف والمنتجات ====================

    /**
     * يحفظ منتجًا جديدًا أو يحدث منتجًا موجودًا.
     * @param {object} item - كائن المنتج.
     * @returns {Promise<any>}
     */
    async saveItem(item) {
        // توليد كود تلقائي إذا لم يكن موجودًا
        if (!item.code) {
            item.code = `ITEM-${Date.now().toString().substr(-6)}`;
        }
        
        // تأكد من وجود التواريخ
        if (!item.createdAt) {
            item.createdAt = new Date().toISOString();
        }
        item.updatedAt = new Date().toISOString();
        
        return this.put('items', item);
    }

    /**
     * يحصل على منتج معين باستخدام المعرف.
     * @param {number} id - معرف المنتج.
     * @returns {Promise<object>} وعد بكائن المنتج.
     */
    getItem(id) {
        return this.get('items', id);
    }

    /**
     * يحصل على منتج باستخدام الكود.
     * @param {string} code - كود المنتج.
     * @returns {Promise<object>} وعد بكائن المنتج.
     */
    getItemByCode(code) {
        return this.execute('items', 'readonly', (store) => {
            const index = store.index('code');
            return index.get(code);
        });
    }

    /**
     * يحصل على جميع المنتجات.
     * @param {boolean} activeOnly - إرجاع المنتجات النشطة فقط.
     * @returns {Promise<object[]>} وعد بقائمة المنتجات.
     */
    async getAllItems(activeOnly = true) {
        const items = await this.getAll('items');
        if (activeOnly) {
            return items.filter(item => !item.deleted);
        }
        return items;
    }

    /**
     * يحصل على المنتجات حسب الفئة.
     * @param {number} categoryId - معرف الفئة.
     * @param {boolean} activeOnly - إرجاع المنتجات النشطة فقط.
     * @returns {Promise<object[]>} وعد بقائمة المنتجات.
     */
    async getItemsByCategory(categoryId, activeOnly = true) {
        return this.execute('items', 'readonly', async (store) => {
            const index = store.index('categoryId');
            const items = await index.getAll(categoryId);
            if (activeOnly) {
                return items.filter(item => !item.deleted);
            }
            return items;
        });
    }

    /**
     * يبحث عن المنتجات بالاسم أو الكود.
     * @param {string} searchTerm - مصطلح البحث.
     * @returns {Promise<object[]>} وعد بقائمة المنتجات.
     */
    async searchItems(searchTerm) {
        const items = await this.getAll('items');
        const term = searchTerm.toLowerCase();
        
        return items.filter(item => 
            !item.deleted && 
            (item.name?.toLowerCase().includes(term) || 
             item.code?.toLowerCase().includes(term) ||
             item.barcode?.toLowerCase().includes(term))
        );
    }

    /**
     * يحصل على المنتجات ذات المخزون المنخفض.
     * @param {number} threshold - الحد الأدنى للمخزون.
     * @returns {Promise<object[]>} وعد بقائمة المنتجات.
     */
    async getLowStockItems(threshold = 5) {
        const items = await this.getAll('items');
        return items.filter(item => 
            !item.deleted && 
            item.stock <= (item.minStock || threshold)
        );
    }

    // ==================== دوال خاصة بالفئات ====================

    /**
     * يحفظ فئة جديدة أو يحدث فئة موجودة.
     * @param {object} category - كائن الفئة.
     * @returns {Promise<any>}
     */
    async saveCategory(category) {
        // تأكد من وجود التواريخ
        if (!category.createdAt) {
            category.createdAt = new Date().toISOString();
        }
        category.updatedAt = new Date().toISOString();
        
        return this.put('categories', category);
    }

    /**
     * يحصل على فئة معينة.
     * @param {number} id - معرف الفئة.
     * @returns {Promise<object>} وعد بكائن الفئة.
     */
    getCategory(id) {
        return this.get('categories', id);
    }

    /**
     * يحصل على جميع الفئات.
     * @param {boolean} activeOnly - إرجاع الفئات النشطة فقط.
     * @returns {Promise<object[]>} وعد بقائمة الفئات.
     */
    async getAllCategories(activeOnly = true) {
        const categories = await this.getAll('categories');
        if (activeOnly) {
            return categories.filter(cat => !cat.deleted);
        }
        return categories;
    }

    /**
     * يحصل على الفئات الرئيسية (التي ليس لها أب).
     * @returns {Promise<object[]>} وعد بقائمة الفئات.
     */
    async getRootCategories() {
        const categories = await this.getAll('categories');
        return categories.filter(cat => !cat.deleted && !cat.parentId);
    }

    /**
     * يحصل على الفئات الفرعية لفئة معينة.
     * @param {number} parentId - معرف الفئة الرئيسية.
     * @returns {Promise<object[]>} وعد بقائمة الفئات.
     */
    async getSubCategories(parentId) {
        return this.filter('categories', 'parentId', IDBKeyRange.only(parentId));
    }

    // ==================== دوال خاصة بالعملاء ====================

    /**
     * يحفظ عميلًا جديدًا أو يحدث عميلًا موجودًا.
     * @param {object} customer - كائن العميل.
     * @returns {Promise<any>}
     */
    async saveCustomer(customer) {
        // توليد كود تلقائي إذا لم يكن موجودًا
        if (!customer.code) {
            customer.code = `CUST-${Date.now().toString().substr(-6)}`;
        }
        
        // تأكد من وجود التواريخ
        if (!customer.createdAt) {
            customer.createdAt = new Date().toISOString();
            customer.updatedAt = new Date().toISOString();
            
            // توليد كود عميل تلقائي
            if (!customer.code) {
                const count = await this.count('customers');
                customer.code = `CUST-${(count + 1).toString().padStart(4, '0')}`;
            }
        } else {
            customer.updatedAt = new Date().toISOString();
        }
        
        return this.put('customers', customer);
    }

    /**
     * يحصل على عميل معين.
     * @param {number} id - معرف العميل.
     * @returns {Promise<object>} وعد بكائن العميل.
     */
    getCustomer(id) {
        return this.get('customers', id);
    }

    /**
     * يحصل على جميع العملاء.
     * @param {boolean} activeOnly - إرجاع العملاء النشطين فقط.
     * @returns {Promise<object[]>} وعد بقائمة العملاء.
     */
    async getAllCustomers(activeOnly = true) {
        const customers = await this.getAll('customers');
        if (activeOnly) {
            return customers.filter(customer => !customer.deleted);
        }
        return customers;
    }

    /**
     * يبحث عن العملاء بالاسم أو الهاتف.
     * @param {string} searchTerm - مصطلح البحث.
     * @returns {Promise<object[]>} وعد بقائمة العملاء.
     */
    async searchCustomers(searchTerm) {
        const customers = await this.getAll('customers');
        const term = searchTerm.toLowerCase();
        
        return customers.filter(customer => 
            !customer.deleted && 
            (customer.name?.toLowerCase().includes(term) || 
             customer.phone?.toLowerCase().includes(term) ||
             customer.code?.toLowerCase().includes(term))
        );
    }

    // ==================== دوال خاصة بالموردين ====================

    /**
     * يحفظ موردًا جديدًا أو يحدث موردًا موجودًا.
     * @param {object} supplier - كائن المورد.
     * @returns {Promise<any>}
     */
    async saveSupplier(supplier) {
        // توليد كود تلقائي إذا لم يكن موجوداً
        if (!supplier.code) {
            supplier.code = `SUPP-${Date.now().toString().substr(-6)}`;
        }
    
        // تأكد من وجود التواريخ
        if (!supplier.createdAt) {
            supplier.createdAt = new Date().toISOString();
        }
        supplier.updatedAt = new Date().toISOString();
    
        return this.put('suppliers', supplier);
    }

    /**
     * يحصل على جميع الموردين.
     * @param {boolean} activeOnly - إرجاع الموردين النشطين فقط.
     * @returns {Promise<object[]>} وعد بقائمة الموردين.
     */
    async getAllSuppliers(activeOnly = true) {
        const suppliers = await this.getAll('suppliers');
        if (activeOnly) {
            return suppliers.filter(supplier => !supplier.deleted);
        }
        return suppliers;
    }

    // ==================== دوال خاصة بالفواتير ====================

    /**
     * يحفظ فاتورة جديدة أو يحدث فاتورة موجودة.
     * @param {object} invoice - كائن الفاتورة.
     * @returns {Promise<any>}
     */
    async saveInvoice(invoice) {
        // توليد رقم فاتورة تلقائي إذا لم يكن موجودًا
        if (!invoice.invoiceNumber) {
            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            invoice.invoiceNumber = `INV-${year}${month}${day}-${random}`;
        }
        
        // تأكد من وجود التواريخ
        if (!invoice.date) {
            invoice.date = new Date().toISOString().split('T')[0];
        }
        if (!invoice.createdAt) {
            invoice.createdAt = new Date().toISOString();
        }
        
        return this.put('invoices', invoice);
    }

    /**
     * يحصل على فاتورة معينة.
     * @param {number} id - معرف الفاتورة.
     * @returns {Promise<object>} وعد بكائن الفاتورة.
     */
    getInvoice(id) {
        return this.get('invoices', id);
    }

    /**
     * يحصل على فاتورة باستخدام رقم الفاتورة.
     * @param {string} invoiceNumber - رقم الفاتورة.
     * @returns {Promise<object>} وعد بكائن الفاتورة.
     */
    getInvoiceByNumber(invoiceNumber) {
        return this.execute('invoices', 'readonly', (store) => {
            const index = store.index('invoiceNumber');
            return index.get(invoiceNumber);
        });
    }

    /**
     * يحصل على جميع الفواتير.
     * @param {boolean} activeOnly - إرجاع الفواتير النشطة فقط.
     * @returns {Promise<object[]>} وعد بقائمة الفواتير.
     */
    async getAllInvoices(activeOnly = true) {
        const invoices = await this.getAll('invoices');
        if (activeOnly) {
            return invoices.filter(invoice => !invoice.deleted);
        }
        return invoices;
    }

    /**
     * يحصل على فواتير عميل معين.
     * @param {number} customerId - معرف العميل.
     * @returns {Promise<object[]>} وعد بقائمة الفواتير.
     */
    async getInvoicesByCustomer(customerId) {
        return this.filter('invoices', 'customerId', IDBKeyRange.only(customerId));
    }

    /**
     * يحصل على الفواتير في نطاق زمني معين.
     * @param {string} startDate - تاريخ البداية (YYYY-MM-DD).
     * @param {string} endDate - تاريخ النهاية (YYYY-MM-DD).
     * @returns {Promise<object[]>} وعد بقائمة الفواتير.
     */
    async getInvoicesByDateRange(startDate, endDate) {
        return this.execute('invoices', 'readonly', (store) => {
            const index = store.index('date');
            const range = IDBKeyRange.bound(startDate, endDate);
            return index.getAll(range);
        });
    }

    /**
     * يحصل على الفواتير حسب حالة الدفع.
     * @param {string} status - حالة الدفع (paid, pending, cancelled).
     * @returns {Promise<object[]>} وعد بقائمة الفواتير.
     */
    async getInvoicesByStatus(status) {
        return this.filter('invoices', 'status', IDBKeyRange.only(status));
    }

    // ==================== دوال خاصة بالمستخدمين ====================

    /**
     * يحفظ مستخدمًا جديدًا أو يحدث مستخدمًا موجودًا.
     * @param {object} user - كائن المستخدم.
     * @returns {Promise<any>}
     */
    async saveUser(user) {
        // تشفير كلمة المرور (يجب أن يتم على الخادم في التطبيقات الحقيقية)
        if (user.password && !user.password.startsWith('encrypted:')) {
            user.password = `encrypted:${btoa(user.password)}`;
        }
        
        // تأكد من وجود التواريخ
        if (!user.createdAt) {
            user.createdAt = new Date().toISOString();
        }
        user.updatedAt = new Date().toISOString();
        
        return this.put('users', user);
    }

    /**
     * التحقق من بيانات تسجيل الدخول.
     * @param {string} username - اسم المستخدم.
     * @param {string} password - كلمة المرور.
     * @returns {Promise<object>} وعد بكائن المستخدم إذا كانت البيانات صحيحة.
     */
    async authenticate(username, password) {
        const users = await this.getAll('users');
        const encryptedPassword = `encrypted:${btoa(password)}`;
        
        return users.find(user => 
            !user.deleted && 
            (user.username === username || user.email === username) && 
            user.password === encryptedPassword
        );
    }

    /**
     * يحصل على جميع المستخدمين.
     * @param {boolean} activeOnly - إرجاع المستخدمين النشطين فقط.
     * @returns {Promise<object[]>} وعد بقائمة المستخدمين.
     */
    async getAllUsers(activeOnly = true) {
        const users = await this.getAll('users');
        if (activeOnly) {
            return users.filter(user => !user.deleted);
        }
        return users;
    }

    // ==================== دوال إحصائية ====================

    /**
     * يحصل على إحصائيات النظام.
     * @returns {Promise<object>} وعد بكائن الإحصائيات.
     */
    async getStatistics() {
        const [
            totalItems,
            totalCategories,
            totalCustomers,
            totalInvoices,
            totalTransactions,
            totalUsers
        ] = await Promise.all([
            this.count('items'),
            this.count('categories'),
            this.count('customers'),
            this.count('invoices'),
            this.count('transactions'),
            this.count('users')
        ]);

        // حساب المبيعات اليومية
        const today = new Date().toISOString().split('T')[0];
        const todayInvoices = await this.getInvoicesByDateRange(today, today);
        const dailySales = todayInvoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);

        // حساب قيمة المخزون
        const items = await this.getAllItems(true);
        const inventoryValue = items.reduce((sum, item) => sum + ((item.stock || 0) * (item.cost || 0)), 0);

        return {
            totals: {
                items: totalItems,
                categories: totalCategories,
                customers: totalCustomers,
                invoices: totalInvoices,
                transactions: totalTransactions,
                users: totalUsers
            },
            financial: {
                dailySales,
                inventoryValue
            },
            lastUpdated: new Date().toISOString()
        };
    }
}

// تصدير الكلاس للاستخدام في ملفات أخرى
if (typeof window !== 'undefined') {
    window.MDatabase = MDatabase;
}

// تهيئة بيانات افتراضية عند التثبيت الأول
async function initializeDefaultData() {
    const db = new MDatabase();
    try {
        await db.openDB();
        
        // التحقق من وجود بيانات الإعدادات
        const companyInfo = await db.getSetting('COMPANY_INFO');
        if (!companyInfo) {
            // حفظ بيانات الشركة الافتراضية من M-core.js
            if (window.COMPANY_INFO) {
                await db.saveSetting('COMPANY_INFO', window.COMPANY_INFO);
                console.log('تم حفظ بيانات الشركة الافتراضية');
            }
        }
        
        // التحقق من وجود الفترة المحاسبية
        const accountingPeriod = await db.getSetting('ACCOUNTING_PERIOD');
        if (!accountingPeriod && window.ACCOUNTING_PERIOD) {
            await db.saveSetting('ACCOUNTING_PERIOD', window.ACCOUNTING_PERIOD);
            console.log('تم حفظ إعدادات الفترة المحاسبية');
        }
        
        // إضافة مستخدم افتراضي
        const users = await db.getAllUsers();
        if (users.length === 0) {
            await db.saveUser({
                username: 'admin',
                password: 'admin123',
                name: 'مدير النظام',
                email: 'admin@system.com',
                role: 'admin',
                active: true
            });
            console.log('تم إنشاء المستخدم الافتراضي');
        }
        
        console.log('تم تهيئة البيانات الافتراضية بنجاح');
    } catch (error) {
        console.error('خطأ في تهيئة البيانات الافتراضية:', error);
    }
}

// تشغيل تهيئة البيانات عند تحميل الصفحة
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        setTimeout(initializeDefaultData, 1000);
    });
}