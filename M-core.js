// core.js - نظام ERP المتكامل مع المحاسبة والضرائب
// الإصدار 2.0 - تم إضافة الفترة المحاسبية ومعلومات الشركة
// تم التحديث بتاريخ: 2024-12-29 - تم تصحيح جميع الأخطاء النحوية والتركيبية

// ==================== 1. الثوابت والإعدادات العامة ====================

// أنظمة العملات والأسعار
var CURRENCY_CONFIG = {
    BASE: 'YER',                          // العملة الأساسية للتسجيل المحاسبي
    DEFAULT_EXCHANGE_RATES: {             // أسعار الصرف الأساسية
        'YER': 1.0000,                    // الريال اليمني
        'SAR': 0.00235,                   // الريال السعودي (1 SAR = 0.00235 YER)
        'USD': 0.000627,                  // الدولار الأمريكي (1 USD = 0.000627 YER)
    },
    SYMBOLS: {
        'YER': 'ر.ي',
        'SAR': 'ر.س',
        'USD': '$',
    },
    PRECISION: {
        'YER': 2,
        'SAR': 2,
        'USD': 2,
    }
};

// أنظمة الوحدات والتحويلات
var UNIT_SYSTEM = {
    CONVERSIONS: {
        // جملة
        'كرتون': 24,      // 1 كرتون = 24 حبة
        'درزن': 12,       // 1 درزن = 12 حبة
        'سلة': 20,        // 1 سلة = 20 حبة
        'صندوق': 48,      // 1 صندوق = 48 حبة
        // تجزئة
        'حبة': 1,
        'كيلو': 1,
    }
};

// إعدادات الفترة المحاسبية
var ACCOUNTING_PERIOD = {
    // الفترة الحالية
    CURRENT_PERIOD: {
        startDate: '2025-01-01',           // تاريخ بداية الفترة (YYYY-MM-DD)
        endDate: '2025-12-31',             // تاريخ نهاية الفترة (YYYY-MM-DD)
        periodType: 'yearly',              // نوع الفترة: yearly, quarterly, monthly
        periodName: 'الفترة السنوية 2025',  // اسم الفترة المعروض
        isLocked: false,                   // هل الفترة مقفلة (لا يمكن التعديل)
        closingDate: null,                 // تاريخ الإقفال (إذا تم إقفال الفترة)
        closedBy: null                     // المستخدم الذي ألغفل الفترة
    },
    
    // إعدادات الفترات
    SETTINGS: {
        autoClosePeriod: false,            // الإقفال التلقائي للفترة
        allowPastTransactions: true,       // السماح بإدخال قيود في فترات سابقة
        allowFutureTransactions: false,    // السماح بإدخال قيود في فترات مستقبلية
        defaultPeriod: 'monthly',          // الفترة الافتراضية للتقارير
        fiscalYearStart: '01-01',          // بداية السنة المالية (MM-DD)
        fiscalYearEnd: '12-31',            // نهاية السنة المالية (MM-DD)
        taxPeriod: 'quarterly',            // فترة التسوية الضريبية
        inventoryCountFrequency: 'monthly' // تكرار جرد المخزون
    },
    
    // حالات الفترة
    STATUS: {
        OPEN: 'open',                      // مفتوحة
        CLOSED: 'closed',                  // مقفلة
        LOCKED: 'locked'                   // مقفلة نهائياً
    },
    
    // تواريخ مهمة
    IMPORTANT_DATES: {
        vatSubmission: '15',               // يوم تقديم الضريبة (من كل شهر)
        financialStatement: '31-12',       // تاريخ إعداد القوائم المالية
        auditPeriod: '01-01 to 03-31'      // فترة المراجعة
    }
};

