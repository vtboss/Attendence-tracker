// Global Variables
let currentUser = JSON.parse(localStorage.getItem('ece_current_user')) || null;
let currentFilter = 'entire';
let subjects = [];
let timetable = {};
let attendance = {};
let semesterInfo = {};

// Load user-specific data
function loadUserData() {
    if (!currentUser) return;
    
    const userId = currentUser.id;
    subjects = JSON.parse(localStorage.getItem(`ece_subjects_${userId}`)) || [];
    timetable = JSON.parse(localStorage.getItem(`ece_timetable_${userId}`)) || {};
    attendance = JSON.parse(localStorage.getItem(`ece_attendance_${userId}`)) || {};
    semesterInfo = JSON.parse(localStorage.getItem(`ece_semester_info_${userId}`)) || {};
}

// Time slots as per SGBIT timetable
const timeSlots = [
    { start: '10:00 am', end: '10:55 am', display: '10:00-10:55 AM' },
    { start: '10:55 am', end: '11:50 am', display: '10:55-11:50 AM' },
    { start: '11:50 am', end: '12:10 pm', display: '11:50-12:10 PM' },
    { start: '12:10 pm', end: '1:05 pm', display: '12:10-1:05 PM' },
    { start: '1:05 pm', end: '2:00 pm', display: '1:05-2:00 PM' },
    { start: '2:00 pm', end: '3:10 pm', display: '2:00-3:10 PM' },
    { start: '3:10 pm', end: '4:05 pm', display: '3:10-4:05 PM' }
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
});

function initializeApp() {
    // Load user-specific data first
    loadUserData();
    
    // Then initialize the app with that data
    loadSemesterInfo();
    loadSubjects();
    generateTimetableGrid();
    loadTimetable();
    setToday();
    updateDashboard();
    
    // Set up event listeners
    setupEventListeners();
    
    // Update UI with user info
    updateUserProfile();
}

// Authentication Functions
function checkAuthStatus() {
    if (currentUser) {
        // User is already signed in
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('mainContainer').style.display = 'block';
        initializeApp();
    } else {
        // User is not signed in
        document.getElementById('loginContainer').style.display = 'flex';
        document.getElementById('mainContainer').style.display = 'none';
    }
}

function handleCredentialResponse(response) {
    try {
        // Decode the JWT token
        const responsePayload = decodeJwtResponse(response.credential);
        
        // Validate required fields
        if (!responsePayload.sub || !responsePayload.name || !responsePayload.email) {
            throw new Error('Missing required user information');
        }
        
        // Save user info
        currentUser = {
            id: responsePayload.sub,
            name: responsePayload.name,
            email: responsePayload.email,
            picture: responsePayload.picture || '',
            signedInAt: new Date().toISOString()
        };
        
        // Store in localStorage
        localStorage.setItem('ece_current_user', JSON.stringify(currentUser));
        
        // Update UI
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('mainContainer').style.display = 'block';
        
        // Initialize app
        initializeApp();
        
        showAlert('success', `✅ Welcome, ${currentUser.name}!`);
    } catch (error) {
        console.error('Authentication error:', error);
        showAlert('danger', '❌ Authentication failed. Please try again.');
    }
}

function decodeJwtResponse(token) {
    try {
        if (!token || typeof token !== 'string') {
            throw new Error('Invalid token format');
        }
        
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid JWT token structure');
        }
        
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('JWT decode error:', error);
        throw new Error('Failed to decode authentication token');
    }
}

function signOut() {
    try {
        // Clear user data
        currentUser = null;
        localStorage.removeItem('ece_current_user');
        
        // Show login screen
        document.getElementById('loginContainer').style.display = 'flex';
        document.getElementById('mainContainer').style.display = 'none';
        
        // Google sign-out
        if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            google.accounts.id.disableAutoSelect();
        }
        
        showAlert('success', '👋 You have been signed out successfully.');
    } catch (error) {
        console.error('Sign out error:', error);
        showAlert('warning', '⚠️ Sign out may not have completed properly.');
        
        // Force logout anyway
        document.getElementById('loginContainer').style.display = 'flex';
        document.getElementById('mainContainer').style.display = 'none';
    }
}

function updateUserProfile() {
    if (currentUser) {
        const profilePic = document.getElementById('userProfilePic');
        const userName = document.getElementById('userName');
        
        if (profilePic) profilePic.src = currentUser.picture;
        if (userName) userName.textContent = currentUser.name;
    }
}

