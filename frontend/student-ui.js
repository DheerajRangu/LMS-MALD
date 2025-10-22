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
    // Debug: Check localStorage
    console.log('Checking localStorage data:', localStorage.getItem('istruzioneF_user'));
    
    // Load user information
    loadUserInfo();
    
    // Test profile picture elements
    console.log('Profile picture elements:', {
        uploadBtn: !!document.getElementById('uploadProfilePic'),
        fileInput: !!document.getElementById('profilePictureInput'),
        profileImage: !!document.getElementById('profileImage'),
        defaultAvatar: !!document.getElementById('defaultAvatar'),
        removeBtn: !!document.getElementById('removeProfilePic')
    });
    
    // Fetch courses and notifications
    await displayStudentCourses();
    await refreshNotifications();
}

// Load user information from localStorage
function loadUserInfo() {
    // Get user data from localStorage (set during login)
    const userData = JSON.parse(localStorage.getItem('istruzioneF_user') || '{}');
    
    // Check if we have valid user data
    if (!userData.id) {
        console.warn('No user data found in localStorage. Redirecting to login...');
        window.location.href = 'student-login.html';
        return;
    }
    
    const firstName = userData.firstName || 'Student';
    const lastName = userData.lastName || '';
    const major = userData.program || userData.major || 'Student';
    const email = userData.email || '';
    const institution = userData.institution || '';
    const yearLevel = userData.yearLevel || '';
    const profilePicture = userData.profilePicture || '';
    
    // Update the UI with user information
    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userNameElement) {
        const fullName = `${firstName} ${lastName}`.trim();
        userNameElement.textContent = fullName || 'Student';
    }
    
    if (userRoleElement) {
        userRoleElement.textContent = major;
    }
    
    // Debug: Log what we're setting
    console.log('Setting profile:', {
        firstName,
        lastName,
        major,
        profilePicture: profilePicture ? 'Present: ' + profilePicture.substring(0, 50) + '...' : 'Not present'
    });
    
    // Debug: Check if profile picture elements exist
    console.log('Profile picture elements check:', {
        userAvatar: !!userAvatar,
        profileImage: !!document.getElementById('profileImage'),
        defaultAvatar: !!document.getElementById('defaultAvatar')
    });
    
    // Update profile picture in sidebar
    if (userAvatar) {
        if (profilePicture) {
            userAvatar.innerHTML = `<img src="${profilePicture}" alt="Profile Picture" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            userAvatar.innerHTML = '<i class="fas fa-user-graduate"></i>';
        }
    }
    
    // Load settings form with user data
    loadSettingsForm(userData);
}

// Load settings form with user data
function loadSettingsForm(userData) {
    // Safely get form elements
    const nameField = document.getElementById('studentName');
    const emailField = document.getElementById('studentEmail');
    const programField = document.getElementById('studentProgram');
    const institutionField = document.getElementById('studentInstitution');
    const yearLevelField = document.getElementById('studentYearLevel');
    
    if (nameField) {
        nameField.value = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    }
    if (emailField) {
        emailField.value = userData.email || '';
    }
    if (programField) {
        programField.value = userData.program || userData.major || '';
    }
    if (institutionField) {
        institutionField.value = userData.institution || '';
    }
    if (yearLevelField) {
        yearLevelField.value = userData.yearLevel || '';
    }
    
    // Load profile picture
    const profileImage = document.getElementById('profileImage');
    const defaultAvatar = document.getElementById('defaultAvatar');
    const removeBtn = document.getElementById('removeProfilePic');
    
    if (profileImage && defaultAvatar && removeBtn) {
        console.log('Loading profile picture in settings:', userData.profilePicture ? 'Present' : 'Not present');
        if (userData.profilePicture) {
            console.log('Setting profile image src:', userData.profilePicture.substring(0, 50) + '...');
            profileImage.src = userData.profilePicture;
            profileImage.style.display = 'block';
            defaultAvatar.style.display = 'none';
            removeBtn.style.display = 'inline-flex';
        } else {
            console.log('No profile picture, showing default avatar');
            profileImage.style.display = 'none';
            defaultAvatar.style.display = 'flex';
            removeBtn.style.display = 'none';
        }
    } else {
        console.error('Profile picture elements not found in settings:', {
            profileImage: !!profileImage,
            defaultAvatar: !!defaultAvatar,
            removeBtn: !!removeBtn
        });
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
    
    // Profile picture upload - use event delegation to ensure it works
    document.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'uploadProfilePic') {
            e.preventDefault();
            console.log('Upload profile picture button clicked');
            const fileInput = document.getElementById('profilePictureInput');
            if (fileInput) {
                fileInput.click();
            } else {
                console.error('Profile picture input not found');
            }
        }
    });
    
    // Fallback: Direct event listener for upload button
    setTimeout(() => {
        const uploadBtn = document.getElementById('uploadProfilePic');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Direct upload button click handler triggered');
                const fileInput = document.getElementById('profilePictureInput');
                if (fileInput) {
                    fileInput.click();
                }
            });
        }
    }, 1000);
    
    document.addEventListener('change', function(e) {
        if (e.target && e.target.id === 'profilePictureInput') {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    alert('Please select an image file.');
                    return;
                }
                
                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert('File size must be less than 5MB.');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    const profileImage = document.getElementById('profileImage');
                    const defaultAvatar = document.getElementById('defaultAvatar');
                    const removeBtn = document.getElementById('removeProfilePic');
                    
                    if (profileImage && defaultAvatar && removeBtn) {
                        profileImage.src = e.target.result;
                        profileImage.style.display = 'block';
                        defaultAvatar.style.display = 'none';
                        removeBtn.style.display = 'inline-flex';
                        
                        // Update sidebar avatar
                        const userAvatar = document.getElementById('userAvatar');
                        if (userAvatar) {
                            userAvatar.innerHTML = `<img src="${e.target.result}" alt="Profile Picture" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                        }
                        
                        // Update user data in localStorage
                        const userData = JSON.parse(localStorage.getItem('istruzioneF_user') || '{}');
                        userData.profilePicture = e.target.result;
                        localStorage.setItem('istruzioneF_user', JSON.stringify(userData));
                        
                        console.log('Profile picture updated successfully');
                    }
                };
                reader.readAsDataURL(file);
            }
        }
    });
    
    // Remove profile picture - use event delegation
    document.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'removeProfilePic') {
            e.preventDefault();
            
            const profileImage = document.getElementById('profileImage');
            const defaultAvatar = document.getElementById('defaultAvatar');
            const removeBtn = document.getElementById('removeProfilePic');
            const userAvatar = document.getElementById('userAvatar');
            
            if (profileImage && defaultAvatar && removeBtn) {
                profileImage.style.display = 'none';
                defaultAvatar.style.display = 'flex';
                removeBtn.style.display = 'none';
                
                // Reset sidebar avatar
                if (userAvatar) {
                    userAvatar.innerHTML = '<i class="fas fa-user-graduate"></i>';
                }
                
                // Clear file input
                const fileInput = document.getElementById('profilePictureInput');
                if (fileInput) {
                    fileInput.value = '';
                }
                
                // Update user data in localStorage
                const userData = JSON.parse(localStorage.getItem('istruzioneF_user') || '{}');
                userData.profilePicture = '';
                localStorage.setItem('istruzioneF_user', JSON.stringify(userData));
                
                console.log('Profile picture removed successfully');
            }
        }
    });
    
    // Save settings
    document.getElementById('saveSettings').addEventListener('click', async function() {
        const userData = JSON.parse(localStorage.getItem('istruzioneF_user') || '{}');
        
        // Get form data
        const fullName = document.getElementById('studentName').value.trim();
        const email = document.getElementById('studentEmail').value.trim();
        const program = document.getElementById('studentProgram').value.trim();
        const institution = document.getElementById('studentInstitution').value.trim();
        const yearLevel = document.getElementById('studentYearLevel').value;
        const notifications = document.getElementById('notifications').value;
        
        // Split full name into first and last name
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Get profile picture
        const profileImage = document.getElementById('profileImage');
        const profilePicture = profileImage.style.display !== 'none' ? profileImage.src : '';
        
        // Update user data
        const updatedUserData = {
            ...userData,
            firstName,
            lastName,
            email,
            program,
            major: program, // Keep both for compatibility
            institution,
            yearLevel,
            profilePicture,
            notifications
        };
        
        // Save to localStorage
        localStorage.setItem('istruzioneF_user', JSON.stringify(updatedUserData));
        
        // Update UI
        loadUserInfo();
        
        // Show success message
        alert('Settings saved successfully!');
        
        // TODO: Send to backend API for persistence
        try {
            await updateStudentProfile(updatedUserData);
        } catch (error) {
            console.error('Failed to update profile on server:', error);
        }
    });
}

// Update student profile on server
async function updateStudentProfile(userData) {
    try {
        const response = await fetch('http://localhost:3000/api/student/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: userData.id,
                firstName: userData.firstName,
                lastName: userData.lastName,
                email: userData.email,
                program: userData.program,
                institution: userData.institution,
                yearLevel: userData.yearLevel,
                profilePicture: userData.profilePicture
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update profile');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
}

// Test function to check if profile picture upload is working
window.testProfilePicture = function() {
    console.log('Testing profile picture functionality...');
    
    const uploadBtn = document.getElementById('uploadProfilePic');
    const fileInput = document.getElementById('profilePictureInput');
    const profileImage = document.getElementById('profileImage');
    const defaultAvatar = document.getElementById('defaultAvatar');
    const removeBtn = document.getElementById('removeProfilePic');
    
    console.log('Elements found:', {
        uploadBtn: !!uploadBtn,
        fileInput: !!fileInput,
        profileImage: !!profileImage,
        defaultAvatar: !!defaultAvatar,
        removeBtn: !!removeBtn
    });
    
    if (uploadBtn) {
        console.log('Upload button found, clicking...');
        uploadBtn.click();
    } else {
        console.error('Upload button not found!');
    }
};