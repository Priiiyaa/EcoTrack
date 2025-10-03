const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const mongodb = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const app = express();

// Array to store uploaded images' paths
const credentials = require("./credentials")
const uri = `mongodb+srv://${credentials.mongodb.user}:${credentials.mongodb.pw}@cluster0.elzxq.mongodb.net/ecoTrack?retryWrites=true&w=majority&appName=Cluster0`;

mongoose.connect(uri).then(() => {
  console.log('MongoDB connected');
}).catch((error) => {
  console.error('MongoDB connection error:', error);
});

// Define User Schema and Model
const userSchema = new mongoose.Schema({
  avatar: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
}, { timestamps: true });

// Model for the "users" collection
const User = mongoose.model('User', userSchema); 

// Define Data Schema and Model for Logging Data
const dataSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  activity: { type: String, required: true },
  amount: { type: Number, required: true },
  carbonEmission: { type: Number, required: true }
}, { timestamps: true });

const Data = mongoose.model('Data', dataSchema); 

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the 'public' and 'uploads' directories
app.use(express.static(path.join(__dirname, '/public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Body Parser Middleware to parse URL-encoded and JSON request bodies
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
      if (/\.(jpg|jpeg|png|gif)$/i.test(file.originalname)) {
          cb(null, true);
      } else {
          cb(new Error('Only image files are allowed!'));
      }
  },
});


function authenticateToken(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    req.user = null; 
    return next();
  }

  jwt.verify(token, credentials.SECRET_KEY, (err, user) => {
    if (err) {
      req.user = null; 
    } else {
      req.user = user;
    }
    next();
  });
}