function setupEventListeners() {
    // Add subject on Enter key
    const subjectInput = document.getElementById('subjectInput');
    if (subjectInput) {
        subjectInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addSubject();
            }
        });
    }
}

// Tab Management
function showTab(tabName) {
    // Hide all tabs
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Remove active class from all nav tabs
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => tab.classList.remove('active'));
    
    // Show selected tab
    const selectedTab = document.getElementById(tabName);
    const selectedNavTab = document.querySelector(`[data-tab="${tabName}"]`);
    
    if (selectedTab) selectedTab.classList.add('active');
    if (selectedNavTab) selectedNavTab.classList.add('active');
    
    // Load data when switching to specific tabs
    if (tabName === 'attendance') {
        loadAttendanceForDate();
    } else if (tabName === 'dashboard') {
        updateDashboard();
    }
}

// Semester Management
function saveSemesterInfo() {
    if (!currentUser) {
        showAlert('danger', '⚠️ You must be signed in to save semester information.');
        return;
    }
    
    const semesterStart = document.getElementById('semesterStart').value;
    const semesterEnd = document.getElementById('semesterEnd').value;
    const cie1Date = document.getElementById('cie1Date').value;
    const cie2Date = document.getElementById('cie2Date').value;
    const threshold = document.getElementById('attendanceThreshold').value;

    if (!semesterStart || !semesterEnd) {
        showAlert('danger', '⚠️ Please enter both semester start and end dates.');
        return;
    }

    if (new Date(semesterStart) >= new Date(semesterEnd)) {
        showAlert('danger', '⚠️ Semester start date must be before end date.');
        return;
    }

    semesterInfo = {
        semesterStart,
        semesterEnd,
        cie1Date,
        cie2Date,
        attendanceThreshold: parseInt(threshold) || 75,
        savedAt: new Date().toISOString()
    };

    localStorage.setItem(`ece_semester_info_${currentUser.id}`, JSON.stringify(semesterInfo));
    loadSemesterInfo();
    showAlert('success', '✅ Semester information saved successfully!');
}

function loadSemesterInfo() {
    if (Object.keys(semesterInfo).length > 0) {
        const elements = {
            semesterStart: document.getElementById('semesterStart'),
            semesterEnd: document.getElementById('semesterEnd'),
            cie1Date: document.getElementById('cie1Date'),
            cie2Date: document.getElementById('cie2Date'),
            attendanceThreshold: document.getElementById('attendanceThreshold')
        };

        if (elements.semesterStart) elements.semesterStart.value = semesterInfo.semesterStart || '';
        if (elements.semesterEnd) elements.semesterEnd.value = semesterInfo.semesterEnd || '';
        if (elements.cie1Date) elements.cie1Date.value = semesterInfo.cie1Date || '';
        if (elements.cie2Date) elements.cie2Date.value = semesterInfo.cie2Date || '';
        if (elements.attendanceThreshold) elements.attendanceThreshold.value = semesterInfo.attendanceThreshold || 75;

        const display = document.getElementById('semesterInfoDisplay');
        if (display) {
            display.style.display = 'block';
            display.innerHTML = `
                <h4>📋 Current Semester Configuration</h4>
                <p><strong>📅 Semester Duration:</strong> ${formatDate(semesterInfo.semesterStart)} to ${formatDate(semesterInfo.semesterEnd)}</p>
                <p><strong>📝 CIE-1 Date:</strong> ${semesterInfo.cie1Date ? formatDate(semesterInfo.cie1Date) : 'Not set'}</p>
                <p><strong>📝 CIE-2 Date:</strong> ${semesterInfo.cie2Date ? formatDate(semesterInfo.cie2Date) : 'Not set'}</p>
                <p><strong>🎯 Minimum Attendance Required:</strong> ${semesterInfo.attendanceThreshold}%</p>
                <p><small>💾 Last updated: ${new Date(semesterInfo.savedAt).toLocaleString()}</small></p>
            `;
        }
    }
}

// Subject Management
function addSubject() {
    const input = document.getElementById('subjectInput');
    const subjectName = input.value.trim();
    
    if (!subjectName) {
        showAlert('warning', '⚠️ Please enter a subject name.');
        return;
    }
    
    if (subjects.includes(subjectName)) {
        showAlert('warning', '⚠️ This subject already exists.');
        return;
    }
    
    subjects.push(subjectName);
    saveSubjects();
    loadSubjects();
    generateTimetableGrid();
    input.value = '';
    showAlert('success', `✅ Subject "${subjectName}" added successfully!`);
}

