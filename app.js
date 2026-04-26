// --- Configuration & Data ---

// Define role permissions (which views they can see)
const rolePermissions = {
    system_admin: ['dashboard', 'members', 'events', 'reports', 'fund', 'users', 'system-config'],
    admin: ['dashboard', 'members', 'events', 'reports', 'fund'],
    data_entry: ['members', 'events'],
    member: ['my-invitations']  // العضو يرى دعواته فقط
};

let usersData = [
    {
        id: 1,
        title: 'مدير النظام',
        username: 'admin',
        password: 'admin',
        role: 'system_admin'
    },
    {
        id: 2,
        title: 'إداري',
        username: 'supervisor',
        password: 'super',
        role: 'admin'
    },
    {
        id: 3,
        title: 'مدخل بيانات',
        username: 'data',
        password: 'data',
        role: 'data_entry'
    }
];

// Define the menu items
const menuItems = [
    { id: 'dashboard', icon: 'fa-chart-line', text: 'لوحة التحكم', viewId: 'view-dashboard' },
    { id: 'members', icon: 'fa-users', text: 'إدارة الأعضاء', viewId: 'view-members' },
    { id: 'events', icon: 'fa-calendar-days', text: 'إدارة الاحتفالات', viewId: 'view-events' },
    { id: 'reports', icon: 'fa-file-lines', text: 'التقارير', viewId: 'view-reports' },
    { id: 'fund', icon: 'fa-vault', text: 'الصندوق', viewId: 'view-fund' },
    { id: 'users', icon: 'fa-users-cog', text: 'إدارة المستخدمين', viewId: 'view-users' },
    { id: 'system-config', icon: 'fa-sliders', text: 'تكوين النظام', viewId: 'view-system-config' },
    { id: 'my-invitations', icon: 'fa-envelope-open-text', text: 'دعواتي', viewId: 'view-my-invitations' }
];

// System Data (Mock State)
let systemData = {
    categories: [
        { name: 'شاعر', startNumber: 100 },
        { name: 'طبل', startNumber: 200 },
        { name: 'رزيف', startNumber: 300 },
        { name: 'يويل', startNumber: 400 }
    ],
    eventTypes: ['عرس', 'حفل', 'مشاركة'],
    regions: [
        { id: 1, name: 'أبوظبي', amount: 50 },
        { id: 2, name: 'دبي', amount: 50 },
        { id: 3, name: 'الشارقة', amount: 50 },
        { id: 4, name: 'عجمان', amount: 50 },
        { id: 5, name: 'أم القيوين', amount: 50 },
        { id: 6, name: 'رأس الخيمة', amount: 50 },
        { id: 7, name: 'الفجيرة', amount: 50 }
    ]
};

// دالة مساعدة للحصول على اسم الفئة (تتعامل مع الشكلين القديم والجديد)
function getCategoryName(cat) {
    if (!cat) return '';
    if (typeof cat === 'string') return cat;
    return cat.name || '';
}
function getCategoryStart(cat) {
    if (!cat) return 0;
    if (typeof cat === 'string') return 0;
    return cat.startNumber || 0;
}
// حساب رقم عضوية تسلسلي حسب الفئة
function getNextMemberNumberForCategory(categoryId) {
    const cat = systemData.categories[categoryId];
    const start = getCategoryStart(cat);
    if (!start) return null;
    // نحسب كم عضو موجود في نفس الفئة
    const countInCategory = membersData.filter(m => m.categoryId === categoryId).length;
    return start + countInCategory;
}

let membersData = [
    {
        id: 1001,
        name: 'أحمد محمد عبدالله',
        phone: '98765432',
        categoryId: 0,
        regionId: 1,
        joinDate: '2023-05-12',
        photo: 'https://ui-avatars.com/api/?name=Ahmed&background=0D8ABC&color=fff',
        attachments: true
    },
    {
        id: 1002,
        name: 'خالد سعيد الرئيسي',
        phone: '91234567',
        categoryId: 1,
        regionId: 2,
        joinDate: '2023-08-20',
        photo: 'https://ui-avatars.com/api/?name=Khalid&background=20c997&color=fff',
        attachments: false
    }
];

let eventsData = [
    {
        id: 2001,
        typeId: 0,
        regionId: 1,
        date: '2023-11-15',
        totalBudget: 1500,
        attendeesCount: 2,
        selectedMembers: [1001, 1002],
        expenses: [
            { desc: 'حجز القاعة', amount: 300 }
        ],
        auditTransactions: []
    }
];

let currentUser = null;
let initialFundBalance = 10000; // رصيد افتتاحي مرجعي
let fundTransactions = [
    { id: 1, date: '2023-11-01', desc: 'إيداع رصيد افتتاحي', type: 'in', amount: 10000 },
    { id: 2, date: '2023-11-05', desc: 'حجز قاعة الاحتفال (عرس)', type: 'out', amount: 1200 }
];

// --- DOM Elements ---
const loginScreen = document.getElementById('login-screen');
const appShell = document.getElementById('app-shell');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const navList = document.getElementById('nav-list');
const logoutBtn = document.getElementById('logout-btn');
const userRoleBadge = document.getElementById('user-role-badge');
const welcomeName = document.getElementById('welcome-name');
const currentPageTitle = document.getElementById('current-page-title');

// Mobile menu elements
const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');

// --- Functions ---

/**
 * Handle Login Submission
 */
// ═══════════════════════════════════════════════════════════════════
// 👤 Member Account System
// نظام حسابات الأعضاء — كل عضو يمكن أن يكون له اسم مستخدم وكلمة مرور
// عند تسجيل الدخول كعضو، يحصل على بوابة محدودة لرؤية دعواته فقط
// ═══════════════════════════════════════════════════════════════════

// تحويل عضو إلى كائن مستخدم متوافق مع نظام تسجيل الدخول
function memberToVirtualUser(member) {
    return {
        id: `member-${member.id}`,
        memberId: member.id,
        title: member.name,
        username: member.username,
        password: member.password,
        role: 'member'
    };
}

// البحث عن حساب عضو مطابق بالاسم وكلمة المرور
function findMatchingMemberAccount(username, password) {
    const m = membersData.find(m => m.username && m.password && m.username === username && m.password === password);
    return m ? memberToVirtualUser(m) : null;
}

loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = usernameInput.value.trim();
    const pass = passwordInput.value.trim();

    // 1) جرّب جدول المستخدمين الإداريين أولاً
    let matchedUser = usersData.find(u => u.username === user && u.password === pass);

    // 2) وإلا جرّب حسابات الأعضاء
    if (!matchedUser) {
        matchedUser = findMatchingMemberAccount(user, pass);
    }

    if (matchedUser) {
        login(matchedUser);
    } else {
        alert('اسم المستخدم أو كلمة المرور غير صحيحة. يرجى تجربة الحسابات التجريبية الموضحة في الشاشة.');
    }
});

/**
 * Login Logic
 */
function login(user) {
    currentUser = user;
    
    // حفظ الجلسة في localStorage للبقاء على تسجيل الدخول عند تحديث الصفحة
    try {
        localStorage.setItem('dibba_session', JSON.stringify({
            username: user.username,
            loginTime: Date.now()
        }));
    } catch (e) { console.warn('لا يمكن حفظ الجلسة:', e); }
    
    // Update UI Elements
    if (userRoleBadge) userRoleBadge.textContent = user.title;
    if (welcomeName) welcomeName.textContent = `مرحباً، ${user.title}`;
    
    // Build Navigation based on role permissions
    const allowedViews = rolePermissions[user.role] || [];
    buildNavigation(allowedViews);
    
    // Switch screens with small delay for animation
    setTimeout(() => {
        loginScreen.classList.remove('active');
        appShell.classList.add('active');
        // Clear password
        passwordInput.value = '';

        // إذا كان المستخدم عضواً، طبّق وضع البوابة المحدودة
        applyMemberMode(user);

        // Trigger initial stats update
        updateDashboardStats();
    }, 400);
}

// ═══════════════════════════════════════════════════════════════════
// تطبيق وضع "بوابة العضو" — يفعّل الإشعارات ويعرض الترحيب الخاص
// ═══════════════════════════════════════════════════════════════════
function applyMemberMode(user) {
    const bell = document.getElementById('notification-bell');
    if (user.role === 'member') {
        if (bell) bell.style.display = 'inline-flex';
        // تحديث شارة الإشعارات وعرض الدعوات
        setTimeout(() => {
            updateNotificationBadge();
            renderMyInvitations();
        }, 100);
    } else {
        if (bell) bell.style.display = 'none';
    }
}

// استعادة الجلسة تلقائياً عند تحميل الصفحة
(function restoreSession() {
    try {
        const sessionRaw = localStorage.getItem('dibba_session');
        if (!sessionRaw) return;
        const session = JSON.parse(sessionRaw);
        if (!session || !session.username) return;
        
        // الجلسة صالحة لمدة 7 أيام
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - (session.loginTime || 0) > SEVEN_DAYS) {
            localStorage.removeItem('dibba_session');
            return;
        }
        
        // العثور على المستخدم المسجل من جدول المستخدمين أولاً، ثم من جدول الأعضاء
        let matched = usersData.find(u => u.username === session.username);
        if (!matched) {
            const m = membersData.find(m => m.username === session.username);
            if (m) matched = memberToVirtualUser(m);
        }
        if (matched) {
            // استعادة مباشرة بدون تأخير الأنيميشن
            currentUser = matched;
            if (userRoleBadge) userRoleBadge.textContent = matched.title;
            if (welcomeName) welcomeName.textContent = `مرحباً، ${matched.title}`;
            const allowedViews = rolePermissions[matched.role] || [];
            buildNavigation(allowedViews);
            loginScreen.classList.remove('active');
            appShell.classList.add('active');
            applyMemberMode(matched);
            updateDashboardStats();
        }
    } catch (e) {
        console.warn('تعذّرت استعادة الجلسة:', e);
    }
})();

/**
 * Build Sidebar Navigation
 */
function buildNavigation(allowedIds) {
    if (!navList) return;
    
    navList.innerHTML = ''; // Clear default
    let firstLi = null;

    menuItems.forEach(item => {
        if (allowedIds.includes(item.id)) {
            const li = document.createElement('li');
            li.className = 'nav-item';
            li.dataset.target = item.viewId;
            li.dataset.title = item.text;
            
            li.innerHTML = `
                <i class="fa-solid ${item.icon}"></i>
                <span>${item.text}</span>
            `;

            li.addEventListener('click', () => {
                switchView(li);
                // Close sidebar on mobile
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                }
            });

            navList.appendChild(li);
            if (!firstLi) firstLi = li;
        }
    });

    // Auto select first allowed view
    if (firstLi) {
        setTimeout(() => switchView(firstLi), 50);
    }
}

/**
 * Switch View sections
 */
function switchView(navElement) {
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    // Add active class to clicked
    navElement.classList.add('active');

    // Update page title
    if (currentPageTitle) {
        currentPageTitle.textContent = navElement.dataset.title;
    }

    // Hide all view sections
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.add('hidden');
        el.style.animation = 'none'; // reset animation
    });

    // Show target section with animation
    const targetId = navElement.dataset.target;
    const targetView = document.getElementById(targetId);
    if (targetView) {
        targetView.classList.remove('hidden');
        // Trigger reflow for animation
        void targetView.offsetWidth;
        targetView.style.animation = 'fadeIn 0.4s ease';

        // --- NEW: Reset sub-views and filters on Navigation ---
        if (targetId === 'view-members') {
            if(memberProfileContainer) memberProfileContainer.classList.add('hidden');
            if(addMemberContainer) addMemberContainer.classList.add('hidden');
            if(membersListContainer) membersListContainer.classList.remove('hidden');
            if(memberSearchInput) memberSearchInput.value = '';
            renderMembers('');
        } else if (targetId === 'view-events') {
            if(addEventContainer) addEventContainer.classList.add('hidden');
            if(window.eventAuditContainer) window.eventAuditContainer.classList.add('hidden');
            if(eventsListContainer) eventsListContainer.classList.remove('hidden');
            renderEvents();
        } else if (targetId === 'view-reports') {
            if(globalSearchInput) globalSearchInput.value = '';
            if(reportsRecentContainer) reportsRecentContainer.classList.remove('hidden');
            if(reportsResultsContainer) reportsResultsContainer.classList.add('hidden');
        }
    }
}

/**
 * Logout
 */
logoutBtn?.addEventListener('click', () => {
    // Reset state
    currentUser = null;
    loginForm.reset();
    
    // حذف جلسة الدخول المحفوظة
    try { localStorage.removeItem('dibba_session'); } catch(e) {}
    
    // Switch screens
    appShell.classList.remove('active');
    loginScreen.classList.add('active');
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
});

/**
 * Mobile Menu Toggle
 */
menuToggle?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
});

// Close sidebar if clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && sidebar?.classList.contains('open')) {
        const isClickInsideSidebar = sidebar.contains(e.target);
        const isClickOnToggle = menuToggle.contains(e.target);
        
        if (!isClickInsideSidebar && !isClickOnToggle) {
            sidebar.classList.remove('open');
        }
    }
});

// --- System Settings (Dashboard) Logic ---

