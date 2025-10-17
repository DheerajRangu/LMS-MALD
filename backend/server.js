const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const multer = require('multer');
const fs = require('fs');


dotenv.config();

const app = express();
const PORT = 5050;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(session({ secret: process.env.SESSION_SECRET || 'devsecret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
// Serve frontend statically (for OAuth success redirects)
app.use(express.static(path.join(__dirname, '..', 'frontend')));
// Ensure uploads directory exists and serve it
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

// Connect to MongoDB Atlas (hardcoded for now)
const mongoURI = process.env.MONGO_URI || 'mongodb+srv://dino123:dino123@cluster0.efxiixb.mongodb.net/istruzioneF?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Student Schema
const studentSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: { type: String, unique: true },
    phone: String,
    studentId: String,
    institution: String,
    program: String,
    yearLevel: String,
    password: String,
    newsletter: Boolean,
    // OTP fields for password reset
    resetOtpCode: String,
    resetOtpExpiresAt: Date,
    createdAt: { type: Date, default: Date.now }
});

const Student = mongoose.model('Student', studentSchema);

// Teacher Schema
const teacherSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: { type: String, unique: true },
    phone: String,
    institution: String,
    department: String,
    position: String,
    experience: String,
    subjects: String,
    bio: String,
    password: String,
    newsletter: Boolean,
    // OTP fields for password reset
    resetOtpCode: String,
    resetOtpExpiresAt: Date,
    createdAt: { type: Date, default: Date.now }
});

const Teacher = mongoose.model('Teacher', teacherSchema);

// ===== Passport serialization (demo: store minimal profile) =====
passport.serializeUser((user, done) => {
    done(null, user);
});
passport.deserializeUser((obj, done) => {
    done(null, obj);
});

// ===== Google OAuth Strategy =====
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5050/auth/google/callback'
    }, (accessToken, refreshToken, profile, done) => {
        const user = { provider: 'google', id: profile.id, displayName: profile.displayName, email: profile.emails?.[0]?.value };
        return done(null, user);
    }));
}

// ===== Microsoft OAuth Strategy =====
if (process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET) {
    passport.use(new MicrosoftStrategy({
        clientID: process.env.MS_CLIENT_ID,
        clientSecret: process.env.MS_CLIENT_SECRET,
        callbackURL: process.env.MS_CALLBACK_URL || 'http://localhost:5050/auth/microsoft/callback',
        scope: ['user.read']
    }, (accessToken, refreshToken, profile, done) => {
        const user = { provider: 'microsoft', id: profile.id, displayName: profile.displayName, email: profile.emails?.[0]?.value };
        return done(null, user);
    }));
}

// ===== OAuth Routes =====
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/auth/failure' }), (req, res) => {
    res.redirect('/auth/success');
});

app.get('/auth/microsoft', passport.authenticate('microsoft'));
app.get('/auth/microsoft/callback', passport.authenticate('microsoft', { failureRedirect: '/auth/failure' }), (req, res) => {
    res.redirect('/auth/success');
});

app.get('/auth/success', async (req, res) => {
    const user = req.user || {};
    const email = user.email;
    let role = 'student';
    let target = '/student.html';
    try {
        if (email) {
            const teacher = await Teacher.findOne({ email });
            if (teacher) { role = 'teacher'; target = '/teacher.html'; }
        }
    } catch (e) { /* ignore, fall back to defaults */ }
    const safe = JSON.stringify({
        provider: user.provider,
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        role,
        target
    });
    res.send(`<!doctype html><html><body style="font-family:system-ui;padding:24px;">
<h2>Signed in successfully</h2>
<script>
  (function(){
    try {
      var u = ${safe};
      var payload = { role: u.role, id: u.id, firstName: u.displayName, email: u.email };
      localStorage.setItem('istruzioneF_user', JSON.stringify(payload));
      window.location.href = u.target;
    } catch(e) {
      document.body.innerHTML += '<p>Failed to store session. '+ (e && e.message ? e.message : '') +'</p>';
    }
  })();
</script>
<pre>${safe}</pre>
<p><a id="cont" href="${target}">Continue</a> · <a href="/auth/logout">Logout</a></p>
</body></html>`);
});
app.get('/auth/failure', (req, res) => res.status(401).send('OAuth failed'));
app.get('/auth/logout', (req, res) => {
    req.logout?.(() => {});
    res.redirect('/');
});