function removeSubject(subjectName) {
    if (!confirm(`Are you sure you want to remove "${subjectName}"?\n\nThis will delete:\n• All timetable entries for this subject\n• All attendance records for this subject\n\nThis action cannot be undone.`)) {
        return;
    }
    
    subjects = subjects.filter(s => s !== subjectName);
    
    // Remove from timetable
    Object.keys(timetable).forEach(day => {
        if (timetable[day]) {
            Object.keys(timetable[day]).forEach(period => {
                if (timetable[day][period] === subjectName) {
                    delete timetable[day][period];
                }
            });
        }
    });
    
    // Remove from attendance
    Object.keys(attendance).forEach(date => {
        if (attendance[date]) {
            Object.keys(attendance[date]).forEach(key => {
                if (key.includes(subjectName)) {
                    delete attendance[date][key];
                }
            });
        }
    });
    
    saveSubjects();
    saveTimetable();
    saveAttendance();
    loadSubjects();
    generateTimetableGrid();
    updateDashboard();
    showAlert('warning', `🗑️ Subject "${subjectName}" removed successfully.`);
}

function saveSubjects() {
    if (!currentUser) return;
    localStorage.setItem(`ece_subjects_${currentUser.id}`, JSON.stringify(subjects));
}

function loadSubjects() {
    const subjectList = document.getElementById('subjectList');
    if (!subjectList) return;
    
    subjectList.innerHTML = '';
    
    if (subjects.length === 0) {
        subjectList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📚</div>
                <h3>No subjects added yet</h3>
                <p>Add your ECE subjects to get started with attendance tracking!</p>
            </div>
        `;
        return;
    }
    
    subjects.forEach((subject, index) => {
        const subjectItem = document.createElement('div');
        subjectItem.className = 'subject-item';
        subjectItem.innerHTML = `
            <div class="subject-name">${subject}</div>
            <button class="btn btn-danger" onclick="removeSubject('${subject}')" title="Remove ${subject}">
                🗑️ Remove
            </button>
        `;
        subjectList.appendChild(subjectItem);
    });
}

// Timetable Management - FIXED
function generateTimetableGrid() {
    const tbody = document.getElementById('timetableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    days.forEach(day => {
        const row = document.createElement('tr');
        
        // Day header cell - FIXED: Ensure proper styling
        const dayCell = document.createElement('td');
        dayCell.className = 'day-header';
        dayCell.textContent = day;
        dayCell.style.minWidth = '120px';
        dayCell.style.fontWeight = 'bold';
        dayCell.style.textAlign = 'center';
        row.appendChild(dayCell);
        
        // Period cells
        timeSlots.forEach((slot, periodIndex) => {
            const cell = document.createElement('td');
            const select = document.createElement('select');
            select.dataset.day = day;
            select.dataset.period = periodIndex;
            select.onchange = () => updateTimetableCell(day, periodIndex, select.value);
            
            // Add default empty option
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = 'Free Period';
            select.appendChild(emptyOption);
            
            // Add subject options
            subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject;
                option.textContent = subject;
                select.appendChild(option);
            });
            
            // Set current value if exists
            if (timetable[day] && timetable[day][periodIndex]) {
                select.value = timetable[day][periodIndex];
            }
            
            cell.appendChild(select);
            row.appendChild(cell);
        });
        
        tbody.appendChild(row);
    });
}

function updateTimetableCell(day, period, subject) {
    if (!timetable[day]) {
        timetable[day] = {};
    }
    
    if (subject && subject.trim()) {
        timetable[day][period] = subject.trim();
    } else {
        delete timetable[day][period];
    }
}

function saveTimetable() {
    if (!currentUser) return;
    localStorage.setItem(`ece_timetable_${currentUser.id}`, JSON.stringify(timetable));
    showAlert('success', '✅ Timetable saved successfully!');
}

function loadTimetable() {
    generateTimetableGrid();
}

// Attendance Management
function setToday() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('attendanceDate');
    if (dateInput) {
        dateInput.value = today;
        loadAttendanceForDate();
    }
}

function loadAttendanceForDate() {
    const dateInput = document.getElementById('attendanceDate');
    const selectedDate = dateInput?.value;
    
    const grid = document.getElementById('attendanceGrid');
    const alertDiv = document.getElementById('attendanceAlert');
    const dayInfoDiv = document.getElementById('dayInfo');
    const holidayToggle = document.getElementById('holidayToggle');
    
    if (!selectedDate || !grid) {
        if (grid) grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><h3>No date selected</h3><p>Please select a date to view/mark attendance.</p></div>';
        return;
    }
    
    const dayName = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
    const daySchedule = timetable[dayName] || {};
    
    grid.innerHTML = '';
    if (alertDiv) alertDiv.innerHTML = '';
    
    // Update day info
    if (dayInfoDiv) {
        dayInfoDiv.innerHTML = `
            <h3>📅 ${formatDate(selectedDate)} - ${dayName}</h3>
            <p>Select attendance status for each scheduled class below.</p>
        `;
    }
    
    // Check if day is marked as holiday
    const isHoliday = attendance[selectedDate] && attendance[selectedDate]['__holiday__'];
    if (holidayToggle) holidayToggle.checked = isHoliday;
    
    if (Object.keys(daySchedule).length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎯</div>
                <h3>No classes scheduled</h3>
                <p>You don't have any classes scheduled for ${dayName}. Enjoy your free day!</p>
            </div>
        `;
        return;
    }
    
    if (isHoliday && alertDiv) {
        alertDiv.innerHTML = '<div class="alert alert-info">🖖 This day is marked as a Holiday. All classes are excluded from attendance calculations.</div>';
    }
    
    // Create attendance cards for each scheduled class
    const scheduledPeriods = Object.keys(daySchedule).sort((a, b) => parseInt(a) - parseInt(b));
    
    scheduledPeriods.forEach(periodIndex => {
        const subject = daySchedule[periodIndex];
        const timeSlot = timeSlots[parseInt(periodIndex)];
        
        if (subject && timeSlot) {
            const periodCard = document.createElement('div');
            const attendanceKey = `${selectedDate}_${periodIndex}_${subject}`;
            
            let currentStatus = 'none';
            if (attendance[selectedDate]) {
                if (attendance[selectedDate]['__holiday__']) {
                    currentStatus = 'holiday';
                } else if (attendance[selectedDate][attendanceKey] === true) {
                    currentStatus = 'present';
                } else if (attendance[selectedDate][attendanceKey] === false) {
                    currentStatus = 'absent';
                }
            }
            
            periodCard.className = `period-card ${currentStatus !== 'none' ? currentStatus : ''}`;
            periodCard.innerHTML = `
                <div class="period-header-attendance">
                    <div class="period-time">${timeSlot.display}</div>
                </div>
                <div class="period-subject">${subject}</div>
                <div class="attendance-buttons">
                    <button class="attendance-btn present ${currentStatus === 'present' ? 'active' : ''}" 
                            onclick="markAttendance('${selectedDate}', ${periodIndex}, '${subject}', true)"
                            ${isHoliday ? 'disabled' : ''}>
                        <span>✅ Present</span>
                    </button>
                    <button class="attendance-btn absent ${currentStatus === 'absent' ? 'active' : ''}" 
                            onclick="markAttendance('${selectedDate}', ${periodIndex}, '${subject}', false)"
                            ${isHoliday ? 'disabled' : ''}>
                        <span>❌ Absent</span>
                    </button>
                </div>
            `;
            
            grid.appendChild(periodCard);
        }
    });
}

