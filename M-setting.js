/**
 * M-setting.js - نظام إعدادات Micro ERP
 */

class MSettings {
    constructor() {
        this.db = new MDatabase();
        this.currentSettings = {};
        this.currentSection = null;
    }

    /**
     * تهيئة نظام الإعدادات
     */
    async init() {
        try {
            await this.db.openDB();
            await this.loadSettings();
            this.setupEventListeners();
            this.setupModals();
            this.setupNavigation();
            this.updateDatabaseStatus();
            
            // عرض قسم معلومات الشركة افتراضيًا
            this.showSection('company-settings');
        } catch (error) {
            console.error('خطأ في تهيئة نظام الإعدادات:', error);
            this.showNotification('خطأ في تحميل النظام', 'danger');
        }
    }

    /**
     * تحميل الإعدادات من قاعدة البيانات
     */
    async loadSettings() {
        try {
            const companyInfo = await this.db.getSetting('COMPANY_INFO') || COMPANY_INFO;
            const accountingPeriod = await this.db.getSetting('ACCOUNTING_PERIOD') || ACCOUNTING_PERIOD;
            
            this.currentSettings = {
                COMPANY_INFO: companyInfo,
                ACCOUNTING_PERIOD: accountingPeriod
            };
            
            this.populateCompanySettings();
            this.populateAccountingSettings();
            await this.loadUsers();
        } catch (error) {
            console.error('خطأ في تحميل الإعدادات:', error);
        }
    }

    /**
     * تعبئة إعدادات الشركة
     */
    populateCompanySettings() {
        const info = this.currentSettings.COMPANY_INFO;
        
        // المعلومات الأساسية
        document.getElementById('companyName').value = info.BASIC?.name || '';
        document.getElementById('tradeName').value = info.BASIC?.tradeName || '';
        document.getElementById('registrationNumber').value = info.BASIC?.registrationNumber || '';
        document.getElementById('taxId').value = info.BASIC?.taxId || '';
        document.getElementById('legalType').value = info.BASIC?.legalType || 'فردي';
        document.getElementById('establishmentDate').value = info.BASIC?.establishmentDate || '';
        
        // معلومات الاتصال
        document.getElementById('street').value = info.CONTACT?.address?.street || '';
        document.getElementById('city').value = info.CONTACT?.address?.city || '';
        document.getElementById('state').value = info.CONTACT?.address?.state || '';
        document.getElementById('country').value = info.CONTACT?.address?.country || 'اليمن';
        document.getElementById('primaryPhone').value = info.CONTACT?.phone?.primary || '';
        document.getElementById('mobilePhone').value = info.CONTACT?.phone?.mobile || '';
        document.getElementById('primaryEmail').value = info.CONTACT?.email?.primary || '';
        document.getElementById('website').value = info.CONTACT?.website || '';
        
        // المعلومات المالية
        document.getElementById('baseCurrency').value = info.FINANCIAL?.currency || 'YER';
        document.getElementById('defaultTaxRate').value = info.FINANCIAL?.defaultTaxRate || 0;
        document.getElementById('vatNumber').value = info.FINANCIAL?.vatNumber || '';
        document.getElementById('taxOffice').value = info.FINANCIAL?.taxOffice || '';
        
        // معلومات المالك
        document.getElementById('ownerName').value = info.OWNER?.name || '';
        document.getElementById('ownerPhone').value = info.OWNER?.phone || '';
        document.getElementById('ownerId').value = info.OWNER?.idNumber || '';
    }

