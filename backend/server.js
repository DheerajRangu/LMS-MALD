// server.js
require('dotenv').config(); // Must be at the very top

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const morgan = require('morgan');

// Optional: LangChain / OpenAI related imports (Tommy)
let ChatOpenAI, TavilySearchResults, initializeAgentExecutorWithOptions, BufferMemory;
try {
    ChatOpenAI = require("@langchain/openai").ChatOpenAI;
    TavilySearchResults = require("@langchain/community/tools/tavily_search").TavilySearchResults;
    initializeAgentExecutorWithOptions = require("langchain/agents").initializeAgentExecutorWithOptions;
    BufferMemory = require("langchain/memory").BufferMemory;
} catch (e) {
    // Not fatal — we will guard Tommy route if libs or keys missing
    console.warn("LangChain/OpenAI libs not present or failed to import. Tommy route will be disabled.", e.message);
}

// ---------- CONFIG ----------
const APP_NAME = process.env.APP_NAME || 'lms_mald';
const PORT = parseInt(process.env.PORT || '3000', 10);
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms_mald';
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_in_prod';
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10', 10);

// ---------- EXPRESS SETUP ----------
const app = express();

// Security & logging
app.use(helmet());
app.use(morgan('dev'));

// Rate limiter (basic)
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 120
});
app.use(limiter);

// Body parsers
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// SPA fallback: serve index.html for unknown routes
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// --------- MONGOOSE CONNECTION with RETRY ----------
mongoose.set('strictQuery', true);

const mongooseOptions = {
    // modern options
    autoIndex: true,
    maxPoolSize: 15,
    minPoolSize: 2,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    family: 4
};

let connectionAttempts = 0;
const maxConnectionAttempts = 5;

const connectToDatabase = async () => {
    try {
        connectionAttempts++;
        console.log(`[${APP_NAME}] MongoDB connection attempt ${connectionAttempts}/${maxConnectionAttempts}...`);
        await mongoose.connect(MONGO_URI, mongooseOptions);
        console.log(`✓ Connected to MongoDB`);
        connectionAttempts = 0;
    } catch (err) {
        console.error('✗ MongoDB connection error:', err.message);
        if (connectionAttempts < maxConnectionAttempts) {
            const delay = Math.min(1000 * Math.pow(2, connectionAttempts - 1), 30000);
            console.log(`Retrying in ${delay}ms...`);
            setTimeout(connectToDatabase, delay);
        } else {
            console.error('✗ Failed to connect to MongoDB after', maxConnectionAttempts, 'attempts');
            process.exit(1);
        }
    }
};

connectToDatabase();

mongoose.connection.on('connected', () => console.log('Mongoose connected'));
mongoose.connection.on('disconnected', () => console.log('Mongoose disconnected'));
mongoose.connection.on('error', (err) => console.error('Mongoose error:', err.message));

// ---------- UTILS ----------
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const handleDbError = (error) => {
    if (!error) return null;
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongoTimeoutError' || (error.message && error.message.includes('buffering timed out'))) {
        return { status: 503, message: 'Database connection timeout. Please try again in a moment.' };
    }
    if (error.name === 'MongoNetworkError') {
        return { status: 503, message: 'Database network error. Please check your connection.' };
    }
    return null;
};