// معلومات الشركة/المالك/المحل
var COMPANY_INFO = {
    // المعلومات الأساسية
    BASIC: {
        name: 'اسم الشركة أو المحل',        // الاسم الرسمي
        tradeName: 'الاسم التجاري',         // الاسم التجاري (إن وجد)
        legalType: 'فردي',                  // نوع الكيان: فردي، شركة، مؤسسة
        registrationNumber: '123456',       // السجل التجاري
        taxIdNumber: '123456789'            // الرقم الضريبي
    },
    
    // معلومات الاتصال
    CONTACT: {
        address: {
            street: 'الشارع الرئيسي',       // اسم الشارع
            city: 'المدينة',                // المدينة
            state: 'المحافظة',              // المحافظة
            postalCode: '12345',            // الرمز البريدي
            country: 'اليمن',               // الدولة
            additionalInfo: 'بجوار المسجد'   // معلومات إضافية
        },
        phone: {
            primary: '+967 1 234 567',      // الهاتف الرئيسي
            mobile: '+967 711 234 567',     // الجوال
            whatsapp: '+967 711 234 568'    // واتساب
        },
        email: {
            primary: 'info@company.com',    // البريد الإلكتروني الرئيسي
            billing: 'billing@company.com'  // بريد الفواتير
        },
        website: 'www.company.com'          // الموقع الإلكتروني
    },
    
    // المعلومات المالية
    FINANCIAL: {
        currency: CURRENCY_CONFIG.BASE,     // العملة الأساسية
        defaultTaxRate: 0,                  // نسبة الضريبة الافتراضية
        vatNumber: 'YE123456789',           // رقم ضريبة القيمة المضافة
        taxOffice: 'مصلحة الضرائب - فرع المدينة', // مكتب الضرائب
        financialYear: '2025',              // السنة المالية
        bankAccounts: [                     // الحسابات البنكية
            {
                bankName: 'اسم البنك',
                accountNumber: '1234567890',
                accountName: 'اسم صاحب الحساب',
                iban: 'YE00 0000 0000 0000 0000 0000',
                currency: 'YER',
                isDefault: true,
                swiftCode: 'BANKYEAD'
            }
        ],
        paymentMethods: ['نقدي', 'شيك', 'آجل', 'تحويل بنكي']
    },
    
    // إعدادات الطباعة والتقارير
    REPORTING: {
        logo: {
            url: '/assets/logo.png',        // رابط الشعار
            width: 150,                     // عرض الشعار بالبكسل
            height: 80,                     // ارتفاع الشعار بالبكسل
            showInReports: true             // عرض الشعار في التقارير
        },
        header: {
            showLogo: true,                 // عرض الشعار في التقرير
            showName: true,                 // عرض الاسم
            showTradeName: true,            // عرض الاسم التجاري
            showAddress: true,              // عرض العنوان
            showTaxInfo: true,              // عرض المعلومات الضريبية
            showContact: true,              // عرض معلومات الاتصال
            showPeriod: true                // عرض الفترة المحاسبية
        },
        footer: {
            text: 'شكراً لتعاملكم معنا',    // نص التذييل
            showPageNumbers: true,          // عرض أرقام الصفحات
            showPrintDate: true,            // عرض تاريخ الطباعة
            showPrintTime: true,            // عرض وقت الطباعة
            showConfidential: true,         // عرض علامة سرية المعلومات
            showCompanyInfo: true           // عرض معلومات الشركة المصغرة
        },
        watermark: {
            enabled: false,                 // علامة مائية
            text: 'مسودة',                  // نص العلامة المائية
            opacity: 0.1,                   // شفافية العلامة المائية
            angle: 45                       // زاوية العلامة المائية
        },
        invoiceFooter: {
            termsAndConditions: `
                1. جميع الأسعار تشمل الضريبة إن وجدت
                2. المرتجعات خلال 7 أيام من تاريخ الشراء
                3. الضمان حسب سياسة الشركة
                4. يرجى حفظ الفاتورة للإرجاع أو الصيانة
            `,
            thankYouMessage: 'نشكركم على ثقتكم ونرجو زيارتنا مرة أخرى',
            contactInfo: 'للشكاوى والاستفسارات: 1234567'
        }
    },
    
    // معلومات المالك/المدير
    OWNER: {
        name: 'اسم المالك',                 // اسم المالك
        phone: 'هاتف المالك',               // رقم الهاتف
        idNumber: '123456789',              // رقم الهوية
        email: 'owner@company.com',         // البريد الإلكتروني
        address: 'عنوان المالك'             // عنوان المالك
    }
};

// ==================== 2. إعدادات الأنظمة ====================