function renderSettings() {
    // 1. Categories (تدعم شكل الكائن {name, startNumber} والشكل القديم النصي)
    const categoriesList = document.getElementById('categories-list');
    if (categoriesList) {
        categoriesList.innerHTML = systemData.categories.map((cat, index) => {
            const name = getCategoryName(cat);
            const start = getCategoryStart(cat);
            return `
            <li style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); color: var(--text-main); padding: 0.5rem 1rem; border: 1px solid var(--border); border-radius: 6px;">
                <div style="display:flex; align-items:center; gap:0.6rem; flex:1;">
                    <span style="font-weight: 600;">${name}</span>
                    ${start ? `<span style="background: var(--gold-dim); color: var(--gold); border:1px solid var(--gold-border); padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.75rem; font-family: monospace;" title="رقم العضوية يبدأ من"><i class="fa-solid fa-hashtag" style="font-size:0.65rem;"></i> ${start}</span>` : ''}
                </div>
                <button class="action-btn delete btn-sm" onclick="deleteCategory(${index})" style="width:28px; height:28px; margin:0;" title="حذف"><i class="fa-solid fa-xmark"></i></button>
            </li>
        `;}).join('');
    }

    // 2. Event Types
    const eventTypesList = document.getElementById('event-types-list');
    if (eventTypesList) {
        eventTypesList.innerHTML = systemData.eventTypes.map((type, index) => `
            <li style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); color: var(--text-main); padding: 0.5rem 1rem; border: 1px solid var(--border); border-radius: 6px;">
                <span style="font-weight: 500;">${type}</span>
                <button class="action-btn delete btn-sm" onclick="deleteEventType(${index})" style="width:28px; height:28px; margin:0;" title="حذف"><i class="fa-solid fa-xmark"></i></button>
            </li>
        `).join('');
    }

    // 3. Regions
    const regionsTableBody = document.getElementById('regions-table-body');
    if (regionsTableBody) {
        regionsTableBody.innerHTML = systemData.regions.map(region => `
            <tr>
                <td style="font-weight: 500;">${region.name}</td>
                <td style="font-weight: 700; color: var(--primary);">${region.amount} د.إ</td>
                <td>
                    <button class="action-btn delete btn-sm" onclick="deleteRegion(${region.id})" title="حذف"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }

    // تحديث قوائم فلاتر الأعضاء عند أي تعديل في الإعدادات
    if (typeof window.populateMemberFilters === 'function') {
        window.populateMemberFilters();
    }
}

// Add hooks for forms
document.getElementById('add-category-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('category-name-input');
    const startInput = document.getElementById('category-start-input');
    const name = nameInput.value.trim();
    const start = parseInt(startInput.value);
    
    if (!name) { alert('يرجى إدخال اسم الفئة.'); return; }
    if (isNaN(start) || start < 1) { alert('يرجى إدخال رقم بداية صحيح أكبر من صفر.'); return; }
    
    // منع التكرار في الاسم أو تداخل الأرقام
    const exists = systemData.categories.some(c => getCategoryName(c) === name);
    if (exists) { alert('اسم الفئة موجود مسبقاً.'); return; }
    
    const startsConflict = systemData.categories.some(c => {
        const s = getCategoryStart(c);
        if (!s) return false;
        // نعتبر التداخل إذا كان الرقم الجديد ضمن مدى فئة أخرى (افتراضياً 100 رقم لكل فئة)
        return Math.abs(s - start) < 100;
    });
    if (startsConflict) {
        if (!confirm(`قد يحدث تداخل مع فئة أخرى قريبة من الرقم ${start}. هل تريد المتابعة على أي حال؟`)) return;
    }
    
    systemData.categories.push({ name: name, startNumber: start });
    nameInput.value = '';
    startInput.value = '';
    renderSettings();
});

document.getElementById('add-event-type-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('event-type-name-input');
    if (input.value.trim()) {
        systemData.eventTypes.push(input.value.trim());
        input.value = '';
        renderSettings();
    }
});

document.getElementById('add-region-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('region-name-input');
    const amountInput = document.getElementById('region-amount-input');
    if (nameInput.value.trim() && amountInput.value) {
        systemData.regions.push({
            id: Date.now(),
            name: nameInput.value.trim(),
            amount: parseFloat(amountInput.value)
        });
        nameInput.value = '';
        amountInput.value = '';
        renderSettings();
    }
});

// Delete functions (Must be global for inline onclick)
window.deleteCategory = function(index) {
    if (confirm('هل أنت متأكد من حذف هذه الفئة؟')) {
        systemData.categories.splice(index, 1);
        renderSettings();
    }
};

window.deleteEventType = function(index) {
    if (confirm('هل أنت متأكد من حذف هذا المسمى؟')) {
        systemData.eventTypes.splice(index, 1);
        renderSettings();
    }
};

window.deleteRegion = function(id) {
    if (confirm('هل أنت متأكد من حذف هذه المنطقة؟')) {
        systemData.regions = systemData.regions.filter(r => r.id !== id);
        renderSettings();
    }
};

// Initial Render
renderSettings();

/**
 * Update Initial Fund Balance from Dashboard
 */
window.saveInitialFund = function() {
    const input = document.getElementById('initial-fund-input');
    if (!input) return;
    const amount = parseFloat(input.value);
    
    if (!isNaN(amount)) {
        initialFundBalance = amount;
        
        // Update the first transaction which is usually the initial deposit
        if (fundTransactions.length > 0) {
            fundTransactions[fundTransactions.length - 1].amount = amount;
        } else {
            fundTransactions.push({ id: Date.now(), date: new Date().toISOString().split('T')[0], desc: 'إيداع رصيد افتتاحي', type: 'in', amount: amount });
        }
        
        renderFund(); // Refresh fund UI and Dashboard stats
        alert('تم تحديث الميزانية المبدئية بنجاح.');
    }
};

// --- Member Management Logic ---

// DOM Elements for Members
const membersListContainer = document.getElementById('members-list-container');
const addMemberContainer = document.getElementById('add-member-container');
const memberProfileContainer = document.getElementById('member-profile-container');

function renderMembers(filterText = '') {
    const container = document.getElementById('categorized-members-container');
    if (!container) return;

    // قراءة الفلاتر
    const regionFilterEl = document.getElementById('member-region-filter');
    const categoryFilterEl = document.getElementById('member-category-filter');
    const regionFilter = regionFilterEl ? regionFilterEl.value : '';
    const categoryFilter = categoryFilterEl ? categoryFilterEl.value : '';

    if (membersData.length === 0) {
        container.innerHTML = '<p class="text-muted" style="text-align:center;">لا يوجد أعضاء مسجلين بعد.</p>';
        return;
    }

    const groups = {};
    let filteredCount = 0;
    membersData.forEach(member => {
        // فلتر البحث النصي
        if (filterText) {
            const term = filterText.toLowerCase();
            const matches = member.name.toLowerCase().includes(term) || 
                            member.phone.includes(term) ||
                            member.id.toString().includes(term);
            if (!matches) return;
        }
        // فلتر المنطقة
        if (regionFilter !== '' && String(member.regionId) !== String(regionFilter)) return;
        // فلتر الفئة
        if (categoryFilter !== '' && String(member.categoryId) !== String(categoryFilter)) return;
        
        filteredCount++;
        if (!groups[member.categoryId]) groups[member.categoryId] = [];
        groups[member.categoryId].push(member);
    });

    if (filteredCount === 0) {
        container.innerHTML = '<p class="text-muted" style="text-align:center; padding: 2rem;"><i class="fa-solid fa-circle-info"></i> لا توجد أي نتائج مطابقة للفلاتر المحددة.</p>';
        return;
    }

    let html = '';
    systemData.categories.forEach((cat, catId) => {
        const catName = getCategoryName(cat);
        const groupMembers = groups[catId] || [];
        if (groupMembers.length === 0) return;

        html += `
            <div class="category-group" style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; box-shadow: var(--shadow-sm);">
                <div style="background: var(--bg-form); padding: 1rem 1.5rem; border-bottom: 2px solid var(--gold); display: flex; align-items: center; justify-content: space-between;">
                    <h3 style="margin: 0; color: var(--gold); font-size: 1.2rem;"><i class="fa-solid fa-layer-group"></i> ${catName}</h3>
                    <span class="badge" style="background: linear-gradient(135deg, var(--gold-dark), var(--gold)); color: #0C0B09; font-size:0.9rem;">${groupMembers.length} أعضاء</span>
                </div>
                <div class="table-responsive">
                    <table class="data-table" style="margin: 0; border: none; border-radius: 0;">
                        <thead>
                            <tr>
                                <th>الاسم</th>
                                <th>رقم الهاتف</th>
                                <th>المنطقة</th>
                                <th>مبلغ القسمة</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${groupMembers.map(member => {
                                const region = systemData.regions.find(r => r.id === member.regionId);
                                const regionName = region ? region.name : 'غير محدد';
                                const amount = region ? region.amount : 0;
                                return `
                                    <tr>
                                        <td>
                                            <div style="display: flex; align-items: center; gap: 0.8rem;">
                                                <img src="${member.photo}" alt="${member.name}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                                                <span style="font-weight: 600;">${member.name}</span>
                                            </div>
                                        </td>
                                        <td style="direction: ltr; text-align: right;">${member.phone}</td>
                                        <td><span class="badge" style="background:var(--text-muted)">${regionName}</span></td>
                                        <td><strong style="color:var(--primary);">${amount} د.إ</strong></td>
                                        <td>
                                            <button class="action-btn edit" title="عرض الملف والتقارير" onclick="viewMemberProfile(${member.id})" style="width:auto; padding:0 0.8rem; font-size:0.85rem;"><i class="fa-solid fa-file-invoice"></i> استعراض التقرير</button>
                                            <button class="action-btn delete" title="حذف" onclick="deleteMember(${member.id})"><i class="fa-solid fa-trash"></i></button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Navigation between member views
document.getElementById('btn-show-add-member')?.addEventListener('click', () => {
    // Populate dropdowns first
    const regionSelect = document.getElementById('new-member-region');
    const categorySelect = document.getElementById('new-member-category');
    
    if (regionSelect) {
        regionSelect.innerHTML = systemData.regions.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
    }
    if (categorySelect) {
        categorySelect.innerHTML = systemData.categories.map((c, i) => `<option value="${i}">${getCategoryName(c)}</option>`).join('');
    }

    membersListContainer.classList.add('hidden');
    memberProfileContainer.classList.add('hidden');
    addMemberContainer.classList.remove('hidden');
});

document.getElementById('btn-back-to-members')?.addEventListener('click', () => {
    addMemberContainer.classList.add('hidden');
    memberProfileContainer.classList.add('hidden');
    membersListContainer.classList.remove('hidden');
});

document.getElementById('btn-back-from-profile')?.addEventListener('click', () => {
    memberProfileContainer.classList.add('hidden');
    addMemberContainer.classList.add('hidden');
    membersListContainer.classList.remove('hidden');
});

// Handle Add Member Submit
document.getElementById('add-member-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // In a real app we upload files to a server. Here we just mock it with local object URLs.
    const photoFile = document.getElementById('new-member-photo').files[0];
    const idCardFile = document.getElementById('new-member-idcard').files[0];
    const emiratesIdFile = document.getElementById('new-member-emirates-id').files[0];
    const passportFile = document.getElementById('new-member-passport').files[0];
    
    const hasAttachments = !!(idCardFile || emiratesIdFile || passportFile);
    
    // Convert photo to object URL if provided, else use avatar placeholder
    const name = document.getElementById('new-member-name').value.trim();
    let photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
    
    if (photoFile) {
        photoUrl = URL.createObjectURL(photoFile);
    }

    const newMember = {
        id: Date.now(),
        memberNumber: getNextMemberNumberForCategory(parseInt(document.getElementById('new-member-category').value)),
        name: name,
        phone: document.getElementById('new-member-phone').value.trim(),
        regionId: parseInt(document.getElementById('new-member-region').value),
        categoryId: parseInt(document.getElementById('new-member-category').value),
        joinDate: new Date().toISOString().split('T')[0],
        photo: photoUrl,
        attachments: hasAttachments
    };

    membersData.push(newMember);
    renderMembers();
    updateDashboardStats();
    
    // Go back to list
    document.getElementById('add-member-form').reset();
    document.getElementById('btn-back-to-members').click();
    
    // Optional alert
    alert('تم إضافة العضو بنجاح!');
});

// Profile State
let currentProfileMemberId = null;

// View Member Profile
window.viewMemberProfile = function(id) {
    const member = membersData.find(m => m.id === id);
    if (!member) return;
    
    currentProfileMemberId = id;

    const category = getCategoryName(systemData.categories[member.categoryId]) || 'غير محدد';
    const region = systemData.regions.find(r => r.id === member.regionId);
    
    // Populate ID Card
    document.getElementById('profile-card-photo').src = member.photo;
    document.getElementById('profile-card-name').textContent = member.name;
    document.getElementById('profile-card-number').textContent = member.memberNumber 
        ? `ID: ${member.memberNumber}` 
        : `ID: MEM-${member.id.toString().slice(-4)}`;
    document.getElementById('profile-card-category').textContent = category;
    document.getElementById('profile-card-region').textContent = region ? region.name : 'غير محدد';
    
    // Populate Details
    document.getElementById('profile-phone').textContent = member.phone;
    document.getElementById('profile-amount').textContent = region ? `${region.amount} د.إ` : '0 د.إ';
    document.getElementById('profile-join-date').textContent = member.joinDate;
    
    const attachStatus = document.getElementById('profile-attachments-status');
    if (member.attachments) {
        attachStatus.textContent = 'مكتملة';
        attachStatus.className = 'badge in';
        attachStatus.style.background = '#20c997';
    } else {
        attachStatus.textContent = 'ناقصة';
        attachStatus.className = 'badge out';
        attachStatus.style.background = '#fa5252';
    }
    
    // Setup Date Filters (Default: start of current year -> today)
    const currentYear = new Date().getFullYear();
    document.getElementById('profile-filter-from').value = `${currentYear}-01-01`;
    document.getElementById('profile-filter-to').value = new Date().toISOString().split('T')[0];

    // Load Events
    renderMemberProfileEvents();

    // Switch Views Automatically if called from elsewhere (e.g. Reports)
    const membersNavItem = Array.from(document.querySelectorAll('.nav-item')).find(el => el.dataset.target === 'view-members');
    if (membersNavItem && !membersNavItem.classList.contains('active')) {
        switchView(membersNavItem);
    }

    // Switch Views
    membersListContainer.classList.add('hidden');
    addMemberContainer.classList.add('hidden');
    memberProfileContainer.classList.remove('hidden');
};

document.getElementById('btn-profile-filter')?.addEventListener('click', () => {
    renderMemberProfileEvents();
});

window.renderMemberProfileEvents = function() {
    if (!currentProfileMemberId) return;
    
    const memberId = currentProfileMemberId;
    const member = membersData.find(m => m.id === memberId);

    const fromDate = document.getElementById('profile-filter-from').value;
    const toDate = document.getElementById('profile-filter-to').value;
    
    // Filter events
    const memberEvents = eventsData.filter(event => {
        if (!event.selectedMembers.includes(memberId)) return false;
        
        let valid = true;
        if (fromDate && event.date < fromDate) valid = false;
        if (toDate && event.date > toDate) valid = false;
        return valid;
    });

    let totalPayout = 0;
    
    const tbody = document.getElementById('profile-events-table');
    if (!tbody) return;

    if (memberEvents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem;" class="text-muted">لا يوجد سجل حضور للمناسبات في هذه الفترة.</td></tr>';
        document.getElementById('profile-stat-count').textContent = '0';
        document.getElementById('profile-stat-amount').textContent = '0 د.إ';
        return;
    }

    tbody.innerHTML = memberEvents.map(event => {
        const typeName = systemData.eventTypes[event.typeId] || 'غير محدد';
        const evRegion = systemData.regions.find(r => r.id === event.regionId);
        const evRegionName = evRegion ? evRegion.name : 'غير محدد';
        // القسمة تُحسب من منطقة المناسبة (وليس منطقة العضو)
        const baseAmount = evRegion ? evRegion.amount : 0;

        let eventTotal = baseAmount;
        let deductionsAmount = 0;
        let bonusesAmount = 0;
        let isExcused = false;
        
        const mtxs = (event.auditTransactions || []).filter(t => t.memberId === memberId);
        mtxs.forEach(t => {
            if (t.type === 'خصم' || t.type === 'تأخير') {
                eventTotal -= t.amount;
                deductionsAmount += t.amount;
            } else if (t.type === 'علاوة') {
                eventTotal += t.amount;
                bonusesAmount += t.amount;
            } else if (t.type === 'اعتذار') {
                eventTotal = 0;
                isExcused = true;
            }
        });
        
        const finalEventAmount = Math.max(0, eventTotal);
        totalPayout += finalEventAmount;
        
        // بناء قائمة شارات البيان المالي بألوان واضحة
        let txHtml = `
            <div style="display:flex; flex-direction:column; gap:4px; min-width:200px;">
                <div style="display:flex; justify-content:space-between; align-items:center; padding:3px 8px; background:rgba(90,191,170,0.12); border:1px solid rgba(90,191,170,0.3); border-radius:4px; font-size:0.82rem;">
                    <span style="color:var(--text-main);">مبلغ القسمة</span>
                    <span style="color:var(--teal); font-weight:700;">+${baseAmount} د.إ</span>
                </div>`;
        if (bonusesAmount > 0) {
            txHtml += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:3px 8px; background:rgba(90,191,170,0.12); border:1px solid rgba(90,191,170,0.3); border-radius:4px; font-size:0.82rem;">
                    <span style="color:var(--text-main);">علاوات إضافية</span>
                    <span style="color:var(--teal); font-weight:700;">+${bonusesAmount} د.إ</span>
                </div>`;
        }
        if (deductionsAmount > 0) {
            txHtml += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:3px 8px; background:rgba(217,123,120,0.12); border:1px solid rgba(217,123,120,0.3); border-radius:4px; font-size:0.82rem;">
                    <span style="color:var(--text-main);">خصميات / تأخير</span>
                    <span style="color:var(--rose); font-weight:700;">-${deductionsAmount} د.إ</span>
                </div>`;
        }
        if (isExcused) {
            txHtml += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:3px 8px; background:rgba(168,152,120,0.12); border:1px solid var(--border); border-radius:4px; font-size:0.82rem;">
                    <span style="color:var(--text-main);"><i class="fa-solid fa-user-xmark"></i> اعتذار</span>
                    <span style="color:var(--text-muted); font-weight:600;">تم تصفير المستحقات</span>
                </div>`;
        }
        txHtml += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:5px 8px; background: linear-gradient(135deg, var(--gold-dim), rgba(186,146,114,0.05)); border:1px solid var(--gold-border); border-radius:4px; font-size:0.88rem; margin-top:2px;">
                    <strong style="color:var(--gold-light);">المحصلة النهائية</strong>
                    <strong style="color:var(--gold); font-size:0.95rem;">${finalEventAmount} د.إ</strong>
                </div>
            </div>`;

        // شارة الحالة (حضر / اعتذار)
        const statusBadge = isExcused
            ? `<span style="background:rgba(168,152,120,0.15); color:var(--text-muted); border:1px solid var(--border); padding:0.2rem 0.6rem; border-radius:20px; font-size:0.72rem; font-weight:600;"><i class="fa-solid fa-user-xmark"></i> اعتذار</span>`
            : `<span style="background:rgba(90,191,170,0.15); color:var(--teal); border:1px solid rgba(90,191,170,0.35); padding:0.2rem 0.6rem; border-radius:20px; font-size:0.72rem; font-weight:600;"><i class="fa-solid fa-check"></i> حضر</span>`;

        return `
            <tr>
                <td style="font-weight:700; color:var(--text-main);">
                    ${typeName}
                    <div style="margin-top:4px;">${statusBadge}</div>
                </td>
                <td>
                    <span style="background:var(--gold-dim); color:var(--gold); border:1px solid var(--gold-border); padding:0.3rem 0.7rem; border-radius:20px; font-size:0.8rem; font-weight:600;">
                        <i class="fa-solid fa-location-dot" style="font-size:0.7rem;"></i> ${evRegionName}
                    </span>
                </td>
                <td style="color:var(--text-main); font-weight:500;">${event.date}</td>
                <td style="min-width: 220px;">${txHtml}</td>
            </tr>
        `;
    }).join('');

    document.getElementById('profile-stat-count').textContent = memberEvents.length;
    document.getElementById('profile-stat-amount').textContent = `${totalPayout} د.إ`;
};

// ===== تصدير تقرير PDF احترافي للعضو =====
document.getElementById('btn-profile-export-pdf')?.addEventListener('click', () => {
    exportMemberReportPDF();
});

function exportMemberReportPDF() {
    if (!currentProfileMemberId) {
        alert('لم يتم تحديد عضو.');
        return;
    }
    const member = membersData.find(m => m.id === currentProfileMemberId);
    if (!member) return;

    const category = getCategoryName(systemData.categories[member.categoryId]) || 'غير محدد';
    const memberHomeRegion = systemData.regions.find(r => r.id === member.regionId);
    const memberRegionName = memberHomeRegion ? memberHomeRegion.name : 'غير محدد';
    const memberIdDisplay = member.memberNumber ? String(member.memberNumber) : `MEM-${member.id.toString().slice(-4)}`;

    const fromDate = document.getElementById('profile-filter-from').value;
    const toDate = document.getElementById('profile-filter-to').value;

    const memberEvents = eventsData.filter(ev => {
        if (!ev.selectedMembers.includes(member.id)) return false;
        if (fromDate && ev.date < fromDate) return false;
        if (toDate && ev.date > toDate) return false;
        return true;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    let totalPayout = 0, totalDeductions = 0, totalBonuses = 0, totalBaseContrib = 0, excusedCount = 0;

    const rows = memberEvents.map((ev, idx) => {
        const typeName = systemData.eventTypes[ev.typeId] || 'غير محدد';
        const evRegion = systemData.regions.find(r => r.id === ev.regionId);
        const evRegionName = evRegion ? evRegion.name : 'غير محدد';
        const baseAmount = evRegion ? evRegion.amount : 0;
        totalBaseContrib += baseAmount;

        let eventTotal = baseAmount;
        let ded = 0, bon = 0;
        let status = 'حضر';
        const mtxs = (ev.auditTransactions || []).filter(t => t.memberId === member.id);
        mtxs.forEach(t => {
            if (t.type === 'خصم' || t.type === 'تأخير') { eventTotal -= t.amount; ded += t.amount; }
            else if (t.type === 'علاوة') { eventTotal += t.amount; bon += t.amount; }
            else if (t.type === 'اعتذار') { eventTotal = 0; status = 'اعتذار'; }
        });
        const finalAmount = Math.max(0, eventTotal);
        totalPayout += finalAmount;
        totalDeductions += ded;
        totalBonuses += bon;
        if (status === 'اعتذار') excusedCount++;

        const statusBg = status === 'اعتذار' ? '#eeeeee' : '#e8f5f0';
        const statusColor = status === 'اعتذار' ? '#666' : '#2e7d5b';
        
        return `
            <tr>
                <td style="padding:7px; border:1px solid #E8DCC4; text-align:center;">${idx + 1}</td>
                <td style="padding:7px; border:1px solid #E8DCC4; text-align:center;">${ev.date}</td>
                <td style="padding:7px; border:1px solid #E8DCC4;">${typeName}</td>
                <td style="padding:7px; border:1px solid #E8DCC4; text-align:center;">${evRegionName}</td>
                <td style="padding:7px; border:1px solid #E8DCC4; text-align:center;">${baseAmount}</td>
                <td style="padding:7px; border:1px solid #E8DCC4; text-align:center; color:#c25550;">${ded || '-'}</td>
                <td style="padding:7px; border:1px solid #E8DCC4; text-align:center; color:#2e7d5b;">${bon || '-'}</td>
                <td style="padding:7px; border:1px solid #E8DCC4; text-align:center;">
                    <span style="background:${statusBg}; color:${statusColor}; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:700;">${status}</span>
                </td>
                <td style="padding:7px; border:1px solid #E8DCC4; text-align:center; font-weight:800; color:#8B6840;">${finalAmount}</td>
            </tr>
        `;
    }).join('');

    const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const periodLabel = (fromDate && toDate) ? `من ${fromDate} إلى ${toDate}` :
                        (fromDate ? `من ${fromDate}` : (toDate ? `حتى ${toDate}` : 'كل الفترات'));

    const photoImg = member.photo ? `<img src="${member.photo}" style="width:100%; height:100%; object-fit:cover;" crossorigin="anonymous" onerror="this.style.display='none'">` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#8B6840;font-size:40px;">\u{1F464}</div>';

    const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>تقرير العضو - ${member.name}</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
    <style>
        @page { size: A4; margin: 12mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Tajawal', Arial, sans-serif; direction: rtl; color: #2a2520; background: white; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #BA9272; padding-bottom: 14px; margin-bottom: 18px; position: relative; }
        .header::after { content: ''; position: absolute; bottom: -4px; right: 0; left: 0; height: 1px; background: linear-gradient(90deg, transparent, #D8B494, transparent); }
        .header h1 { font-size: 22px; color: #8B6840; font-weight: 800; letter-spacing: 0.3px; }
        .header .subtitle { font-size: 12px; color: #8B7A5F; margin-top: 3px; font-weight: 500; }
        .header-left { text-align: left; font-size: 12px; color: #5C5040; }
        .title-box { text-align: center; padding: 14px; background: linear-gradient(135deg, #FAF4E8 0%, #F5EBD8 100%); border: 1px solid #D8B494; border-radius: 10px; margin-bottom: 18px; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.5); }
        .title-box h2 { font-size: 17px; color: #2a2520; margin: 0; font-weight: 700; }
        .title-box .period { font-size: 12px; color: #8B6840; margin-top: 4px; font-weight: 600; letter-spacing: 0.3px; }
        .member-card { display: flex; gap: 18px; margin-bottom: 16px; background: #FDFAF3; border: 1px solid #E0C9A5; border-radius: 10px; padding: 16px; box-shadow: 0 1px 3px rgba(139,104,64,0.08); }
        .photo-circle { width: 95px; height: 95px; border-radius: 50%; border: 3px solid #BA9272; overflow: hidden; background: #fff; flex-shrink: 0; box-shadow: 0 0 0 1px #FAF4E8, 0 2px 6px rgba(139,104,64,0.15); }
        .member-details { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 7px 18px; font-size: 12px; align-content: center; }
        .member-details .row { display: flex; gap: 6px; }
        .member-details .label { color: #8B7A5F; min-width: 80px; }
        .member-details .value { font-weight: 700; color: #2a2520; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
        .stat { padding: 12px; border-radius: 10px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
        .stat .label { font-size: 10px; color: #6F6450; margin-bottom: 4px; font-weight: 600; letter-spacing: 0.2px; }
        .stat .value { font-size: 18px; font-weight: 800; line-height: 1.1; }
        .stat-gold { background: #FAF4E8; border: 1px solid #E0C9A5; }
        .stat-gold .value { color: #8B6840; }
        .stat-green { background: #E8F5F0; border: 1px solid #90c7b3; }
        .stat-green .value { color: #2e7d5b; }
        .stat-red { background: #FBEBEA; border: 1px solid #e6a8a6; }
        .stat-red .value { color: #c25550; }
        .stat-net { background: linear-gradient(135deg, #8B6840 0%, #BA9272 100%); color: white; box-shadow: 0 2px 6px rgba(139,104,64,0.3); }
        .stat-net .label { color: rgba(255,255,255,0.92); }
        .stat-net .value { color: white; }
        h3.section { font-size: 14px; color: #8B6840; margin: 18px 0 8px 0; padding-bottom: 6px; border-bottom: 2px solid #D8B494; font-weight: 700; letter-spacing: 0.3px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(139,104,64,0.1); }
        thead tr { background: linear-gradient(135deg, #8B6840 0%, #A07A50 100%); color: white; }
        thead th { padding: 9px 7px; border: 1px solid #6F5232; font-weight: 700; letter-spacing: 0.2px; }
        tbody tr { transition: background 0.1s; }
        tbody tr:nth-child(even) { background: #FDFAF3; }
        tbody td { color: #2a2520; }
        tfoot tr { background: #FAF4E8; font-weight: 700; }
        .no-data { text-align: center; padding: 28px; background: #FDFAF3; border: 1px dashed #D8B494; border-radius: 10px; color: #8B7A5F; font-size: 13px; }
        .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #D8B494; display: flex; justify-content: space-between; font-size: 10px; color: #8B7A5F; }
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>فرقة المزيود الحربية</h1>
            <div class="subtitle">نظام إدارة المناسبات والأعضاء</div>
        </div>
        <div class="header-left">
            <div><strong>تاريخ التقرير:</strong> ${today}</div>
            <div><strong>الفترة:</strong> ${periodLabel}</div>
        </div>
    </div>

    <div class="title-box">
        <h2>تقرير حضور المناسبات للعضو</h2>
        <div class="period">${periodLabel}</div>
    </div>

    <div class="member-card">
        <div class="photo-circle">${photoImg}</div>
        <div class="member-details">
            <div class="row"><span class="label">الاسم:</span> <span class="value">${member.name}</span></div>
            <div class="row"><span class="label">رقم العضوية:</span> <span class="value" style="color:#8B6840; font-family:monospace;">${memberIdDisplay}</span></div>
            <div class="row"><span class="label">الفئة:</span> <span class="value">${category}</span></div>
            <div class="row"><span class="label">المنطقة:</span> <span class="value">${memberRegionName}</span></div>
            <div class="row"><span class="label">رقم الهاتف:</span> <span class="value" style="direction:ltr;">${member.phone}</span></div>
            <div class="row"><span class="label">تاريخ الانضمام:</span> <span class="value">${member.joinDate || '-'}</span></div>
            <div class="row"><span class="label">حالة المرفقات:</span> <span class="value" style="color:${member.attachments ? '#2e7d5b' : '#c25550'};">${member.attachments ? 'مكتملة' : 'ناقصة'}</span></div>
            <div class="row"><span class="label">عدد المناسبات:</span> <span class="value" style="color:#8B6840;">${memberEvents.length}</span></div>
        </div>
    </div>

    <div class="stats">
        <div class="stat stat-gold">
            <div class="label">عدد المناسبات</div>
            <div class="value">${memberEvents.length}</div>
        </div>
        <div class="stat stat-green">
            <div class="label">إجمالي العلاوات</div>
            <div class="value">${totalBonuses}</div>
        </div>
        <div class="stat stat-red">
            <div class="label">إجمالي الخصومات</div>
            <div class="value">${totalDeductions}</div>
        </div>
        <div class="stat stat-net">
            <div class="label">صافي المستحق</div>
            <div class="value">${totalPayout} د.إ</div>
        </div>
    </div>

    <h3 class="section">جدول المناسبات المُشارَك بها</h3>
    ${memberEvents.length === 0 ? '<div class="no-data">لا توجد مناسبات مسجلة خلال هذه الفترة</div>' : `
    <table>
        <thead>
            <tr>
                <th style="width:35px;">#</th>
                <th style="width:85px;">التاريخ</th>
                <th>المناسبة</th>
                <th style="width:80px;">المنطقة</th>
                <th style="width:60px;">القسمة</th>
                <th style="width:60px;">خصومات</th>
                <th style="width:60px;">علاوات</th>
                <th style="width:65px;">الحالة</th>
                <th style="width:70px;">المحصلة</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
            <tr>
                <td colspan="4" style="padding:9px; border:1px solid #E8DCC4; text-align:left;">الإجمالي</td>
                <td style="padding:9px; border:1px solid #E8DCC4; text-align:center;">${totalBaseContrib}</td>
                <td style="padding:9px; border:1px solid #E8DCC4; text-align:center; color:#c25550;">${totalDeductions}</td>
                <td style="padding:9px; border:1px solid #E8DCC4; text-align:center; color:#2e7d5b;">${totalBonuses}</td>
                <td style="padding:9px; border:1px solid #E8DCC4; text-align:center;">${excusedCount > 0 ? 'اعتذر ' + excusedCount : '-'}</td>
                <td style="padding:9px; border:1px solid #E8DCC4; text-align:center; background:#8B6840; color:white; font-size:13px;">${totalPayout} د.إ</td>
            </tr>
        </tfoot>
    </table>
    `}

    <div class="footer">
        <div>© ${new Date().getFullYear()} فرقة المزيود الحربية — جميع الحقوق محفوظة</div>
        <div>التوقيع المعتمد: ________________</div>
    </div>

    <script>
        window.addEventListener('load', function() {
            // انتظار تحميل الخط قبل الطباعة لضمان النص العربي النقي
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(function() {
                    setTimeout(function() {
                        window.print();
                        setTimeout(function(){ window.close(); }, 500);
                    }, 300);
                });
            } else {
                setTimeout(function() {
                    window.print();
                    setTimeout(function(){ window.close(); }, 500);
                }, 700);
            }
        });
    </script>
</body>
</html>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { alert('يرجى السماح بفتح النوافذ المنبثقة لطباعة التقرير.'); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
}
// ===== نهاية دالة تصدير PDF =====

window.deleteMember = function(id) {
    if (confirm('هل أنت متأكد من حذف هذا العضو بالكامل؟')) {
        membersData = membersData.filter(m => m.id !== id);
        renderMembers();
    }
};

// ═══════════════════════════════════════════════════════
// طباعة بطاقة العضو (كبطاقة فعلية بحجم ID card قياسي)
// ═══════════════════════════════════════════════════════
window.printMembershipCard = function() {
    if (!currentProfileMemberId) {
        alert('لم يتم تحديد عضو.');
        return;
    }
    const member = membersData.find(m => m.id === currentProfileMemberId);
    if (!member) return;

    const category = getCategoryName(systemData.categories[member.categoryId]) || 'غير محدد';
    const memberRegion = systemData.regions.find(r => r.id === member.regionId);
    const memberRegionName = memberRegion ? memberRegion.name : '-';
    const memberIdShort = member.memberNumber ? String(member.memberNumber) : `MEM-${member.id.toString().slice(-4)}`;
    const photoSrc = member.photo || '';

    // حجم بطاقة ID قياسي: 85.6mm × 53.98mm (CR80)
    const cardHtml = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>بطاقة عضوية - ${member.name}</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
    <style>
        @page {
            size: 90mm 56mm;
            margin: 0;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Tajawal', sans-serif;
            direction: rtl;
            background: #1a1815;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
        }
        .card {
            width: 85.6mm;
            height: 53.98mm;
            background: linear-gradient(135deg, #0C0B09 0%, #1A1714 50%, #0C0B09 100%);
            border-radius: 3mm;
            position: relative;
            overflow: hidden;
            color: #F2EAD8;
            box-shadow: 0 8px 24px rgba(0,0,0,0.45), 0 0 0 0.3mm #BA9272;
            padding: 4mm;
            display: flex;
            gap: 3mm;
        }
        /* خط ذهبي علوي ناعم */
        .card::before {
            content: '';
            position: absolute;
            top: 0; right: 0; left: 0;
            height: 0.6mm;
            background: linear-gradient(90deg, transparent, #BA9272 30%, #D8B494 50%, #BA9272 70%, transparent);
        }
        /* توهج نحاسي خفيف في الزاوية */
        .card::after {
            content: '';
            position: absolute;
            top: -8mm; left: -8mm;
            width: 22mm; height: 22mm;
            background: radial-gradient(circle, rgba(186,146,114,0.18) 0%, transparent 70%);
            border-radius: 50%;
            pointer-events: none;
        }
        .card-left {
            width: 22mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 1.5mm;
            z-index: 2;
        }
        .photo-circle {
            width: 20mm; height: 20mm;
            border-radius: 50%;
            border: 0.6mm solid #BA9272;
            overflow: hidden;
            background: #1A1714;
            box-shadow: 0 0 4mm rgba(186,146,114,0.25);
        }
        .photo-circle img {
            width: 100%; height: 100%;
            object-fit: cover;
        }
        .photo-placeholder {
            width:100%; height:100%;
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:8mm;
            color:#BA9272;
        }
        .member-id {
            font-family: 'Courier New', monospace;
            font-size: 2.2mm;
            font-weight: 700;
            letter-spacing: 0.5mm;
            background: rgba(186,146,114,0.15);
            border: 0.15mm solid rgba(186,146,114,0.4);
            color: #D8B494;
            padding: 0.5mm 1.8mm;
            border-radius: 1mm;
        }
        .card-right {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            z-index: 2;
            padding: 0.5mm 0;
        }
        .card-header {
            border-bottom: 0.2mm solid rgba(186,146,114,0.45);
            padding-bottom: 1mm;
            margin-bottom: 1.5mm;
        }
        .card-header .title {
            font-size: 3.2mm;
            font-weight: 800;
            line-height: 1.1;
            color: #D8B494;
            letter-spacing: 0.1mm;
        }
        .card-header .subtitle {
            font-size: 2mm;
            color: #A89878;
            margin-top: 0.4mm;
            font-weight: 500;
        }
        .member-name {
            font-size: 3.8mm;
            font-weight: 800;
            line-height: 1.1;
            margin-bottom: 1.2mm;
            color: #F2EAD8;
        }
        .info-row {
            font-size: 2.2mm;
            display: flex;
            gap: 1.5mm;
            margin-bottom: 0.6mm;
        }
        .info-row .label {
            color: #8B7A5F;
            min-width: 11mm;
        }
        .info-row .value {
            font-weight: 600;
            color: #E8DCC4;
        }
        .award-icon {
            position: absolute;
            left: 4mm;
            bottom: 3mm;
            font-size: 5mm;
            color: rgba(186,146,114,0.18);
            z-index: 1;
            font-weight: 800;
        }
        @media print {
            body {
                background: white;
                padding: 0;
            }
            .card {
                box-shadow: 0 0 0 0.3mm #8B6840;
                margin: 2mm auto;
                /* Force background color print in modern browsers */
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="card-left">
            <div class="photo-circle">
                ${photoSrc ? `<img src="${photoSrc}" alt="${member.name}">` : '<div class="photo-placeholder">👤</div>'}
            </div>
            <div class="member-id">${memberIdShort}</div>
        </div>
        <div class="card-right">
            <div class="card-header">
                <div class="title">فرقة المزيود الحربية</div>
                <div class="subtitle">بطاقة عضوية معتمدة</div>
            </div>
            <div>
                <div class="member-name">${member.name}</div>
                <div class="info-row"><span class="label">الفئة:</span> <span class="value">${category}</span></div>
                <div class="info-row"><span class="label">المنطقة:</span> <span class="value">${memberRegionName}</span></div>
                <div class="info-row"><span class="label">الانضمام:</span> <span class="value">${member.joinDate || '-'}</span></div>
            </div>
        </div>
        <div class="award-icon">★</div>
    </div>
    <script>
        // طباعة تلقائية بعد تحميل الصور
        window.addEventListener('load', function() {
            setTimeout(function() {
                window.print();
                // إغلاق النافذة بعد الطباعة (أو الإلغاء)
                setTimeout(function() { window.close(); }, 500);
            }, 300);
        });
    </script>
</body>
</html>
    `;

    // فتح نافذة جديدة للبطاقة فقط
    const printWin = window.open('', '_blank', 'width=500,height=350');
    if (!printWin) {
        alert('يرجى السماح بفتح النوافذ المنبثقة لطباعة البطاقة.');
        return;
    }
    printWin.document.open();
    printWin.document.write(cardHtml);
    printWin.document.close();
};

// Initial Render for Members
renderMembers();

// --- Event Management Logic ---

// DOM Elements
const eventsListContainer = document.getElementById('events-list-container');
const addEventContainer = document.getElementById('add-event-container');
const eventsGridView = document.getElementById('events-grid-view');

// Temporary Event State
let tempEventExpenses = [];
let tempSelectedCategoryIds = new Set();
let tempSelectedMemberIds = new Set();

function renderEvents() {
    if (!eventsGridView) return;

    if (eventsData.length === 0) {
        eventsGridView.innerHTML = '<p class="text-muted" style="text-align:center; grid-column: 1/-1;">لا توجد مناسبات مسجلة بعد.</p>';
        return;
    }

    eventsGridView.innerHTML = eventsData.map(event => {
        const typeName = systemData.eventTypes[event.typeId] || 'غير محدد';
        const regionName = systemData.regions.find(r => r.id === event.regionId)?.name || 'غير محدد';
        
        // Format Date for UI
        const [year, month, day] = event.date.split('-');
        const monthsAr = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
        const monthName = monthsAr[parseInt(month) - 1];

        // Calc
        const totalExpenses = event.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        
        // Setup audit transactions fallback
        if (!event.auditTransactions) event.auditTransactions = [];
        
        const deductions = event.auditTransactions.filter(t => t.type === 'خصم' || t.type === 'تأخير').reduce((sum, t) => sum + t.amount, 0);
        const bonuses = event.auditTransactions.filter(t => t.type === 'علاوة').reduce((sum, t) => sum + t.amount, 0);

        // Calc contributions (In a real app, this might be a static sum based on members region amount at time of creation. We'll simply lookup current region amount for simplicity)
        let totalContributions = 0;
        event.selectedMembers.forEach(mId => {
            const member = membersData.find(m => m.id === mId);
            if(member) {
               const r = systemData.regions.find(rg => rg.id === member.regionId);
               if(r) totalContributions += r.amount;
            }
        });

        const balance = totalContributions - totalExpenses + deductions - bonuses;

        // 🔔 إحصاء استجابات الأعضاء (للمدير لمعرفة من قبل/اعتذر/معلّق)
        if (typeof ensureEventResponses === 'function') ensureEventResponses(event);
        let respAccepted = 0, respExcused = 0, respPending = 0;
        (event.selectedMembers || []).forEach(mid => {
            const r = (event.memberResponses && event.memberResponses[mid]) || { status: 'pending' };
            if (r.status === 'accepted') respAccepted++;
            else if (r.status === 'excused') respExcused++;
            else respPending++;
        });
        const responsesBar = `
            <div style="margin-top:0.6rem; padding-top:0.6rem; border-top:1px dashed var(--border-color); display:flex; gap:0.5rem; flex-wrap:wrap; font-size:0.85rem;" title="ردود الأعضاء على الدعوة">
                <span style="background:rgba(46,125,91,0.15); color:#20c997; padding:0.2rem 0.6rem; border-radius:12px; font-weight:600;"><i class="fa-solid fa-circle-check"></i> قبل: ${respAccepted}</span>
                <span style="background:rgba(194,85,80,0.15); color:#c25550; padding:0.2rem 0.6rem; border-radius:12px; font-weight:600;"><i class="fa-solid fa-circle-xmark"></i> اعتذر: ${respExcused}</span>
                <span style="background:rgba(252,196,25,0.15); color:#fcc419; padding:0.2rem 0.6rem; border-radius:12px; font-weight:600;"><i class="fa-solid fa-clock"></i> بانتظار: ${respPending}</span>
            </div>`;

        return `
            <div class="event-card" style="align-items: flex-start;">
                <div class="event-date">
                    <span class="day">${day}</span>
                    <span class="month">${monthName}</span>
                </div>
                <div class="event-details">
                    <div style="display:flex; justify-content:space-between;">
                        <h4 style="color:var(--primary); font-size:1.2rem;">${typeName}</h4>
                        <span class="badge" style="background:var(--text-muted)">${regionName}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <p style="margin-top:0.5rem;"><i class="fa-solid fa-users text-muted"></i> أعضاء مشاركين: <strong>${event.selectedMembers.length}</strong> (حضور مخصص: ${event.attendeesCount || event.selectedMembers.length})</p>
                        <button class="btn-outline btn-sm action-audit-btn" onclick="openEventAudit(${event.id})"><i class="fa-solid fa-clipboard-check"></i> التفاصيل والتدقيق</button>
                    </div>
                    <div style="margin-top:0.8rem; padding-top:0.8rem; border-top:1px dashed var(--border-color); display:flex; justify-content:space-between; font-size:0.9rem;">
                        <span style="color:#20c997;" title="القسمة"><i class="fa-solid fa-arrow-down"></i> ${totalContributions} د.إ</span>
                        <span style="color:#fa5252;" title="المصاريف"><i class="fa-solid fa-arrow-up"></i> ${totalExpenses} د.إ</span>
                        <span style="color:var(--primary); font-weight:bold;" title="الرصيد المتبقي"><i class="fa-solid fa-vault"></i> ${balance} د.إ</span>
                    </div>
                    ${responsesBar}
                </div>
            </div>
        `;
    }).join('');
}

// Navigation
document.getElementById('btn-show-add-event')?.addEventListener('click', () => {
    // Reset Temporary State
    tempEventExpenses = [];
    tempSelectedCategoryIds.clear();
    tempSelectedMemberIds.clear();
    
    // Populate Selects
    const typeSelect = document.getElementById('event-type-select');
    const regionSelect = document.getElementById('event-region-select');
    
    if(typeSelect) typeSelect.innerHTML = systemData.eventTypes.map((t, i) => `<option value="${i}">${t}</option>`).join('');
    if(regionSelect) regionSelect.innerHTML = systemData.regions.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
    
    // Set default date to today
    document.getElementById('event-date').value = new Date().toISOString().split('T')[0];
    
    // Render Filters
    const catFiltersContainer = document.getElementById('event-category-filters');
    if(catFiltersContainer) {
        catFiltersContainer.innerHTML = systemData.categories.map((c, i) => `
            <label style="display:flex; align-items:center; gap:0.3rem; background:var(--bg-card); color:var(--text-main); padding:0.3rem 0.6rem; border:1px solid var(--border); border-radius:20px; font-size:0.85rem; cursor:pointer;">
                <input type="checkbox" value="${i}" class="cat-filter-chk" checked>
                <span>${getCategoryName(c)}</span>
            </label>
        `).join('');
        
        // Default to all checked
        systemData.categories.forEach((_, i) => tempSelectedCategoryIds.add(i));
        
        // Add Listeners to filters
        document.querySelectorAll('.cat-filter-chk').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const val = parseInt(e.target.value);
                e.target.checked ? tempSelectedCategoryIds.add(val) : tempSelectedCategoryIds.delete(val);
                renderEventMembersList();
            });
        });
    }

    renderEventMembersList();
    renderEventExpensesList();
    updateLiveSummary();

    eventsListContainer.classList.add('hidden');
    addEventContainer.classList.remove('hidden');
});

