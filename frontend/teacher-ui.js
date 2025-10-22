// teacher-ui.js - UI functions for teacher interface

document.addEventListener('DOMContentLoaded', function() {
    console.log('Teacher UI initialized');
    initializeTeacherDashboard();
    setupEventListeners();
});

// Initialize the teacher dashboard
function initializeTeacherDashboard() {
    // Seed demo teacher data locally when running on localhost and none exists
    try {
        const hasTeacher = localStorage.getItem('istruzioneF_teacher') || localStorage.getItem('istruzioneF_user');
        const isLocal = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
        if (!hasTeacher && isLocal) {
            localStorage.setItem('istruzioneF_teacher', JSON.stringify({
                role: 'teacher',
                id: 'demo-teacher-1',
                firstName: 'Alex',
                lastName: 'Johnson',
                email: 'alex.johnson@example.edu',
                institution: 'IstruzioneF University',
                department: 'Computer Science',
                position: 'Assistant Professor',
                profilePicture: ''
            }));
        }
    } catch (e) { console.warn('Unable to seed demo teacher:', e); }

    // Load user information
    loadUserInfo();
    
    // Load teacher courses
    loadTeacherCourses();
    
    // Initialize notifications
    refreshNotifications();
    
    // Set up polling for notifications
    setInterval(refreshNotifications, 30000); // Check every 30 seconds
    
    // Set up settings form handlers
    setupSettingsHandlers();
}

// Load user information from localStorage
function loadUserInfo() {
    // Read teacher data from either teacher-specific or generic key
    let userData = JSON.parse(localStorage.getItem('istruzioneF_teacher') || 'null');
    if (!userData) {
        userData = JSON.parse(localStorage.getItem('istruzioneF_user') || '{}');
    }

    // If no essential fields, redirect to login
    if (!userData || (!userData.email && !userData.firstName)) {
        console.warn('No teacher data found in localStorage. Redirecting to login...');
        window.location.href = 'teacher-login.html';
        return;
    }

    const firstName = userData.firstName || 'Teacher';
    const lastName = userData.lastName || '';
    const department = userData.department || userData.position || '';
    const profilePicture = userData.profilePicture || '';

    // Update the UI with user information
    const userNameElement = document.getElementById('teacherNameDisplay');
    const userRoleElement = document.getElementById('teacherDepartmentDisplay');

    if (userNameElement) {
        userNameElement.textContent = `${firstName} ${lastName}`.trim();
    }

    if (userRoleElement) {
        userRoleElement.textContent = department;
    }

    // Update profile picture in sidebar
    const sidebarProfileImage = document.getElementById('sidebarProfileImage');
    const sidebarDefaultAvatar = document.getElementById('sidebarDefaultAvatar');

    if (sidebarProfileImage && sidebarDefaultAvatar) {
        if (profilePicture) {
            sidebarProfileImage.src = profilePicture;
            sidebarProfileImage.style.display = 'block';
            sidebarDefaultAvatar.style.display = 'none';
        } else {
            sidebarProfileImage.style.display = 'none';
            sidebarDefaultAvatar.style.display = 'flex';
        }
    }

    // Load settings form with user data
    loadSettingsForm(userData);
}

// Load settings form with user data
function loadSettingsForm(userData) {
    // Safely get form elements
    const firstNameField = document.getElementById('teacherFirstName');
    const lastNameField = document.getElementById('teacherLastName');
    const emailField = document.getElementById('teacherEmail');
    const departmentField = document.getElementById('teacherDepartment');
    const institutionField = document.getElementById('teacherInstitution');
    
    if (firstNameField) {
        firstNameField.value = userData.firstName || '';
    }
    if (lastNameField) {
        lastNameField.value = userData.lastName || '';
    }
    if (emailField) {
        emailField.value = userData.email || '';
    }
    if (departmentField) {
        departmentField.value = userData.department || '';
    }
    if (institutionField) {
        institutionField.value = userData.institution || '';
    }
    
    // Load profile picture
    const profileImage = document.getElementById('profileImage');
    const defaultAvatar = document.getElementById('defaultAvatar');
    const removeBtn = document.getElementById('removeProfilePic');
    
    if (profileImage && defaultAvatar && removeBtn) {
        if (userData.profilePicture) {
            profileImage.src = userData.profilePicture;
            profileImage.style.display = 'block';
            defaultAvatar.style.display = 'none';
            removeBtn.style.display = 'inline-flex';
        } else {
            profileImage.style.display = 'none';
            defaultAvatar.style.display = 'flex';
            removeBtn.style.display = 'none';
        }
    }
}