// نظام المبيعات (Sales)
var SALES_CONFIG = {
    // إعدادات العملة
    CURRENCY: {
        baseCurrency: CURRENCY_CONFIG.BASE,
        baseExchangeRates: CURRENCY_CONFIG.DEFAULT_EXCHANGE_RATES,
        defaultCurrency: 'YER'
    },
    
    // إعدادات الحسابات المحاسبية
    ACCOUNTS: {
        CASH: '1010',               // الصندوق / النقدية
        CUSTOMER: '1040',           // العملاء (الذمم المدينة)
        REVENUE: '4010',            // إيرادات المبيعات (تم تعديل الكود ليتوافق مع COA)
        COGS: '5010',               // تكلفة البضاعة المباعة (تم تعديل الكود ليتوافق مع COA)
        INVENTORY: '1030',          // المخزون
        DISCOUNT: '4030',           // خصومات المبيعات (تم تعديل الكود ليتوافق مع COA)
        RETURNS: '4040',            // مردودات المبيعات (تم تعديل الكود ليتوافق مع COA)
        SHIPPING: '5080',           // مصاريف الشحن (تم تعديل الكود ليتوافق مع COA)
        VAT_OUTPUT: '2041'          // ضريبة المخرجات
    },
    
    // إعدادات الضريبة
    TAX: {
        defaultRate: COMPANY_INFO.FINANCIAL.defaultTaxRate, // نسبة الضريبة الافتراضية
        accountCode: '2041',        // ضريبة المبيعات المستحقة
        isInclusive: false,         // الضريبة غير مشمولة في السعر
        calculationMethod: 'percentage', // طريقة الحساب
        rounding: 'nearest'         // طريقة التقريب
    },
    
    // إعدادات الفواتير
    INVOICE: {
        prefix: 'INV-',             // بادئة رقم الفاتورة
        startingNumber: 1000,       // رقم البداية
        defaultTerms: 'نقدي',       // شروط الدفع الافتراضية
        validityDays: 30,           // صلاحية الفاتورة بالأيام
        printTemplate: 'default',   // قالب الطباعة
        showCompanyInfo: true,      // عرض معلومات الشركة
        showCustomerInfo: true,     // عرض معلومات العميل
        showTaxDetails: true,       // عرض تفاصيل الضريبة
        showDiscount: true          // عرض الخصم
    },
    
    // إعدادات العمليات
    OPERATIONS: {
        autoUpdateStock: true,      // تحديث المخزون تلقائياً
        allowNegativeStock: false,  // السماح بالمخزون السالب
        requireCustomer: false,     // إلزامية اختيار عميل
        printAfterSave: true,       // الطباعة بعد الحفظ
        allowDiscount: true,        // السماح بالخصم
        maxDiscountPercentage: 20,  // أقصى نسبة خصم مسموح بها
        requireManagerApproval: false // تتطلب موافقة المدير للخصم الكبير
    },
    
    // إعدادات التقارير
    REPORTS: {
        dailySales: true,
        monthlySales: true,
        customerStatements: true,
        salesByItem: true,
        salesByCategory: true
    }
};

// نظام المشتريات (Purchases)
var PURCHASE_CONFIG = {
    // إعدادات العملة
    CURRENCY: {
        baseCurrency: CURRENCY_CONFIG.BASE,
        purchaseCurrency: 'SAR',    // العملة الافتراضية للشراء
        baseExchangeRates: CURRENCY_CONFIG.DEFAULT_EXCHANGE_RATES
    },
    
    // إعدادات الحسابات المحاسبية
    ACCOUNTS: {
        CASH: '1010',               // الصندوق / النقدية
        SUPPLIER: '2010',           // الموردين (الذمم الدائنة)
        INVENTORY: '1030',          // المخزون
        DEDUCTIBLE_TAX: '1070',     // ضريبة المدخلات القابلة للخصم
        PURCHASE_EXPENSE: '5010',   // مصاريف المشتريات (تم تعديل الكود ليتوافق مع COGS)
        FREIGHT_IN: '5080',         // مصاريف النقل للمشتريات (تم تعديل الكود ليتوافق مع COA)
        VAT_INPUT: '1070'           // ضريبة المدخلات
    },
    
    // إعدادات الضريبة
    TAX: {
        defaultRate: COMPANY_INFO.FINANCIAL.defaultTaxRate, // نسبة الضريبة الافتراضية للشراء
        isDeductible: true,         // ضريبة مدخلات قابلة للخصم
        accountCode: '1070',        // ضريبة المدخلات
        calculationMethod: 'percentage',
        rounding: 'nearest'
    },
    
    // إعدادات التسعير
    PRICING: {
        defaultMarginPercentage: 30,    // هامش الربح الثابت
        autoUpdateSalePrice: true,      // تحديث سعر البيع تلقائياً
        roundPrices: true,              // تقريب الأسعار
        roundTo: 0.25,                  // التقريب لأقرب 0.25
        pricingMethod: 'costPlus',      // طريقة التسعير: costPlus, marketPrice
        includeTaxInCost: false         // تضمين الضريبة في التكلفة
    },
    
    // إعدادات الفواتير
    INVOICE: {
        prefix: 'PUR-',             // بادئة فاتورة الشراء
        startingNumber: 1000,       // رقم البداية
        defaultPaymentTerms: 'نقدي', // شروط الدفع الافتراضية
        requireSupplier: true,      // إلزامية اختيار مورد
        printTemplate: 'purchase',  // قالب طباعة فواتير الشراء
        showTaxBreakdown: true,     // عرض تفاصيل الضريبة
        showDeliveryInfo: true      // عرض معلومات التسليم
    },
    
    // إعدادات الجودة
    QUALITY: {
        checkExpiryDates: true,     // التحقق من صلاحية المنتجات
        minQualityScore: 80,        // الحد الأدنى لجودة المنتج
        requireInspection: false    // تتطلب فحص المنتجات
    }
};

