// student-api.js - API functions for student interface

// API Base URL (configurable for production)
const DEFAULT_LOCAL_API = 'http://localhost:5001/api';
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
const currentUserId = localStorage.getItem('userId') || '123456'; // Fallback for testing
const userRole = 'student';

// Function to fetch courses for the current student
async function fetchStudentCourses() {
    try {
        const response = await fetch(`${API_BASE_URL}/student/${currentUserId}/courses`);
        if (!response.ok) throw new Error('Failed to fetch courses');
        return await response.json();
    } catch (error) {
        console.error('Error fetching courses:', error);
        return [];
    }
}

// Function to fetch a specific course
async function fetchCourse(courseId) {
    try {
        const response = await fetch(`${API_BASE_URL}/courses/${courseId}`);
        if (!response.ok) throw new Error('Failed to fetch course details');
        return await response.json();
    } catch (error) {
        console.error('Error fetching course:', error);
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

// Function to submit an assignment
async function submitAssignment(assignmentId, formData) {
    try {
        const response = await fetch(`${API_BASE_URL}/assignments/${assignmentId}/submit`, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) throw new Error('Failed to submit assignment');
        return await response.json();
    } catch (error) {
        console.error('Error submitting assignment:', error);
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
window.studentApi = {
    fetchStudentCourses,
    fetchCourse,
    fetchCourseMaterials,
    fetchCourseAssignments,
    submitAssignment,
    fetchNotifications,
    markNotificationAsRead,
    timeAgo
};