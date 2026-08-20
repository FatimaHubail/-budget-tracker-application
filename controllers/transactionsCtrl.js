const User = require('../models/user.js');

// index route (dashboard)
const index = async (req, res) => {
    try {
        res.render('transactions/index.ejs');
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
};

// route to render the 'add transaction' form 
const newFood = async (req, res) => {
    try {
        res.render('foods/new.ejs');
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
}

// route to add item to pantry
const create = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        await user.save();
        res.redirect(`/users/${user._id}/foods`);
    } catch (error) {
        console.log(error);
        res.redirect(`/users/${req.params.id}/foods/new`);
    }
};

// route to show the edit page
const edit = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        const item = user.pantry.id(req.params.itemId);
        res.render('foods/edit.ejs', { item });
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
};

// update route
const update = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        const item = user.pantry.id(req.params.itemId);
        item.set(req.body);
        await user.save();
        res.redirect(`/users/${user._id}/foods`);

    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
}

// Delete item route
const deleteItem = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        user.pantry.pull(req.params.itemId);
        await user.save();
        res.redirect(`/users/${user._id}/foods`)
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
}


module.exports = {
    index,
    newFood,
    create,
    deleteItem,
    edit,
    update,
};