document.getElementById('btn-back-to-events')?.addEventListener('click', () => {
    addEventContainer.classList.add('hidden');
    eventsListContainer.classList.remove('hidden');
});

// Member Checklist Logic
function renderEventMembersList() {
    const listContainer = document.getElementById('event-members-list');
    if(!listContainer) return;

    // منطقة المناسبة تحدد قسمة كل عضو (وليس منطقة العضو)
    const eventRegionId = parseInt(document.getElementById('event-region-select').value);
    const eventRegion = systemData.regions.find(r => r.id === eventRegionId);
    const perMemberAmount = eventRegion ? eventRegion.amount : 0;
    const eventRegionName = eventRegion ? eventRegion.name : '';

    // Filter members based on checked categories
    const filteredMembers = membersData.filter(m => tempSelectedCategoryIds.has(m.categoryId));
    
    if(filteredMembers.length === 0){
        listContainer.innerHTML = '<li class="text-muted" style="text-align:center;">لا يوجد أعضاء في الفئات المحددة.</li>';
        return;
    }

    listContainer.innerHTML = filteredMembers.map(member => {
        // منطقة العضو (معلومة تعريفية فقط)
        const memberRegion = systemData.regions.find(r => r.id === member.regionId);
        const memberRegionName = memberRegion ? memberRegion.name : 'غير محدد';
        const isChecked = tempSelectedMemberIds.has(member.id);
        
        // إذا لم تُحدد منطقة المناسبة بعد، نُنبّه
        const hasValidEventRegion = eventRegion && perMemberAmount > 0;
        
        // تنسيق العنصر حسب حالة التحديد
        const liBorder = isChecked ? 'var(--gold)' : 'var(--border)';
        const liBg = isChecked ? 'var(--gold-dim)' : 'var(--bg-card)';
        const liShadow = isChecked ? '0 0 0 1px var(--gold-border)' : 'none';
        
        return `
            <li style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0.8rem; background:${liBg}; color:var(--text-main); border:1px solid ${liBorder}; box-shadow:${liShadow}; border-radius:6px; cursor:pointer; transition: all 0.2s;" onclick="toggleMemberSelection(${member.id}, this)">
                <div style="display:flex; align-items:center; gap:0.8rem; flex:1;">
                    <input type="checkbox" ${isChecked ? 'checked' : ''} style="pointer-events:none; accent-color: var(--gold);">
                    <img src="${member.photo}" style="width:32px; height:32px; border-radius:50%; border:1px solid var(--gold-border);">
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:600;">${member.name}</span>
                        <span style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-solid fa-location-dot" style="font-size:0.7rem;"></i> ${memberRegionName}</span>
                    </div>
                </div>
                ${hasValidEventRegion ? `
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:2px;">
                        <span style="font-size:0.7rem; color:var(--text-muted);">قسمة ${eventRegionName}</span>
                        <span style="background: linear-gradient(135deg, var(--gold-dark), var(--gold)); color:#0C0B09; font-weight:700; padding:0.25rem 0.7rem; border-radius:20px; font-size:0.85rem; min-width:70px; text-align:center;">${perMemberAmount} د.إ</span>
                    </div>
                ` : `
                    <span style="background:rgba(217,123,120,0.15); color:var(--rose); border:1px solid rgba(217,123,120,0.35); padding:0.25rem 0.7rem; border-radius:20px; font-size:0.75rem;" title="حدد منطقة المناسبة أولاً"><i class="fa-solid fa-triangle-exclamation"></i> اختر منطقة المناسبة</span>
                `}
            </li>
        `;
    }).join('');
    
    // Auto-select all filtered members if their state hasn't been deliberately unchecked? 
    // To keep it clean, let's just default to selecting everyone that is visible initially, or require manual selection.
    // Let's require manual selection or select all visible. Let's auto-select everyone when rendering for the first time.
    // Actually, user wants to Check who contributes. Let's just track selection accurately.
}