// نظام الضريبة المتكامل
var TAX_CONFIG = {
    // إعدادات الحسابات المحاسبية للضريبة
    ACCOUNTS: {
        VAT_OUTPUT: '2041',         // ضريبة المخرجات المستحقة الدفع
        VAT_INPUT: '1070',          // ضريبة المدخلات القابلة للخصم
        VAT_PAYABLE: '2041',        // الضريبة المستحقة (موجب)
        VAT_RECEIVABLE: '1070',     // الضريبة القابلة للاسترداد (سالب)
        TAX_EXPENSE: '5110'         // مصاريف الضرائب
    },
    
    // إعدادات الحسابين الرئيسيين للتسوية
    SETTLEMENT: {
        VAT_NET_PAYABLE: '2045',    // صافي الضريبة المستحقة الدفع
        VAT_NET_RECEIVABLE: '1075', // صافي الضريبة القابلة للاسترداد
        SETTLEMENT_ACCOUNT: '1020'  // حساب التسوية (البنك)
    },
    
    // إعدادات النظام
    SYSTEM: {
        autoSettlement: true,       // التسوية التلقائية بعد كل عملية
        taxThreshold: 50000,        // الحد الأدنى للتسوية (ر.ي)
        settlementPeriod: ACCOUNTING_PERIOD.SETTINGS.taxPeriod, // فترة التسوية
        taxAuthorityRate: 0,        // نسبة الضريبة للجهة الحكومية
        roundingMethod: 'normal',   // طريقة التقريب (normal, floor, ceil)
        decimalPlaces: 2,           // عدد المنازل العشرية
        taxAuthority: COMPANY_INFO.FINANCIAL.taxOffice, // مصلحة الضرائب
        submissionDay: ACCOUNTING_PERIOD.IMPORTANT_DATES.vatSubmission // يوم التقديم
    },
    
    // أنواع الضرائب
    TAX_TYPES: {
        SALES: {                    // ضريبة المبيعات
            code: 'VAT_OUT',
            name: 'ضريبة المخرجات',
            rate: COMPANY_INFO.FINANCIAL.defaultTaxRate,
            account: '2041',
            description: 'ضريبة القيمة المضافة على المبيعات'
        },
        PURCHASE: {                 // ضريبة المشتريات
            code: 'VAT_IN',
            name: 'ضريبة المدخلات',
            rate: COMPANY_INFO.FINANCIAL.defaultTaxRate,
            account: '1070',
            description: 'ضريبة القيمة المضافة على المشتريات'
        },
        INCOME: {                   // ضريبة الدخل
            code: 'INC_TAX',
            name: 'ضريبة الدخل',
            rate: 0,
            account: '5110',
            description: 'ضريبة دخل الشركات'
        }
    },
    
    // التقارير الضريبية
    REPORTS: {
        vatReturn: true,            // إقرار ضريبي
        taxSummary: true,           // ملخص ضريبي
        auditTrail: true,           // سجل التدقيق
        complianceReport: true      // تقرير الامتثال
    }
};

// ==================== 3. شجرة الحسابات الأساسية (COA) ====================