// Set up settings form handlers
function setupSettingsHandlers() {
    // Profile picture change handler
    const profilePictureInput = document.getElementById('profilePictureInput');
    if (profilePictureInput) {
        profilePictureInput.addEventListener('change', handleProfilePictureChange);
    }
    
    // Remove profile picture button
    const removeProfilePicBtn = document.getElementById('removeProfilePic');
    if (removeProfilePicBtn) {
        removeProfilePicBtn.addEventListener('click', removeProfilePicture);
    }
    
    // Settings form submission
    const settingsForm = document.getElementById('teacherSettingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updateTeacherProfile();
        });
    }
}

// Handle profile picture change
function handleProfilePictureChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, or GIF)');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        // Update profile picture in settings form
        const profileImage = document.getElementById('profileImage');
        const defaultAvatar = document.getElementById('defaultAvatar');
        const removeBtn = document.getElementById('removeProfilePic');
        
        if (profileImage && defaultAvatar && removeBtn) {
            profileImage.src = e.target.result;
            profileImage.style.display = 'block';
            defaultAvatar.style.display = 'none';
            removeBtn.style.display = 'inline-flex';
        }
        
        // Store the base64 image temporarily
        const userData = JSON.parse(localStorage.getItem('istruzioneF_teacher') || '{}');
        userData.profilePicture = e.target.result;
        localStorage.setItem('istruzioneF_teacher', JSON.stringify(userData));
        
        // Update sidebar profile picture
        const sidebarProfileImage = document.getElementById('sidebarProfileImage');
        const sidebarDefaultAvatar = document.getElementById('sidebarDefaultAvatar');
        
        if (sidebarProfileImage && sidebarDefaultAvatar) {
            sidebarProfileImage.src = e.target.result;
            sidebarProfileImage.style.display = 'block';
            sidebarDefaultAvatar.style.display = 'none';
        }
    };
    reader.readAsDataURL(file);
}

// Remove profile picture
function removeProfilePicture() {
    // Update UI
    const profileImage = document.getElementById('profileImage');
    const defaultAvatar = document.getElementById('defaultAvatar');
    const removeBtn = document.getElementById('removeProfilePic');
    
    if (profileImage && defaultAvatar && removeBtn) {
        profileImage.src = '';
        profileImage.style.display = 'none';
        defaultAvatar.style.display = 'flex';
        removeBtn.style.display = 'none';
    }
    
    // Update sidebar
    const sidebarProfileImage = document.getElementById('sidebarProfileImage');
    const sidebarDefaultAvatar = document.getElementById('sidebarDefaultAvatar');
    
    if (sidebarProfileImage && sidebarDefaultAvatar) {
        sidebarProfileImage.src = '';
        sidebarProfileImage.style.display = 'none';
        sidebarDefaultAvatar.style.display = 'flex';
    }
    
    // Update localStorage
    const userData = JSON.parse(localStorage.getItem('istruzioneF_teacher') || '{}');
    userData.profilePicture = '';
    localStorage.setItem('istruzioneF_teacher', JSON.stringify(userData));
    
    // Update on server (when backend is ready)
    // updateTeacherProfile();
}