window.toggleMemberSelection = function(id, liElement) {
    const chk = liElement.querySelector('input[type="checkbox"]');
    if (tempSelectedMemberIds.has(id)) {
        tempSelectedMemberIds.delete(id);
        chk.checked = false;
        liElement.style.borderColor = 'var(--border)';
        liElement.style.background = 'var(--bg-card)';
        liElement.style.boxShadow = 'none';
    } else {
        tempSelectedMemberIds.add(id);
        chk.checked = true;
        liElement.style.borderColor = 'var(--gold)';
        liElement.style.background = 'var(--gold-dim)';
        liElement.style.boxShadow = '0 0 0 1px var(--gold-border)';
    }
    updateLiveSummary();
};

// Select All Button? We can rely on individual clicks.
// Optional: Pre-select all members when the modal opens.
const defaultSelectAll = () => {
    membersData.forEach(m => tempSelectedMemberIds.add(m.id));
}

// Ensure defaultSelectAll runs when modal opens
document.getElementById('btn-show-add-event')?.addEventListener('click', () => {
   defaultSelectAll();
   renderEventMembersList();
   updateLiveSummary();
});

// Expense Logic
document.getElementById('btn-add-expense')?.addEventListener('click', () => {
    const descInput = document.getElementById('expense-desc');
    const amountInput = document.getElementById('expense-amount');
    
    if (descInput.value.trim() && amountInput.value) {
        tempEventExpenses.push({
            id: Date.now(),
            desc: descInput.value.trim(),
            amount: parseFloat(amountInput.value)
        });
        descInput.value = '';
        amountInput.value = '';
        renderEventExpensesList();
    }
});

function renderEventExpensesList() {
    const listContainer = document.getElementById('event-expenses-list');
    if(!listContainer) return;

    if (tempEventExpenses.length === 0) {
        listContainer.innerHTML = '<li class="text-muted" style="text-align:center; padding:1rem;">لا توجد مصاريف مضافة.</li>';
    } else {
        listContainer.innerHTML = tempEventExpenses.map((exp, index) => `
            <li style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem 1rem; background:var(--bg-card); color:var(--text-main); border:1px solid rgba(217,123,120,0.3); border-radius:6px; border-right: 4px solid var(--rose);">
                <span>${exp.desc}</span>
                <div style="display:flex; align-items:center; gap:1rem;">
                    <span style="font-weight:bold; color:var(--rose);">${exp.amount} د.إ</span>
                    <button type="button" class="btn-plain text-muted" onclick="removeTempExpense(${index})" title="حذف"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </li>
        `).join('');
    }
    updateLiveSummary();
}

window.removeTempExpense = function(index) {
    tempEventExpenses.splice(index, 1);
    renderEventExpensesList();
};

// Validation logic
const eventAttendeesCountInput = document.getElementById('event-attendees-count');
const validationMsg = document.getElementById('event-validation-msg');
const btnSubmitEvent = document.getElementById('btn-submit-event');
const btnRevertMembers = document.getElementById('btn-revert-members');

function validateEventAttendees() {
    if(!eventAttendeesCountInput || !validationMsg || !btnSubmitEvent) return;
    const requiredCount = parseInt(eventAttendeesCountInput.value) || 0;
    const actualCount = tempSelectedMemberIds.size;
    
    if (requiredCount > 0 && requiredCount === actualCount) {
        validationMsg.innerHTML = '<i class="fa-solid fa-check-circle"></i> العدد مطابق للاختيار.';
        validationMsg.style.color = '#20c997';
        btnSubmitEvent.disabled = false;
        btnRevertMembers.classList.add('hidden');
    } else {
        validationMsg.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> يرجى مطابقة عدد الأعضاء المحدد مع عدد الحضور.';
        validationMsg.style.color = '#fa5252';
        btnSubmitEvent.disabled = true;
        
        if (actualCount > 0) {
            btnRevertMembers.classList.remove('hidden');
        } else {
            btnRevertMembers.classList.add('hidden');
        }
    }
}

eventAttendeesCountInput?.addEventListener('input', validateEventAttendees);

btnRevertMembers?.addEventListener('click', () => {
    tempSelectedMemberIds.clear();
    document.querySelectorAll('#event-members-list input[type="checkbox"]').forEach(chk => {
        chk.checked = false;
        chk.closest('li').style.borderColor = 'var(--border-color)';
    });
    updateLiveSummary();
});

// Summary Logic
function updateLiveSummary() {
    // مبلغ الاتفاق
    const agreementAmount = parseFloat(document.getElementById('event-total-amount').value) || 0;

    // منطقة المناسبة هي التي تحدد قسمة كل عضو (وليس منطقة العضو)
    const eventRegionId = parseInt(document.getElementById('event-region-select').value);
    const eventRegion = systemData.regions.find(r => r.id === eventRegionId);
    const perMemberAmount = eventRegion ? eventRegion.amount : 0;

    // قسمة الأعضاء المشاركين = عدد الأعضاء × قسمة منطقة المناسبة
    const totalContrib = tempSelectedMemberIds.size * perMemberAmount;

    // المصاريف الإضافية
    const totalExp = tempEventExpenses.reduce((sum, item) => sum + item.amount, 0);

    // المتبقي = مبلغ الاتفاق - قسمة الأعضاء - المصاريف
    const balance = agreementAmount - totalContrib - totalExp;

    const agreementEl = document.getElementById('live-agreement-amount');
    if (agreementEl) agreementEl.textContent = `${agreementAmount} د.إ`;
    document.getElementById('live-total-contributions').textContent = `${totalContrib} د.إ`;
    document.getElementById('live-total-expenses').textContent = `${totalExp} د.إ`;
    const balanceEl = document.getElementById('live-final-balance');
    balanceEl.textContent = `${balance} د.إ`;
    // لون تحذيري لو صار الرصيد سالب
    balanceEl.style.color = balance < 0 ? 'var(--rose)' : 'var(--gold)';
    
    validateEventAttendees();
}

// تحديث فوري عند تغيير مبلغ الاتفاق أو منطقة المناسبة
document.getElementById('event-total-amount')?.addEventListener('input', updateLiveSummary);
document.getElementById('event-region-select')?.addEventListener('change', () => {
    updateLiveSummary();
    // إعادة رسم قائمة الأعضاء لتحديث مبلغ القسمة الظاهر لكل عضو
    if (typeof renderEventMembersList === 'function') renderEventMembersList();
});

// Handle Add Event Submit
document.getElementById('add-event-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (tempSelectedMemberIds.size === 0) {
        alert('يجب اختيار عضو مشارك واحد على الأقل.');
        return;
    }

    const newEvent = {
        id: Date.now(),
        typeId: parseInt(document.getElementById('event-type-select').value),
        regionId: parseInt(document.getElementById('event-region-select').value),
        date: document.getElementById('event-date').value,
        totalBudget: parseFloat(document.getElementById('event-total-amount').value),
        attendeesCount: parseInt(document.getElementById('event-attendees-count').value),
        selectedMembers: Array.from(tempSelectedMemberIds),
        expenses: [...tempEventExpenses],
        auditTransactions: [],
        memberResponses: {}  // 🔔 سيتم تعبئته تلقائياً عبر ensureEventResponses
    };

    // تهيئة استجابات الأعضاء كـ "بانتظار" لكل عضو محدد
    if (typeof ensureEventResponses === 'function') ensureEventResponses(newEvent);

    eventsData.unshift(newEvent); // Add to beginning

    // 💾 حفظ في localStorage ليراها العضو عند تسجيل دخوله
    if (typeof saveEventsToStorage === 'function') saveEventsToStorage();

    renderEvents();
    updateDashboardStats();
    
    // Go back
    document.getElementById('add-event-form').reset();
    document.getElementById('btn-back-to-events').click();
    
    alert('تم تسجيل المناسبة بنجاح.\nسيتم إيداع المبلغ المتبقي في الصندوق عند اعتماد المناسبة نهائياً.\nسيتم إشعار الأعضاء المشاركين عبر بوابتهم.');
});

// Initial Render
renderEvents();

// --- Event Auditing Logic ---
const eventAuditContainer = document.getElementById('event-audit-container');

document.getElementById('btn-back-to-events-from-audit')?.addEventListener('click', () => {
    if(eventAuditContainer) eventAuditContainer.classList.add('hidden');
    eventsListContainer.classList.remove('hidden');
});