var CHART_OF_ACCOUNTS = {
    // الأصول (Assets)
    ASSETS: {
        '1000': { name: 'الأصول', type: 'asset', parent: null, description: 'مجموع الأصول' },
        '1010': { name: 'الصندوق', type: 'asset', parent: '1000', balance: 0, description: 'النقدية في الصندوق' },
        '1020': { name: 'البنك', type: 'asset', parent: '1000', balance: 0, description: 'الحسابات البنكية' },
        '1030': { name: 'المخزون', type: 'asset', parent: '1000', balance: 0, description: 'بضاعة المخزن' },
        '1040': { name: 'العملاء', type: 'asset', parent: '1000', balance: 0, description: 'ذمم العملاء المدينة' },
        '1050': { name: 'أصول ثابتة', type: 'asset', parent: '1000', balance: 0, description: 'المباني، المعدات، السيارات' },
        '1060': { name: 'مصروفات مقدمة', type: 'asset', parent: '1000', balance: 0, description: 'مصروفات مدفوعة مسبقاً' },
        '1070': { name: 'ضريبة المدخلات', type: 'asset', parent: '1000', balance: 0, description: 'ضريبة القيمة المضافة على المشتريات' },
        '1075': { name: 'صافي الضريبة القابلة للاسترداد', type: 'asset', parent: '1070', balance: 0, description: 'صافي ضريبة المدخلات' },
        '1080': { name: 'مدينون آخرون', type: 'asset', parent: '1000', balance: 0, description: 'ذمم مدينة أخرى' }
    },
    
    // الخصوم (Liabilities)
    LIABILITIES: {
        '2000': { name: 'الخصوم', type: 'liability', parent: null, description: 'مجموع الخصوم' },
        '2010': { name: 'الموردين', type: 'liability', parent: '2000', balance: 0, description: 'ذمم الموردين الدائنة' },
        '2020': { name: 'قروض', type: 'liability', parent: '2000', balance: 0, description: 'القروض البنكية' },
        '2030': { name: 'أجور مستحقة', type: 'liability', parent: '2000', balance: 0, description: 'الرواتب المستحقة الدفع' },
        '2040': { name: 'ضرائب مستحقة', type: 'liability', parent: '2000', balance: 0, description: 'مجموع الضرائب المستحقة' },
        '2041': { name: 'ضريبة المخرجات', type: 'liability', parent: '2040', balance: 0, description: 'ضريبة القيمة المضافة على المبيعات' },
        '2045': { name: 'صافي الضريبة المستحقة', type: 'liability', parent: '2040', balance: 0, description: 'صافي ضريبة المخرجات' },
        '2050': { name: 'دائنون آخرون', type: 'liability', parent: '2000', balance: 0, description: 'ذمم دائنة أخرى' }
    },
    
    // حقوق الملكية (Equity)
    EQUITY: {
        '3000': { name: 'حقوق الملكية', type: 'equity', parent: null, description: 'مجموع حقوق الملكية' },
        '3010': { name: 'رأس المال', type: 'equity', parent: '3000', balance: 0, description: 'رأس مال المالك' },
        '3020': { name: 'أرباح محتجزة', type: 'equity', parent: '3000', balance: 0, description: 'أرباح السنوات السابقة' },
        '3030': { name: 'أرباح العام', type: 'equity', parent: '3000', balance: 0, description: 'أرباح السنة الحالية' },
        '3040': { name: 'مسحوبات شخصية', type: 'equity', parent: '3000', balance: 0, description: 'السحوبات الشخصية للمالك' },
        '3050': { name: 'أرباح الفترة الجارية', type: 'equity', parent: '3000', balance: 0, description: 'أرباح الفترة المحاسبية الحالية' },
        '3060': { name: 'أرباح الفترة السابقة', type: 'equity', parent: '3000', balance: 0, description: 'أرباح الفترة المحاسبية الماضية' }
    },
    
    // الإيرادات (Revenue)
    REVENUE: {
        '4000': { name: 'الإيرادات', type: 'revenue', parent: null, description: 'مجموع الإيرادات' },
        '4010': { name: 'مبيعات', type: 'revenue', parent: '4000', balance: 0, description: 'إيرادات المبيعات' },
        '4020': { name: 'إيرادات خدمات', type: 'revenue', parent: '4000', balance: 0, description: 'إيرادات تقديم الخدمات' },
        '4030': { name: 'خصومات مبيعات', type: 'revenue', parent: '4000', balance: 0, description: 'الخصومات المسجلة على المبيعات' },
        '4040': { name: 'مرتجع مبيعات', type: 'revenue', parent: '4000', balance: 0, description: 'مرتجعات المبيعات' },
        '4050': { name: 'إيرادات أخرى', type: 'revenue', parent: '4000', balance: 0, description: 'إيرادات متنوعة' },
        '4060': { name: 'إيرادات الفترة المغلقة', type: 'revenue', parent: '4000', balance: 0, description: 'إيرادات الفترات المحاسبية المغلقة' }
    },
    
    // المصروفات (Expenses)
    EXPENSES: {
        '5000': { name: 'المصروفات', type: 'expense', parent: null, description: 'مجموع المصروفات' },
        '5010': { name: 'تكلفة البضاعة المباعة', type: 'expense', parent: '5000', balance: 0, description: 'تكلفة البضاعة المباعة' },
        '5020': { name: 'مصاريف تشغيل', type: 'expense', parent: '5000', balance: 0, description: 'مصاريف التشغيل اليومية' },
        '5030': { name: 'رواتب وأجور', type: 'expense', parent: '5000', balance: 0, description: 'رواتب الموظفين والأجور' },
        '5040': { name: 'إيجار', type: 'expense', parent: '5000', balance: 0, description: 'إيجار المحل أو المقر' },
        '5050': { name: 'كهرباء وماء', type: 'expense', parent: '5000', balance: 0, description: 'فواتير الكهرباء والماء' },
        '5060': { name: 'صيانة', type: 'expense', parent: '5000', balance: 0, description: 'مصاريف الصيانة' },
        '5070': { name: 'إعلانات', type: 'expense', parent: '5000', balance: 0, description: 'مصاريف الدعاية والإعلان' },
        '5080': { name: 'مصاريف نقل', type: 'expense', parent: '5000', balance: 0, description: 'مصاريف النقل والتوصيل' },
        '5090': { name: 'مصاريف إدارية', type: 'expense', parent: '5000', balance: 0, description: 'مصاريف إدارية متنوعة' },
        '5100': { name: 'مصاريف الفترة المغلقة', type: 'expense', parent: '5000', balance: 0, description: 'مصاريف الفترات المحاسبية المغلقة' },
        '5110': { name: 'مصاريف الضرائب', type: 'expense', parent: '5000', balance: 0, description: 'مصاريف الضرائب والرسوم' }
    }
};