const ensureUploadsDir = (subfolder = '') => {
    const dir = path.join(__dirname, 'uploads', subfolder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
};

// ---------- MONGOOSE SCHEMAS ----------
const Schema = mongoose.Schema;

const UserBase = {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // hashed
    createdAt: { type: Date, default: Date.now }
};

const UserSchema = new Schema(UserBase, { discriminatorKey: 'kind', timestamps: true });

const StudentSchema = new Schema({
    ...UserBase,
    enrolledCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
    institution: { type: String },
    major: { type: String },
    yearLevel: { type: String },
    profilePicture: { type: String }
}, { timestamps: true });

const TeacherSchema = new Schema({
    ...UserBase,
    institution: { type: String },
    department: { type: String },
    position: { type: String },
    experience: { type: String },
    subjects: [{ type: String }],
    bio: { type: String },
    profilePicture: { type: String },
    courses: [{ type: Schema.Types.ObjectId, ref: 'Course' }]
}, { timestamps: true });

const CourseSchema = new Schema({
    title: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'], required: true },
    duration: { type: String, required: true },
    language: { type: String, default: 'english' },
    price: { type: Number, default: 0 },
    maxStudents: { type: Number, default: null },
    prerequisites: { type: String, default: '' },
    learningOutcomes: [{ type: String }],
    isPublic: { type: Boolean, default: true },
    allowDiscussions: { type: Boolean, default: true },
    publishOption: { type: String, enum: ['publish', 'draft'], default: 'draft' },
    thumbnail: { filename: String, originalname: String, path: String, mimetype: String, size: Number },
    introductionVideo: { filename: String, originalname: String, path: String, mimetype: String, size: Number },
    materials: [{ filename: String, originalname: String, path: String, uploadDate: Date, mimetype: String, size: Number }],
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    students: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    publishedAt: { type: Date },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' }
}, { timestamps: true });

const AssignmentSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    dueDate: { type: Date },
    points: { type: Number, default: 100 },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const SubmissionSchema = new Schema({
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    file: { type: String },
    originalFilename: { type: String },
    submittedAt: { type: Date, default: Date.now },
    grade: { type: Number },
    feedback: { type: String }
}, { timestamps: true });

const MessageSchema = new Schema({
    senderId: { type: Schema.Types.ObjectId, required: true },
    senderRole: { type: String, enum: ['student', 'teacher'], required: true },
    recipientId: { type: Schema.Types.ObjectId, required: true },
    recipientRole: { type: String, enum: ['student', 'teacher'], required: true },
    subject: { type: String },
    content: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const NotificationSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, required: true },
    userRole: { type: String, enum: ['student', 'teacher'], required: true },
    message: { type: String, required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    type: { type: String, enum: ['assignment', 'material', 'grade', 'message'], required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

/* Models */
const BaseUser = mongoose.model('User', UserSchema);
const Student = mongoose.model('Student', StudentSchema);
const Teacher = mongoose.model('Teacher', TeacherSchema);
const Course = mongoose.model('Course', CourseSchema);
const Assignment = mongoose.model('Assignment', AssignmentSchema);
const Submission = mongoose.model('Submission', SubmissionSchema);
const Message = mongoose.model('Message', MessageSchema);
const Notification = mongoose.model('Notification', NotificationSchema);

// ---------- MULTER (file uploads) ----------
const createStorage = (subfolder) => {
    ensureUploadsDir(subfolder);
    return multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadDir = path.join(__dirname, 'uploads', subfolder);
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const safeName = file.originalname.replace(/\s+/g, '_');
            cb(null, `${uniqueSuffix}-${safeName}`);
        }
    });
};

const fileFilter = (req, file, cb) => {
    // Accept all for now; you can whitelist mime types if desired
    cb(null, true);
};

const upload = multer({
    storage: createStorage('general'),
    fileFilter,
    limits: { fileSize: 200 * 1024 * 1024 } // up to 200MB files
});

// ---------- AUTH HELPERS ----------
const signJwt = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
const verifyJwt = (token) => jwt.verify(token, JWT_SECRET);

// Auth middleware (expects Authorization: Bearer <token>)
const authMiddleware = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = verifyJwt(token);
        req.user = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ message: 'Invalid token' });
    }
});

// Role guard
const requireRole = (role) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (req.user.role !== role) return res.status(403).json({ message: 'Forbidden' });
    next();
};

// ---------- ROUTES ----------

// Root
app.get('/', (req, res) => res.json({ success: true, app: APP_NAME }));

// ----- AUTH -----
app.post('/api/register', asyncHandler(async (req, res) => {
    const { firstName, lastName, email, password, role, ...rest } = req.body;
    if (!firstName || !lastName || !email || !password || !role) return res.status(400).json({ message: 'Missing fields' });
    const existing = await BaseUser.findOne({ email }).lean();
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    let newUser;
    if (role === 'student') {
        newUser = new Student({ firstName, lastName, email, password: hashed, ...rest });
    } else if (role === 'teacher') {
        newUser = new Teacher({ firstName, lastName, email, password: hashed, ...rest });
    } else {
        return res.status(400).json({ message: 'Invalid role' });
    }
    await newUser.save();

    const token = signJwt({ id: newUser._id, role });
    const payload = { id: newUser._id, firstName, lastName, email, role, token };
    res.status(201).json(payload);
}));