app.post('/register', upload.single('avatar'), async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!email || !username || !password || !req.file) {
      return res.status(400).json({ error: 'Missing required fields: email, password, or avatar file.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const avatarUrl = `/uploads/${req.file.filename}`;
    const newUser = new User({
      avatar: avatarUrl,
      name: username,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    // Respond with success message
    return res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error('Error registering user:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/guest-login', (req, res) => {
  const token = jwt.sign({ role: 'guest' }, credentials.SECRET_KEY, { expiresIn: '1h' });
  res.cookie('token', token, { httpOnly: true }).send('Guest login successful.');
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send('Email and password are required.');

  try {

    const user = await User.findOne({ email });
    if (!user) return res.status(404).send('User not found.');


    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(403).send('Invalid credentials.');

    const token = jwt.sign({ id: user._id, avatar: user.avatar, name:user.name, email: user.email, role: 'user' }, credentials.SECRET_KEY, { expiresIn: '15d' });
    res.cookie('token', token, { httpOnly: true }).send('Login successful.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error.');
  }
});
app.post('/admin', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).send('Password is required.');

  try {
    const validPassword = password === credentials.admin_password;
    if (!validPassword) return res.status(403).send('Invalid password.');

    const token = jwt.sign({ role: 'admin' }, credentials.SECRET_KEY, { expiresIn: '2h' });

    res.cookie('token', token, { httpOnly: true }).send('Admin Login successful.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error.');
  }
});

app.get('/', authenticateToken, (req, res) => {
  if (!req.user) {
    return res.redirect('/login');
  }

  res.render('index', { title: 'EcoTrack - Carbon Footprint Tracker', user: req.user });
});

// Route: Log Activity
app.post('/log', upload.single('file'), authenticateToken, async (req, res) => {
  try {
      const { date, activity, amount } = req.body;

      // Ensure all required fields are provided
      if (!activity || !amount || !date) {
          return res.status(400).json({ error: 'Missing required parameters: activity, amount, or date.' });
      }

      if (!req.user) {
          return res.status(401).json({ error: 'Unauthorized. Please log in to continue.' });
      }

      // Calculate the carbon emission regardless of role
      const carbonEmission = calculateCarbon(activity, amount);

      // If user role is 'user', save the data to the database
      if (req.user.role === 'user') {
          const logEntry = new Data({
            user: req.user.id, 
            date: new Date(date), 
            activity,
            amount: parseFloat(amount), 
            carbonEmission,
          });

          await logEntry.save(); 

          res.json({ activity, amount, carbonEmission, message: 'Data logged successfully.' });
      } else {
          // If role is not 'user', just calculate the carbon emission without saving
          res.json({ activity, amount, carbonEmission, message: 'Carbon emission calculated only, data not saved.' });
      }
  } catch (error) {
      console.error('Error logging data:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Function: Calculate Carbon Emission
function calculateCarbon(activity, amount) {
  const factors = {
      Driving: 0.21,
      ElectricityUsage: 0.527,
      WasteDisposal: 0.06,
  };
  return (factors[activity] || 0) * amount;
}


// Additional Routes
app.get('/login', authenticateToken, (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  res.render('login', { title: 'Login - EcoTrack' });
});
app.get('/admin', authenticateToken, (req, res) => {
  if (req.user && req.user.role === 'admin') {
    return res.redirect('/dashboard');
  } 

  res.render('adminLogin', { title: 'Admin Login - EcoTrack' });
});
app.get('/dashboard', authenticateToken, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.redirect('/admin');
  }

  try {
    // Fetch total number of users
    const totalUsers = await User.countDocuments();

    // Aggregate data for activity amounts and total carbon emissions
    const dataSummary = await Data.aggregate([
      {
        $group: {
          _id: "$activity",
          totalAmount: { $sum: "$amount" },
          totalCarbonEmission: { $sum: "$carbonEmission" },
        },
      },
    ]);

    // Transform aggregated data for the view
    const activityData = {
      Driving: { totalAmount: 0, totalCarbonEmission: 0 },
      ElectricityUsage: { totalAmount: 0, totalCarbonEmission: 0 },
      WasteDisposal: { totalAmount: 0, totalCarbonEmission: 0 },
    };

    let totalCarbonEmission = 0;

    dataSummary.forEach((activity) => {
      if (activityData[activity._id]) {
        activityData[activity._id].totalAmount = activity.totalAmount;
        activityData[activity._id].totalCarbonEmission = activity.totalCarbonEmission;
        totalCarbonEmission += activity.totalCarbonEmission;
      }
    });

    // Render the dashboard with fetched data
    res.render('dashboard', {
      title: 'Admin Dashboard - EcoTrack',
      totalUsers,
      activityData,
      totalCarbonEmission,
      user: req.user
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.status(200).send({ message: 'Logged out successfully' });
});

app.get('/register', (req, res) => res.render('register', { title: 'Register - EcoTrack' }));

// Example History and News Routes
app.get('/history', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.redirect('/login');
  } else if (req.user.role === 'guest') {
    return res.redirect('/access-denied');
  }

  try {

    const historyData = await Data.find({ user: req.user.id }).sort({ date: -1 }); 


    if (historyData.length === 0) {
      return res.render('history', { history: [], title: 'History - EcoTrack', user: req.user });
    }


    res.render('history', { history: historyData, title: 'History - EcoTrack', user: req.user });
  } catch (error) {
    console.error('Error fetching history data:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/news', authenticateToken, async (req, res) => {
  if (!authenticateToken) {
    return res.redirect('/login');
  }else if (req.user.role === 'guest') {
    return res.redirect('/access-denied');
  }
  const url = `https://newsapi.org/v2/everything?q=carbon&sortBy=publishedAt&apiKey=9510c3cb648448c98b0edcf9e6d77912`;
  const data = await fetch(url);
  const parsedData = await data.json();
  const articles = parsedData.articles
  res.render('news', { articles, title: 'News - EcoTrack', user: req.user });
});
app.get('/access-denied', authenticateToken, async (req, res) => {
  if (!authenticateToken) {
    return res.redirect('/login');
  }
  res.render('access_denied', { title: '403 - Forbidden', user: req.user });
});
app.get('/about', authenticateToken, async (req, res) => {
  if (!authenticateToken) {
    return res.redirect('/login');
  }

  res.render('about', { title: 'About - EcoTrack', user: req.user });
});
app.get('/access-denied', authenticateToken, async (req, res) => {
  if (!authenticateToken) {
    return res.redirect('/login');
  }
  res.render('access_denied', { title: '403 - Forbidden', user: req.user });
});

// Error Handling
app.use((req, res) => res.status(404).render('error_404', { title: '404 - Page Not Found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error_500', { title: '500 - Internal Server Error' });
});

// Start Server
app.listen(3000, () => console.log('Server running at http://localhost:3000'));