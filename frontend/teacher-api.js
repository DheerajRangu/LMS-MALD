// teacher-api.js - API functions for teacher interface

// API Base URL (configurable for production)
const DEFAULT_LOCAL_API = 'http://localhost:3000/api';
const CONFIG_API =
    localStorage.getItem('API_BASE') ||
    (window.APP_CONFIG && window.APP_CONFIG.API_BASE) ||
    null;
const isProdHost = /netlify\.app$/.test(window.location.hostname);
const API_BASE_URL = CONFIG_API || DEFAULT_LOCAL_API;
if (isProdHost && !CONFIG_API) {
    console.warn('Production host detected; set localStorage.API_BASE to your backend URL (e.g., https://your-backend.onrender.com/api).');
}

// Get user ID from localStorage (set during login)
const currentUserId = localStorage.getItem('userId') || '789012'; // Fallback for testing
const userRole = 'teacher';

// Function to fetch courses for the current teacher
async function fetchTeacherCourses() {
    try {
        const response = await fetch(`${API_BASE_URL}/teachers/${currentUserId}/courses`);
        if (!response.ok) throw new Error('Failed to fetch courses');
        return await response.json();
    } catch (error) {
        console.error('Error fetching courses:', error);
        return [];
    }
}

// Function to create a new course
async function createCourse(courseData) {
    try {
        const response = await fetch(`${API_BASE_URL}/courses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...courseData,
                teacherId: currentUserId
            })
        });
        if (!response.ok) throw new Error('Failed to create course');
        return await response.json();
    } catch (error) {
        console.error('Error creating course:', error);
        return null;
    }
}

// Function to upload course material
async function uploadCourseMaterial(courseId, formData) {
    try {
        const response = await fetch(`${API_BASE_URL}/courses/${courseId}/materials`, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) throw new Error('Failed to upload material');
        return await response.json();
    } catch (error) {
        console.error('Error uploading material:', error);
        return null;
    }
}

// Function to create a new assignment
async function createAssignment(courseId, assignmentData) {
    try {
        const response = await fetch(`${API_BASE_URL}/courses/${courseId}/assignments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(assignmentData)
        });
        if (!response.ok) throw new Error('Failed to create assignment');
        return await response.json();
    } catch (error) {
        console.error('Error creating assignment:', error);
        return null;
    }
}

// Function to fetch course materials
async function fetchCourseMaterials(courseId) {
    try {
        const response = await fetch(`${API_BASE_URL}/courses/${courseId}/materials`);
        if (!response.ok) throw new Error('Failed to fetch course materials');
        return await response.json();
    } catch (error) {
        console.error('Error fetching course materials:', error);
        return [];
    }
}

// Function to fetch course assignments
async function fetchCourseAssignments(courseId) {
    try {
        const response = await fetch(`${API_BASE_URL}/courses/${courseId}/assignments`);
        if (!response.ok) throw new Error('Failed to fetch assignments');
        return await response.json();
    } catch (error) {
        console.error('Error fetching assignments:', error);
        return [];
    }
}

// Function to fetch assignment submissions
async function fetchAssignmentSubmissions(assignmentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/assignments/${assignmentId}/submissions`);
        if (!response.ok) throw new Error('Failed to fetch submissions');
        return await response.json();
    } catch (error) {
        console.error('Error fetching submissions:', error);
        return [];
    }
}

// Function to grade a submission
async function gradeSubmission(submissionId, gradeData) {
    try {
        const response = await fetch(`${API_BASE_URL}/submissions/${submissionId}/grade`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(gradeData)
        });
        if (!response.ok) throw new Error('Failed to grade submission');
        return await response.json();
    } catch (error) {
        console.error('Error grading submission:', error);
        return null;
    }
}

// Function to fetch notifications
async function fetchNotifications() {
    try {
        const response = await fetch(`${API_BASE_URL}/notifications/${userRole}/${currentUserId}`);
        if (!response.ok) throw new Error('Failed to fetch notifications');
        return await response.json();
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
}

// Function to mark notification as read
async function markNotificationAsRead(notificationId) {
    try {
        const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
            method: 'PUT'
        });
        if (!response.ok) throw new Error('Failed to mark notification as read');
        return await response.json();
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return null;
    }
}

// Helper function to format time ago
function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return interval + ' years ago';
    if (interval === 1) return '1 year ago';
    
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return interval + ' months ago';
    if (interval === 1) return '1 month ago';
    
    interval = Math.floor(seconds / 86400);
    if (interval > 1) return interval + ' days ago';
    if (interval === 1) return '1 day ago';
    
    interval = Math.floor(seconds / 3600);
    if (interval > 1) return interval + ' hours ago';
    if (interval === 1) return '1 hour ago';
    
    interval = Math.floor(seconds / 60);
    if (interval > 1) return interval + ' minutes ago';
    if (interval === 1) return '1 minute ago';
    
    return 'just now';
}

// Export functions
window.teacherApi = {
    fetchTeacherCourses,
    createCourse,
    uploadCourseMaterial,
    createAssignment,
    fetchCourseMaterials,
    fetchCourseAssignments,
    fetchAssignmentSubmissions,
    gradeSubmission,
    fetchNotifications,
    markNotificationAsRead,
    timeAgo
};