app.post('/api/login', asyncHandler(async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password || !role) return res.status(400).json({ message: 'Missing fields' });

    let user = null;
    if (role === 'student') user = await Student.findOne({ email }).lean();
    else if (role === 'teacher') user = await Teacher.findOne({ email }).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const pwdMatch = await bcrypt.compare(password, user.password);
    if (!pwdMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = signJwt({ id: user._id, role });
    res.json({ id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, role, token });
}));

// ----- NOTIFICATIONS -----
app.get('/api/notifications/:userRole/:userId', asyncHandler(async (req, res) => {
    try {
        const { userId, userRole } = req.params;
        const notifications = await Notification.find({ userId, userRole }).maxTimeMS(30000).sort({ createdAt: -1 });
        res.status(200).json(notifications);
    } catch (error) {
        const dbErr = handleDbError(error);
        if (dbErr) return res.status(dbErr.status).json({ message: dbErr.message });
        throw error;
    }
}));

app.put('/api/notifications/:notificationId/read', asyncHandler(async (req, res) => {
    const notification = await Notification.findByIdAndUpdate(req.params.notificationId, { read: true }, { new: true });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.status(200).json(notification);
}));

// ----- COURSES -----
app.post('/api/courses', upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'introductionVideo', maxCount: 1 },
    { name: 'materials', maxCount: 20 }
]), asyncHandler(async (req, res) => {
    const { title, code, description, category, difficulty, duration, language, price, maxStudents, prerequisites, learningOutcomes, isPublic, allowDiscussions, publishOption, teacherId } = req.body;

    if (!title || !code || !description || !category || !difficulty || !duration || !teacherId) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    let parsedLearningOutcomes = [];
    if (learningOutcomes) {
        try { parsedLearningOutcomes = JSON.parse(learningOutcomes); } catch (e) { parsedLearningOutcomes = [learningOutcomes]; }
    }

    const courseData = {
        title, code, description, category, difficulty, duration, language: language || 'english',
        price: parseFloat(price) || 0,
        maxStudents: maxStudents ? parseInt(maxStudents) : null,
        prerequisites: prerequisites || '', learningOutcomes: parsedLearningOutcomes,
        isPublic: isPublic === 'true' || isPublic === true, allowDiscussions: allowDiscussions === 'true' || allowDiscussions === true,
        publishOption: publishOption || 'draft', teacherId, status: publishOption === 'publish' ? 'published' : 'draft'
    };

    if (req.files?.thumbnail?.[0]) {
        const f = req.files.thumbnail[0];
        courseData.thumbnail = { filename: f.filename, originalname: f.originalname, path: `/uploads/general/${f.filename}`, mimetype: f.mimetype, size: f.size };
    }
    if (req.files?.introductionVideo?.[0]) {
        const f = req.files.introductionVideo[0];
        courseData.introductionVideo = { filename: f.filename, originalname: f.originalname, path: `/uploads/general/${f.filename}`, mimetype: f.mimetype, size: f.size };
    }
    if (req.files?.materials?.length > 0) {
        courseData.materials = req.files.materials.map(file => ({
            filename: file.filename, originalname: file.originalname, path: `/uploads/general/${file.filename}`, mimetype: file.mimetype, size: file.size, uploadDate: new Date()
        }));
    }

    const course = new Course(courseData);
    await course.save();
    await Teacher.findByIdAndUpdate(teacherId, { $push: { courses: course._id } });
    res.status(201).json({ success: true, message: 'Course created successfully', course });
}));

app.get('/api/courses', asyncHandler(async (req, res) => {
    const { code, published } = req.query;
    let query = {};
    if (code) query.code = code;
    if (published === 'true') { query.status = 'published'; query.isPublic = true; }

    const courses = await Course.find(query).populate('teacherId', 'firstName lastName').populate('students');
    res.status(200).json(courses);
}));

app.get('/api/courses/:courseId', asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.courseId).populate('teacherId', 'firstName lastName').populate('students', 'firstName lastName');
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.status(200).json(course);
}));