// API endpoint to register student
app.post('/register-student', async (req, res) => {
    try {
        const { firstName, lastName, email, phone, studentId, institution, program, yearLevel, password, newsletter } = req.body;

        // Check if email exists
        const existing = await Student.findOne({ email });
        if(existing) return res.status(400).json({ message: 'Email already registered' });

        // Hash password
        const hashedPassword = password ? await bcrypt.hash(password, 10) : '';

        const newStudent = new Student({
            firstName, lastName, email, phone, studentId, institution, program, yearLevel, password: hashedPassword, newsletter
        });

        await newStudent.save();
        res.json({ message: `Account created successfully for ${firstName}` });
    } catch(err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// API endpoint to register teacher
app.post('/register-teacher', async (req, res) => {
    try {
        const { firstName, lastName, email, phone, institution, department, position, experience, subjects, bio, password, newsletter } = req.body;

        const existing = await Teacher.findOne({ email });
        if (existing) return res.status(400).json({ message: 'Email already registered' });

        const hashedPassword = password ? await bcrypt.hash(password, 10) : '';

        const newTeacher = new Teacher({
            firstName, lastName, email, phone, institution, department, position, experience, subjects, bio, password: hashedPassword, newsletter
        });

        await newTeacher.save();
        res.json({ message: `Account created successfully for ${firstName}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login endpoint for students
app.post('/login-student', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await Student.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid email or password' });

        const valid = await bcrypt.compare(password, user.password || '');
        if (!valid) return res.status(400).json({ message: 'Invalid email or password' });

        res.json({
            message: 'Login successful',
            role: 'student',
            user: {
                id: user._id,
                firstName: user.firstName,
                email: user.email,
                program: user.program,
                institution: user.institution,
                studentId: user.studentId,
                yearLevel: user.yearLevel
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login endpoint for teachers
app.post('/login-teacher', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await Teacher.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid email or password' });

        const valid = await bcrypt.compare(password, user.password || '');
        if (!valid) return res.status(400).json({ message: 'Invalid email or password' });

        res.json({
            message: 'Login successful',
            role: 'teacher',
            user: {
                id: user._id,
                firstName: user.firstName,
                email: user.email,
                institution: user.institution,
                department: user.department,
                position: user.position
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ===== Password Reset (OTP) =====
function generateOtp() {
    return (Math.floor(100000 + Math.random() * 900000)).toString(); // 6-digit
}
function generateEnrollCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

// Email transporter (SMTP)
let transporter = null;
const forceTest = process.env.FORCE_TEST_SMTP === 'true';
const demo2fa = process.env.DEMO_2FA === 'true';
const hasSmtp = (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);
const forceTestSms = process.env.FORCE_TEST_SMS === 'true';
if (hasSmtp && !forceTest) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        logger: process.env.SMTP_DEBUG === 'true',
        debug: process.env.SMTP_DEBUG === 'true'
    });
}

async function ensureTestTransporterWhenMissing() {
    if (transporter || hasSmtp) return;
    try {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: { user: testAccount.user, pass: testAccount.pass },
            logger: process.env.SMTP_DEBUG === 'true',
            debug: process.env.SMTP_DEBUG === 'true'
        });
        console.log('Using Ethereal test SMTP account for emails.');
    } catch (e) {
        console.error('Failed to create test SMTP account', e);
    }
}

async function sendOtpEmail(to, code) {
    if (!transporter && (!hasSmtp || forceTest)) {
        await ensureTestTransporterWhenMissing();
    }
    if (!transporter) return { sent: false };
    const appName = 'IstruzioneF';
    const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@istruzionef.test',
        to,
        subject: `${appName} Password Reset OTP`,
        text: `Your OTP is ${code}. It expires in 10 minutes.`,
        html: `<p>Your OTP is <b>${code}</b>. It expires in 10 minutes.</p>`
    };
    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : undefined;
    if (previewUrl) {
        console.log('Preview email at:', previewUrl);
    }
    return { sent: true, previewUrl };
}

// Twilio SMS setup
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

async function sendOtpSms(toPhone, code) {
    if (!twilioClient || !process.env.TWILIO_FROM_NUMBER) return false;
    const body = `IstruzioneF OTP: ${code}. Expires in 10 minutes.`;
    await twilioClient.messages.create({ from: process.env.TWILIO_FROM_NUMBER, to: toPhone, body });
    return true;
}

// Request OTP for student
app.post('/password-reset/request/student', async (req, res) => {
    try {
        const { email, phone } = req.body;
        if (!email && !phone) return res.status(400).json({ message: 'email or phone is required' });
        const user = email ? await Student.findOne({ email }) : await Student.findOne({ phone });
        if (!user) return res.status(200).json({ message: 'If account exists, OTP sent' });

        const code = generateOtp();
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        user.resetOtpCode = code;
        user.resetOtpExpiresAt = expires;
        await user.save();

        let result = { sent: false };
        if (email) {
            try { result = await sendOtpEmail(email, code); } catch (e) { console.error('Email send failed', e); }
        } else if (phone) {
            if (!forceTestSms) {
                try { const ok = await sendOtpSms(phone, code); result = { sent: ok }; } catch (e) { console.error('SMS send failed', e); }
            }
        }
        if (result.sent) {
            return res.json({
                message: email ? 'OTP sent to email' : 'OTP sent to phone',
                previewUrl: result.previewUrl,
                devCode: ((email && forceTest) || (phone && forceTestSms) || demo2fa) ? code : undefined,
                expiresAt: expires
            });
        }
        // fallback for development if delivery not configured or failed
        res.json({ message: 'OTP generated (dev mode)', devCode: code, previewUrl: result.previewUrl, expiresAt: expires });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Verify OTP for student
app.post('/password-reset/verify/student', async (req, res) => {
    try {
        const { email, phone, otp } = req.body;
        if ((!email && !phone) || !otp) return res.status(400).json({ message: 'email or phone and otp are required' });
        const user = email ? await Student.findOne({ email }) : await Student.findOne({ phone });
        if (!user || !user.resetOtpCode || !user.resetOtpExpiresAt) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }
        if (user.resetOtpCode !== otp || user.resetOtpExpiresAt < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }
        res.json({ message: 'OTP verified' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Reset password for student
app.post('/password-reset/reset/student', async (req, res) => {
    try {
        const { email, phone, otp, newPassword } = req.body;
        if ((!email && !phone) || !otp || !newPassword) return res.status(400).json({ message: 'email or phone, otp and newPassword are required' });
        const user = email ? await Student.findOne({ email }) : await Student.findOne({ phone });
        if (!user || !user.resetOtpCode || !user.resetOtpExpiresAt) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }
        if (user.resetOtpCode !== otp || user.resetOtpExpiresAt < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }
        user.password = await bcrypt.hash(newPassword, 10);
        user.resetOtpCode = undefined;
        user.resetOtpExpiresAt = undefined;
        await user.save();
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Request OTP for teacher
app.post('/password-reset/request/teacher', async (req, res) => {
    try {
        const { email, phone } = req.body;
        if (!email && !phone) return res.status(400).json({ message: 'email or phone is required' });
        const user = email ? await Teacher.findOne({ email }) : await Teacher.findOne({ phone });
        if (!user) return res.status(200).json({ message: 'If account exists, OTP sent' });
        const code = generateOtp();
        const expires = new Date(Date.now() + 10 * 60 * 1000);
        user.resetOtpCode = code;
        user.resetOtpExpiresAt = expires;
        await user.save();
        let result = { sent: false };
        if (email) {
            try { result = await sendOtpEmail(email, code); } catch (e) { console.error('Email send failed', e); }
        } else if (phone) {
            try { const ok = await sendOtpSms(phone, code); result = { sent: ok }; } catch (e) { console.error('SMS send failed', e); }
        }
        if (result.sent) {
            return res.json({ message: 'OTP sent to email', previewUrl: result.previewUrl, devCode: forceTest ? code : undefined, expiresAt: expires });
        }
        res.json({ message: 'OTP generated (dev mode)', devCode: code, previewUrl: result.previewUrl, expiresAt: expires });
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// Verify OTP for teacher
app.post('/password-reset/verify/teacher', async (req, res) => {
    try {
        const { email, phone, otp } = req.body;
        if ((!email && !phone) || !otp) return res.status(400).json({ message: 'email or phone and otp are required' });
        const user = email ? await Teacher.findOne({ email }) : await Teacher.findOne({ phone });
        if (!user || !user.resetOtpCode || !user.resetOtpExpiresAt) return res.status(400).json({ message: 'Invalid or expired OTP' });
        if (user.resetOtpCode !== otp || user.resetOtpExpiresAt < new Date()) return res.status(400).json({ message: 'Invalid or expired OTP' });
        res.json({ message: 'OTP verified' });
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// Reset password for teacher
app.post('/password-reset/reset/teacher', async (req, res) => {
    try {
        const { email, phone, otp, newPassword } = req.body;
        if ((!email && !phone) || !otp || !newPassword) return res.status(400).json({ message: 'email or phone, otp and newPassword are required' });
        const user = email ? await Teacher.findOne({ email }) : await Teacher.findOne({ phone });
        if (!user || !user.resetOtpCode || !user.resetOtpExpiresAt) return res.status(400).json({ message: 'Invalid or expired OTP' });
        if (user.resetOtpCode !== otp || user.resetOtpExpiresAt < new Date()) return res.status(400).json({ message: 'Invalid or expired OTP' });
        user.password = await bcrypt.hash(newPassword, 10);
        user.resetOtpCode = undefined;
        user.resetOtpExpiresAt = undefined;
        await user.save();
        res.json({ message: 'Password updated successfully' });
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// ===== Learning Models =====
const courseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    duration: { type: String, default: '' },
    code: String,
    category: String,
    term: String,
    enrollCode: { type: String, default: '' },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    createdAt: { type: Date, default: Date.now }
});
const Course = mongoose.model('Course', courseSchema);

const enrollmentSchema = new mongoose.Schema({
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    createdAt: { type: Date, default: Date.now }
});
const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

const assignmentSchema = new mongoose.Schema({
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    description: String,
    dueDate: Date,
    createdAt: { type: Date, default: Date.now }
});
const Assignment = mongoose.model('Assignment', assignmentSchema);

const submissionSchema = new mongoose.Schema({
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    content: String, // URL or text
    submittedAt: { type: Date, default: Date.now },
    grade: Number,
    feedback: String,
    gradedAt: Date
});
const Submission = mongoose.model('Submission', submissionSchema);

const discussionSchema = new mongoose.Schema({
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    authorRole: { type: String, enum: ['student', 'teacher'], required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const DiscussionMessage = mongoose.model('DiscussionMessage', discussionSchema);

// ===== Course Material (Files) =====
const materialSchema = new mongoose.Schema({
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    type: { type: String, enum: ['pdf', 'video', 'other'], default: 'other' },
    filename: { type: String, required: true },
    filepath: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    createdAt: { type: Date, default: Date.now }
});
const Material = mongoose.model('Material', materialSchema);

const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, uploadsDir); },
    filename: function (req, file, cb) {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, unique + ext);
    }
});
const upload = multer({ storage });

// Upload material (PDF/video/other)
app.post('/materials/upload', upload.single('file'), async (req, res) => {
    try {
        const { courseId, title, type, teacherId } = req.body;
        if (!req.file || !courseId || !title || !teacherId) {
            return res.status(400).json({ message: 'file, courseId, title, teacherId are required' });
        }
        const mat = await Material.create({
            courseId,
            title,
            type: ['pdf', 'video'].includes(type) ? type : 'other',
            filename: req.file.filename,
            filepath: '/uploads/' + req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size,
            uploadedBy: teacherId
        });
        res.json(mat);
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// List materials for a course
app.get('/materials', async (req, res) => {
    try {
        const { courseId } = req.query;
        if (!courseId) return res.status(400).json({ message: 'courseId is required' });
        const list = await Material.find({ courseId }).sort({ createdAt: -1 });
        res.json(list);
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// ===== Course Endpoints =====
app.post('/courses', async (req, res) => {
    try {
        const { title, description, duration, code, category, term, teacherId } = req.body;
        if (!title || !teacherId) return res.status(400).json({ message: 'title and teacherId are required' });
        const enrollCode = generateEnrollCode();
        const course = await Course.create({ title, description, duration, code, category, term, teacherId, enrollCode });
        res.json(course);
    } catch (err) {
        console.error(err); res.status(500).json({ message: 'Server error' });
    }
});

app.get('/courses', async (req, res) => {
    try {
        const { teacherId } = req.query;
        const query = teacherId ? { teacherId } : {};
        const courses = await Course.find(query).sort({ createdAt: -1 });
        res.json(courses);
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

app.get('/courses/available', async (req, res) => {
    try {
        const { studentId } = req.query;
        const enrolled = await Enrollment.find({ studentId }).select('courseId');
        const enrolledIds = enrolled.map(e => e.courseId);
        const courses = await Course.find({ _id: { $nin: enrolledIds } }).sort({ createdAt: -1 });
        res.json(courses);
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// ===== Enrollment Endpoints =====
app.post('/enroll', async (req, res) => {
    try {
        const { studentId, courseId, enrollCode } = req.body;
        if (!studentId) return res.status(400).json({ message: 'studentId is required' });
        let targetCourseId = courseId;
        if (!targetCourseId && enrollCode) {
            const course = await Course.findOne({ enrollCode });
            if (!course) return res.status(400).json({ message: 'Invalid enrollment code' });
            targetCourseId = course._id;
        }
        if (!targetCourseId) return res.status(400).json({ message: 'courseId or enrollCode is required' });
        const exists = await Enrollment.findOne({ studentId, courseId: targetCourseId });
        if (exists) return res.status(400).json({ message: 'Already enrolled' });
        const enr = await Enrollment.create({ studentId, courseId: targetCourseId });
        res.json(enr);
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

app.get('/enrollments', async (req, res) => {
    try {
        const { studentId } = req.query;
        if (!studentId) return res.status(400).json({ message: 'studentId is required' });
        const enrollments = await Enrollment.find({ studentId }).populate('courseId').sort({ createdAt: -1 });
        const courses = enrollments.map(e => e.courseId);
        res.json(courses);
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// ===== Assignment Endpoints =====
app.post('/assignments', async (req, res) => {
    try {
        const { courseId, title, description, dueDate } = req.body;
        if (!courseId || !title) return res.status(400).json({ message: 'courseId and title are required' });
        const a = await Assignment.create({ courseId, title, description, dueDate });
        res.json(a);
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

app.get('/assignments', async (req, res) => {
    try {
        const { courseId } = req.query;
        if (!courseId) return res.status(400).json({ message: 'courseId is required' });
        const list = await Assignment.find({ courseId }).sort({ createdAt: -1 });
        res.json(list);
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// ===== Submission + Grading =====
app.post('/submit', async (req, res) => {
    try {
        const { assignmentId, studentId, content } = req.body;
        if (!assignmentId || !studentId) return res.status(400).json({ message: 'assignmentId and studentId are required' });
        const s = await Submission.create({ assignmentId, studentId, content });
        res.json(s);
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

app.get('/submissions', async (req, res) => {
    try {
        const { assignmentId } = req.query;
        if (!assignmentId) return res.status(400).json({ message: 'assignmentId is required' });
        const subs = await Submission.find({ assignmentId }).sort({ submittedAt: -1 });
        res.json(subs);
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

app.post('/grade', async (req, res) => {
    try {
        const { submissionId, grade, feedback } = req.body;
        if (!submissionId || grade == null) return res.status(400).json({ message: 'submissionId and grade are required' });
        const updated = await Submission.findByIdAndUpdate(
            submissionId,
            { grade, feedback, gradedAt: new Date() },
            { new: true }
        );
        res.json(updated);
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// ===== Discussion =====
app.post('/discussions', async (req, res) => {
    try {
        const { courseId, authorId, authorRole, content } = req.body;
        if (!courseId || !authorId || !authorRole || !content) return res.status(400).json({ message: 'Missing fields' });
        const msg = await DiscussionMessage.create({ courseId, authorId, authorRole, content });
        res.json(msg);
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

app.get('/discussions', async (req, res) => {
    try {
        const { courseId } = req.query;
        if (!courseId) return res.status(400).json({ message: 'courseId is required' });
        const msgs = await DiscussionMessage.find({ courseId }).sort({ createdAt: -1 });
        res.json(msgs);
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// ===== Helper endpoints =====
app.get('/course-students', async (req, res) => {
    try {
        const { courseId } = req.query;
        if (!courseId) return res.status(400).json({ message: 'courseId is required' });
        const enrollments = await Enrollment.find({ courseId }).populate('studentId');
        const course = await Course.findById(courseId).lean();
        const students = enrollments.map(e => ({
            id: e.studentId?._id,
            firstName: e.studentId?.firstName,
            lastName: e.studentId?.lastName,
            email: e.studentId?.email,
            studentId: e.studentId?.studentId,
            program: e.studentId?.program
        }));
        res.json({ enrollCode: course?.enrollCode, students });
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

app.get('/grades', async (req, res) => {
    try {
        const { studentId } = req.query;
        if (!studentId) return res.status(400).json({ message: 'studentId is required' });
        const subs = await Submission.find({ studentId, grade: { $ne: null } }).populate({
            path: 'assignmentId',
            populate: { path: 'courseId' }
        }).sort({ gradedAt: -1 });
        const results = subs.map(s => ({
            assignmentTitle: s.assignmentId?.title,
            courseTitle: s.assignmentId?.courseId?.title,
            grade: s.grade,
            feedback: s.feedback,
            gradedAt: s.gradedAt
        }));
        res.json(results);
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// Start server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