window.openEventAudit = function(eventId) {
    const event = eventsData.find(e => e.id === eventId);
    if (!event) return;

    if (!event.auditTransactions) event.auditTransactions = [];
    
    // Header details
    const typeName = systemData.eventTypes[event.typeId] || 'غير محدد';
    const regionName = systemData.regions.find(r => r.id === event.regionId)?.name || 'غير محدد';
    
    document.getElementById('audit-event-type').textContent = typeName;
    document.getElementById('audit-event-region').textContent = regionName;
    document.getElementById('audit-event-date').textContent = event.date;
    document.getElementById('audit-event-budget').textContent = `${event.totalBudget || 0} د.إ`;

    // قسمة الأعضاء = عدد المشاركين × قسمة منطقة المناسبة
    const eventRegionForAudit = systemData.regions.find(r => r.id === event.regionId);
    const perMemberAmount = eventRegionForAudit ? eventRegionForAudit.amount : 0;
    const totalContrib = event.selectedMembers.length * perMemberAmount;
    // المصاريف الإضافية
    const totalExp = event.expenses.reduce((s, e) => s + e.amount, 0);

    // الخصومات/التأخير/الاعتذار ترجع للاتفاق (وارد)
    const deductions = event.auditTransactions.filter(t => t.type === 'خصم' || t.type === 'تأخير' || t.type === 'اعتذار').reduce((sum, t) => sum + t.amount, 0);
    // العلاوات تُصرف من الاتفاق (خصم)
    const bonuses = event.auditTransactions.filter(t => t.type === 'علاوة').reduce((sum, t) => sum + t.amount, 0);

    // المتبقي النهائي للصندوق:
    //   مبلغ الاتفاق - قسمة الأعضاء - المصاريف + الخصومات المستردة - العلاوات
    const agreementAmount = event.totalBudget || 0;
    const balance = agreementAmount - totalContrib - totalExp + deductions - bonuses;

    document.getElementById('audit-event-deductions').textContent = `${deductions} د.إ`;
    document.getElementById('audit-event-bonuses').textContent = `${bonuses} د.إ`;
    // الحقول الجديدة
    const contribEl = document.getElementById('audit-event-contrib');
    const expensesEl = document.getElementById('audit-event-expenses');
    if (contribEl) contribEl.textContent = `${totalContrib} د.إ`;
    if (expensesEl) expensesEl.textContent = `${totalExp} د.إ`;
    const finalEl = document.getElementById('audit-event-final-balance');
    finalEl.textContent = `${balance} د.إ`;
    finalEl.style.color = balance < 0 ? 'var(--rose)' : 'var(--gold)';

    // Members list
    const tbody = document.getElementById('audit-members-table-body');
    if(tbody) {
        tbody.innerHTML = event.selectedMembers.map(mId => {
            const member = membersData.find(m => m.id === mId);
            if (!member) return '';
            const catName = getCategoryName(systemData.categories[member.categoryId]) || 'عضو';
            const memberRegion = systemData.regions.find(rg => rg.id === member.regionId);
            const memberRegionName = memberRegion ? memberRegion.name : '-';
            // القسمة تُحسب من منطقة المناسبة (وليس منطقة العضو)
            const baseAmount = perMemberAmount;
            
            // Find transactions for this member
            const mtxs = event.auditTransactions.filter(t => t.memberId === member.id);
            const txHtml = mtxs.map(t => {
                let color = '#20c997';
                if(t.type === 'علاوة') color = '#fa5252';
                else if(t.type === 'اعتذار') color = '#adb5bd';
                return `<span class="badge" style="margin:2px; font-size:0.75rem; background:${color}">${t.type}: ${t.amount}</span>`;
            }).join('');

            return `
                <tr>
                    <td>
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <img src="${member.photo}" style="width:24px; height:24px; border-radius:50%;">
                            <span>${member.name}</span>
                        </div>
                    </td>
                    <td style="direction:ltr;">${member.phone}</td>
                    <td><span class="badge in">${catName}</span></td>
                    <td><strong style="color:var(--primary);">${baseAmount} د.إ</strong></td>
                    <td>
                        <button class="action-btn" title="تأخير" onclick="addAuditTransaction(${eventId}, ${mId}, 'تأخير')" style="background:rgba(255,193,7,0.15); color:#FFC107; border:1px solid rgba(255,193,7,0.35); width:30px;" ${event.verified ? 'disabled' : ''}><i class="fa-solid fa-clock"></i></button>
                        <button class="action-btn" title="خصم" onclick="addAuditTransaction(${eventId}, ${mId}, 'خصم')" style="background:rgba(217,123,120,0.15); color:var(--rose); border:1px solid rgba(217,123,120,0.35); width:30px;" ${event.verified ? 'disabled' : ''}><i class="fa-solid fa-minus-circle"></i></button>
                        <button class="action-btn" title="علاوة ${catName}" onclick="addAuditTransaction(${eventId}, ${mId}, 'علاوة')" style="background:rgba(90,191,170,0.15); color:var(--teal); border:1px solid rgba(90,191,170,0.35); width:30px;" ${event.verified ? 'disabled' : ''}><i class="fa-solid fa-plus-circle"></i></button>
                        <button class="action-btn" title="اعتذار" onclick="addAuditTransaction(${eventId}, ${mId}, 'اعتذار')" style="background:rgba(168,152,120,0.15); color:var(--text-muted); border:1px solid var(--border); width:30px;" ${event.verified ? 'disabled' : ''}><i class="fa-solid fa-user-xmark"></i></button>
                    </td>
                    <td>${txHtml || '<span class="text-muted" style="font-size:0.8rem;">لا يوجد</span>'}</td>
                    <td>
                        <button class="action-btn delete" title="حذف العضو نهائياً" onclick="removeMemberFromEventAudit(${eventId}, ${mId})" ${event.verified ? 'disabled' : ''}><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Populate Add Member select
    const addSelect = document.getElementById('audit-add-member-select');
    if(addSelect) {
        addSelect.innerHTML = '<option value="">-- اختر العضو للإضافة --</option>' + 
            membersData.filter(m => !event.selectedMembers.includes(m.id))
            .map(m => `<option value="${m.id}">${m.name} (${getCategoryName(systemData.categories[m.categoryId]) || ''})</option>`).join('');
    }

    // Verification Save Button
    const saveBtn = document.getElementById('btn-save-audit');
    if(saveBtn) {
        saveBtn.onclick = () => window.verifyEvent(eventId);
        if(event.verified) {
             saveBtn.disabled = true;
             document.getElementById('audit-event-type').innerHTML = typeName + ' <span class="badge in" style="background:#12b886; margin-right:0.5rem;"><i class="fa-solid fa-check"></i> تم الاعتماد</span>';
             saveBtn.innerHTML = '<i class="fa-solid fa-lock"></i> تم الاعتماد نهائياً';
             saveBtn.style.opacity = '0.5';
             saveBtn.style.cursor = 'not-allowed';
        } else {
             saveBtn.disabled = false;
             saveBtn.innerHTML = '<i class="fa-solid fa-check-double"></i> حفظ بعد التحقق';
             saveBtn.style.opacity = '1';
             saveBtn.style.cursor = 'pointer';
        }
    }

    // زر "فك الاعتماد" — يظهر للمدير فقط (system_admin) عند اعتماد المناسبة
    const unverifyBtn = document.getElementById('btn-unverify-audit');
    if (unverifyBtn) {
        const isAdmin = currentUser && currentUser.role === 'system_admin';
        if (event.verified && isAdmin) {
            unverifyBtn.classList.remove('hidden');
            unverifyBtn.onclick = () => window.unverifyEvent(eventId);
        } else {
            unverifyBtn.classList.add('hidden');
        }
    }
    
    // إخفاء/إظهار خيار إضافة عضو حسب حالة الاعتماد
    const addMemberRow = document.getElementById('audit-add-member-row');
    if (addMemberRow) {
        // نترك الصف ظاهراً دائماً (لأنه يحوي زر الحفظ) لكن نعطل الـ select والزر إن كانت معتمدة
        const addMemSelect = document.getElementById('audit-add-member-select');
        const addMemBtn = addMemberRow.querySelector('button[onclick*="addMemberToEventAuditCurrent"]');
        if (addMemSelect) addMemSelect.disabled = !!event.verified;
        if (addMemBtn) addMemBtn.disabled = !!event.verified;
    }

    // عرض المصاريف الإضافية مع إمكانية الحذف (قبل الاعتماد)
    renderAuditExpenses(event);

    // Store globally for currently viewing
    window.currentAuditEventId = eventId;

    // Switch Views Automatically if called from elsewhere (e.g. Reports)
    const eventsNavItem = Array.from(document.querySelectorAll('.nav-item')).find(el => el.dataset.target === 'view-events');
    if (eventsNavItem && !eventsNavItem.classList.contains('active')) {
        switchView(eventsNavItem);
    }

    // Show View
    eventsListContainer.classList.add('hidden');
    addEventContainer.classList.add('hidden');
    if(eventAuditContainer) eventAuditContainer.classList.remove('hidden');
};

window.addAuditTransaction = function(eventId, memberId, type) {
    const event = eventsData.find(e => e.id === eventId);
    if (!event) return;
    
    // Identify member for customized prompt message
    const member = membersData.find(m => m.id === memberId);
    let title = type;
    if (type === 'علاوة' && member) {
        title = `علاوة ${getCategoryName(systemData.categories[member.categoryId]) || ''}`;
    }

    // Handle Excuse case silently filling amount
    if (type === 'اعتذار') {
        if(confirm(`تأكيد اعتذار العضو ${member?.name}؟ سيتم تصفير مستحقاته في هذه المناسبة وإرجاع مبلغه إلى مبلغ الاتفاق.`)) {
            // مبلغ الاعتذار = قسمة منطقة المناسبة (وليس منطقة العضو)
            const excuseRegion = systemData.regions.find(r => r.id === event.regionId);
            const baseAmount = excuseRegion ? excuseRegion.amount : 0;
            if (!event.auditTransactions) event.auditTransactions = [];
            event.auditTransactions.push({
                memberId: memberId,
                type: 'اعتذار',
                amount: baseAmount, // المبلغ الذي يرجع لمبلغ الاتفاق
                timestamp: new Date().toISOString()
            });

            // ملاحظة: التحويل للصندوق يتم فقط عند اعتماد المناسبة (verifyEvent)
            openEventAudit(eventId);
            if(window.renderRecentEventsForReports) renderRecentEventsForReports();
        }
        return;
    }

    const val = prompt(`الرجاء إدخال مبلغ الـ (${title}) للعضو ${member?.name}:`, "50");
    if (val !== null && val.trim() !== '') {
        const amount = parseFloat(val);
        if (!isNaN(amount) && amount > 0) {
            if (!event.auditTransactions) event.auditTransactions = [];
            event.auditTransactions.push({
                memberId: memberId,
                type: type,
                amount: amount,
                timestamp: new Date().toISOString()
            });

            // ملاحظة: التحويل للصندوق يتم فقط عند اعتماد المناسبة (verifyEvent)
            openEventAudit(eventId);
            if(window.renderRecentEventsForReports) renderRecentEventsForReports();
        } else {
            alert("يرجى إدخال مبلغ صحيح أكبر من الصفر.");
        }
    }
};

// Remove member from event
window.removeMemberFromEventAudit = function(eventId, memberId) {
    const event = eventsData.find(e => e.id === eventId);
    if (!event) return;
    if(confirm('هل أنت متأكد من حذف هذا العضو من المناسبة؟ سيعود مبلغه بالكامل للصندوق ولن يُسجل له حضور.')) {
        event.selectedMembers = event.selectedMembers.filter(id => id !== memberId);
        // Clear their audit history in this event
        if(event.auditTransactions) {
            event.auditTransactions = event.auditTransactions.filter(t => t.memberId !== memberId);
        }
        openEventAudit(eventId);
    }
};

// Add new member to event from audit
window.addMemberToEventAuditCurrent = function() {
    if(!window.currentAuditEventId) return;
    const select = document.getElementById('audit-add-member-select');
    if(!select || !select.value) {
        alert('الرجاء اختيار اسم العضو أولاً من القائمة المنسدلة.');
        return;
    }
    const memberId = parseInt(select.value);
    const member = membersData.find(m => m.id === memberId);
    
    const event = eventsData.find(e => e.id === window.currentAuditEventId);
    if(event && !event.selectedMembers.includes(memberId)) {
        // مبلغ القسمة = من منطقة المناسبة (وليس منطقة العضو)
        const evRegion = systemData.regions.find(r => r.id === event.regionId);
        const amount = evRegion ? evRegion.amount : 0;
        
        if (confirm(`سيتم إضافة العضو "${member?.name}" إلى المناسبة واستقطاع مبلغ القسمة (${amount} د.إ) من مبلغ الاتفاق.\n\nهل تريد المتابعة؟`)) {
            event.selectedMembers.push(memberId);
            openEventAudit(window.currentAuditEventId);
        }
    }
};

// ═══════════════════════════════════════════════════════
// إدارة المصاريف الإضافية في شاشة التدقيق
// ═══════════════════════════════════════════════════════
function renderAuditExpenses(event) {
    const listEl = document.getElementById('audit-expenses-list');
    const totalEl = document.getElementById('audit-expenses-total');
    const addWrapper = document.getElementById('audit-add-expense-wrapper');
    if (!listEl || !totalEl) return;

    const expenses = event.expenses || [];
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    totalEl.textContent = `${total} د.إ`;

    // إخفاء نموذج الإضافة إذا كانت المناسبة معتمدة
    if (addWrapper) {
        addWrapper.style.display = event.verified ? 'none' : 'flex';
    }

    if (expenses.length === 0) {
        listEl.innerHTML = '<li class="text-muted" style="text-align:center; padding:0.5rem;">لا توجد مصاريف إضافية مسجلة.</li>';
        return;
    }

    listEl.innerHTML = expenses.map((exp, idx) => `
        <li style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 1rem; background:var(--bg-card); color:var(--text-main); border:1px solid rgba(217,123,120,0.3); border-radius:6px; border-right: 4px solid var(--rose);">
            <span style="flex:1;">${exp.desc}</span>
            <div style="display:flex; align-items:center; gap:1rem;">
                <span style="font-weight:bold; color:var(--rose);">${exp.amount} د.إ</span>
                ${!event.verified ? `
                    <button type="button" class="action-btn" title="تعديل" onclick="editExpenseFromCurrentEvent(${idx})" style="background:rgba(186,146,114,0.15); color:var(--gold); border:1px solid var(--gold-border); width:28px; height:28px;"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="action-btn delete" title="حذف" onclick="deleteExpenseFromCurrentEvent(${idx})" style="width:28px; height:28px;"><i class="fa-solid fa-xmark"></i></button>
                ` : '<span style="color:var(--text-muted); font-size:0.75rem;"><i class="fa-solid fa-lock"></i> مقفل</span>'}
            </div>
        </li>
    `).join('');
}

window.addExpenseToCurrentEvent = function() {
    if (!window.currentAuditEventId) return;
    const event = eventsData.find(e => e.id === window.currentAuditEventId);
    if (!event) return;
    if (event.verified) {
        alert('لا يمكن إضافة مصاريف بعد اعتماد المناسبة.');
        return;
    }

    const descEl = document.getElementById('audit-new-expense-desc');
    const amtEl = document.getElementById('audit-new-expense-amount');
    const desc = descEl.value.trim();
    const amount = parseFloat(amtEl.value);

    if (!desc) { alert('يرجى إدخال بيان المصروف.'); return; }
    if (isNaN(amount) || amount <= 0) { alert('يرجى إدخال مبلغ صحيح أكبر من الصفر.'); return; }

    if (!event.expenses) event.expenses = [];
    event.expenses.push({ desc: desc, amount: amount });

    descEl.value = '';
    amtEl.value = '';

    openEventAudit(event.id);
};

window.deleteExpenseFromCurrentEvent = function(idx) {
    if (!window.currentAuditEventId) return;
    const event = eventsData.find(e => e.id === window.currentAuditEventId);
    if (!event || event.verified) return;
    const exp = event.expenses[idx];
    if (!exp) return;
    if (confirm(`هل تريد حذف المصروف "${exp.desc}" بقيمة ${exp.amount} د.إ؟`)) {
        event.expenses.splice(idx, 1);
        openEventAudit(event.id);
    }
};

window.editExpenseFromCurrentEvent = function(idx) {
    if (!window.currentAuditEventId) return;
    const event = eventsData.find(e => e.id === window.currentAuditEventId);
    if (!event || event.verified) return;
    const exp = event.expenses[idx];
    if (!exp) return;

    const newDesc = prompt('تعديل بيان المصروف:', exp.desc);
    if (newDesc === null) return;
    const newAmtStr = prompt('تعديل المبلغ:', exp.amount);
    if (newAmtStr === null) return;
    const newAmt = parseFloat(newAmtStr);
    if (!newDesc.trim() || isNaN(newAmt) || newAmt <= 0) {
        alert('بيانات غير صحيحة.');
        return;
    }
    event.expenses[idx] = { desc: newDesc.trim(), amount: newAmt };
    openEventAudit(event.id);
};

// ═══════════════════════════════════════════════════════
// فك اعتماد المناسبة (للمدير فقط)
// ═══════════════════════════════════════════════════════
window.unverifyEvent = function(eventId) {
    if (!currentUser || currentUser.role !== 'system_admin') {
        alert('هذه العملية متاحة لمدير النظام فقط.');
        return;
    }
    const event = eventsData.find(e => e.id === eventId);
    if (!event || !event.verified) return;

    const eventName = systemData.eventTypes[event.typeId] || 'مناسبة';
    const regName = systemData.regions.find(r => r.id === event.regionId)?.name || '';
    
    const confirmMsg = `تحذير: فك اعتماد المناسبة!\n\n` +
        `مناسبة: ${eventName}${regName ? ' - ' + regName : ''}\n` +
        `التاريخ: ${event.date}\n\n` +
        `سيتم:\n` +
        `• إلغاء المعاملة المرتبطة في الصندوق (سترد القيد)\n` +
        `• فتح المناسبة للتعديل من جديد\n\n` +
        `هل تريد المتابعة؟`;

    if (!confirm(confirmMsg)) return;

    // حذف قيد الصندوق المرتبط بهذه المناسبة (إن وُجد)
    if (Array.isArray(fundTransactions)) {
        fundTransactions = fundTransactions.filter(tx => tx.sourceEventId !== event.id);
    }

    // إلغاء حالة الاعتماد
    delete event.verified;
    delete event.finalBalance;
    delete event.verifiedAt;

    // إعادة الرسم
    openEventAudit(eventId);
    renderFund();
    renderEvents();
    updateDashboardStats();
    if (window.renderRecentEventsForReports) renderRecentEventsForReports();

    alert('تم فك اعتماد المناسبة بنجاح. يمكنك الآن التعديل عليها.');
};

// Finalize and Verify Event — يرسل المتبقي من مبلغ الاتفاق إلى الصندوق
window.verifyEvent = function(eventId) {
    const event = eventsData.find(e => e.id === eventId);
    if (!event) return;
    
    // حساب المتبقي النهائي
    // قسمة الأعضاء = عدد المشاركين × قسمة منطقة المناسبة
    const verifyRegion = systemData.regions.find(r => r.id === event.regionId);
    const verifyPerMember = verifyRegion ? verifyRegion.amount : 0;
    const totalContrib = event.selectedMembers.length * verifyPerMember;
    const totalExp = event.expenses.reduce((s, e) => s + e.amount, 0);
    const deductions = (event.auditTransactions || []).filter(t => t.type === 'خصم' || t.type === 'تأخير' || t.type === 'اعتذار').reduce((sum, t) => sum + t.amount, 0);
    const bonuses = (event.auditTransactions || []).filter(t => t.type === 'علاوة').reduce((sum, t) => sum + t.amount, 0);
    const agreementAmount = event.totalBudget || 0;
    const finalBalance = agreementAmount - totalContrib - totalExp + deductions - bonuses;

    const eventName = systemData.eventTypes[event.typeId] || 'مناسبة';
    const regName = systemData.regions.find(r => r.id === event.regionId)?.name || '';
    
    let confirmMsg = `هل أنت متأكد من اعتماد هذه المناسبة بشكل نهائي؟\n\n`;
    confirmMsg += `• مبلغ الاتفاق: ${agreementAmount} د.إ\n`;
    confirmMsg += `• قسمة الأعضاء: ${totalContrib} د.إ\n`;
    confirmMsg += `• المصاريف الإضافية: ${totalExp} د.إ\n`;
    if (deductions > 0) confirmMsg += `• خصومات/اعتذارات مستردة: +${deductions} د.إ\n`;
    if (bonuses > 0) confirmMsg += `• علاوات مصروفة: -${bonuses} د.إ\n`;
    if (finalBalance >= 0) {
        confirmMsg += `\n◄ سيتم إيداع المتبقي (${finalBalance} د.إ) في الصندوق كوارد.\n`;
    } else {
        confirmMsg += `\n⚠ يوجد عجز بقيمة (${Math.abs(finalBalance)} د.إ) سيُستقطع من الصندوق لتغطية المناسبة.\n`;
    }
    confirmMsg += `\nلا يمكن التعديل بعد الاعتماد.`;

    if(confirm(confirmMsg)) {
        event.verified = true;
        event.finalBalance = finalBalance;
        event.verifiedAt = new Date().toISOString();

        // إيداع المتبقي في الصندوق (وارد) — فقط إن كان موجباً
        if (finalBalance > 0) {
            fundTransactions.unshift({
                id: Date.now(),
                date: new Date().toISOString().split('T')[0],
                desc: `وارد من مناسبة: ${eventName}${regName ? ' - ' + regName : ''} بتاريخ ${event.date}`,
                type: 'in',
                amount: finalBalance,
                sourceEventId: event.id
            });
        } else if (finalBalance < 0) {
            // عجز: يُستقطع من الصندوق لتغطية المناسبة
            fundTransactions.unshift({
                id: Date.now(),
                date: new Date().toISOString().split('T')[0],
                desc: `مستقطع من الصندوق لتغطية عجز مناسبة: ${eventName}${regName ? ' - ' + regName : ''} بتاريخ ${event.date}`,
                type: 'out',
                amount: Math.abs(finalBalance),
                sourceEventId: event.id
            });
        }

        openEventAudit(eventId);
        renderEvents();
        renderFund();
        updateDashboardStats();
        if(window.renderRecentEventsForReports) renderRecentEventsForReports();

        if (finalBalance >= 0) {
            alert(`تم اعتماد المناسبة بنجاح.\nتم إيداع ${finalBalance} د.إ في الصندوق كوارد.`);
        } else {
            alert(`تم اعتماد المناسبة بنجاح.\nتم استقطاع ${Math.abs(finalBalance)} د.إ من الصندوق لتغطية عجز المناسبة.`);
        }
    }
};

// --- Reports Hub Unified Search Logic ---
const globalSearchInput = document.getElementById('global-search-input');
const reportsRecentContainer = document.getElementById('reports-recent-container');
const reportsResultsContainer = document.getElementById('reports-results-container');
const recentEventsList = document.getElementById('recent-events-list');
const searchMembersResults = document.getElementById('search-members-results');
const searchEventsResults = document.getElementById('search-events-results');
const memberSearchInput = document.getElementById('member-search-input');
const memberRegionFilter = document.getElementById('member-region-filter');
const memberCategoryFilter = document.getElementById('member-category-filter');

// 1. Member View Search
memberSearchInput?.addEventListener('input', (e) => {
    renderMembers(e.target.value.trim());
});

// فلاتر المنطقة والفئة
memberRegionFilter?.addEventListener('change', () => {
    renderMembers(memberSearchInput?.value?.trim() || '');
});
memberCategoryFilter?.addEventListener('change', () => {
    renderMembers(memberSearchInput?.value?.trim() || '');
});

// تعبئة قوائم الفلاتر من بيانات النظام
window.populateMemberFilters = function() {
    if (memberRegionFilter) {
        const currentVal = memberRegionFilter.value;
        memberRegionFilter.innerHTML = '<option value="">كل المناطق</option>' +
            systemData.regions.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
        // استعادة القيمة إن كانت لا تزال موجودة
        if (currentVal && systemData.regions.some(r => String(r.id) === currentVal)) {
            memberRegionFilter.value = currentVal;
        }
    }
    if (memberCategoryFilter) {
        const currentVal = memberCategoryFilter.value;
        memberCategoryFilter.innerHTML = '<option value="">كل الفئات</option>' +
            systemData.categories.map((c, i) => `<option value="${i}">${getCategoryName(c)}</option>`).join('');
        if (currentVal && systemData.categories[parseInt(currentVal)]) {
            memberCategoryFilter.value = currentVal;
        }
    }
};

// تعبئة أولية وتحديث عند فتح الشاشة
populateMemberFilters();

// تحديث الفلاتر عند تغيير المناطق/الفئات من إعدادات النظام
document.addEventListener('click', (e) => {
    const navItem = e.target.closest('.nav-item');
    if (navItem && navItem.dataset.target === 'view-members') {
        setTimeout(populateMemberFilters, 50);
    }
});

// 2. Initial Setup for Reports View
window.renderRecentEventsForReports = function() {
    if (!recentEventsList) return;
    
    // Get last 5 events
    const sorted = [...eventsData].sort((a,b) => new Date(b.date) - new Date(a.date));
    const recent = sorted.slice(0, 5);
    
    if (recent.length === 0) {
        recentEventsList.innerHTML = '<p class="text-muted" style="text-align:center;">لا توجد مناسبات مسجلة.</p>';
        return;
    }
    
    recentEventsList.innerHTML = recent.map(event => {
        const typeName = systemData.eventTypes[event.typeId] || 'غير محدد';
        const regionName = systemData.regions.find(r => r.id === event.regionId)?.name || 'غير محدد';
        
        return `
            <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 1.2rem; display: flex; justify-content: space-between; align-items: center; box-shadow: var(--shadow-sm);">
                <div>
                    <h4 style="margin: 0 0 0.5rem 0; color: var(--text-main);">${typeName} (${regionName})</h4>
                    <span style="font-size: 0.85rem; color: var(--text-muted);"><i class="fa-regular fa-calendar"></i> ${event.date}</span>
                </div>
                <button class="btn-outline btn-sm" onclick="openEventAudit(${event.id})">التفاصيل والتدقيق <i class="fa-solid fa-arrow-left" style="margin-right:0.5rem;"></i></button>
            </div>
        `;
    }).join('');
};

// Initialize
renderRecentEventsForReports();

// 3. Global Search Logic
globalSearchInput?.addEventListener('input', (e) => {
    const term = e.target.value.trim().toLowerCase();
    
    if (term.length === 0) {
        reportsRecentContainer.classList.remove('hidden');
        reportsResultsContainer.classList.add('hidden');
        return;
    }
    
    reportsRecentContainer.classList.add('hidden');
    reportsResultsContainer.classList.remove('hidden');
    
    // Search Members
    const matchedMembers = membersData.filter(m => 
        m.name.toLowerCase().includes(term) || 
        m.phone.includes(term) ||
        (getCategoryName(systemData.categories[m.categoryId]) || '').toLowerCase().includes(term) ||
        (systemData.regions.find(r=>r.id===m.regionId)?.name || '').toLowerCase().includes(term)
    );
    
    // Search Events
    const matchedEvents = eventsData.filter(ev => {
        const typeName = (systemData.eventTypes[ev.typeId] || '').toLowerCase();
        const regionName = (systemData.regions.find(r => r.id === ev.regionId)?.name || '').toLowerCase();
        return ev.date.includes(term) || typeName.includes(term) || regionName.includes(term);
    });
    
    // Render Matched Members
    if (matchedMembers.length === 0) {
        searchMembersResults.innerHTML = '<p class="text-muted" style="text-align:center;">لا يوجد نتائج مشابهة</p>';
    } else {
        searchMembersResults.innerHTML = matchedMembers.map(m => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem; border:1px solid var(--border); border-radius:6px; background:var(--bg-card); color:var(--text-main);">
                <div style="display:flex; align-items:center; gap:0.8rem;">
                    <img src="${m.photo}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">
                    <div>
                        <div style="font-weight:600; color:var(--text-main);">${m.name}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted);">${getCategoryName(systemData.categories[m.categoryId]) || 'غير محدد'}</div>
                    </div>
                </div>
                <button class="btn-primary btn-sm" onclick="viewMemberProfile(${m.id})">الملف <i class="fa-solid fa-file-invoice" style="margin-right:0.3rem;"></i></button>
            </div>
        `).join('');
    }
    
    // Render Matched Events
    if (matchedEvents.length === 0) {
        searchEventsResults.innerHTML = '<p class="text-muted" style="text-align:center;">لا يوجد نتائج مشابهة</p>';
    } else {
        searchEventsResults.innerHTML = matchedEvents.map(ev => {
             const typeName = systemData.eventTypes[ev.typeId] || 'غير محدد';
             const regionName = systemData.regions.find(r => r.id === ev.regionId)?.name || 'غير محدد';
             return `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem; border:1px solid var(--border); border-radius:6px; background:var(--bg-card); color:var(--text-main);">
                    <div>
                        <div style="font-weight:600; color:var(--text-main);">${typeName} (${regionName})</div>
                        <div style="font-size:0.8rem; color:var(--text-muted);"><i class="fa-regular fa-calendar"></i> ${ev.date}</div>
                    </div>
                    <button class="btn-outline btn-sm" onclick="openEventAudit(${ev.id})">التفاصيل <i class="fa-solid fa-arrow-left" style="margin-right:0.3rem;"></i></button>
                </div>
             `;
        }).join('');
    }
});