app.delete('/api/courses/:courseId', asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const teacherId = req.query.teacherId || req.body.teacherId;
    if (!teacherId) return res.status(400).json({ success: false, message: 'teacherId is required' });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (course.teacherId.toString() !== teacherId.toString()) return res.status(403).json({ success: false, message: 'Not authorized' });

    // 1. Delete course doc
    await Course.findByIdAndDelete(courseId);

    // 2. Remove course from teacher.courses array
    await Teacher.findByIdAndUpdate(teacherId, { $pull: { courses: courseId } });

    // 3. Remove course from students' enrolledCourses
    await Student.updateMany(
        { enrolledCourses: courseId },
        { $pull: { enrolledCourses: courseId } }
    );

    // 4. Optionally delete related assignments, submissions, notifications, messages
    await Assignment.deleteMany({ courseId });
    await Submission.deleteMany({ assignmentId: { $in: (await Assignment.find({ courseId })).map(a => a._id) } });
    await Notification.deleteMany({ courseId });

    res.status(200).json({ success: true, message: 'Course deleted' });
}));

// Enroll / Unenroll endpoints
app.post('/api/courses/:courseId/enroll', asyncHandler(async (req, res) => {
    const { studentId } = req.body;
    const { courseId } = req.params;
    if (!studentId) return res.status(400).json({ message: 'studentId is required' });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    if (course.maxStudents && course.students.length >= course.maxStudents) return res.status(400).json({ message: 'Course full' });

    await Course.findByIdAndUpdate(courseId, { $addToSet: { students: studentId } });
    await Student.findByIdAndUpdate(studentId, { $addToSet: { enrolledCourses: courseId } });

    res.status(200).json({ message: 'Enrolled' });
}));

app.post('/api/courses/:courseId/unenroll', asyncHandler(async (req, res) => {
    const { studentId } = req.body;
    const { courseId } = req.params;
    if (!studentId) return res.status(400).json({ message: 'studentId is required' });

    await Course.findByIdAndUpdate(courseId, { $pull: { students: studentId } });
    await Student.findByIdAndUpdate(studentId, { $pull: { enrolledCourses: courseId } });

    res.status(200).json({ message: 'Unenrolled' });
}));

// ----- ASSIGNMENTS -----
app.post('/api/courses/:courseId/assignments', asyncHandler(async (req, res) => {
    const { title, description, dueDate, points } = req.body;
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const newAssignment = new Assignment({ title, description, courseId: req.params.courseId, dueDate, points });
    await newAssignment.save();

    // Create notifications for students
    const notifications = course.students.map(studentId => ({
        userId: studentId, userRole: 'student', message: `New assignment: ${title}`, courseId: course._id, type: 'assignment'
    }));
    if (notifications.length > 0) await Notification.insertMany(notifications);

    res.status(201).json(newAssignment);
}));

app.get('/api/courses/:courseId/assignments', asyncHandler(async (req, res) => {
    const assignments = await Assignment.find({ courseId: req.params.courseId });
    res.status(200).json(assignments);
}));

app.get('/api/assignments/:assignmentId', asyncHandler(async (req, res) => {
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    res.status(200).json(assignment);
}));

// Submit assignment (single file)
app.post('/api/assignments/:assignmentId/submit', upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ message: 'studentId required' });

    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    let submission = await Submission.findOne({ assignmentId: req.params.assignmentId, studentId });

    if (submission) {
        submission.file = req.file.filename;
        submission.originalFilename = req.file.originalname;
        submission.submittedAt = Date.now();
        await submission.save();
    } else {
        submission = new Submission({
            assignmentId: req.params.assignmentId, studentId, file: req.file.filename, originalFilename: req.file.originalname
        });
        await submission.save();

        // Notify teacher
        const course = await Course.findById(assignment.courseId);
        const notification = new Notification({
            userId: course.teacherId, userRole: 'teacher', message: `New submission for: ${assignment.title}`, courseId: course._id, type: 'assignment'
        });
        await notification.save();
    }

    res.status(200).json(submission);
}));

// ----- PROFILE -----
app.put('/api/student/profile', asyncHandler(async (req, res) => {
    const { userId, ...updates } = req.body;
    const student = await Student.findByIdAndUpdate(userId, updates, { new: true });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.status(200).json({ message: 'Profile updated', student });
}));