// ==================== 4. دوال مساعدة ====================

// التحقق من أن العملية ضمن الفترة المحاسبية المسموحة
function validateAccountingPeriod(transactionDate) {
    const transDate = new Date(transactionDate);
    const startDate = new Date(ACCOUNTING_PERIOD.CURRENT_PERIOD.startDate);
    const endDate = new Date(ACCOUNTING_PERIOD.CURRENT_PERIOD.endDate);
    
    // إذا كانت الفترة مقفلة
    if (ACCOUNTING_PERIOD.CURRENT_PERIOD.isLocked) {
        return {
            valid: false,
            message: 'الفترة المحاسبية مقفلة ولا يمكن إضافة عمليات',
            period: ACCOUNTING_PERIOD.CURRENT_PERIOD.periodName,
            status: 'locked'
        };
    }
    
    // إذا كان التاريخ قبل بداية الفترة
    if (transDate < startDate && !ACCOUNTING_PERIOD.SETTINGS.allowPastTransactions) {
        return {
            valid: false,
            message: 'لا يمكن إضافة عمليات قبل بداية الفترة المحاسبية',
            periodStart: ACCOUNTING_PERIOD.CURRENT_PERIOD.startDate,
            transactionDate: transactionDate
        };
    }
    
    // إذا كان التاريخ بعد نهاية الفترة
    if (transDate > endDate && !ACCOUNTING_PERIOD.SETTINGS.allowFutureTransactions) {
        return {
            valid: false,
            message: 'لا يمكن إضافة عمليات بعد نهاية الفترة المحاسبية',
            periodEnd: ACCOUNTING_PERIOD.CURRENT_PERIOD.endDate,
            transactionDate: transactionDate
        };
    }
    
    return { 
        valid: true, 
        message: 'العمليات مسموحة',
        period: ACCOUNTING_PERIOD.CURRENT_PERIOD.periodName,
        withinPeriod: true
    };
}