function markAttendance(date, period, subject, isPresent) {
    if (!attendance[date]) {
        attendance[date] = {};
    }
    
    const attendanceKey = `${date}_${period}_${subject}`;
    attendance[date][attendanceKey] = isPresent;
    
    saveAttendance();
    loadAttendanceForDate();
    updateDashboard();
    
    const status = isPresent ? 'Present' : 'Absent';
    showAlert('success', `✅ Marked ${status} for ${subject} at ${timeSlots[period].display}`);
}

function toggleHoliday() {
    const dateInput = document.getElementById('attendanceDate');
    const selectedDate = dateInput?.value;
    const holidayToggle = document.getElementById('holidayToggle');
    
    if (!selectedDate) {
        showAlert('warning', '⚠️ Please select a date first.');
        if (holidayToggle) holidayToggle.checked = false;
        return;
    }
    
    if (!attendance[selectedDate]) {
        attendance[selectedDate] = {};
    }
    
    if (holidayToggle?.checked) {
        attendance[selectedDate]['__holiday__'] = true;
        showAlert('info', '🖖 Day marked as Holiday. All attendance for this day will be excluded from calculations.');
    } else {
        delete attendance[selectedDate]['__holiday__'];
        showAlert('info', '📅 Holiday status removed. Attendance for this day will be included in calculations.');
    }
    
    saveAttendance();
    loadAttendanceForDate();
    updateDashboard();
}

