// student-ui.js - UI handlers for student interface

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page
    initializeStudentDashboard();
    
    // Set up polling for notifications (every 30 seconds)
    setInterval(refreshNotifications, 30000);
    
    // Add event listeners
    setupEventListeners();
});

// Initialize the dashboard
async function initializeStudentDashboard() {
    // Load user information
    loadUserInfo();
    
    // Fetch courses and notifications
    await displayStudentCourses();
    await refreshNotifications();
}

// Load user information from localStorage
function loadUserInfo() {
    const firstName = localStorage.getItem('firstName') || 'Student';
    const lastName = localStorage.getItem('lastName') || '';
    const major = localStorage.getItem('major') || '';
    
    // Update the UI with user information
    const userNameElement = document.querySelector('.user-name');
    const userRoleElement = document.querySelector('.user-role');
    
    if (userNameElement) {
        userNameElement.textContent = `${firstName} ${lastName}`;
    }
    
    if (userRoleElement) {
        userRoleElement.textContent = major;
    }
}

// Display student courses
async function displayStudentCourses() {
    const courses = await window.studentApi.fetchStudentCourses();
    const coursesGrid = document.querySelector('.courses-grid');
    if (!coursesGrid) return;
    
    // Clear existing courses
    coursesGrid.innerHTML = '';
    
    if (courses.length === 0) {
        coursesGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book"></i>
                <p>You are not enrolled in any courses yet.</p>
            </div>
        `;
        return;
    }
    
    // Update courses count in stats
    const coursesStatValue = document.querySelector('.stat-card:first-child .stat-value');
    if (coursesStatValue) coursesStatValue.textContent = courses.length;
    
    // Add each course to the grid
    courses.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        courseCard.innerHTML = `
            <div class="course-header" style="background: linear-gradient(135deg, #4f46e5, #7c3aed);">
                <div class="course-title">${course.title}</div>
                <div class="course-meta">${course.code} • ${course.department}</div>
            </div>
            <div class="course-content">
                <div class="course-instructor">
                    <i class="fas fa-user-tie"></i> ${course.teacher ? `${course.teacher.firstName} ${course.teacher.lastName}` : 'Instructor'}
                </div>
                <div class="course-stats">
                    <div class="stat">
                        <i class="fas fa-file-alt"></i> ${course.assignments ? course.assignments.length : 0} Assignments
                    </div>
                    <div class="stat">
                        <i class="fas fa-file"></i> ${course.materials ? course.materials.length : 0} Materials
                    </div>
                </div>
                <div class="course-actions">
                    <button class="btn btn-primary view-course" data-course-id="${course._id}">View Course</button>
                </div>
            </div>
        `;
        coursesGrid.appendChild(courseCard);
    });
}

// View a specific course
async function viewCourse(courseId) {
    const course = await window.studentApi.fetchCourse(courseId);
    if (!course) return;
    
    // Hide all sections and show course content
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById('course-content').classList.add('active');
    
    // Set course name
    document.getElementById('currentCourseName').textContent = course.title;
    
    // Set active tab to overview
    document.querySelectorAll('.course-tabs .tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector('.course-tabs .tab[data-tab="overview"]').classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById('overview-tab').classList.add('active');
    
    // Load course materials
    loadCourseMaterials(courseId);
    
    // Load course assignments
    loadCourseAssignments(courseId);
    
    // Store current course ID
    localStorage.setItem('currentCourseId', courseId);
}

// Load course materials
async function loadCourseMaterials(courseId) {
    const materials = await window.studentApi.fetchCourseMaterials(courseId);
    const materialsList = document.getElementById('course-materials-list');
    if (!materialsList) return;
    
    // Clear existing materials
    materialsList.innerHTML = '';
    
    if (materials.length === 0) {
        materialsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-upload"></i>
                <p>No materials have been uploaded for this course yet.</p>
            </div>
        `;
        return;
    }
    
    // Add each material to the list
    materials.forEach(material => {
        const materialItem = document.createElement('div');
        materialItem.className = 'resource-item';
        
        // Determine icon based on file type
        let icon = 'fas fa-file';
        if (material.originalname.endsWith('.pdf')) icon = 'fas fa-file-pdf';
        else if (material.originalname.endsWith('.ppt') || material.originalname.endsWith('.pptx')) icon = 'fas fa-file-powerpoint';
        else if (material.originalname.endsWith('.doc') || material.originalname.endsWith('.docx')) icon = 'fas fa-file-word';
        else if (material.originalname.endsWith('.xls') || material.originalname.endsWith('.xlsx')) icon = 'fas fa-file-excel';
        else if (material.originalname.endsWith('.zip') || material.originalname.endsWith('.rar')) icon = 'fas fa-file-archive';
        else if (material.originalname.endsWith('.jpg') || material.originalname.endsWith('.png') || material.originalname.endsWith('.gif')) icon = 'fas fa-file-image';
        
        materialItem.innerHTML = `
            <div class="resource-icon">
                <i class="${icon}"></i>
            </div>
            <div class="resource-info">
                <h4>${material.originalname}</h4>
                <p>Uploaded on ${new Date(material.uploadDate).toLocaleDateString()}</p>
            </div>
            <div class="resource-actions">
                <a href="${material.path}" class="btn btn-outline" download>
                    <i class="fas fa-download"></i> Download
                </a>
            </div>
        `;
        materialsList.appendChild(materialItem);
    });
}

