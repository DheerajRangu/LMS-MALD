const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
require('dotenv').config();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms_mald';

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Define Schemas
const Schema = mongoose.Schema;

// User Schema (base for Student and Teacher)
const UserSchema = new Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Student Schema
const StudentSchema = new Schema({
    ...UserSchema.obj,
    enrolledCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
    institution: { type: String },
    major: { type: String },
    yearLevel: { type: String },
    profilePicture: { type: String }
});

// Teacher Schema
const TeacherSchema = new Schema({
    ...UserSchema.obj,
    institution: { type: String },
    department: { type: String },
    courses: [{ type: Schema.Types.ObjectId, ref: 'Course' }]
});

// Course Schema
const CourseSchema = new Schema({
    title: { type: String, required: true },
    code: { type: String },
    description: { type: String },
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    students: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
    materials: [{
        filename: { type: String },
        originalname: { type: String },
        path: { type: String },
        uploadDate: { type: Date, default: Date.now },
        mimetype: { type: String }
    }],
    createdAt: { type: Date, default: Date.now }
});

// Assignment Schema
const AssignmentSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    dueDate: { type: Date },
    points: { type: Number, default: 100 },
    createdAt: { type: Date, default: Date.now }
});

// Submission Schema
const SubmissionSchema = new Schema({
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    file: { type: String },
    originalFilename: { type: String },
    submittedAt: { type: Date, default: Date.now },
    grade: { type: Number },
    feedback: { type: String }
});