// دالة للتحقق من وجود كود الحساب
function validateAccountCode(accountCode) {
    for (const category in CHART_OF_ACCOUNTS) {
        if (CHART_OF_ACCOUNTS[category][accountCode]) {
            return true;
        }
    }
    return false;
}

// دالة للحصول على نوع الحساب (Asset, Liability, etc.)
function getAccountType(accountCode) {
    for (const category in CHART_OF_ACCOUNTS) {
        if (CHART_OF_ACCOUNTS[category][accountCode]) {
            return CHART_OF_ACCOUNTS[category][accountCode].type;
        }
    }
    return null;
}

// دالة للتحقق من توازن القيد المحاسبي (المدين = الدائن)
function checkJournalEntryBalance(journalEntryLines) {
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of journalEntryLines) {
        if (line.type === 'debit') {
            totalDebit += line.amount;
        } else if (line.type === 'credit') {
            totalCredit += line.amount;
        }
    }

    const isBalanced = totalDebit === totalCredit;
    const difference = totalDebit - totalCredit;

    return {
        isBalanced: isBalanced,
        totalDebit: totalDebit,
        totalCredit: totalCredit,
        difference: difference
    };
}

// دالة لحساب رصيد الحساب (تتطلب تكامل مع M-database.js)
function calculateAccountBalance(accountCode) {
    console.warn(`[M-core.js] الدالة calculateAccountBalance هي دالة هيكلية. يجب تنفيذها في M-accountingtree.js`);
    return 0; // رصيد افتراضي
}

// دالة لتنسيق التاريخ
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('ar-SA', options);
}

// دالة لتحديث الفترة المحاسبية
function updateAccountingPeriod(newPeriod) {
    ACCOUNTING_PERIOD.CURRENT_PERIOD = {
        ...ACCOUNTING_PERIOD.CURRENT_PERIOD,
        ...newPeriod
    };
    
    console.log(`تم تحديث الفترة المحاسبية إلى: ${ACCOUNTING_PERIOD.CURRENT_PERIOD.periodName}`);
    return ACCOUNTING_PERIOD.CURRENT_PERIOD;
}

// دالة لتوليد قيد محاسبي مبسط لفاتورة نقطة البيع
function generateJournalEntry(invoice) {
    const totals = invoice; // الفاتورة تحتوي على الإجماليات
    const date = invoice.date || new Date().toISOString().split('T')[0];
    const reference = invoice.invoiceNumber || invoice.id;
    const description = `قيد بيع نقدي رقم ${reference} للعميل ${invoice.customerName}`;
    
    // حسابات المبيعات من SALES_CONFIG
    const cashAccount = SALES_CONFIG.ACCOUNTS.CASH;
    const revenueAccount = SALES_CONFIG.ACCOUNTS.REVENUE;
    const vatOutputAccount = SALES_CONFIG.ACCOUNTS.VAT_OUTPUT;
    
    // القيد المحاسبي
    const journalEntry = {
        date: date,
        type: 'POS_SALE',
        reference: reference,
        description: description,
        lines: []
    };
    
    // 1. المدين: الصندوق (إجمالي المبلغ شامل الضريبة)
    journalEntry.lines.push({
        accountCode: cashAccount,
        type: 'debit',
        amount: totals.total,
        description: `تحصيل نقدي لفاتورة رقم ${reference}`
    });
    
    // 2. الدائن: الإيرادات (صافي المبلغ بدون ضريبة)
    journalEntry.lines.push({
        accountCode: revenueAccount,
        type: 'credit',
        amount: totals.subTotal,
        description: `إيرادات مبيعات نقطة بيع رقم ${reference}`
    });
    
    // 3. الدائن: ضريبة المخرجات (مبلغ الضريبة)
    if (totals.taxAmount > 0) {
        journalEntry.lines.push({
            accountCode: vatOutputAccount,
            type: 'credit',
            amount: totals.taxAmount,
            description: `ضريبة القيمة المضافة على مبيعات رقم ${reference}`
        });
    }
    
    // يجب التحقق من توازن القيد قبل إعادته
    const balanceCheck = checkJournalEntryBalance(journalEntry.lines);
    if (!balanceCheck.isBalanced) {
        console.error(`خطأ في توازن القيد المحاسبي للفاتورة ${reference}:`, balanceCheck);
        // يمكن إضافة حساب تسوية أو رمي خطأ
    }
    
    return journalEntry;
}