// Update teacher profile
async function updateTeacherProfile() {
    try {
        // Get form data
        const firstName = document.getElementById('teacherFirstName').value;
        const lastName = document.getElementById('teacherLastName').value;
        const email = document.getElementById('teacherEmail').value;
        const department = document.getElementById('teacherDepartment').value;
        const institution = document.getElementById('teacherInstitution').value;
        
        // Get current user data
        const userData = JSON.parse(localStorage.getItem('istruzioneF_teacher') || '{}');
        
        // Update user data
        userData.firstName = firstName;
        userData.lastName = lastName;
        userData.email = email;
        userData.department = department;
        userData.institution = institution;
        
        // Save to localStorage
        localStorage.setItem('istruzioneF_teacher', JSON.stringify(userData));
        
        // Update UI
        document.getElementById('teacherNameDisplay').textContent = `${firstName} ${lastName}`;
        document.getElementById('teacherDepartmentDisplay').textContent = department;
        
        // When backend is ready, uncomment this code to save to server
        /*
        // First update user profile data without the profile picture
        const response = await fetch('http://localhost:3000/api/teacher/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: userData.id,
                firstName: firstName,
                lastName: lastName,
                email: email,
                department: department,
                institution: institution
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update profile');
        }
        
        // If there's a profile picture and it's changed (starts with data:image), upload it separately
        if (userData.profilePicture && userData.profilePicture.startsWith('data:image')) {
            // Convert base64 to blob
            const fetchResponse = await fetch(userData.profilePicture);
            const blob = await fetchResponse.blob();
            
            // Create FormData and append the blob
            const formData = new FormData();
            formData.append('profilePicture', blob, 'profile-image.jpg');
            
            // Upload the profile picture
            const pictureResponse = await fetch(`http://localhost:3000/api/teacher/${userData.id}/profile-picture`, {
                method: 'POST',
                body: formData
            });
            
            if (!pictureResponse.ok) {
                console.error('Failed to upload profile picture');
            }
        }
        */
        
        // Show success message
        alert('Profile updated successfully!');
        
        // Switch to dashboard view
        document.querySelectorAll('.dashboard-section').forEach(section => {
            section.style.display = 'none';
        });
        document.getElementById('dashboard').style.display = 'block';
        
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile. Please try again.');
    }
}

// Set up event listeners
function setupEventListeners() {
    // Course view button clicks
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('view-course-btn')) {
            const courseId = e.target.getAttribute('data-course-id');
            viewCourse(courseId);
        }
    });
    
    // Tab switching in course view
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('course-tab')) {
            const tabId = e.target.getAttribute('data-tab');
            switchCourseTab(tabId);
        }
    });
    
    // Back to courses button
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('back-to-courses')) {
            document.getElementById('courses-container').style.display = 'block';
            document.getElementById('course-details').style.display = 'none';
        }
    });
    
    // Upload material form submission
    const uploadForm = document.getElementById('upload-material-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            uploadCourseMaterial();
        });
    }
    
    // File input change - for preview and validation
    const fileInput = document.getElementById('material-file');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            validateAndPreviewFile(this);
        });
    }
    
    // Modal open/close buttons
    document.querySelectorAll('.open-modal').forEach(button => {
        button.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            document.getElementById(modalId).style.display = 'flex';
        });
    });
    
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Navigation menu items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            // If this is a link to a dashboard section
            const sectionId = this.getAttribute('data-section');
            if (sectionId) {
                e.preventDefault();
                document.querySelectorAll('.dashboard-section').forEach(section => {
                    section.style.display = 'none';
                });
                document.getElementById(sectionId).style.display = 'block';
                
                // Update active state
                document.querySelectorAll('.nav-item').forEach(navItem => {
                    navItem.classList.remove('active');
                });
                this.classList.add('active');
            }
        });
    });
}

// Load teacher courses
function loadTeacherCourses() {
    console.log('Loading teacher courses...');
    const coursesContainer = document.getElementById('courses-container');
    if (!coursesContainer) {
        console.error('Courses container not found');
        return;
    }
    
    // Sample course data - in a real app, this would come from an API
    const courses = [
        {
            _id: 'course1',
            title: 'Introduction to Computer Science',
            code: 'CS101',
            description: 'Fundamentals of computer science including algorithms, data structures, and programming concepts.',
            students: Array(45).fill({})
        },
        {
            _id: 'course2',
            title: 'Advanced Database Systems',
            code: 'CS305',
            description: 'In-depth study of database design, implementation, and optimization techniques.',
            students: Array(28).fill({})
        },
        {
            _id: 'course3',
            title: 'Machine Learning Fundamentals',
            code: 'CS420',
            description: 'Introduction to machine learning algorithms, models, and applications.',
            students: Array(36).fill({})
        }
    ];
    
    console.log('Courses loaded:', courses);
    coursesContainer.innerHTML = '<h2>My Courses</h2>';
    
    if (!courses || courses.length === 0) {
        coursesContainer.innerHTML += '<p>You have no courses yet. Create your first course!</p>';
        return;
    }
    
    const courseGrid = document.createElement('div');
    courseGrid.className = 'course-grid';
    
    courses.forEach(course => {
        const card = createCourseCard(course);
        courseGrid.appendChild(card);
    });
    
    coursesContainer.appendChild(courseGrid);
}