app.get('/api/student/:studentId/profile', asyncHandler(async (req, res) => {
    const student = await Student.findById(req.params.studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.status(200).json(student);
}));

// ----- MESSAGES -----
app.post('/api/messages', asyncHandler(async (req, res) => {
    const { senderId, senderRole, recipientId, recipientRole, subject, content } = req.body;
    if (!senderId || !senderRole || !recipientId || !recipientRole || !content) return res.status(400).json({ message: 'Missing fields' });
    const msg = new Message({ senderId, senderRole, recipientId, recipientRole, subject, content });
    await msg.save();

    // Create notification for recipient
    const notification = new Notification({
        userId: recipientId, userRole: recipientRole, message: `New message: ${subject || 'No subject'}`, type: 'message'
    });
    await notification.save();

    res.status(201).json(msg);
}));

app.get('/api/messages/:userId', asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const messages = await Message.find({ $or: [{ senderId: userId }, { recipientId: userId }] }).sort({ createdAt: -1 });
    res.json(messages);
}));

// ----- TOMMY AI CHATBOT (optional) -----
const TommyChatSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    userRole: { type: String, enum: ['student', 'teacher'] },
    message: { type: String, required: true },
    response: { type: String, required: true },
    sessionId: { type: String },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const TommyChat = mongoose.model('TommyChat', TommyChatSchema);

const chatHistories = {};

const validateTommyConfig = () => {
    const hasKeys = process.env.OPENAI_API_KEY && process.env.TAVILY_API_KEY;
    const hasLibs = ChatOpenAI && TavilySearchResults && initializeAgentExecutorWithOptions && BufferMemory;
    return hasKeys && hasLibs;
};

const TOMMY_SYSTEM_PROMPT = `You are Tommy, an advanced AI assistant capable of helping with any topic - from general knowledge and creative writing to technical questions, coding help, math, science, history, and more.

Your capabilities:
- Answer questions on virtually any topic with accuracy and depth
- Provide detailed explanations, examples, and context
- Help with creative tasks, brainstorming, and problem-solving
- Assist with coding, debugging, and technical explanations
- Discuss current events and provide research-backed information
- Adapt your tone based on the user's needs (professional, casual, educational, etc.)

Guidelines:
- Be helpful, accurate, and honest
- If you're unsure about something, say so and explain what you'd need to verify it
- Use web search (when available) for current information, recent events, or factual queries
- Provide well-structured, clear responses
- When answering LMS-related questions, use the available database tools
- For coding questions, provide working examples when relevant
- Break down complex topics into understandable parts
- Be conversational and engaging while remaining professional`;

const tommyHelpers = {
    searchCourses: async (query, userRole = 'student') => {
        try {
            const filter = {};
            if (userRole === 'student') {
                filter.isPublic = true;
                filter.status = 'published';
            }
            
            const courses = await Course.find({
                ...filter,
                $or: [
                    { title: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } },
                    { code: { $regex: query, $options: 'i' } }
                ]
            }).select('title code category difficulty duration learningOutcomes').limit(5).lean();
            
            if (courses.length === 0) {
                return `No courses found for "${query}". Browse all available courses to discover more!`;
            }
            
            return courses.map(c => 
                `**${c.title}** (${c.code})\n• Category: ${c.category}\n• Level: ${c.difficulty}\n• Duration: ${c.duration}`
            ).join('\n\n');
        } catch (error) {
            return `Error searching courses: ${error.message}`;
        }
    },
    
    getStudentEnrollments: async (userId) => {
        try {
            const student = await Student.findById(userId)
                .populate('enrolledCourses', 'title code category');
            
            if (!student || student.enrolledCourses.length === 0) {
                return "You haven't enrolled in any courses yet. Search for courses to get started!";
            }
            
            return `You're enrolled in:\n${student.enrolledCourses
                .map(c => `• **${c.title}** (${c.code})`)
                .join('\n')}`;
        } catch (error) {
            return `Error fetching enrollments: ${error.message}`;
        }
    },
    
    getUpcomingAssignments: async (studentId) => {
        try {
            const student = await Student.findById(studentId)
                .populate('enrolledCourses', '_id');
            
            if (!student) return "Student not found";
            
            const enrolledIds = student.enrolledCourses.map(c => c._id);
            const assignments = await Assignment.find({
                courseId: { $in: enrolledIds },
                dueDate: { $gte: new Date() }
            }).sort({ dueDate: 1 }).limit(5).lean();
            
            if (assignments.length === 0) {
                return "No upcoming assignments! Keep up the great work.";
            }
            
            return `Your upcoming assignments:\n${assignments
                .map(a => `• **${a.title}** - Due: ${new Date(a.dueDate).toLocaleDateString()}`)
                .join('\n')}`;
        } catch (error) {
            return `Error fetching assignments: ${error.message}`;
        }
    },
    
    getCourseInfo: async (courseCode) => {
        try {
            const course = await Course.findOne({ code: courseCode })
                .select('title description category difficulty duration learningOutcomes').lean();
            
            if (!course) return `Course "${courseCode}" not found.`;
            
            const outcomes = course.learningOutcomes.slice(0, 3).join('\n• ');
            return `**${course.title}**\n• Category: ${course.category}\n• Level: ${course.difficulty}\n• Duration: ${course.duration}\n\nKey Learning Outcomes:\n• ${outcomes}`;
        } catch (error) {
            return `Error fetching course info: ${error.message}`;
        }
    }
};