    /**
     * تعبئة الإعدادات المحاسبية
     */
    populateAccountingSettings() {
        const period = this.currentSettings.ACCOUNTING_PERIOD;
        const currentPeriod = period.CURRENT_PERIOD || ACCOUNTING_PERIOD.CURRENT_PERIOD;
        const settings = period.SETTINGS || ACCOUNTING_PERIOD.SETTINGS;
        const importantDates = period.IMPORTANT_DATES || ACCOUNTING_PERIOD.IMPORTANT_DATES;
        
        // الفترة الحالية
        document.getElementById('periodStartDate').value = currentPeriod.startDate || '';
        document.getElementById('periodEndDate').value = currentPeriod.endDate || '';
        document.getElementById('periodName').value = currentPeriod.periodName || '';
        document.getElementById('periodType').value = currentPeriod.periodType || 'yearly';
        document.getElementById('periodStatus').value = currentPeriod.isLocked ? 'locked' : 
                                                       currentPeriod.closingDate ? 'closed' : 'open';
        
        // إعدادات الفترة
        document.getElementById('autoClosePeriod').checked = settings.autoClosePeriod || false;
        document.getElementById('allowPastTransactions').checked = settings.allowPastTransactions || false;
        document.getElementById('allowFutureTransactions').checked = settings.allowFutureTransactions || false;
        document.getElementById('defaultReportPeriod').value = settings.defaultPeriod || 'monthly';
        document.getElementById('taxPeriod').value = settings.taxPeriod || 'quarterly';
        document.getElementById('vatSubmissionDay').value = importantDates.vatSubmission || '15';
        document.getElementById('fiscalYearStart').value = settings.fiscalYearStart || '01-01';
        document.getElementById('fiscalYearEnd').value = settings.fiscalYearEnd || '12-31';
    }

    /**
     * تحميل قائمة المستخدمين
     */
    async loadUsers() {
        try {
            const users = await this.db.getAllUsers(true);
            const tbody = document.getElementById('usersTableBody');
            tbody.innerHTML = '';
            
            if (users.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-muted">لا يوجد مستخدمين</td>
                    </tr>
                `;
                return;
            }
            
            users.forEach((user, index) => {
                const roleNames = {
                    'admin': 'مدير النظام',
                    'accountant': 'محاسب',
                    'sales': 'بائع',
                    'viewer': 'مشاهد'
                };
                
                const statusBadge = user.active ? 
                    '<span class="badge bg-success">نشط</span>' : 
                    '<span class="badge bg-secondary">غير نشط</span>';
                
                const lastLogin = user.lastLogin ? 
                    new Date(user.lastLogin).toLocaleDateString('ar-SA') : 
                    'لم يسجل دخول';
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="user-avatar me-2">${user.name.charAt(0)}</div>
                            <div>
                                <div>${user.name}</div>
                                <small class="text-muted">${user.username}</small>
                            </div>
                        </div>
                    </td>
                    <td>${user.email || '-'}</td>
                    <td><span class="badge bg-info">${roleNames[user.role] || user.role}</span></td>
                    <td>${statusBadge}</td>
                    <td>${lastLogin}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="settingsSystem.editUser(${user.id})">
                                <i class="bi bi-pencil"></i>
                            </button>
                            ${user.role !== 'admin' ? `
                                <button class="btn btn-outline-danger" onclick="settingsSystem.deleteUser(${user.id})">
                                    <i class="bi bi-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } catch (error) {
            console.error('خطأ في تحميل المستخدمين:', error);
        }
    }

    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        // تبديل الثيم
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // حفظ إعدادات الشركة
        document.getElementById('saveCompanySettingsBtn').addEventListener('click', () => this.saveCompanySettings());
        
        // حفظ الإعدادات المحاسبية
        document.getElementById('saveAccountingSettingsBtn').addEventListener('click', () => this.saveAccountingSettings());
        
        // إدارة المستخدمين
        document.getElementById('addUserBtn').addEventListener('click', () => this.addUser());
        document.getElementById('saveUserBtn').addEventListener('click', () => this.saveUser());
        
        // النسخ الاحتياطي
        document.getElementById('backupBtn').addEventListener('click', () => this.createBackup());
        document.getElementById('restoreBtn').addEventListener('click', () => this.restoreBackup());
        document.getElementById('restoreFileInput').addEventListener('change', (e) => this.handleRestoreFile(e));
        
        // مسح البيانات
        document.getElementById('confirmDeleteText').addEventListener('input', (e) => {
            document.getElementById('confirmClearBtn').disabled = e.target.value !== 'حذف الكل';
        });
        document.getElementById('confirmClearBtn').addEventListener('click', () => this.clearAllData());
    }

    /**
     * إعداد النوافذ المنبثقة
     */
    setupModals() {
        this.userModal = new bootstrap.Modal(document.getElementById('userModal'));
        this.confirmClearModal = new bootstrap.Modal(document.getElementById('confirmClearModal'));
    }

