/* eslint-disable prefer-destructuring */
require('dotenv').config();
require('./config/database');

const path = require('path');
const express = require('express');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  app.set('trust proxy', 1);
}

// Middleware
const session = require('express-session');
const MongoStore = require('connect-mongo').MongoStore;
const methodOverride = require('method-override');
const morgan = require('morgan');
const isSignedIn = require('./middleware/isSignedIn');
const addUserToViews = require('./middleware/addUserToViews');
const { SUPPORTED_CURRENCIES } = require('./utils/currencyHelper');

// Routers
const authRouter = require('./routes/authRouter');
const pagesRouter = require('./routes/pagesRouter');
const transactionsRouter = require('./routes/transactionsRouter');
const groupsRouter = require('./routes/groupsRouter');
const invitationsRouter = require('./routes/invitationsRouter');
const budgetsRouter = require('./routes/budgetsRouter');

// make the currency list available to every view
app.locals.currencies = SUPPORTED_CURRENCIES;

// Set the port from environment variable or default to 3000
const port = process.env.PORT ? process.env.PORT : '3000';

// MIDDLEWARE
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static('assets'));
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
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.DATABASE_URI }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
    },
  })
);
app.use(addUserToViews);

// ROUTES
app.use('', pagesRouter);
app.use('/auth', authRouter); 
app.use('/invitations', invitationsRouter);

// Customer middleware
app.use(isSignedIn);

app.use('/transactions', transactionsRouter);
app.use('/groups', groupsRouter);
app.use('/budgets', budgetsRouter); // personal
app.use('/groups/:id/budgets', budgetsRouter);  // Group

app.listen(port, () => {
  console.log(`The express app is ready on port ${port}!`);
});