app.post('/api/tommy/chat', asyncHandler(async (req, res) => {
    try {
        const { message, userId, userRole, includeWebSearch = true } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: "Message cannot be empty" });
        }

        const hasAIConfig = process.env.OPENAI_API_KEY && process.env.TAVILY_API_KEY;
        const hasTommyLibs = ChatOpenAI && TavilySearchResults && initializeAgentExecutorWithOptions && BufferMemory;
        
        if (!hasAIConfig || !hasTommyLibs) {
            return res.status(503).json({ 
                error: "Tommy AI service not fully configured. Please add OPENAI_API_KEY and TAVILY_API_KEY to environment.",
                fallback: true 
            });
        }

        const model = new ChatOpenAI({
            modelName: process.env.OPENAI_MODEL || "gpt-4o",
            temperature: 0.8,
            openAIApiKey: process.env.OPENAI_API_KEY,
            maxTokens: 4096,
            topP: 0.95,
            frequencyPenalty: 0.5,
            presencePenalty: 0.5
        });

        const tools = [];
        
        if (includeWebSearch && process.env.TAVILY_API_KEY) {
            tools.push(
                new TavilySearchResults({
                    maxResults: 5,
                    apiKey: process.env.TAVILY_API_KEY,
                    searchDepth: "advanced"
                })
            );
        }

        const sessionId = userId || 'anonymous-' + Date.now();
        if (!chatHistories[sessionId]) {
            chatHistories[sessionId] = new BufferMemory({
                memoryKey: "chat_history",
                returnMessages: true,
                humanPrefix: "User",
                aiPrefix: "Tommy"
            });
        }
        const memory = chatHistories[sessionId];

        const systemMessage = TOMMY_SYSTEM_PROMPT + 
            (userRole === 'teacher' ? '\n\nNote: This user is a teacher. Provide educational and professional context when relevant.' : 
             '\n\nNote: This user is a student. Provide educational context and learning support when relevant.');

        const executor = await initializeAgentExecutorWithOptions(tools, model, {
            agentType: "openai-functions",
            agentArgs: {
                systemMessage: systemMessage,
                prefix: "",
                suffix: "",
                inputVariables: ["input", "chat_history", "agent_scratchpad"]
            },
            verbose: false,
            memory: memory,
            handleParsingErrors: true,
            maxIterations: 10,
            earlyStoppingMethod: "generate",
            returnIntermediateSteps: false
        });

        const result = await executor.invoke({ 
            input: message,
            chat_history: memory.chatHistory || []
        });
        
        let response = result.output || "I couldn't process that request.";
        response = response.trim();

        if (!response) {
            response = "I've thought about your question, but I need you to ask it differently or provide more context. Could you rephrase or give me more details?";
        }

        if (userId) {
            try {
                const chatRecord = new TommyChat({
                    userId,
                    userRole: userRole || 'student',
                    message: message.substring(0, 5000),
                    response: response.substring(0, 10000),
                    sessionId
                });
                await chatRecord.save();
            } catch (dbError) {
                console.warn("Failed to save Tommy chat to database:", dbError.message);
            }
        }

        return res.json({ 
            response, 
            sessionId, 
            timestamp: new Date(),
            model: process.env.OPENAI_MODEL || "gpt-4o",
            webSearchEnabled: tools.length > 0
        });
    } catch (error) {
        console.error("Tommy Error:", error.message);
        
        let errorResponse = "I encountered an error processing your request.";
        if (error.message.includes('rate limit')) {
            errorResponse = "I'm getting too many requests. Please try again in a moment.";
        } else if (error.message.includes('quota')) {
            errorResponse = "API quota exceeded. Please try again later.";
        } else if (error.message.includes('invalid')) {
            errorResponse = "There was a validation error. Please check your message and try again.";
        }
        
        return res.status(500).json({ error: errorResponse, details: error.message });
    }
}));