// Load course assignments
async function loadCourseAssignments(courseId) {
    const assignments = await window.studentApi.fetchCourseAssignments(courseId);
    const assignmentsList = document.querySelector('#assignments-tab .assignments-list');
    if (!assignmentsList) return;
    
    // Clear existing assignments
    assignmentsList.innerHTML = '';
    
    if (assignments.length === 0) {
        assignmentsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks"></i>
                <p>No assignments have been created for this course yet.</p>
            </div>
        `;
        return;
    }
    
    // Add each assignment to the list
    assignments.forEach(assignment => {
        const assignmentItem = document.createElement('div');
        assignmentItem.className = 'assignment-item';
        assignmentItem.innerHTML = `
            <div class="assignment-info">
                <h4>${assignment.title}</h4>
                <div class="assignment-meta">
                    <span>Due: ${new Date(assignment.dueDate).toLocaleDateString()}</span>
                    <span>Weight: ${assignment.weight}%</span>
                </div>
                <p>${assignment.description}</p>
            </div>
            <div class="assignment-actions">
                <button class="btn btn-primary submit-assignment" data-assignment-id="${assignment._id}">Submit</button>
                <button class="btn btn-outline">View Details</button>
            </div>
        `;
        assignmentsList.appendChild(assignmentItem);
    });
}

// Refresh notifications
async function refreshNotifications() {
    const notifications = await window.studentApi.fetchNotifications();
    const notificationsList = document.getElementById('notifications-list');
    if (!notificationsList) return;
    
    // Clear existing notifications
    notificationsList.innerHTML = '';
    
    if (notifications.length === 0) {
        notificationsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications at this time.</p>
            </div>
        `;
        return;
    }
    
    // Update notification badge
    const unreadCount = notifications.filter(n => !n.read).length;
    const badge = document.querySelector('.notification-badge');
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
    
    // Add each notification to the list
    notifications.forEach(notification => {
        const notificationItem = document.createElement('div');
        notificationItem.className = `notification-item ${notification.read ? '' : 'unread'}`;
        
        // Determine icon based on notification type
        let icon = 'fas fa-bell';
        if (notification.type === 'assignment') icon = 'fas fa-tasks';
        else if (notification.type === 'material') icon = 'fas fa-file-upload';
        else if (notification.type === 'message') icon = 'fas fa-envelope';
        else if (notification.type === 'grade') icon = 'fas fa-chart-bar';
        
        notificationItem.innerHTML = `
            <div class="notification-icon">
                <i class="${icon}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${window.studentApi.timeAgo(new Date(notification.createdAt))}</div>
            </div>
            <button class="mark-read-btn" data-notification-id="${notification._id}" ${notification.read ? 'style="display:none"' : ''}>
                <i class="fas fa-check"></i>
            </button>
        `;
        notificationsList.appendChild(notificationItem);
    });
}

// Set up event listeners
function setupEventListeners() {
    // Course view buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('view-course')) {
            const courseId = e.target.getAttribute('data-course-id');
            viewCourse(courseId);
        }
    });
    
    // Tab switching functionality for course content
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('tab')) {
            const tabName = e.target.getAttribute('data-tab');
            
            // Update active tab
            document.querySelectorAll('.course-tabs .tab').forEach(tab => {
                tab.classList.remove('active');
            });
            e.target.classList.add('active');
            
            // Show corresponding content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabName}-tab`).classList.add('active');
        }
    });
    
    // Back to courses button
    document.getElementById('backToCourses').addEventListener('click', function() {
        document.querySelectorAll('.dashboard-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById('my-courses').classList.add('active');
    });
    
    // Mark notification as read
    document.addEventListener('click', async function(e) {
        if (e.target.classList.contains('mark-read-btn') || e.target.parentElement.classList.contains('mark-read-btn')) {
            const button = e.target.classList.contains('mark-read-btn') ? e.target : e.target.parentElement;
            const notificationId = button.getAttribute('data-notification-id');
            await window.studentApi.markNotificationAsRead(notificationId);
            button.style.display = 'none';
            button.closest('.notification-item').classList.remove('unread');
            
            // Update badge count
            const badge = document.querySelector('.notification-badge');
            if (badge) {
                const currentCount = parseInt(badge.textContent);
                const newCount = currentCount - 1;
                badge.textContent = newCount;
                badge.style.display = newCount > 0 ? 'flex' : 'none';
            }
        }
    });
    
    // Assignment submission
    document.getElementById('assignmentForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const assignmentId = document.getElementById('assignmentId').value;
        const formData = new FormData(this);
        
        const result = await window.studentApi.submitAssignment(assignmentId, formData);
        if (result) {
            alert('Assignment submitted successfully!');
            document.getElementById('submitAssignmentModal').classList.remove('active');
            this.reset();
        } else {
            alert('Failed to submit assignment. Please try again.');
        }
    });
}