    /**
     * إعداد التنقل بين الأقسام
     */
    setupNavigation() {
        document.querySelectorAll('.setting-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const target = card.getAttribute('data-target');
                this.showSection(target);
            });
        });
    }

    /**
     * تبديل الثيم
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
     * عرض قسم معين
     */
    showSection(sectionId) {
        // إخفاء جميع الأقسام
        document.querySelectorAll('.settings-section').forEach(section => {
            section.style.display = 'none';
        });
        
        // إزالة النشاط من جميع البطاقات
        document.querySelectorAll('.setting-card').forEach(card => {
            card.classList.remove('active');
        });
        
        // عرض القسم المطلوب
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'block';
        }
        
        // تفعيل البطاقة المناسبة
        const activeCard = document.querySelector(`.setting-card[data-target="${sectionId}"]`);
        if (activeCard) {
            activeCard.classList.add('active');
        }
        
        this.currentSection = sectionId;
    }

    /**
     * حفظ إعدادات الشركة
     */
    async saveCompanySettings() {
        const form = document.getElementById('companySettingsForm');
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        const companyInfo = {
            BASIC: {
                name: document.getElementById('companyName').value,
                tradeName: document.getElementById('tradeName').value,
                legalType: document.getElementById('legalType').value,
                registrationNumber: document.getElementById('registrationNumber').value,
                taxId: document.getElementById('taxId').value,
                establishmentDate: document.getElementById('establishmentDate').value
            },
            CONTACT: {
                address: {
                    street: document.getElementById('street').value,
                    city: document.getElementById('city').value,
                    state: document.getElementById('state').value,
                    country: document.getElementById('country').value
                },
                phone: {
                    primary: document.getElementById('primaryPhone').value,
                    mobile: document.getElementById('mobilePhone').value
                },
                email: {
                    primary: document.getElementById('primaryEmail').value
                },
                website: document.getElementById('website').value
            },
            FINANCIAL: {
                currency: document.getElementById('baseCurrency').value,
                defaultTaxRate: parseFloat(document.getElementById('defaultTaxRate').value) || 0,
                vatNumber: document.getElementById('vatNumber').value,
                taxOffice: document.getElementById('taxOffice').value
            },
            OWNER: {
                name: document.getElementById('ownerName').value,
                phone: document.getElementById('ownerPhone').value,
                idNumber: document.getElementById('ownerId').value
            }
        };
        
        try {
            await this.db.saveSetting('COMPANY_INFO', companyInfo);
            this.currentSettings.COMPANY_INFO = companyInfo;
            
            // تحديث المتغيرات العامة
            if (typeof window !== 'undefined' && window.COMPANY_INFO) {
                Object.assign(window.COMPANY_INFO, companyInfo);
            }
            
            this.showNotification('تم حفظ إعدادات الشركة بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في حفظ إعدادات الشركة:', error);
            this.showNotification('فشل في حفظ الإعدادات', 'danger');
        }
    }

    /**
     * حفظ الإعدادات المحاسبية
     */
    async saveAccountingSettings() {
        const form = document.getElementById('accountingSettingsForm');
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        const accountingPeriod = {
            CURRENT_PERIOD: {
                startDate: document.getElementById('periodStartDate').value,
                endDate: document.getElementById('periodEndDate').value,
                periodName: document.getElementById('periodName').value,
                periodType: document.getElementById('periodType').value,
                isLocked: document.getElementById('periodStatus').value === 'locked' || 
                          document.getElementById('periodStatus').value === 'closed',
                closingDate: document.getElementById('periodStatus').value === 'closed' ? 
                            new Date().toISOString().split('T')[0] : null
            },
            SETTINGS: {
                autoClosePeriod: document.getElementById('autoClosePeriod').checked,
                allowPastTransactions: document.getElementById('allowPastTransactions').checked,
                allowFutureTransactions: document.getElementById('allowFutureTransactions').checked,
                defaultPeriod: document.getElementById('defaultReportPeriod').value,
                fiscalYearStart: document.getElementById('fiscalYearStart').value,
                fiscalYearEnd: document.getElementById('fiscalYearEnd').value,
                taxPeriod: document.getElementById('taxPeriod').value,
                inventoryCountFrequency: 'monthly'
            },
            IMPORTANT_DATES: {
                vatSubmission: document.getElementById('vatSubmissionDay').value
            }
        };
        
        try {
            await this.db.saveSetting('ACCOUNTING_PERIOD', accountingPeriod);
            this.currentSettings.ACCOUNTING_PERIOD = accountingPeriod;
            
            // تحديث المتغيرات العامة
            if (typeof window !== 'undefined' && window.ACCOUNTING_PERIOD) {
                Object.assign(window.ACCOUNTING_PERIOD, accountingPeriod);
            }
            
            this.showNotification('تم حفظ الإعدادات المحاسبية بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في حفظ الإعدادات المحاسبية:', error);
            this.showNotification('فشل في حفظ الإعدادات', 'danger');
        }
    }

    /**
     * إضافة مستخدم جديد
     */
    addUser() {
        document.getElementById('userModalTitle').textContent = 'إضافة مستخدم جديد';
        document.getElementById('userForm').reset();
        document.getElementById('userId').value = '';
        document.getElementById('userActive').checked = true;
        this.userModal.show();
    }

    /**
     * تعديل مستخدم
     */
    async editUser(userId) {
        try {
            const user = await this.db.get('users', userId);
            if (!user) return;
            
            document.getElementById('userModalTitle').textContent = 'تعديل مستخدم';
            document.getElementById('userId').value = user.id;
            document.getElementById('userUsername').value = user.username;
            document.getElementById('userName').value = user.name;
            document.getElementById('userEmail').value = user.email || '';
            document.getElementById('userRole').value = user.role || 'sales';
            document.getElementById('userActive').checked = user.active !== false;
            
            // إزالة الـ required من حقول كلمة المرور للتعديل
            document.getElementById('userPassword').removeAttribute('required');
            document.getElementById('userConfirmPassword').removeAttribute('required');
            
            this.userModal.show();
        } catch (error) {
            console.error('خطأ في تحميل بيانات المستخدم:', error);
            this.showNotification('فشل في تحميل بيانات المستخدم', 'danger');
        }
    }

    /**
     * حفظ المستخدم
     */
    async saveUser() {
        const form = document.getElementById('userForm');
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        const userId = document.getElementById('userId').value;
        const password = document.getElementById('userPassword').value;
        const confirmPassword = document.getElementById('userConfirmPassword').value;
        
        // التحقق من كلمة المرور للمستخدمين الجدد
        if (!userId && password !== confirmPassword) {
            this.showNotification('كلمات المرور غير متطابقة', 'warning');
            return;
        }
        
        const userData = {
            username: document.getElementById('userUsername').value,
            name: document.getElementById('userName').value,
            email: document.getElementById('userEmail').value,
            role: document.getElementById('userRole').value,
            active: document.getElementById('userActive').checked,
            updatedAt: new Date().toISOString()
        };
        
        // تحديث كلمة المرور فقط إذا تم إدخالها
        if (password) {
            userData.password = password;
        }
        
        // إذا كان مستخدم جديد
        if (!userId) {
            userData.createdAt = new Date().toISOString();
        } else {
            userData.id = parseInt(userId);
        }
        
        try {
            await this.db.saveUser(userData);
            await this.loadUsers();
            this.userModal.hide();
            this.showNotification('تم حفظ المستخدم بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في حفظ المستخدم:', error);
            this.showNotification('فشل في حفظ المستخدم', 'danger');
        }
    }

    /**
     * حذف مستخدم
     */
    async deleteUser(userId) {
        if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
            return;
        }
        
        try {
            await this.db.softDelete('users', userId);
            await this.loadUsers();
            this.showNotification('تم حذف المستخدم بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في حذف المستخدم:', error);
            this.showNotification('فشل في حذف المستخدم', 'danger');
        }
    }

    /**
     * إنشاء نسخة احتياطية
     */
    async createBackup() {
        try {
            const backup = await this.db.backupDatabase();
            const backupStr = JSON.stringify(backup, null, 2);
            const blob = new Blob([backupStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // إنشاء رابط للتحميل
            const a = document.createElement('a');
            a.href = url;
            a.download = `MERP-Backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            // تحديث تاريخ آخر نسخة
            document.getElementById('lastBackupDate').textContent = new Date().toLocaleDateString('ar-SA');
            this.showNotification('تم إنشاء النسخة الاحتياطية بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في إنشاء النسخة الاحتياطية:', error);
            this.showNotification('فشل في إنشاء النسخة الاحتياطية', 'danger');
        }
    }

    /**
     * التعامل مع ملف الاستعادة
     */
    handleRestoreFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.name.endsWith('.json')) {
            this.showNotification('يرجى اختيار ملف JSON صالح', 'warning');
            return;
        }
        
        if (confirm('هل أنت متأكد من استعادة البيانات من هذا الملف؟ سيتم استبدال جميع البيانات الحالية.')) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const backupData = JSON.parse(e.target.result);
                    await this.restoreFromData(backupData);
                } catch (error) {
                    console.error('خطأ في قراءة ملف النسخة الاحتياطية:', error);
                    this.showNotification('ملف النسخة الاحتياطية غير صالح', 'danger');
                }
            };
            reader.readAsText(file);
        }
        
        // إعادة تعيين حقل الملف
        event.target.value = '';
    }

    /**
     * استعادة من ملف
     */
    restoreBackup() {
        document.getElementById('restoreFileInput').click();
    }

    /**
     * استعادة البيانات من كائن النسخة الاحتياطية
     */
    async restoreFromData(backupData) {
        try {
            await this.db.restoreDatabase(backupData);
            this.showNotification('تم استعادة البيانات بنجاح', 'success');
            
            // إعادة تحميل الصفحة بعد ثانيتين
            setTimeout(() => {
                location.reload();
            }, 2000);
        } catch (error) {
            console.error('خطأ في استعادة البيانات:', error);
            this.showNotification('فشل في استعادة البيانات', 'danger');
        }
    }

    /**
     * مسح جميع البيانات
     */
    async clearAllData() {
        try {
            // تأكيد النص
            const confirmText = document.getElementById('confirmDeleteText').value;
            if (confirmText !== 'حذف الكل') {
                this.showNotification('يرجى كتابة النص المطلوب للتأكيد', 'warning');
                return;
            }
            
            // مسح جميع المخازن باستثناء المستخدمين
            const stores = ['customers', 'suppliers', 'items', 'categories', 'invoices', 
                           'transactions', 'tax_settlements', 'returns'];
            
            for (const storeName of stores) {
                await this.db.clear(storeName);
            }
            
            // إعادة تعيين الحسابات المحاسبية
            const accounts = await this.db.getAllAccounts();
            for (const account of accounts) {
                account.balance = account.openingBalance || 0;
                await this.db.saveAccount(account);
            }
            
            this.confirmClearModal.hide();
            document.getElementById('confirmDeleteText').value = '';
            document.getElementById('confirmClearBtn').disabled = true;
            
            this.showNotification('تم مسح جميع البيانات بنجاح', 'success');
            
            // إعادة تحميل الصفحة بعد ثانيتين
            setTimeout(() => {
                location.reload();
            }, 2000);
            
        } catch (error) {
            console.error('خطأ في مسح البيانات:', error);
            this.showNotification('فشل في مسح البيانات', 'danger');
        }
    }

    /**
     * تحديث حالة قاعدة البيانات
     */
    async updateDatabaseStatus() {
        try {
            const status = await this.db.getAll('settings');
            const statusElement = document.getElementById('dbStatus');
            
            if (status && status.length > 0) {
                statusElement.className = 'badge bg-success';
                statusElement.textContent = 'قاعدة البيانات: نشطة';
            } else {
                statusElement.className = 'badge bg-warning';
                statusElement.textContent = 'قاعدة البيانات: تحت التهيئة';
            }
        } catch (error) {
            const statusElement = document.getElementById('dbStatus');
            statusElement.className = 'badge bg-danger';
            statusElement.textContent = 'قاعدة البيانات: خطأ';
        }
    }

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
}

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.settingsSystem = new MSettings();
    window.settingsSystem.init();
});