// Message Schema
const MessageSchema = new Schema({
    senderId: { type: Schema.Types.ObjectId, required: true },
    senderRole: { type: String, enum: ['student', 'teacher'], required: true },
    recipientId: { type: Schema.Types.ObjectId, required: true },
    recipientRole: { type: String, enum: ['student', 'teacher'], required: true },
    subject: { type: String },
    content: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Notification Schema
const NotificationSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, required: true },
    userRole: { type: String, enum: ['student', 'teacher'], required: true },
    message: { type: String, required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    type: { type: String, enum: ['assignment', 'material', 'grade', 'message'], required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Create models
const Student = mongoose.model('Student', StudentSchema);
const Teacher = mongoose.model('Teacher', TeacherSchema);
const Course = mongoose.model('Course', CourseSchema);
const Assignment = mongoose.model('Assignment', AssignmentSchema);
const Submission = mongoose.model('Submission', SubmissionSchema);
const Message = mongoose.model('Message', MessageSchema);
const Notification = mongoose.model('Notification', NotificationSchema);

// Get notifications for a user
app.get('/api/notifications/:userRole/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const userRole = req.params.userRole;
        
        const notifications = await Notification.find({ 
            userId: userId,
            userRole: userRole
        }).sort({ createdAt: -1 });
        
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mark notification as read
app.put('/api/notifications/:notificationId/read', async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.notificationId,
            { read: true },
            { new: true }
        );
        
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        
        res.status(200).json(notification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Configure multer storage for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

// Authentication Routes
// Login route
app.post('/api/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        
        let user;
        if (role === 'student') {
            user = await Student.findOne({ email });
        } else if (role === 'teacher') {
            user = await Teacher.findOne({ email });
        }
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // In a real app, you would compare hashed passwords
        if (user.password !== password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const responseData = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role
        };
        
        // Add student-specific fields
        if (role === 'student') {
            responseData.program = user.major;
            responseData.institution = user.institution;
            responseData.yearLevel = user.yearLevel;
            responseData.profilePicture = user.profilePicture;
        }
        
        res.status(200).json(responseData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Register route
app.post('/api/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, role, institution, department, major } = req.body;
        
        // Check if user already exists
        let existingUser;
        if (role === 'student') {
            existingUser = await Student.findOne({ email });
        } else if (role === 'teacher') {
            existingUser = await Teacher.findOne({ email });
        }
        
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        // Create new user
        let newUser;
        if (role === 'student') {
            newUser = new Student({
                firstName,
                lastName,
                email,
                password, // In a real app, you would hash this password
                institution,
                major,
                yearLevel: req.body.yearLevel || '',
                profilePicture: ''
            });
        } else if (role === 'teacher') {
            newUser = new Teacher({
                firstName,
                lastName,
                email,
                password, // In a real app, you would hash this password
                institution,
                department
            });
        }
        
        await newUser.save();
        
        res.status(201).json({
            id: newUser._id,
            firstName,
            lastName,
            email,
            role
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Course Routes
// Get all courses for a teacher
app.get('/api/teacher/:teacherId/courses', async (req, res) => {
    try {
        const courses = await Course.find({ teacherId: req.params.teacherId });
        res.status(200).json(courses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all courses for a student
app.get('/api/student/:studentId/courses', async (req, res) => {
    try {
        const student = await Student.findById(req.params.studentId).populate('enrolledCourses');
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.status(200).json(student.enrolledCourses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a new course
app.post('/api/courses', async (req, res) => {
    try {
        const { title, code, description, teacherId } = req.body;
        
        const newCourse = new Course({
            title,
            code,
            description,
            teacherId
        });
        
        await newCourse.save();
        
        // Update teacher's courses array
        await Teacher.findByIdAndUpdate(
            teacherId,
            { $push: { courses: newCourse._id } }
        );
        
        res.status(201).json(newCourse);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get course details
app.get('/api/courses/:courseId', async (req, res) => {
    try {
        const course = await Course.findById(req.params.courseId)
            .populate('teacherId', 'firstName lastName')
            .populate('students', 'firstName lastName');
            
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        res.status(200).json(course);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Upload course material
app.post('/api/courses/:courseId/materials', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        const course = await Course.findById(req.params.courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        const material = {
            filename: req.file.filename,
            originalname: req.file.originalname,
            path: req.file.path,
            mimetype: req.file.mimetype
        };
        
        course.materials.push(material);
        await course.save();
        
        // Create notifications for all students in the course
        const notifications = course.students.map(studentId => ({
            userId: studentId,
            userRole: 'student',
            message: `New material added to ${course.title}: ${req.file.originalname}`,
            courseId: course._id,
            type: 'material'
        }));
        
        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }
        
        res.status(201).json(material);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get course materials
app.get('/api/courses/:courseId/materials', async (req, res) => {
    try {
        const course = await Course.findById(req.params.courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        res.status(200).json(course.materials);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Assignment Routes
// Create assignment
app.post('/api/courses/:courseId/assignments', async (req, res) => {
    try {
        const { title, description, dueDate, points } = req.body;
        
        const course = await Course.findById(req.params.courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        const newAssignment = new Assignment({
            title,
            description,
            courseId: req.params.courseId,
            dueDate,
            points
        });
        
        await newAssignment.save();
        
        // Create notifications for all students in the course
        const notifications = course.students.map(studentId => ({
            userId: studentId,
            userRole: 'student',
            message: `New assignment in ${course.title}: ${title}`,
            courseId: course._id,
            type: 'assignment'
        }));
        
        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }
        
        res.status(201).json(newAssignment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get course assignments
app.get('/api/courses/:courseId/assignments', async (req, res) => {
    try {
        const assignments = await Assignment.find({ courseId: req.params.courseId });
        res.status(200).json(assignments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Submit assignment
app.post('/api/assignments/:assignmentId/submit', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        const { studentId } = req.body;
        
        // Check if assignment exists
        const assignment = await Assignment.findById(req.params.assignmentId);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }
        
        // Check if student has already submitted
        const existingSubmission = await Submission.findOne({
            assignmentId: req.params.assignmentId,
            studentId
        });
        
        if (existingSubmission) {
            // Update existing submission
            existingSubmission.file = req.file.filename;
            existingSubmission.originalFilename = req.file.originalname;
            existingSubmission.submittedAt = Date.now();
            await existingSubmission.save();
            
            res.status(200).json(existingSubmission);
        } else {
            // Create new submission
            const newSubmission = new Submission({
                assignmentId: req.params.assignmentId,
                studentId,
                file: req.file.filename,
                originalFilename: req.file.originalname
            });
            
            await newSubmission.save();
            
            // Get course and teacher info for notification
            const course = await Course.findById(assignment.courseId);
            
            // Create notification for teacher
            const notification = new Notification({
                userId: course.teacherId,
                userRole: 'teacher',
                message: `New submission for assignment: ${assignment.title}`,
                courseId: course._id,
                type: 'assignment'
            });
            
            await notification.save();
            
            res.status(201).json(newSubmission);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get assignment submissions
app.get('/api/assignments/:assignmentId/submissions', async (req, res) => {
    try {
        const submissions = await Submission.find({ assignmentId: req.params.assignmentId })
            .populate('studentId', 'firstName lastName');
            
        res.status(200).json(submissions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Grade submission
app.put('/api/submissions/:submissionId/grade', async (req, res) => {
    try {
        const { grade, feedback } = req.body;
        
        const submission = await Submission.findByIdAndUpdate(
            req.params.submissionId,
            { grade, feedback },
            { new: true }
        );
        
        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }
        
        // Create notification for student
        const assignment = await Assignment.findById(submission.assignmentId);
        const course = await Course.findById(assignment.courseId);
        
        const notification = new Notification({
            userId: submission.studentId,
            userRole: 'student',
            message: `Your submission for ${assignment.title} has been graded`,
            courseId: course._id,
            type: 'grade'
        });
        
        await notification.save();
        
        res.status(200).json(submission);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Enroll student in course
app.post('/api/courses/:courseId/enroll', async (req, res) => {
    try {
        const { studentId } = req.body;
        
        // Check if course exists
        const course = await Course.findById(req.params.courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        // Check if student exists
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        // Check if student is already enrolled
        if (course.students.includes(studentId)) {
            return res.status(400).json({ message: 'Student already enrolled in this course' });
        }
        
        // Add student to course
        course.students.push(studentId);
        await course.save();
        
        // Add course to student's enrolled courses
        student.enrolledCourses.push(course._id);
        await student.save();
        
        res.status(200).json({ message: 'Student enrolled successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Student Profile Routes
// Update student profile
app.put('/api/student/profile', async (req, res) => {
    try {
        const { userId, firstName, lastName, email, program, institution, yearLevel, profilePicture } = req.body;
        
        // Find and update student
        const student = await Student.findById(userId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        // Update student fields
        student.firstName = firstName || student.firstName;
        student.lastName = lastName || student.lastName;
        student.email = email || student.email;
        student.major = program || student.major;
        student.institution = institution || student.institution;
        student.yearLevel = yearLevel || student.yearLevel;
        student.profilePicture = profilePicture || student.profilePicture;
        
        await student.save();
        
        res.status(200).json({
            message: 'Profile updated successfully',
            student: {
                id: student._id,
                firstName: student.firstName,
                lastName: student.lastName,
                email: student.email,
                program: student.major,
                institution: student.institution,
                yearLevel: student.yearLevel,
                profilePicture: student.profilePicture
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get student profile
app.get('/api/student/:studentId/profile', async (req, res) => {
    try {
        const student = await Student.findById(req.params.studentId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        res.status(200).json({
            id: student._id,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            program: student.major,
            institution: student.institution,
            yearLevel: student.yearLevel,
            profilePicture: student.profilePicture
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Upload profile picture
app.post('/api/student/:studentId/profile-picture', upload.single('profilePicture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        const student = await Student.findById(req.params.studentId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        // Update student's profile picture path
        student.profilePicture = `/uploads/${req.file.filename}`;
        await student.save();
        
        res.status(200).json({
            message: 'Profile picture uploaded successfully',
            profilePicture: student.profilePicture
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
