const Invitation = require('../models/invitation.js');
const Group = require('../models/group.js');

// route to show accept/decline confirmation page
const show = async (req, res) => {
    try {
        const invitation = await Invitation.findById(req.params.id).populate('group').populate('invitedBy');

        // invitation doesn't exist, or has already been accepted/declined
        if (!invitation || invitation.status !== 'pending') {
            return res.render('invitations/expired.ejs');
        }

        // must be logged in to accept/decline, send them to login, then bring them back after
        if (!req.session.user) {
            req.session.returnTo = `/invitations/${invitation._id}`;
            return res.redirect('/auth/sign-in');
        }

        res.render('invitations/show.ejs', { invitation });
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
};

// route to add the user to the group, mark invitation accepted
const accept = async (req, res) => { 
    try {
        const invitation = await Invitation.findById(req.params.id);

        if (!invitation || invitation.status !== 'pending') {
            return res.render('invitations/expired.ejs');
        }

        // logged in user's email matches who this invite was actually sent to
        if (invitation.email !== req.session.user.email) {
            return res.render('invitations/expired.ejs');
        }

        const group = await Group.findById(invitation.group);

        // if member already exist don't add them again
        const alreadyMember = group.members.some(member => member.user.toString() === req.session.user._id);
        
        if (!alreadyMember) {
            group.members.push({
                user: req.session.user._id,
                role: invitation.role,
            });
            await group.save();
        }

        invitation.status = 'accepted';
        await invitation.save();

        res.redirect(`/groups/${group._id}`);
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
};

// mark invitation as declined
const decline = async (req, res) => { 
    try {
        const invitation = await Invitation.findById(req.params.id);

        if (!invitation || invitation.status !== 'pending') {
            return res.render('invitations/expired.ejs');
        }

        if (invitation.email !== req.session.user.email) {
            return res.render('invitations/expired.ejs');
        }

        invitation.status = 'declined';
        await invitation.save();

        res.redirect('/groups');
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
};

module.exports = {
    show,
    accept,
    decline,
};