// --- Fund Management Logic ---

// Change listener for Pay member selection
document.getElementById('fund-type')?.addEventListener('change', (e) => {
    const wrapper = document.getElementById('fund-member-select-wrapper');
    const select = document.getElementById('fund-member-select');
    if (e.target.value === 'pay') {
        wrapper.classList.remove('hidden');
        // Populate members
        select.innerHTML = '<option value="">-- اختر عضو --</option>' + 
            membersData.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    } else {
        wrapper.classList.add('hidden');
    }
});

window.addManualFundTransaction = function() {
    const desc = document.getElementById('fund-desc').value.trim();
    const type = document.getElementById('fund-type').value;
    const amount = parseFloat(document.getElementById('fund-amount').value);
    const memberId = document.getElementById('fund-member-select').value;
    
    if (!desc || isNaN(amount) || amount <= 0) {
        alert('يرجى إكمال جميع الحقول وإدخال مبلغ صحيح.');
        return;
    }

    let finalDesc = desc;
    if (type === 'pay' && memberId) {
        const member = membersData.find(m => m.id == memberId);
        if (member) finalDesc = `${desc} (${member.name})`;
    }

    fundTransactions.unshift({
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        desc: finalDesc,
        type: (type === 'in') ? 'in' : 'out',
        amount: amount
    });

    // Reset Form
    document.getElementById('fund-desc').value = '';
    document.getElementById('fund-amount').value = '';
    document.getElementById('fund-type').value = 'in';
    document.getElementById('fund-member-select-wrapper').classList.add('hidden');

    // إخفاء النموذج بعد التسجيل
    document.getElementById('fund-manual-form')?.classList.add('hidden');

    renderFund();
    alert('تم تسجيل المعاملة بنجاح.');
};