function saveAttendance() {
    if (!currentUser) return;
    localStorage.setItem(`ece_attendance_${currentUser.id}`, JSON.stringify(attendance));
}

// Dashboard and Analytics - FIXED
function updateDashboard() {
    updateOverallStats();
    updateSubjectWiseStats();
}

function updateOverallStats() {
    const stats = calculateFilteredStats();
    
    // Update individual stat elements
    const elements = {
        overallPercentage: document.getElementById('overallPercentage'),
        totalClasses: document.getElementById('totalClasses'),
        attendedClasses: document.getElementById('attendedClasses'),
        holidayClasses: document.getElementById('holidayClasses')
    };

    if (elements.overallPercentage) elements.overallPercentage.textContent = `${stats.overallPercentage}%`;
    if (elements.totalClasses) elements.totalClasses.textContent = stats.totalClasses;
    if (elements.attendedClasses) elements.attendedClasses.textContent = stats.totalPresent;
    if (elements.holidayClasses) elements.holidayClasses.textContent = calculateHolidayClasses();
}

function updateSubjectWiseStats() {
    const subjectStats = calculateSubjectWiseStats();
    const container = document.getElementById('subjectStats');
    
    if (!container) return;
    
    if (subjectStats.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <h3>No attendance data yet</h3>
                <p>Start marking your attendance to see detailed analytics here!</p>
            </div>
        `;
        return;
    }
    
    const threshold = semesterInfo.attendanceThreshold || 75;
    
    container.innerHTML = subjectStats.map(stat => {
        const isLowAttendance = stat.percentage < threshold;
        const progressWidth = Math.min(stat.percentage, 100);
        
        return `
            <div class="subject-card ${isLowAttendance ? 'low-attendance' : ''}">
                <div class="subject-card-header">
                    <div class="subject-card-name">${stat.subject}</div>
                    <div class="subject-percentage ${stat.percentage < threshold ? 'low' : stat.percentage < 85 ? 'medium' : ''}">
                        ${stat.percentage}%
                    </div>
                </div>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill ${stat.percentage < threshold ? 'low' : stat.percentage < 85 ? 'medium' : ''}" 
                             style="width: ${progressWidth}%"></div>
                    </div>
                </div>
                <div class="attendance-details">
                    <div class="detail-item">
                        <div class="detail-value">${stat.present}</div>
                        <div class="detail-label">Present</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-value">${stat.absent}</div>
                        <div class="detail-label">Absent</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-value">${stat.total}</div>
                        <div class="detail-label">Total</div>
                    </div>
                </div>
                ${isLowAttendance ? `
                    <div class="threshold-warning">
                        ⚠️ Below ${threshold}% threshold! Need to improve attendance.
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function calculateFilteredStats() {
    const cie1 = semesterInfo.cie1Date;
    const cie2 = semesterInfo.cie2Date;

    let filterFunc = () => true;
    if (currentFilter === 'before-cie1' && cie1) {
        filterFunc = date => new Date(date) < new Date(cie1);
    } else if (currentFilter === 'between-cie' && cie1 && cie2) {
        filterFunc = date => new Date(date) >= new Date(cie1) && new Date(date) <= new Date(cie2);
    } else if (currentFilter === 'after-cie2' && cie2) {
        filterFunc = date => new Date(date) > new Date(cie2);
    }

    let totalPresent = 0, totalAbsent = 0, totalClasses = 0;
    Object.keys(attendance).forEach(date => {
        if (!filterFunc(date)) return;
        if (attendance[date]['__holiday__']) return;
        Object.keys(attendance[date]).forEach(key => {
            if (!key.startsWith('__')) {
                if (attendance[date][key] === true) totalPresent++;
                else if (attendance[date][key] === false) totalAbsent++;
                totalClasses++;
            }
        });
    });

    const overallPercentage = totalClasses > 0 ? ((totalPresent / totalClasses) * 100).toFixed(1) : 0;
    return {
        totalPresent,
        totalAbsent,
        totalClasses,
        overallPercentage: parseFloat(overallPercentage)
    };
}

function calculateSubjectWiseStats() {
    const subjectStats = {};
    
    subjects.forEach(subject => {
        subjectStats[subject] = { present: 0, absent: 0, total: 0 };
    });
    
    Object.keys(attendance).forEach(date => {
        if (attendance[date]['__holiday__']) return;
        
        Object.keys(attendance[date]).forEach(key => {
            if (!key.startsWith('__')) {
                const parts = key.split('_');
                if (parts.length >= 3) {
                    const subject = parts.slice(2).join('_');
                    if (subjectStats[subject]) {
                        if (attendance[date][key] === true) {
                            subjectStats[subject].present++;
                        } else if (attendance[date][key] === false) {
                            subjectStats[subject].absent++;
                        }
                        subjectStats[subject].total++;
                    }
                }
            }
        });
    });
    
    return Object.keys(subjectStats)
        .filter(subject => subjectStats[subject].total > 0)
        .map(subject => {
            const stats = subjectStats[subject];
            const percentage = ((stats.present / stats.total) * 100).toFixed(1);
            return {
                subject,
                present: stats.present,
                absent: stats.absent,
                total: stats.total,
                percentage: parseFloat(percentage)
            };
        })
        .sort((a, b) => a.percentage - b.percentage);
}

function calculateHolidayClasses() {
    let holidayCount = 0;
    Object.keys(attendance).forEach(date => {
        if (attendance[date]['__holiday__']) {
            const dayName = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
            const daySchedule = timetable[dayName] || {};
            holidayCount += Object.keys(daySchedule).length;
        }
    });
    return holidayCount;
}

// Filter Functions - FIXED
function setFilter(filter) {
    currentFilter = filter;

    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        // Check if this button is the one we want to activate
        if (btn.getAttribute('data-filter') === filter) {
            btn.classList.add('active');
        }
    });

    // Update the dashboard with the new filter
    updateDashboard();
}

// Export Functions - FIXED
function exportToCSV() {
    const subjectStats = calculateSubjectWiseStats();
    let csvContent = "Subject,Present,Absent,Total,Percentage\n";
    
    subjectStats.forEach(stat => {
        csvContent += `"${stat.subject}",${stat.present},${stat.absent},${stat.total},${stat.percentage}%\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ece_attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showAlert('success', '📄 CSV report downloaded successfully!');
}

function exportToJSON() {
    const data = {
        subjects,
        timetable,
        attendance,
        semesterInfo,
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `ece_attendance_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showAlert('success', '✅ Data exported successfully!');
}

function clearAllData() {
    if (confirm('⚠️ This will permanently delete ALL data including:\n\n• All subjects\n• Complete timetable\n• All attendance records\n• Semester information\n\nThis action CANNOT be undone!\n\nAre you absolutely sure?')) {
        
        subjects = [];
        timetable = {};
        attendance = {};
        semesterInfo = {};
        currentFilter = 'entire';
        
        localStorage.removeItem('ece_subjects');
        localStorage.removeItem('ece_timetable');
        localStorage.removeItem('ece_attendance');
        localStorage.removeItem('ece_semester_info');
        
        initializeApp();
        showAlert('warning', '🗑️ All data has been cleared successfully.');
    }
}

// Utility Functions
function formatDate(dateString) {
    if (!dateString) return 'Not set';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function showAlert(type, message) {
    const alertContainer = document.getElementById('alertContainer') || createAlertContainer();
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <span class="alert-message">${message}</span>
        <button class="alert-close" onclick="closeAlert(this)">×</button>
    `;
    
    alertContainer.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
    
    setTimeout(() => {
        alertDiv.classList.add('show');
    }, 10);
}

function createAlertContainer() {
    const container = document.createElement('div');
    container.id = 'alertContainer';
    container.className = 'alert-container';
    document.body.appendChild(container);
    return container;
}

function closeAlert(button) {
    const alert = button.parentNode;
    alert.classList.add('hide');
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 300);
}

// Keyboard Shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab && activeTab.id === 'timetable') {
            saveTimetable();
        }
    }
    
    if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        exportToJSON();
    }
});

console.log('ECE Attendance Tracker initialized successfully! 🎉');