// دالة لتحويل العملات
function convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
        return amount;
    }
    
    const rates = CURRENCY_CONFIG.DEFAULT_EXCHANGE_RATES;
    if (!rates[fromCurrency] || !rates[toCurrency]) {
        console.error(`أسعار الصرف غير متوفرة للعملات: ${fromCurrency} -> ${toCurrency}`);
        return amount;
    }
    
    // التحويل عبر العملة الأساسية
    const amountInBase = amount * rates[fromCurrency];
    const convertedAmount = amountInBase / rates[toCurrency];
    
    return convertedAmount;
}

// دالة لتنسيق المبالغ المالية
function formatCurrency(amount, currency = 'YER') {
    const symbol = CURRENCY_CONFIG.SYMBOLS[currency] || currency;
    const precision = CURRENCY_CONFIG.PRECISION[currency] || 2;
    
    return new Intl.NumberFormat('ar-SA', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision
    }).format(amount) + ` ${symbol}`;
}

// دالة للتحقق من صحة رقم الهاتف
function validatePhoneNumber(phone) {
    const phoneRegex = /^\+?[\d\s\-\(\)]{8,}$/;
    return phoneRegex.test(phone);
}

// دالة للتحقق من صحة البريد الإلكتروني
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ==================== 5. تصدير الثوابت والدوال ====================

// تصدير الثوابت والدوال إلى النطاق العام (window) لضمان الوصول إليها من الملفات الأخرى
if (typeof window !== 'undefined') {
    window.CURRENCY_CONFIG = CURRENCY_CONFIG;
    window.UNIT_SYSTEM = UNIT_SYSTEM;
    window.ACCOUNTING_PERIOD = ACCOUNTING_PERIOD;
    window.COMPANY_INFO = COMPANY_INFO;
    window.SALES_CONFIG = SALES_CONFIG;
    window.PURCHASE_CONFIG = PURCHASE_CONFIG;
    window.TAX_CONFIG = TAX_CONFIG;
    window.CHART_OF_ACCOUNTS = CHART_OF_ACCOUNTS;
    
    // الدوال العامة
    window.validateAccountingPeriod = validateAccountingPeriod;
    window.formatDate = formatDate;
    window.updateAccountingPeriod = updateAccountingPeriod;
    window.validateAccountCode = validateAccountCode;
    window.getAccountType = getAccountType;
    window.checkJournalEntryBalance = checkJournalEntryBalance;
    window.calculateAccountBalance = calculateAccountBalance;
    window.generateJournalEntry = generateJournalEntry;
    window.convertCurrency = convertCurrency;
    window.formatCurrency = formatCurrency;
    window.validatePhoneNumber = validatePhoneNumber;
    window.validateEmail = validateEmail;
    
    console.log('تم تحميل M-core.js بنجاح');
}

// ==================== 6. تهيئة البيانات الافتراضية ====================

// دالة لتهيئة البيانات الافتراضية للنظام
function initializeSystemDefaults() {
    try {
        // التحقق من إعدادات الفترة المحاسبية
        if (!ACCOUNTING_PERIOD.CURRENT_PERIOD.periodName) {
            const currentYear = new Date().getFullYear();
            ACCOUNTING_PERIOD.CURRENT_PERIOD.periodName = `الفترة السنوية ${currentYear}`;
            ACCOUNTING_PERIOD.CURRENT_PERIOD.startDate = `${currentYear}-01-01`;
            ACCOUNTING_PERIOD.CURRENT_PERIOD.endDate = `${currentYear}-12-31`;
        }
        
        // التحقق من إعدادات الشركة
        if (!COMPANY_INFO.BASIC.name || COMPANY_INFO.BASIC.name === 'اسم الشركة أو المحل') {
            console.warn('يرجى تحديث معلومات الشركة في ملف M-core.js');
        }
        
        // التحقق من أسعار الصرف
        Object.keys(CURRENCY_CONFIG.SYMBOLS).forEach(currency => {
            if (!CURRENCY_CONFIG.DEFAULT_EXCHANGE_RATES[currency]) {
                console.warn(`سعر الصرف غير محدد للعملة: ${currency}`);
            }
        });
        
        console.log('تم تهيئة النظام بنجاح');
        return true;
    } catch (error) {
        console.error('خطأ في تهيئة النظام:', error);
        return false;
    }
}

// تشغيل التهيئة تلقائياً عند تحميل الملف
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        setTimeout(initializeSystemDefaults, 100);
    });
}