// Create a course card
function createCourseCard(course) {
    const card = document.createElement('div');
    card.className = 'course-card';
    
    card.innerHTML = `
        <h3>${course.title}</h3>
        <p class="course-code">${course.code || 'No code'}</p>
        <p>${course.description || 'No description'}</p>
        <p><strong>Students:</strong> ${course.students ? course.students.length : 0}</p>
        <button class="view-course-btn" data-course-id="${course._id}">View Course</button>
    `;
    
    return card;
}

// View a specific course
function viewCourse(courseId) {
    console.log('Viewing course:', courseId);
    document.getElementById('courses-container').style.display = 'none';
    const courseDetails = document.getElementById('course-details');
    courseDetails.style.display = 'block';
    courseDetails.innerHTML = '<div class="loading">Loading course details...</div>';
    
    fetch(`http://localhost:3000/api/courses/${courseId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch course details');
            return response.json();
        })
        .then(course => {
            console.log('Course details:', course);
            courseDetails.setAttribute('data-course-id', courseId);
            
            // Create course header and tabs
            courseDetails.innerHTML = `
                <div class="course-header">
                    <button class="back-to-courses"><i class="fas fa-arrow-left"></i> Back to Courses</button>
                    <h2>${course.title}</h2>
                    <p class="course-code">${course.code || 'No code'}</p>
                </div>
                
                <div class="course-tabs">
                    <button class="course-tab active" data-tab="materials">Materials</button>
                    <button class="course-tab" data-tab="assignments">Assignments</button>
                    <button class="course-tab" data-tab="students">Students</button>
                </div>
                
                <div class="course-content">
                    <div id="materials-tab" class="tab-content active">
                        <div class="tab-header">
                            <h3>Course Materials</h3>
                            <button class="open-modal" data-modal="upload-material-modal">
                                <i class="fas fa-plus"></i> Upload Material
                            </button>
                        </div>
                        <div id="materials-list" class="materials-list">
                            <div class="loading">Loading materials...</div>
                        </div>
                    </div>
                    
                    <div id="assignments-tab" class="tab-content">
                        <div class="tab-header">
                            <h3>Assignments</h3>
                            <button class="open-modal" data-modal="create-assignment-modal">
                                <i class="fas fa-plus"></i> Create Assignment
                            </button>
                        </div>
                        <div id="assignments-list" class="assignments-list">
                            <div class="loading">Loading assignments...</div>
                        </div>
                    </div>
                    
                    <div id="students-tab" class="tab-content">
                        <h3>Enrolled Students</h3>
                        <div id="students-list" class="students-list">
                            <div class="loading">Loading students...</div>
                        </div>
                    </div>
                </div>
            `;
            
            // Set up event listeners for the new elements
            setupEventListeners();
            
            // Load materials, assignments, and students
            loadCourseMaterials(courseId);
            loadCourseAssignments(courseId);
            loadCourseStudents(course.students);
        })
        .catch(error => {
            console.error('Error loading course details:', error);
            courseDetails.innerHTML = `
                <div class="course-header">
                    <button class="back-to-courses"><i class="fas fa-arrow-left"></i> Back to Courses</button>
                    <h2>Error</h2>
                </div>
                <p>Failed to load course details. Please try again later.</p>
            `;
        });
}

// Switch between course tabs
function switchCourseTab(tabId) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.course-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Add active class to selected tab and content
    document.querySelector(`.course-tab[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(`${tabId}-tab`).classList.add('active');
}

// Load course materials
function loadCourseMaterials(courseId) {
    console.log('Loading materials for course:', courseId);
    const materialsList = document.getElementById('materials-list');
    
    fetchCourseMaterials(courseId)
        .then(materials => {
            console.log('Materials loaded:', materials);
            
            if (!materials || materials.length === 0) {
                materialsList.innerHTML = '<p>No materials uploaded yet.</p>';
                return;
            }
            
            materialsList.innerHTML = '';
            
            materials.forEach(material => {
                const materialItem = document.createElement('div');
                materialItem.className = 'material-item';
                
                // Determine file type for icon
                const fileInfo = getFileTypeInfo(material.mimetype, material.originalname);
                
                // Format date
                const uploadDate = new Date(material.uploadDate).toLocaleDateString();
                
                materialItem.innerHTML = `
                    <div class="material-icon">
                        <i class="fas ${fileInfo.icon}"></i>
                    </div>
                    <div class="material-info">
                        <h4>${material.originalname}</h4>
                        <p><span class="file-type">${fileInfo.type}</span> • Uploaded on ${uploadDate}</p>
                    </div>
                    <div class="material-actions">
                        <a href="http://localhost:3000/uploads/${material.filename}" target="_blank" class="view-material">
                            <i class="fas fa-download"></i> Download
                        </a>
                        <button class="preview-material" data-file="http://localhost:3000/uploads/${material.filename}" 
                                data-type="${fileInfo.type.toLowerCase()}" data-name="${material.originalname}">
                            <i class="fas fa-eye"></i> Preview
                        </button>
                    </div>
                `;
                
                materialsList.appendChild(materialItem);
            });
            
            // Add event listeners for preview buttons
            document.querySelectorAll('.preview-material').forEach(button => {
                button.addEventListener('click', function() {
                    const fileUrl = this.getAttribute('data-file');
                    const fileType = this.getAttribute('data-type');
                    const fileName = this.getAttribute('data-name');
                    showFilePreview(fileUrl, fileType, fileName);
                });
            });
        })
        .catch(error => {
            console.error('Error loading materials:', error);
            materialsList.innerHTML = '<p>Failed to load materials. Please try again later.</p>';
        });
}

// Get file type information based on mimetype or filename
function getFileTypeInfo(mimetype, filename) {
    let fileIcon = 'fa-file';
    let fileType = 'Document';
    
    if (mimetype) {
        if (mimetype.includes('pdf')) {
            fileIcon = 'fa-file-pdf';
            fileType = 'PDF';
        } else if (mimetype.includes('image')) {
            fileIcon = 'fa-file-image';
            fileType = 'Image';
        } else if (mimetype.includes('video')) {
            fileIcon = 'fa-file-video';
            fileType = 'Video';
        } else if (mimetype.includes('audio')) {
            fileIcon = 'fa-file-audio';
            fileType = 'Audio';
        } else if (mimetype.includes('word') || mimetype.includes('document')) {
            fileIcon = 'fa-file-word';
            fileType = 'Document';
        } else if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) {
            fileIcon = 'fa-file-excel';
            fileType = 'Spreadsheet';
        } else if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) {
            fileIcon = 'fa-file-powerpoint';
            fileType = 'Presentation';
        }
    } else if (filename) {
        // Fallback to extension-based detection
        const ext = filename.split('.').pop().toLowerCase();
        
        if (ext === 'pdf') {
            fileIcon = 'fa-file-pdf';
            fileType = 'PDF';
        } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(ext)) {
            fileIcon = 'fa-file-image';
            fileType = 'Image';
        } else if (['mp4', 'webm', 'mov', 'avi', 'wmv'].includes(ext)) {
            fileIcon = 'fa-file-video';
            fileType = 'Video';
        } else if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
            fileIcon = 'fa-file-audio';
            fileType = 'Audio';
        } else if (['doc', 'docx', 'rtf', 'txt'].includes(ext)) {
            fileIcon = 'fa-file-word';
            fileType = 'Document';
        } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
            fileIcon = 'fa-file-excel';
            fileType = 'Spreadsheet';
        } else if (['ppt', 'pptx'].includes(ext)) {
            fileIcon = 'fa-file-powerpoint';
            fileType = 'Presentation';
        }
    }
    
    return { icon: fileIcon, type: fileType };
}