// زر فتح نموذج معاملة جديدة
document.getElementById('btn-toggle-fund-form')?.addEventListener('click', () => {
    const form = document.getElementById('fund-manual-form');
    if (form) {
        form.classList.toggle('hidden');
        if (!form.classList.contains('hidden')) {
            // تركيز تلقائي على حقل البيان
            setTimeout(() => document.getElementById('fund-desc')?.focus(), 50);
            form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
});

// زر إلغاء/إغلاق النموذج
document.getElementById('btn-close-fund-form')?.addEventListener('click', () => {
    document.getElementById('fund-manual-form')?.classList.add('hidden');
    document.getElementById('fund-desc').value = '';
    document.getElementById('fund-amount').value = '';
});

// حالة الفلتر الحالية في الصندوق
let fundFilterState = {
    type: 'all',  // all | in | out
    from: '',
    to: ''
};

function getFilteredFundTransactions() {
    return fundTransactions.filter(tx => {
        if (fundFilterState.type !== 'all' && tx.type !== fundFilterState.type) return false;
        if (fundFilterState.from && tx.date < fundFilterState.from) return false;
        if (fundFilterState.to && tx.date > fundFilterState.to) return false;
        return true;
    });
}

window.renderFund = function() {
    const tbody = document.getElementById('fund-transactions-body');
    const totalInEl = document.getElementById('fund-total-in');
    const totalOutEl = document.getElementById('fund-total-out');
    const balanceEl = document.getElementById('fund-total-balance');
    
    if (!tbody) return;

    // الإحصائيات الكلية (لا تتأثر بالفلتر — تعرض الرصيد الحقيقي)
    let grandIn = 0, grandOut = 0;
    fundTransactions.forEach(tx => {
        if (tx.type === 'in') grandIn += tx.amount;
        else grandOut += tx.amount;
    });

    // المعاملات المفلترة (هذه تعرض في الجدول)
    const filtered = getFilteredFundTransactions();
    let filteredIn = 0, filteredOut = 0;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem; color: var(--text-muted);"><i class="fa-solid fa-inbox"></i> لا توجد معاملات تطابق الفلتر المحدد.</td></tr>';
    } else {
        tbody.innerHTML = filtered.map(tx => {
            if (tx.type === 'in') filteredIn += tx.amount;
            else filteredOut += tx.amount;

            const typeLabel = tx.type === 'in' ? 'وارد' : 'منصرف';
            const typeClass = tx.type === 'in' ? 'in' : 'out';
            const amountSign = tx.type === 'in' ? '+' : '-';
            const amountColor = tx.type === 'in' ? 'var(--teal)' : 'var(--rose)';

            return `
                <tr>
                    <td>${tx.date}</td>
                    <td>${tx.desc}</td>
                    <td><span class="badge ${typeClass}">${typeLabel}</span></td>
                    <td style="color: ${amountColor}; font-weight: bold;">${amountSign}${tx.amount} د.إ</td>
                </tr>
            `;
        }).join('');
    }

    // الإحصائيات الكلية (دائماً من كل المعاملات)
    const grandBalance = grandIn - grandOut;
    if(totalInEl) totalInEl.textContent = `${grandIn} د.إ`;
    if(totalOutEl) totalOutEl.textContent = `${grandOut} د.إ`;
    if(balanceEl) balanceEl.textContent = `${grandBalance} د.إ`;

    // ملخص الفلتر (يظهر فقط لو الفلتر نشط)
    const isFilterActive = fundFilterState.type !== 'all' || fundFilterState.from || fundFilterState.to;
    const filterSummary = document.getElementById('fund-filter-summary');
    if (filterSummary) {
        if (isFilterActive) {
            filterSummary.classList.remove('hidden');
            const typeText = fundFilterState.type === 'all' ? 'الكل' : (fundFilterState.type === 'in' ? 'وارد فقط' : 'صادر فقط');
            let periodText = 'كل الفترات';
            if (fundFilterState.from && fundFilterState.to) periodText = `من ${fundFilterState.from} إلى ${fundFilterState.to}`;
            else if (fundFilterState.from) periodText = `من ${fundFilterState.from}`;
            else if (fundFilterState.to) periodText = `حتى ${fundFilterState.to}`;
            const info = document.getElementById('fund-filter-info');
            if (info) info.textContent = `${typeText} — ${periodText} — ${filtered.length} معاملة`;
            const inEl = document.getElementById('fund-filter-in');
            const outEl = document.getElementById('fund-filter-out');
            const netEl = document.getElementById('fund-filter-net');
            if (inEl) inEl.textContent = `${filteredIn} د.إ`;
            if (outEl) outEl.textContent = `${filteredOut} د.إ`;
            if (netEl) netEl.textContent = `${filteredIn - filteredOut} د.إ`;
        } else {
            filterSummary.classList.add('hidden');
        }
    }

    // Sync Dashboard Stats
    updateDashboardStats();
};

// ─── ربط فلاتر الصندوق ───
document.getElementById('btn-fund-apply-filter')?.addEventListener('click', () => {
    fundFilterState.type = document.getElementById('fund-filter-type').value;
    fundFilterState.from = document.getElementById('fund-filter-from').value;
    fundFilterState.to = document.getElementById('fund-filter-to').value;
    renderFund();
});

document.getElementById('btn-fund-reset-filters')?.addEventListener('click', () => {
    fundFilterState = { type: 'all', from: '', to: '' };
    document.getElementById('fund-filter-type').value = 'all';
    document.getElementById('fund-filter-from').value = '';
    document.getElementById('fund-filter-to').value = '';
    renderFund();
});

// ─── طباعة تقرير الصندوق ───
document.getElementById('btn-fund-print-report')?.addEventListener('click', () => {
    printFundReport();
});

function printFundReport() {
    const filtered = getFilteredFundTransactions();
    if (filtered.length === 0) {
        if (!confirm('لا توجد معاملات تطابق الفلتر الحالي. هل تريد طباعة تقرير فارغ؟')) return;
    }

    let totalIn = 0, totalOut = 0;
    filtered.forEach(tx => {
        if (tx.type === 'in') totalIn += tx.amount;
        else totalOut += tx.amount;
    });
    const net = totalIn - totalOut;

    const typeText = fundFilterState.type === 'all' ? 'كل المعاملات' : (fundFilterState.type === 'in' ? 'الواردات فقط' : 'المصروفات فقط');
    let periodText = 'كل الفترات';
    if (fundFilterState.from && fundFilterState.to) periodText = `من ${fundFilterState.from} إلى ${fundFilterState.to}`;
    else if (fundFilterState.from) periodText = `من ${fundFilterState.from}`;
    else if (fundFilterState.to) periodText = `حتى ${fundFilterState.to}`;

    const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

    const rows = filtered.map((tx, idx) => {
        const typeLabel = tx.type === 'in' ? 'وارد' : 'منصرف';
        const color = tx.type === 'in' ? '#2e7d5b' : '#c25550';
        const bg = tx.type === 'in' ? '#e8f5f0' : '#fbebea';
        return `
            <tr>
                <td style="padding:8px; border:1px solid #E8DCC4; text-align:center;">${idx + 1}</td>
                <td style="padding:8px; border:1px solid #E8DCC4;">${tx.date}</td>
                <td style="padding:8px; border:1px solid #E8DCC4;">${tx.desc}</td>
                <td style="padding:8px; border:1px solid #E8DCC4; text-align:center;">
                    <span style="background:${bg}; color:${color}; padding:3px 10px; border-radius:12px; font-size:11px; font-weight:700;">${typeLabel}</span>
                </td>
                <td style="padding:8px; border:1px solid #E8DCC4; text-align:center; color:${color}; font-weight:700;">${tx.type === 'in' ? '+' : '-'}${tx.amount}</td>
            </tr>
        `;
    }).join('');

    const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>تقرير الصندوق - فرقة المزيود الحربية</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
    <style>
        @page { size: A4; margin: 15mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Tajawal', Arial, sans-serif; direction: rtl; color: #2a2520; background: white; padding: 10px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #BA9272; padding-bottom: 14px; margin-bottom: 20px; position: relative; }
        .header::after { content: ''; position: absolute; bottom: -4px; right: 0; left: 0; height: 1px; background: linear-gradient(90deg, transparent, #D8B494, transparent); }
        .header h1 { font-size: 22px; color: #8B6840; font-weight: 800; letter-spacing: 0.3px; }
        .header .subtitle { font-size: 13px; color: #8B7A5F; margin-top: 4px; font-weight: 500; }
        .header-left { text-align: left; font-size: 12px; color: #5C5040; }
        .title-box { text-align: center; padding: 14px; background: linear-gradient(135deg, #FAF4E8 0%, #F5EBD8 100%); border: 1px solid #D8B494; border-radius: 10px; margin-bottom: 20px; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.5); }
        .title-box h2 { font-size: 18px; color: #2a2520; margin: 0; font-weight: 700; }
        .title-box .period { font-size: 13px; color: #8B6840; margin-top: 5px; font-weight: 600; letter-spacing: 0.3px; }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
        .stat { padding: 14px; border-radius: 10px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
        .stat-in { background: #E8F5F0; border: 1px solid #90c7b3; }
        .stat-out { background: #FBEBEA; border: 1px solid #e6a8a6; }
        .stat-net { background: linear-gradient(135deg, #8B6840 0%, #BA9272 100%); color: white; box-shadow: 0 2px 6px rgba(139,104,64,0.3); }
        .stat .label { font-size: 11px; opacity: 0.9; margin-bottom: 5px; font-weight: 600; letter-spacing: 0.2px; }
        .stat .value { font-size: 19px; font-weight: 800; line-height: 1.1; }
        .stat-in .value { color: #2e7d5b; }
        .stat-out .value { color: #c25550; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(139,104,64,0.1); }
        thead tr { background: linear-gradient(135deg, #8B6840 0%, #A07A50 100%); color: white; }
        thead th { padding: 10px 8px; border: 1px solid #6F5232; font-weight: 700; letter-spacing: 0.2px; }
        tbody tr:nth-child(even) { background: #FDFAF3; }
        tbody td { color: #2a2520; }
        tfoot tr { background: #FAF4E8; font-weight: 700; }
        .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #D8B494; display: flex; justify-content: space-between; font-size: 11px; color: #8B7A5F; }
        .no-data { text-align: center; padding: 30px; background: #FDFAF3; border: 1px dashed #D8B494; border-radius: 10px; color: #8B7A5F; }
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>فرقة المزيود الحربية</h1>
            <div class="subtitle">نظام إدارة المناسبات والأعضاء — تقرير الصندوق المالي</div>
        </div>
        <div class="header-left">
            <div><strong>تاريخ الإصدار:</strong> ${today}</div>
        </div>
    </div>

    <div class="title-box">
        <h2>تقرير معاملات الصندوق</h2>
        <div class="period">${typeText} — ${periodText}</div>
    </div>

    <div class="stats">
        <div class="stat stat-in">
            <div class="label">إجمالي الواردات</div>
            <div class="value">${totalIn} د.إ</div>
        </div>
        <div class="stat stat-out">
            <div class="label">إجمالي المصروفات</div>
            <div class="value">${totalOut} د.إ</div>
        </div>
        <div class="stat stat-net">
            <div class="label">الصافي</div>
            <div class="value">${net} د.إ</div>
        </div>
    </div>

    ${filtered.length === 0 ? '<div class="no-data">لا توجد معاملات تطابق الفلتر المحدد.</div>' : `
    <table>
        <thead>
            <tr>
                <th style="width:40px;">#</th>
                <th>التاريخ</th>
                <th>البيان</th>
                <th style="width:80px;">النوع</th>
                <th style="width:100px;">المبلغ (د.إ)</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
            <tr>
                <td colspan="3" style="padding:10px; border:1px solid #E8DCC4; text-align:left;">الإجمالي</td>
                <td style="padding:10px; border:1px solid #E8DCC4; text-align:center; color:#2e7d5b;">+${totalIn}</td>
                <td style="padding:10px; border:1px solid #E8DCC4; text-align:center; color:#c25550;">-${totalOut}</td>
            </tr>
            <tr style="background: #8B6840; color: white;">
                <td colspan="4" style="padding:10px; border:1px solid #6F5232; text-align:left;">صافي الفترة</td>
                <td style="padding:10px; border:1px solid #6F5232; text-align:center; font-size:14px;">${net} د.إ</td>
            </tr>
        </tfoot>
    </table>
    `}

    <div class="footer">
        <div>© ${new Date().getFullYear()} فرقة المزيود الحربية</div>
        <div>التوقيع المعتمد: ________________</div>
    </div>

    <script>
        window.addEventListener('load', function() {
            setTimeout(function() {
                window.print();
                setTimeout(function(){ window.close(); }, 500);
            }, 300);
        });
    </script>
</body>
</html>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { alert('يرجى السماح بفتح النوافذ المنبثقة لطباعة التقرير.'); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
}

window.updateDashboardStats = function() {
    const dashMembers = document.getElementById('stat-total-members');
    const dashEvents = document.getElementById('stat-total-events');
    const dashFund = document.getElementById('stat-fund-balance');
    
    if(dashMembers) dashMembers.textContent = membersData.length;
    if(dashEvents) dashEvents.textContent = eventsData.length;
    
    // Calculate fund balance for dashboard from transactions
    if(dashFund) {
        const balance = fundTransactions.reduce((acc, tx) => 
            tx.type === 'in' ? acc + tx.amount : acc - tx.amount, 0);
        dashFund.textContent = `${balance} د.إ`;
    }
};

// Ensure Fund is rendered when navigating to it
document.addEventListener('click', (e) => {
    const navItem = e.target.closest('.nav-item');
    if (navItem && navItem.dataset.target === 'view-fund') {
        setTimeout(renderFund, 50);
    }
});

// --- User Management Logic ---

window.renderUsers = function() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    tbody.innerHTML = usersData.map(user => {
        const roleName = {
            system_admin: 'مدير نظام',
            admin: 'إداري',
            data_entry: 'مدخل بيانات'
        }[user.role] || user.role;

        const roleColor = {
            system_admin: '#20c997',
            admin: '#0d8abc',
            data_entry: '#adb5bd'
        }[user.role] || '#adb5bd';

        return `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <div style="width:32px; height:32px; background:${roleColor}; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.8rem;">
                            <i class="fa-solid fa-user"></i>
                        </div>
                        <span style="font-weight:600;">${user.title}</span>
                    </div>
                </td>
                <td><code style="background:#f1f3f5; padding:2px 4px; border-radius:4px;">${user.username}</code></td>
                <td><span class="badge" style="background:${roleColor}">${roleName}</span></td>
                <td>
                    ${user.username === 'admin' ? 
                        '<span class="text-muted" style="font-size:0.8rem;">أساسي</span>' : 
                        `<button class="action-btn delete" onclick="deleteUser(${user.id})" title="حذف الحساب"><i class="fa-solid fa-user-minus"></i></button>`
                    }
                </td>
            </tr>
        `;
    }).join('');
};

document.getElementById('add-user-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('new-user-username').value.trim();
    const password = document.getElementById('new-user-password').value.trim();
    const role = document.getElementById('new-user-role').value;

    if (usersData.some(u => u.username === username)) {
        alert('اسم المستخدم موجود بالفعل. يرجى اختيار اسم آخر.');
        return;
    }

    const roleTitles = {
        system_admin: 'مدير النظام',
        admin: 'إداري',
        data_entry: 'مدخل بيانات'
    };

    const newUser = {
        id: Date.now(),
        title: roleTitles[role],
        username: username,
        password: password,
        role: role
    };

    usersData.push(newUser);
    renderUsers();
    e.target.reset();
    alert('تم إنشاء حساب المستخدم بنجاح.');
});

window.deleteUser = function(id) {
    if (confirm('هل أنت متأكد من حذف هذا المستخدم؟ لن يتمكن من دخول النظام مرة أخرى.')) {
        usersData = usersData.filter(u => u.id !== id);
        renderUsers();
    }
};

// Ensure Users list is rendered when navigating to it
document.addEventListener('click', (e) => {
    const navItem = e.target.closest('.nav-item');
    if (navItem && navItem.dataset.target === 'view-users') {
        setTimeout(renderUsers, 50);
    }
});

// Initial call
renderUsers();

// --- Home / Dashboard Leaderboard Logic ---

window.calculateMemberRating = function(memberId) {
    if (eventsData.length === 0) return 5; // Default for new system

    // Participations where they were actually checked (not necessarily just 'selected' if we want to be strict, but let's use selected)
    const participations = eventsData.filter(ev => ev.selectedMembers.includes(memberId));
    const attendedCount = participations.length;
    
    let totalDeductions = 0;
    let totalExcuses = 0;
    
    participations.forEach(ev => {
        const mtxs = (ev.auditTransactions || []).filter(t => t.memberId === memberId);
        mtxs.forEach(t => {
            if (t.type === 'اعتذار') totalExcuses++;
            if (t.type === 'خصم' || t.type === 'تأخير') totalDeductions++;
        });
    });

    /**
     * Rating formula (0-5 stars):
     * Ideal member: Attends all events (AttendRate = 1), zero excuses, zero deductions.
     * Penalty: -1.5 per excuse, -1 per deduction.
     * AttendFactor: (AttendedCount / TotalEvents_Recorded) * 5.
     */
    const totalEventsCount = Math.max(eventsData.length, 1);
    const attendanceFactor = (attendedCount / totalEventsCount) * 5;
    const excusePenalty = totalExcuses * 1.5;
    const deductionPenalty = totalDeductions * 1.0;
    
    const finalScore = attendanceFactor - excusePenalty - deductionPenalty;
    return Math.max(0, Math.min(5, finalScore)); // Clamp between 0 and 5
};

window.renderLeaderboard = function() {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;

    // Calculate rating for each member
    const scoredMembers = membersData.map(m => {
        const rating = calculateMemberRating(m.id);
        const attended = eventsData.filter(ev => ev.selectedMembers.includes(m.id)).length;
        return { ...m, rating, attended };
    });

    // Sort by rating desc
    scoredMembers.sort((a, b) => b.rating - a.rating);

    tbody.innerHTML = scoredMembers.slice(0, 10).map((m, index) => {
        const stars = Math.round(m.rating);
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= stars) {
                starsHtml += '<i class="fa-solid fa-star" style="color:#fcc419;"></i>';
            } else {
                starsHtml += '<i class="fa-regular fa-star" style="color:#dee2e6;"></i>';
            }
        }

        const rankBadge = index === 0 ? '<i class="fa-solid fa-crown" style="color:#fcc419;"></i>' : 
                          index === 1 ? '<i class="fa-solid fa-medal" style="color:#adb5bd;"></i>' :
                          index === 2 ? '<i class="fa-solid fa-medal" style="color:#cd7f32;"></i>' :
                          `#${index + 1}`;

        return `
            <tr>
                <td style="font-weight:bold; font-size:1.1rem; color:var(--primary); text-align:center;">${rankBadge}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <img src="${m.photo}" style="width:28px; height:28px; border-radius:50%;">
                        <span>${m.name}</span>
                    </div>
                </td>
                <td><span class="badge" style="background:#f1f3f5; color:var(--text-muted);">${getCategoryName(systemData.categories[m.categoryId]) || ''}</span></td>
                <td><strong style="color:#20c997;">${m.attended}</strong> مناسبات</td>
                <td>${starsHtml} <span style="font-size:0.8rem; color:#adb5bd; margin-right:5px;">(${m.rating.toFixed(1)})</span></td>
            </tr>
        `;
    }).join('');
};

// Initial call for first view
setTimeout(renderLeaderboard, 100);

// Note: لوحة تميز الأعضاء removed from dashboard.
// renderLeaderboard() is kept defined (safe no-op when #leaderboard-body absent)
// for backward compatibility with any external integrations that may call it.


// ═══════════════════════════════════════════════════════════════════════════
// 🔔 MEMBER PORTAL & INVITATIONS SYSTEM
// نظام بوابة العضو والدعوات
// ───────────────────────────────────────────────────────────────────────────
// كل مناسبة تحتفظ بكائن memberResponses في صورة:
//   { [memberId]: { status: 'pending' | 'accepted' | 'excused', timestamp } }
// عند تسجيل العضو لاستجابة، تتحدث البيانات فوراً ويراها المدير.
// ═══════════════════════════════════════════════════════════════════════════

/** يضمن وجود كائن memberResponses لكل مناسبة مع جميع الأعضاء المحددين */
function ensureEventResponses(event) {
    if (!event.memberResponses || typeof event.memberResponses !== 'object') {
        event.memberResponses = {};
    }
    (event.selectedMembers || []).forEach(mid => {
        if (!event.memberResponses[mid]) {
            event.memberResponses[mid] = { status: 'pending', timestamp: null };
        }
    });
    return event.memberResponses;
}

/** الحصول على حالة استجابة عضو معيّن لمناسبة */
window.getMemberResponse = function(event, memberId) {
    ensureEventResponses(event);
    return event.memberResponses[memberId] || { status: 'pending', timestamp: null };
};

/** تسجيل استجابة العضو وإضافة معاملة تدقيق إذا لزم */
window.recordMemberResponse = function(eventId, memberId, status) {
    const event = eventsData.find(e => e.id === eventId);
    if (!event) return false;
    ensureEventResponses(event);

    event.memberResponses[memberId] = {
        status,
        timestamp: new Date().toISOString()
    };

    // إذا اعتذر، أضِف معاملة "اعتذار" للسجل المالي (إن لم تكن موجودة)
    if (status === 'excused') {
        event.auditTransactions = event.auditTransactions || [];
        const exists = event.auditTransactions.some(t => t.memberId === memberId && t.type === 'اعتذار');
        if (!exists) {
            event.auditTransactions.push({
                id: Date.now() + Math.random(),
                memberId,
                type: 'اعتذار',
                amount: 0,
                note: 'اعتذار مسجَّل تلقائياً عبر بوابة العضو',
                date: new Date().toISOString().split('T')[0]
            });
        }
    } else if (status === 'accepted') {
        // إذا قبل العضو، أزل أي معاملة "اعتذار" سابقة (تراجَع عن الاعتذار)
        if (event.auditTransactions) {
            event.auditTransactions = event.auditTransactions.filter(
                t => !(t.memberId === memberId && t.type === 'اعتذار' && t.note && t.note.includes('بوابة العضو'))
            );
        }
    }

    // حفظ في localStorage
    saveEventsToStorage();
    // تحديث واجهات المدير إن كانت ظاهرة
    if (typeof renderEvents === 'function') renderEvents();
    return true;
};

/** حفظ بيانات المناسبات (إن كان النظام يستخدم localStorage) */
function saveEventsToStorage() {
    try {
        localStorage.setItem('mazyoud_events_data', JSON.stringify(eventsData));
    } catch (e) { /* تجاهل */ }
}

/** استعادة بيانات المناسبات من localStorage عند التحميل */
(function restoreEventsFromStorage() {
    try {
        const raw = localStorage.getItem('mazyoud_events_data');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                eventsData = parsed;
            }
        }
    } catch (e) { /* تجاهل */ }
})();

/** الحصول على معرّف العضو الحالي إن كان مسجّلاً كعضو */
function getCurrentMemberId() {
    if (currentUser && currentUser.role === 'member' && currentUser.memberId) {
        return currentUser.memberId;
    }
    return null;
}

/** الحصول على دعوات العضو الحالي مرتّبة (المعلقة أولاً) */
window.getMyInvitations = function() {
    const memberId = getCurrentMemberId();
    if (!memberId) return [];

    return eventsData
        .filter(ev => (ev.selectedMembers || []).includes(memberId))
        .map(ev => {
            const response = getMemberResponse(ev, memberId);
            return { event: ev, response };
        })
        .sort((a, b) => {
            // المعلقة أولاً
            if (a.response.status === 'pending' && b.response.status !== 'pending') return -1;
            if (a.response.status !== 'pending' && b.response.status === 'pending') return 1;
            // ثم حسب التاريخ تنازلياً
            return new Date(b.event.date) - new Date(a.event.date);
        });
};

/** تحديث شارة الإشعارات (عدد الدعوات المعلقة) */
window.updateNotificationBadge = function() {
    const badge = document.getElementById('notification-badge');
    if (!badge) return;
    const memberId = getCurrentMemberId();
    if (!memberId) {
        badge.style.display = 'none';
        return;
    }
    const pending = getMyInvitations().filter(inv => inv.response.status === 'pending').length;
    if (pending > 0) {
        badge.textContent = pending > 99 ? '99+' : String(pending);
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
};

/** عرض دعوات العضو في صفحة "دعواتي" */
window.renderMyInvitations = function() {
    const container = document.getElementById('my-invitations-container');
    if (!container) return;
    const memberId = getCurrentMemberId();
    if (!memberId) {
        container.innerHTML = '<p class="text-muted" style="text-align:center; padding:2rem;">يجب تسجيل الدخول كعضو لعرض الدعوات.</p>';
        return;
    }

    const invitations = getMyInvitations();
    if (invitations.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:4rem 1rem; color:var(--text-muted);">
                <i class="fa-solid fa-inbox" style="font-size:3rem; opacity:0.4; margin-bottom:1rem;"></i>
                <h3 style="color:var(--text-main);">لا توجد دعوات حالياً</h3>
                <p>سيتم إشعارك هنا عند تسجيل أي مناسبة جديدة تشارك فيها.</p>
            </div>`;
        return;
    }

    const member = membersData.find(m => m.id === memberId);

    container.innerHTML = invitations.map(({ event, response }) => {
        const typeName = systemData.eventTypes[event.typeId] || 'غير محدد';
        const region = systemData.regions.find(r => r.id === event.regionId);
        const regionName = region ? region.name : '-';
        const baseAmount = region ? region.amount : 0;

        // حساب صافي المستحق المتوقع لهذا العضو
        const mtxs = (event.auditTransactions || []).filter(t => t.memberId === memberId);
        let expected = baseAmount;
        mtxs.forEach(t => {
            if (t.type === 'خصم' || t.type === 'تأخير') expected -= t.amount;
            else if (t.type === 'علاوة') expected += t.amount;
            else if (t.type === 'اعتذار') expected = 0;
        });
        expected = Math.max(0, expected);

        // بطاقة الحالة
        let statusBadge = '', borderColor = 'var(--border)', actionsHtml = '';
        if (response.status === 'pending') {
            statusBadge = '<span class="badge" style="background:rgba(252,196,25,0.15); color:#fcc419; border:1px solid rgba(252,196,25,0.4); padding:0.4rem 0.9rem; font-weight:700;"><i class="fa-solid fa-clock"></i> بانتظار ردّك</span>';
            borderColor = 'rgba(252,196,25,0.5)';
            actionsHtml = `
                <div style="display:flex; gap:0.75rem; margin-top:1.25rem; padding-top:1.25rem; border-top:1px solid var(--border);">
                    <button class="btn-primary" style="flex:1; padding:0.75rem; background:linear-gradient(135deg, #2e7d5b, #20c997); border:none;" onclick="respondToInvitation(${event.id}, 'accepted')">
                        <i class="fa-solid fa-circle-check"></i> قبول الدعوة
                    </button>
                    <button class="btn-outline" style="flex:1; padding:0.75rem; border-color:#c25550; color:#c25550;" onclick="respondToInvitation(${event.id}, 'excused')">
                        <i class="fa-solid fa-circle-xmark"></i> اعتذار
                    </button>
                </div>`;
        } else if (response.status === 'accepted') {
            statusBadge = '<span class="badge" style="background:rgba(46,125,91,0.18); color:#20c997; border:1px solid rgba(46,125,91,0.5); padding:0.4rem 0.9rem; font-weight:700;"><i class="fa-solid fa-check-double"></i> قبلتَ الدعوة</span>';
            borderColor = 'rgba(46,125,91,0.5)';
            actionsHtml = `
                <div style="display:flex; gap:0.75rem; margin-top:1.25rem; padding-top:1.25rem; border-top:1px solid var(--border);">
                    <button class="btn-outline btn-sm" style="border-color:#c25550; color:#c25550;" onclick="respondToInvitation(${event.id}, 'excused')">
                        <i class="fa-solid fa-rotate-left"></i> تغيير إلى اعتذار
                    </button>
                </div>`;
        } else if (response.status === 'excused') {
            statusBadge = '<span class="badge" style="background:rgba(194,85,80,0.15); color:#c25550; border:1px solid rgba(194,85,80,0.5); padding:0.4rem 0.9rem; font-weight:700;"><i class="fa-solid fa-circle-xmark"></i> اعتذرتَ</span>';
            borderColor = 'rgba(194,85,80,0.5)';
            actionsHtml = `
                <div style="display:flex; gap:0.75rem; margin-top:1.25rem; padding-top:1.25rem; border-top:1px solid var(--border);">
                    <button class="btn-outline btn-sm" style="border-color:#20c997; color:#20c997;" onclick="respondToInvitation(${event.id}, 'accepted')">
                        <i class="fa-solid fa-rotate-left"></i> تراجع وقبول الدعوة
                    </button>
                </div>`;
        }

        const responseTime = response.timestamp
            ? `<span style="font-size:0.8rem; color:var(--text-muted);"><i class="fa-solid fa-clock-rotate-left"></i> آخر تحديث: ${new Date(response.timestamp).toLocaleString('ar-EG')}</span>`
            : '';

        return `
            <div class="card" style="padding:1.5rem; margin-bottom:1rem; border:2px solid ${borderColor}; transition: all 0.2s;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; margin-bottom:1rem;">
                    <div>
                        <h3 style="margin:0 0 0.4rem 0; color:var(--text-main); display:flex; align-items:center; gap:0.6rem;">
                            <i class="fa-solid fa-calendar-day" style="color:var(--gold);"></i>
                            ${typeName} — ${regionName}
                        </h3>
                        <div style="color:var(--text-muted); font-size:0.95rem;">
                            <i class="fa-solid fa-calendar"></i> ${event.date}
                        </div>
                    </div>
                    <div style="text-align:left;">${statusBadge}</div>
                </div>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:1rem; padding:1rem; background:var(--bg-form); border-radius:8px; border:1px solid var(--border);">
                    <div>
                        <div style="font-size:0.8rem; color:var(--text-muted);">القسمة الأساسية</div>
                        <div style="font-weight:800; color:var(--gold-light); font-size:1.1rem;">${baseAmount} د.إ</div>
                    </div>
                    <div>
                        <div style="font-size:0.8rem; color:var(--text-muted);">الصافي المتوقع</div>
                        <div style="font-weight:800; color:${response.status === 'excused' ? '#c25550' : '#20c997'}; font-size:1.1rem;">${expected} د.إ</div>
                    </div>
                </div>
                ${actionsHtml}
                ${responseTime ? `<div style="margin-top:0.75rem; text-align:left;">${responseTime}</div>` : ''}
            </div>
        `;
    }).join('');
};

/** الاستجابة لدعوة (يستدعى من أزرار قبول/اعتذار) */
window.respondToInvitation = function(eventId, status) {
    const memberId = getCurrentMemberId();
    if (!memberId) return;

    const event = eventsData.find(e => e.id === eventId);
    if (!event) return;

    const statusLabel = status === 'accepted' ? 'قبول' : 'اعتذار';
    if (!confirm(`هل أنت متأكد من ${statusLabel} هذه الدعوة؟`)) return;

    recordMemberResponse(eventId, memberId, status);
    renderMyInvitations();
    updateNotificationBadge();

    // إشعار قصير
    if (typeof showToast === 'function') {
        showToast(`تم تسجيل ${statusLabel} المناسبة`, 'success');
    }
};

// عند الضغط على جرس الإشعارات → الانتقال لصفحة الدعوات
document.addEventListener('click', (e) => {
    const bell = e.target.closest('#notification-bell');
    if (!bell) return;
    const navItem = Array.from(document.querySelectorAll('.nav-item')).find(el => el.dataset.target === 'view-my-invitations');
    if (navItem) {
        if (typeof switchView === 'function') switchView(navItem);
        renderMyInvitations();
    }
});

// تحديث شارة الإشعارات تلقائياً كل دقيقة (في حال تم تسجيل مناسبات في تبويبات أخرى)
setInterval(() => {
    if (currentUser && currentUser.role === 'member') {
        // إعادة قراءة المناسبات من localStorage لمزامنة التغييرات من حساب المدير
        try {
            const raw = localStorage.getItem('mazyoud_events_data');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) eventsData = parsed;
            }
        } catch (e) {}
        updateNotificationBadge();
        const view = document.getElementById('view-my-invitations');
        if (view && !view.classList.contains('hidden')) {
            renderMyInvitations();
        }
    }
}, 60000);

/** حفظ بيانات الأعضاء (مع حسابات الدخول) في localStorage */
function saveMembersToStorage() {
    try {
        localStorage.setItem('mazyoud_members_data', JSON.stringify(membersData));
    } catch (e) { /* تجاهل */ }
}

/** استعادة بيانات الأعضاء من localStorage عند التحميل */
(function restoreMembersFromStorage() {
    try {
        const raw = localStorage.getItem('mazyoud_members_data');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                membersData = parsed;
            }
        }
    } catch (e) { /* تجاهل */ }
})();

// ───────────────────────────────────────────────────────────────────
// Member Account Modal — إنشاء/تعديل/حذف حساب دخول العضو
// ───────────────────────────────────────────────────────────────────

window.openMemberAccountModal = function() {
    if (!currentProfileMemberId) return;
    const member = membersData.find(m => m.id === currentProfileMemberId);
    if (!member) return;

    const modal = document.getElementById('member-account-modal');
    const nameLabel = document.getElementById('account-modal-member-name');
    const usernameInput = document.getElementById('member-account-username');
    const passwordInput = document.getElementById('member-account-password');
    const deleteBtn = document.getElementById('btn-delete-member-account');

    if (nameLabel) nameLabel.textContent = member.name;
    if (usernameInput) usernameInput.value = member.username || '';
    if (passwordInput) passwordInput.value = member.password || '';

    // إظهار زر الحذف فقط إن كان لديه حساب
    if (deleteBtn) deleteBtn.style.display = (member.username) ? 'inline-flex' : 'none';

    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
};

window.closeMemberAccountModal = function() {
    const modal = document.getElementById('member-account-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

window.saveMemberAccount = function(e) {
    if (e) e.preventDefault();
    if (!currentProfileMemberId) return;
    const member = membersData.find(m => m.id === currentProfileMemberId);
    if (!member) return;

    const username = document.getElementById('member-account-username').value.trim();
    const password = document.getElementById('member-account-password').value.trim();

    if (!username || !password) {
        alert('يرجى إدخال اسم مستخدم وكلمة مرور.');
        return;
    }

    // التحقق من عدم تكرار اسم المستخدم في حسابات المستخدمين الإداريين
    if (usersData.some(u => u.username === username)) {
        alert('اسم المستخدم محجوز لحساب إداري. اختر اسم مستخدم آخر.');
        return;
    }
    // التحقق من عدم تكرار اسم المستخدم في حسابات أعضاء آخرين
    if (membersData.some(m => m.id !== member.id && m.username === username)) {
        alert('اسم المستخدم مستخدم بالفعل لعضو آخر. اختر اسم مستخدم آخر.');
        return;
    }

    member.username = username;
    member.password = password;

    saveMembersToStorage();
    closeMemberAccountModal();

    // تحديث زر الإدارة في صفحة الملف
    updateAccountButtonLabel();

    alert(`✅ تم حفظ حساب الدخول للعضو ${member.name}.\n\nاسم المستخدم: ${username}\nكلمة المرور: ${password}\n\nيمكن للعضو الآن تسجيل الدخول من شاشة الدخول الرئيسية.`);
};

window.deleteMemberAccount = function() {
    if (!currentProfileMemberId) return;
    const member = membersData.find(m => m.id === currentProfileMemberId);
    if (!member || !member.username) return;

    if (!confirm(`هل أنت متأكد من حذف حساب الدخول للعضو "${member.name}"؟\nلن يتمكن من تسجيل الدخول بعد ذلك.`)) return;

    delete member.username;
    delete member.password;
    saveMembersToStorage();
    closeMemberAccountModal();
    updateAccountButtonLabel();
    alert('تم حذف حساب الدخول للعضو.');
};

/** تحديث نص زر إدارة الحساب وفقاً لوجود الحساب */
function updateAccountButtonLabel() {
    const label = document.getElementById('btn-manage-account-label');
    if (!label || !currentProfileMemberId) return;
    const member = membersData.find(m => m.id === currentProfileMemberId);
    if (!member) return;
    label.textContent = member.username ? `إدارة حساب الدخول (${member.username})` : 'إنشاء حساب للعضو';
}

// تحديث نص الزر عند تحميل ملف العضو
const _origViewMemberProfile = window.viewMemberProfile;
if (typeof _origViewMemberProfile === 'function') {
    window.viewMemberProfile = function(id) {
        _origViewMemberProfile(id);
        setTimeout(updateAccountButtonLabel, 0);
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// نهاية نظام بوابة العضو
// ═══════════════════════════════════════════════════════════════════════════


// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  ☁️  CLOUD SYNC LAYER — مزامنة البيانات بين جميع الأجهزة              ║
// ║  Firebase Realtime Database — اختيارية ولا تكسر شيئاً إن لم تُفعَّل     ║
// ║                                                                        ║
// ║  المنطق: كل تعديل محلي يُدفع إلى السحابة، وكل تغيير من جهاز آخر       ║
// ║  يصل إلى هذا الجهاز فوراً ويعيد رسم الواجهة.                          ║
// ╚═══════════════════════════════════════════════════════════════════════╝

(function initCloudSync() {
    // —— هل Firebase معدّ؟ ——
    const cfg = window.FIREBASE_CONFIG;
    const ns  = window.FIREBASE_NAMESPACE || 'mazyoud_main';
    const isConfigured = cfg && cfg.apiKey && cfg.apiKey !== 'YOUR_API_KEY_HERE' && cfg.databaseURL;

    if (!isConfigured) {
        console.info('☁️ المزامنة السحابية معطّلة (firebase-config.js لم يُعدَّل بعد). البرنامج يعمل محلياً فقط.');
        // عرض شارة توضيحية صغيرة في الواجهة (إن وُجدت)
        showCloudStatus('local', 'يعمل محلياً — راجع README لتفعيل المزامنة');
        return;
    }

    if (typeof firebase === 'undefined') {
        console.warn('☁️ Firebase SDK لم يُحمَّل. تأكد من اتصالك بالإنترنت.');
        showCloudStatus('error', 'فشل تحميل Firebase');
        return;
    }

    // —— تهيئة Firebase ——
    let db;
    try {
        firebase.initializeApp(cfg);
        db = firebase.database();
    } catch (e) {
        console.error('☁️ فشلت تهيئة Firebase:', e);
        showCloudStatus('error', 'خطأ في إعدادات Firebase');
        return;
    }

    const stateRef = db.ref(`${ns}/state`);
    const clientId = (Math.random().toString(36) + Date.now().toString(36)).slice(2, 14);
    let pushTimer = null;
    let lastPushedAt = 0;
    let isApplyingRemote = false;

    // —— التقاط الحالة الكاملة ——
    function snapshotLocalState() {
        return {
            users: usersData,
            members: membersData,
            events: eventsData,
            fund: fundTransactions,
            system: systemData,
            initialFund: initialFundBalance,
            _by: clientId,
            _ts: Date.now()
        };
    }

    // —— تطبيق الحالة الواردة ——
    function applyRemoteState(data) {
        if (!data) return;
        if (data._by === clientId) return;       // تجاهل التغييرات الصادرة من هذا الجهاز
        if (data._ts && data._ts <= lastPushedAt) return;  // تجاهل البيانات الأقدم

        isApplyingRemote = true;
        try {
            if (Array.isArray(data.users))   usersData = data.users;
            if (Array.isArray(data.members)) membersData = data.members;
            if (Array.isArray(data.events))  eventsData = data.events;
            if (Array.isArray(data.fund))    fundTransactions = data.fund;
            if (data.system && typeof data.system === 'object') systemData = data.system;
            if (typeof data.initialFund === 'number') initialFundBalance = data.initialFund;

            // إعادة رسم كل الواجهات الظاهرة
            try { if (typeof renderEvents          === 'function') renderEvents();          } catch (e) {}
            try { if (typeof renderMembers         === 'function') renderMembers();         } catch (e) {}
            try { if (typeof renderUsersTable      === 'function') renderUsersTable();      } catch (e) {}
            try { if (typeof renderFundTransactions === 'function') renderFundTransactions(); } catch (e) {}
            try { if (typeof renderRegions         === 'function') renderRegions();         } catch (e) {}
            try { if (typeof renderCategories      === 'function') renderCategories();      } catch (e) {}
            try { if (typeof renderEventTypes      === 'function') renderEventTypes();      } catch (e) {}
            try { if (typeof updateDashboardStats  === 'function') updateDashboardStats();  } catch (e) {}

            // تحديث بوابة العضو إن كانت مفتوحة
            if (currentUser && currentUser.role === 'member') {
                try { if (typeof updateNotificationBadge === 'function') updateNotificationBadge(); } catch (e) {}
                try { if (typeof renderMyInvitations    === 'function') renderMyInvitations();    } catch (e) {}
            }

            console.info('☁️ تم استلام تحديث من جهاز آخر —', new Date().toLocaleTimeString('ar-EG'));
            showCloudStatus('synced', 'تم التحديث');
        } finally {
            isApplyingRemote = false;
        }
    }

    // —— الدفع للسحابة (debounced) ——
    function cloudPush() {
        if (isApplyingRemote) return;            // لا نرسل تغييرات قادمة من السحابة نفسها
        clearTimeout(pushTimer);
        pushTimer = setTimeout(() => {
            const snap = snapshotLocalState();
            lastPushedAt = snap._ts;
            stateRef.set(snap)
                .then(() => showCloudStatus('synced', 'تمت المزامنة'))
                .catch(err => {
                    console.error('☁️ فشل الرفع:', err);
                    showCloudStatus('error', 'فشلت المزامنة');
                });
        }, 600);
    }

    // —— الاستماع للتغييرات الواردة ——
    let firstSnapshot = true;
    stateRef.on('value', snap => {
        const data = snap.val();
        if (firstSnapshot) {
            firstSnapshot = false;
            if (data) {
                // أول تشغيل: استورد البيانات من السحابة (تجاوز فحص الجهاز/الوقت)
                isApplyingRemote = true;
                try {
                    if (Array.isArray(data.users))   usersData = data.users;
                    if (Array.isArray(data.members)) membersData = data.members;
                    if (Array.isArray(data.events))  eventsData = data.events;
                    if (Array.isArray(data.fund))    fundTransactions = data.fund;
                    if (data.system) systemData = data.system;
                    if (typeof data.initialFund === 'number') initialFundBalance = data.initialFund;
                    showCloudStatus('synced', 'متصل بالسحابة');
                    // إعادة رسم الواجهات
                    setTimeout(() => {
                        try { if (typeof renderEvents          === 'function') renderEvents();          } catch (e) {}
                        try { if (typeof renderMembers         === 'function') renderMembers();         } catch (e) {}
                        try { if (typeof renderUsersTable      === 'function') renderUsersTable();      } catch (e) {}
                        try { if (typeof renderFundTransactions === 'function') renderFundTransactions(); } catch (e) {}
                        try { if (typeof renderRegions         === 'function') renderRegions();         } catch (e) {}
                        try { if (typeof renderCategories      === 'function') renderCategories();      } catch (e) {}
                        try { if (typeof renderEventTypes      === 'function') renderEventTypes();      } catch (e) {}
                        try { if (typeof updateDashboardStats  === 'function') updateDashboardStats();  } catch (e) {}
                        if (currentUser && currentUser.role === 'member') {
                            try { if (typeof updateNotificationBadge === 'function') updateNotificationBadge(); } catch (e) {}
                            try { if (typeof renderMyInvitations    === 'function') renderMyInvitations();    } catch (e) {}
                        }
                    }, 100);
                } finally {
                    isApplyingRemote = false;
                }
            } else {
                // لا توجد بيانات في السحابة → ادفع البيانات الحالية كنقطة بداية
                showCloudStatus('synced', 'بدء المزامنة');
                cloudPush();
            }
        } else {
            applyRemoteState(data);
        }
    }, err => {
        console.error('☁️ خطأ في الاستماع للسحابة:', err);
        showCloudStatus('error', 'انقطع الاتصال');
    });

    // —— هوكات في الدوال الموجودة ——
    // كلما حُفظت بيانات في localStorage، ادفعها أيضاً للسحابة.
    if (typeof saveEventsToStorage === 'function') {
        const _origEvents = saveEventsToStorage;
        window.saveEventsToStorage = function() { _origEvents.apply(this, arguments); cloudPush(); };
    }
    if (typeof saveMembersToStorage === 'function') {
        const _origMembers = saveMembersToStorage;
        window.saveMembersToStorage = function() { _origMembers.apply(this, arguments); cloudPush(); };
    }

    // —— كشف عام: cloudPush متاحة كنداء يدوي للأكواد الأخرى ——
    window.cloudPush = cloudPush;

    // —— مزامنة دورية احتياطية كل 15 ثانية للبيانات غير المربوطة بـ saveXxxToStorage ——
    // هذا يضمن مزامنة fundTransactions و systemData و usersData حتى لو نسي الكود استدعاء cloudPush
    setInterval(() => { if (!isApplyingRemote) cloudPush(); }, 15000);

    console.info(`☁️ المزامنة السحابية مفعّلة — Namespace: ${ns}, ClientID: ${clientId}`);
})();

/** عرض حالة المزامنة في زاوية الشاشة */
function showCloudStatus(state, message) {
    let badge = document.getElementById('cloud-status-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'cloud-status-badge';
        badge.style.cssText = `
            position: fixed; bottom: 1rem; left: 1rem; z-index: 999;
            padding: 0.4rem 0.9rem; border-radius: 20px;
            font-size: 0.78rem; font-weight: 600;
            display: flex; align-items: center; gap: 0.5rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.3s; pointer-events: none;
            font-family: 'Tajawal', sans-serif;
        `;
        document.body.appendChild(badge);
    }
    const palette = {
        synced: { bg: 'rgba(46,125,91,0.95)',  fg: '#fff', icon: '☁️' },
        local:  { bg: 'rgba(139,104,64,0.95)', fg: '#fff', icon: '📁' },
        error:  { bg: 'rgba(194,85,80,0.95)',  fg: '#fff', icon: '⚠️' }
    };
    const p = palette[state] || palette.local;
    badge.style.background = p.bg;
    badge.style.color = p.fg;
    badge.innerHTML = `<span>${p.icon}</span><span>${message}</span>`;
    badge.style.opacity = '1';

    // اختفاء بعد 4 ثوان للحالة "synced"
    if (state === 'synced') {
        clearTimeout(badge._fadeTimer);
        badge._fadeTimer = setTimeout(() => { badge.style.opacity = '0.4'; }, 4000);
    }
}

// ╚═══════════════════════════════════════════════════════════════════════╝

