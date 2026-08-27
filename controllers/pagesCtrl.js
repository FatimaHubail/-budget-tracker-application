const home = async (req, res) => {
  if (req.session.user) {
    return res.redirect('/transactions');
  }
  res.render('index.ejs');
};

module.exports = {
  home,
};