// Show file preview modal
function showFilePreview(fileUrl, fileType, fileName) {
    console.log('Showing preview for:', fileUrl, fileType);
    
    // Create modal if it doesn't exist
    let previewModal = document.getElementById('file-preview-modal');
    
    if (!previewModal) {
        previewModal = document.createElement('div');
        previewModal.id = 'file-preview-modal';
        previewModal.className = 'modal';
        previewModal.innerHTML = `
            <div class="modal-content preview-modal-content">
                <div class="modal-header">
                    <h3 id="preview-title"></h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body" id="preview-container">
                </div>
            </div>
        `;
        document.body.appendChild(previewModal);
        
        // Add close button event listener
        previewModal.querySelector('.close-modal').addEventListener('click', function() {
            previewModal.style.display = 'none';
            document.getElementById('preview-container').innerHTML = '';
        });
    }
    
    // Set title
    document.getElementById('preview-title').textContent = fileName;
    
    // Clear previous content
    const previewContainer = document.getElementById('preview-container');
    previewContainer.innerHTML = '';
    
    // Add appropriate preview based on file type
    fileType = fileType.toLowerCase();
    
    if (fileType === 'pdf') {
        previewContainer.innerHTML = `
            <div class="pdf-container">
                <iframe src="${fileUrl}" width="100%" height="500px" class="pdf-iframe"></iframe>
            </div>
        `;
    } else if (fileType === 'image') {
        previewContainer.innerHTML = `
            <div class="image-container">
                <img src="${fileUrl}" alt="${fileName}" style="max-width: 100%; max-height: 500px;">
            </div>
        `;
    } else if (fileType === 'video') {
        previewContainer.innerHTML = `
            <div class="video-container">
                <video controls width="100%" height="auto">
                    <source src="${fileUrl}">
                    Your browser does not support the video tag.
                </video>
            </div>
        `;
    } else if (fileType === 'audio') {
        previewContainer.innerHTML = `
            <div class="audio-container">
                <audio controls style="width: 100%">
                    <source src="${fileUrl}">
                    Your browser does not support the audio tag.
                </audio>
            </div>
        `;
    } else {
        previewContainer.innerHTML = `
            <div class="no-preview">
                <i class="fas fa-file fa-3x"></i>
                <p>Preview not available for this file type.</p>
                <a href="${fileUrl}" target="_blank" class="btn">Download File</a>
            </div>
        `;
    }
    
    // Show modal
    previewModal.style.display = 'flex';
}

