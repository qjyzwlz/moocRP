/**
 * UserController
 *
 * @module      :: Controller
 * @description	:: A set of functions called `actions`.
 *
 *                 Actions contain code telling Sails how to respond to a certain type of reques      res.view({
        title: 'Signup',
      });t.
 *                 (i.e. do stuff, then send some JSON, show an HTML page, or redirect to another URL)
 *
 *                 You can configure the blueprint URLs which trigger these actions (`config/controllers.js`)
 *                 and/or override them with custom routes (`config/routes.js`)
 *
 *                 NOTE: The code you write here supports both HTTP and Socket.io automatically.
 *
 * @docs        :: http://sailsjs.org/#!documentation/controllers
 */

// TODO: After deleting a user, all requests and visualizations associated
// with the user should be deleted as well.

module.exports = {

  /**
   * Overrides for the settings in `config/controllers.js`
   * (specific to UserController)
   */
  _config: {},

  // Create a user (for signup page)
  create: function(req, res, next) {
    // To prevent users from directly accessing this page through the URL
    if (req.session.lastPage != 'signup') {
      return res.redirect('500');
    } else {
      var params = req.params.all();
      params['id'] = req.session.uid;
      params['registered'] = true;

      // KK-080414: Add script to add public key to GPG store

      User.create(params, function userCreated(err, user) {
        if (err || !user) {
          sails.log.debug('Error occurred: ' + err);
          req.session.messages = { error: ["Please fill in all fields and use a @berkeley.edu email."] };
          return res.redirect('/signup');
        } else {
          req.session.user = user;
          var oldDateObj = new Date();
          var newDateObj = new Date(oldDateObj.getTime() + 3600000); // one hour before expiring
          req.session.cookie.expires = newDateObj;
          req.session.authenticated = true;
          return res.redirect('/dashboard');
        }
      });
    }
  },

  // Delete a user
  destroy: function(req, res, next) {
    User.findOne(req.param('id'), function foundUser(err, user) {
      if (err) sails.log.debug(err);
      if (err || !user) return res.redirect('404');

      User.destroy(req.param('id'), function userDestroyed(err) {
        if (err) return next(err);
      });

      return res.redirect('/admin/manage_users');
    });
  }, 

  // Edit user details
  edit: function(req, res, next) {
    // Find the user from the id passed in via params
    User.findOne(req.param('id'), function foundUser(err, user) {
      if (err) sails.log.debug(err);
      if (err || !user) return res.redirect('404');
      
      res.view({
        user: user,
        title: 'Edit'
      });
    });
  },

  // Login page
  login: function(req, res) {
    var settings = sails.config.settings;

    // For test only -- please disable in production
    if (settings.bypassLogin) {
      User.findOne(settings.bypassUserId, function(err, user) {
        if (err || !user) {
          sails.log.error('Unable to bypass login!');
          return res.redirect('/')
        } else {
          req.session.messages = { success: ['Bypassed login!'] };
          var oldDateObj = new Date();
          var newDateObj = new Date(oldDateObj.getTime() + 3600000); // one hour before expiring
          req.session.cookie.expires = newDateObj;
          req.session.user = user;
          req.session.authenticated = true;
          return res.redirect('/dashboard');
        }
      });
    } else {
      var casOptions = {
        casURL: 'https://ncas-test.berkeley.edu',
        login: '/cas/login',
        validate: '/cas/validate',
        service: settings.protocol + settings.host[settings.environment] +'/user/validate',
        renew: true,
        gateway: false
      }

      if (req.session.authenticated) {
        return res.redirect('/dashboard');
      } else {
        var https = require('https');
        return res.redirect(casOptions.casURL + casOptions.login + '?service=' + casOptions.service + '&renew=' + casOptions.renew);
      }
    }
  },

  // Logout action
  logout: function(req, res) {
    var settings = sails.config.settings;
    var casOptions = {
      casURL: 'https://ncas-test.berkeley.edu',
      login: '/cas/login',
      logout: '/cas/logout',
      validate: '/cas/validate',
      service: settings.protocol + settings.host[settings.environment] +'/user/validate',
      renew: true,
      gateway: false
    }

    if (req.session.authenticated) {
      var request = require('request');
      var settings = sails.config.settings;
      var completeURL = casOptions.casURL + casOptions.logout + '?url=' + casOptions.service;

      req.session.user = null;
      req.session.authenticated = false;
      return res.redirect(completeURL);
    } else {
      return res.redirect('/home');
    }
  },

  // TODO: Save user params (for edit/updates)
  save: function(req, res) {
    var params = req.params.all(),
        updateParams = {};

    if (params['publicKey'] != '') {
      updateParams['publicKey'] = params['publicKey'];
    }

    if (params['email'] != '') {
      updateParams['email'] = params['email'];
    }

    User.update(params['id'], updateParams, function (err) {
      if (err) sails.log.error(err);

      req.session.mesages = { success: ['Successfully updated user profile'] };
      if (req.session.user.admin) {
        return res.redirect('/admin/manage_users');
      } else {
        return res.redirect('/');
      }
    });
  },

  // Show user information
  show: function(req, res) {
    User.findOne(req.param('id')).exec(function (err, user) {
      if (err) sails.log.debug(err);
      if (err || !user) return res.redirect('404');

      Request.find().where({ userID: user.id }).exec(function (err, requests) {
        if (err) sails.log.debug(err);
        if (err || !requests) requests = [];

        Visualization.find().where({ userID: user.id }).exec(function (err, visualizations) {
        if (err) sails.log.debug(err);
        if (err || !visualizations) visualizations = [];

          res.view({
            title: 'User Information',
            user: user,
            requests: requests,
            visualizations: visualizations
          });
        });
      });
    }); 
  },

  // Signup page
  signup: function(req, res) {
    if (req.session.authenticated) {
      req.session.lastPage = null;
      return res.redirect('/dashboard');
    }

    if (!req.session.uid) {
      return res.redirect('/login');
    } else {
      req.session.lastPage = 'signup';
      res.view({
        title: 'Register',
      });
    }
  },

  // Switches an admin to a regular user or vice versa
  switch: function(req, res) {
    sails.log.debug(req.params.all());
    User.findOne(req.param('id'), function foundUser(err, user) {
      if (err) sails.log.debug(err);
      if (err || !user) return res.redirect('404');

      if (user.admin) {
        user.admin = false;
      } else {
        user.admin = true;
      }

      user.save(function (err) {
        if (err) {
          req.session.messages = { 'error': ['Error while switching user role']}
        } else {
          req.session.messages = { 'success': ['Successfully switched user role'] };
        }
        return res.redirect('/admin/manage_users');
      });
    });
  },

  // Validation step called by login; redirects to signup page if necessary
  validate: function(req, res, next) {
    var settings = sails.config.settings;
    var casOptions = {
      casURL: 'https://ncas-test.berkeley.edu',
      login: '/cas/login',
      validate: '/cas/validate',
      service: settings.protocol + settings.host[settings.environment] +'/user/validate',
      renew: true,
      gateway: false
    }

    var ticket = req.param('ticket');
    var request = require('request');

    // If a ticket was retrieved from CAS, process and verify it
    if (ticket) {
      sails.log.debug('CAS ticket issued: ' + ticket);
      var complete_url = casOptions.casURL + casOptions.validate 
        + '?service=' + casOptions.service + '&ticket=' + ticket;

      // Validate the ticket
      request({uri: complete_url, secureProtocol: 'SSLv3_method' }, function(err, response, body) {
        var lines = body.split('\n');
        if (lines[0] == 'yes') {
          var uid = lines[1];

          // Check to see if user exists in our database
          User.findOne(uid, function foundUser(err, user) {
            if (err) {
              sails.log.error(err);
              req.session.messages = { error: ["Unknown error occurred; please report this error."] };
              return next(err);
            }

            // If user already exists, continue to dashboard
            if (user && user.registered) {
              sails.log.debug('User ' + user.id + ' logged in');
              var oldDateObj = new Date();
              var newDateObj = new Date(oldDateObj.getTime() + 3600000); // one hour before expiring
              req.session.cookie.expires = newDateObj;
              req.session.user = user;
              req.session.authenticated = true;
              return res.redirect('/dashboard');
            }

            // If not, create one and go to dashboard
            if (!user || !user.registered) {
              req.session.uid = uid;
              return res.redirect('/signup');
            }
          });
        } else {
          // ticket was not valid; try to login again
          var next_url = casOptions.casURL + casOptions.login + '?service=' + casOptions.service;
          return res.redirect(next_url);
        }
      });
    } else {
      sails.log.debug('No ticket was found - redirecting to login again');
      var next_url = casOptions.casURL + casOptions.login + '?service=' + casOptions.service;
      return res.redirect(next_url);
    }
  }

};
