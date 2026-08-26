/* eslint-disable prefer-destructuring */
require('dotenv').config();
require('./config/database');

const path = require('path');
const express = require('express');

const app = express();

// Middleware
const session = require('express-session');
const MongoStore = require('connect-mongo').MongoStore;
const methodOverride = require('method-override');
const morgan = require('morgan');
const isSignedIn = require('./middleware/isSignedIn');
const addUserToViews = require('./middleware/addUserToViews');

// Routers
const authRouter = require('./routes/authRouter');
const pagesRouter = require('./routes/pagesRouter');
const transactionsRouter = require('./routes/transactionsRouter');
const groupsRouter = require('./routes/groupsRouter');
const invitationsRouter = require('./routes/invitationsRouter');
const budgetsRouter = require('./routes/budgetsRouter');

// Set the port from environment variable or default to 3000
const port = process.env.PORT ? process.env.PORT : '3000';

// MIDDLEWARE
app.use(express.static(path.join(__dirname, 'public')));
// Middleware to parse URL-encoded data from forms
app.use(express.urlencoded({ extended: false }));
// Middleware for using HTTP verbs such as PUT or DELETE
app.use(methodOverride('_method'));
// Morgan for logging HTTP requests
app.use(morgan('dev'));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({ mongoUrl: process.env.DATABASE_URI }),
  })
);
app.use(addUserToViews);

// ROUTES
app.use('', pagesRouter);
app.use('/auth', authRouter); 
app.use('/invitations', invitationsRouter);
app.use('/budgets', budgetsRouter); // personal
app.use('/groups/:id/budgets', budgetsRouter);  // Group

// Customer middleware
app.use(isSignedIn);

app.use('/transactions', transactionsRouter);
app.use('/groups', groupsRouter);

app.listen(port, () => {
  console.log(`The express app is ready on port ${port}!`);
});