// Validate and preview file before upload
function validateAndPreviewFile(fileInput) {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const file = fileInput.files[0];
    
    if (!file) return;
    
    // Check file size
    if (file.size > maxSize) {
        alert('File size exceeds 50MB limit.');
        fileInput.value = '';
        return;
    }
    
    // Show file info
    const fileInfoContainer = document.getElementById('file-info-container') || document.createElement('div');
    fileInfoContainer.id = 'file-info-container';
    fileInfoContainer.className = 'file-info-container';
    
    // Get file type info
    const fileInfo = getFileTypeInfo(file.type, file.name);
    
    fileInfoContainer.innerHTML = `
        <div class="file-info">
            <i class="fas ${fileInfo.icon}"></i>
            <span class="file-name">${file.name}</span>
            <span class="file-size">(${(file.size / 1024 / 1024).toFixed(2)} MB)</span>
            <span class="file-type">${fileInfo.type}</span>
        </div>
    `;
    
    // Add to DOM if not already there
    if (!document.getElementById('file-info-container')) {
        const formGroup = fileInput.closest('.form-group');
        formGroup.appendChild(fileInfoContainer);
    }
}

// Upload course material
function uploadCourseMaterial() {
    const courseId = document.getElementById('course-details').getAttribute('data-course-id');
    const fileInput = document.getElementById('material-file');
    const titleInput = document.getElementById('material-title');
    
    if (!fileInput.files || fileInput.files.length === 0) {
        alert('Please select a file to upload.');
        return;
    }
    
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    if (titleInput && titleInput.value) {
        formData.append('title', titleInput.value);
    }
    
    // Show loading state
    const uploadButton = document.querySelector('#upload-material-form button[type="submit"]');
    const originalButtonText = uploadButton.innerHTML;
    uploadButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    uploadButton.disabled = true;
    
    // Upload the file
    uploadCourseMaterial(courseId, formData)
        .then(response => {
            console.log('Upload response:', response);
            
            // Reset form
            document.getElementById('upload-material-form').reset();
            
            // Clear file info
            const fileInfoContainer = document.getElementById('file-info-container');
            if (fileInfoContainer) {
                fileInfoContainer.remove();
            }
            
            // Close modal
            document.getElementById('upload-material-modal').style.display = 'none';
            
            // Reload materials
            loadCourseMaterials(courseId);
            
            // Show success message
            alert('Material uploaded successfully!');
        })
        .catch(error => {
            console.error('Error uploading material:', error);
            alert('Failed to upload material. Please try again.');
        })
        .finally(() => {
            // Reset button
            uploadButton.innerHTML = originalButtonText;
            uploadButton.disabled = false;
        });
}