app.get('/api/tommy/history/:userId', authMiddleware, asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params;
        const history = await TommyChat.find({ userId })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        
        res.json({ history, count: history.length });
    } catch (error) {
        console.error("Error fetching Tommy history:", error);
        return res.status(500).json({ error: "Failed to retrieve conversation history" });
    }
}));

app.delete('/api/tommy/history/:userId', authMiddleware, asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await TommyChat.deleteMany({ userId });
        
        if (chatHistories[userId]) {
            delete chatHistories[userId];
        }
        
        res.json({ message: "Conversation history cleared", deletedCount: result.deletedCount });
    } catch (error) {
        console.error("Error clearing Tommy history:", error);
        return res.status(500).json({ error: "Failed to clear conversation history" });
    }
}));

app.get('/api/tommy/search-courses', asyncHandler(async (req, res) => {
    try {
        const { query } = req.query;
        const userRole = req.query.role || 'student';
        
        if (!query) {
            return res.status(400).json({ error: "Search query required" });
        }
        
        const result = await tommyHelpers.searchCourses(query, userRole);
        res.json({ result });
    } catch (error) {
        console.error("Error searching courses via Tommy:", error);
        return res.status(500).json({ error: "Failed to search courses" });
    }
}));

app.get('/api/tommy/my-enrollments', authMiddleware, asyncHandler(async (req, res) => {
    try {
        const result = await tommyHelpers.getStudentEnrollments(req.user.id);
        res.json({ result });
    } catch (error) {
        console.error("Error fetching enrollments via Tommy:", error);
        return res.status(500).json({ error: "Failed to fetch enrollments" });
    }
}));

app.get('/api/tommy/upcoming-assignments', authMiddleware, asyncHandler(async (req, res) => {
    try {
        const result = await tommyHelpers.getUpcomingAssignments(req.user.id);
        res.json({ result });
    } catch (error) {
        console.error("Error fetching assignments via Tommy:", error);
        return res.status(500).json({ error: "Failed to fetch assignments" });
    }
}));

app.get('/api/tommy/course-info/:courseCode', asyncHandler(async (req, res) => {
    try {
        const { courseCode } = req.params;
        const result = await tommyHelpers.getCourseInfo(courseCode);
        res.json({ result });
    } catch (error) {
        console.error("Error fetching course info via Tommy:", error);
        return res.status(500).json({ error: "Failed to fetch course information" });
    }
}));

// ---------- GLOBAL ERROR HANDLER ----------
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    const dbErr = handleDbError(err);
    if (dbErr) return res.status(dbErr.status).json({ message: dbErr.message });
    res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

// ---------- START SERVER ----------
const server = app.listen(PORT, () => {
    console.log(`🚀 ${APP_NAME} running on port ${PORT}`);
});

// Graceful shutdown
const shutdown = async (reason) => {
    console.log('Shutting down...' + (reason ? ` Reason: ${reason}` : ''));
    server.close(() => {
        console.log('HTTP server closed.');
    });
    try {
        await mongoose.disconnect();
        console.log('Mongo disconnected.');
    } catch (e) {
        console.error('Error during Mongo disconnect', e);
    }
    process.exit(0);
};

process.on('SIGINT', () => {
    console.log('SIGINT received');
    shutdown('SIGINT');
});
process.on('SIGTERM', () => {
    console.log('SIGTERM received');
    shutdown('SIGTERM');
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection:', reason);
});

process.on('exit', (code) => {
    console.log('Process exit with code', code);
});

module.exports = app;