// Load course assignments
function loadCourseAssignments(courseId) {
    console.log('Loading assignments for course:', courseId);
    const assignmentsList = document.getElementById('assignments-list');
    
    fetchCourseAssignments(courseId)
        .then(assignments => {
            console.log('Assignments loaded:', assignments);
            
            if (!assignments || assignments.length === 0) {
                assignmentsList.innerHTML = '<p>No assignments created yet.</p>';
                return;
            }
            
            assignmentsList.innerHTML = '';
            
            assignments.forEach(assignment => {
                const assignmentItem = document.createElement('div');
                assignmentItem.className = 'assignment-item';
                
                // Format dates
                const createdDate = new Date(assignment.createdAt).toLocaleDateString();
                const dueDate = assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No due date';
                
                assignmentItem.innerHTML = `
                    <div class="assignment-header">
                        <h4>${assignment.title}</h4>
                        <span class="points">${assignment.points || 100} points</span>
                    </div>
                    <div class="assignment-details">
                        <p>${assignment.description || 'No description'}</p>
                        <div class="assignment-meta">
                            <span><i class="fas fa-calendar-plus"></i> Created: ${createdDate}</span>
                            <span><i class="fas fa-calendar-day"></i> Due: ${dueDate}</span>
                        </div>
                    </div>
                    <div class="assignment-actions">
                        <button class="view-submissions" data-assignment-id="${assignment._id}">
                            <i class="fas fa-clipboard-list"></i> View Submissions
                        </button>
                    </div>
                `;
                
                assignmentsList.appendChild(assignmentItem);
            });
        })
        .catch(error => {
            console.error('Error loading assignments:', error);
            assignmentsList.innerHTML = '<p>Failed to load assignments. Please try again later.</p>';
        });
}

// Load course students
function loadCourseStudents(students) {
    console.log('Loading students:', students);
    const studentsList = document.getElementById('students-list');
    
    if (!students || students.length === 0) {
        studentsList.innerHTML = '<p>No students enrolled yet.</p>';
        return;
    }
    
    studentsList.innerHTML = `
        <table class="students-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="students-table-body">
            </tbody>
        </table>
    `;
    
    const tableBody = document.getElementById('students-table-body');
    
    students.forEach(student => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${student.firstName || ''} ${student.lastName || ''}</td>
            <td>${student.email || 'No email'}</td>
            <td>
                <button class="view-student-progress" data-student-id="${student._id}">
                    <i class="fas fa-chart-line"></i> Progress
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Refresh notifications
function refreshNotifications() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    
    const notificationBadge = document.getElementById('notification-badge');
    const notificationsList = document.getElementById('notifications-list');
    
    if (!notificationBadge && !notificationsList) return;
    
    fetchNotifications(userId, 'teacher')
        .then(notifications => {
            console.log('Notifications:', notifications);
            
            // Count unread notifications
            const unreadCount = notifications.filter(notification => !notification.read).length;
            
            // Update badge
            if (notificationBadge) {
                if (unreadCount > 0) {
                    notificationBadge.textContent = unreadCount;
                    notificationBadge.style.display = 'flex';
                } else {
                    notificationBadge.style.display = 'none';
                }
            }
            
            // Update list
            if (notificationsList) {
                if (!notifications || notifications.length === 0) {
                    notificationsList.innerHTML = '<p class="no-notifications">No notifications</p>';
                    return;
                }
                
                notificationsList.innerHTML = '';
                
                notifications.forEach(notification => {
                    const notificationItem = document.createElement('div');
                    notificationItem.className = `notification-item ${notification.read ? '' : 'unread'}`;
                    
                    // Format date
                    const notificationDate = new Date(notification.createdAt).toLocaleDateString();
                    
                    notificationItem.innerHTML = `
                        <div class="notification-content">
                            <p>${notification.message}</p>
                            <span class="notification-time">${notificationDate}</span>
                        </div>
                        ${!notification.read ? `
                            <button class="mark-read" data-notification-id="${notification._id}">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                    `;
                    
                    notificationsList.appendChild(notificationItem);
                });
            }
        })
        .catch(error => {
            console.error('Error refreshing notifications:', error);
        });
}