/**
 * Request
 *
 * @module      :: Model
 * @description :: A short summary of how this model works and what it represents.
 * @docs		:: http://sailsjs.org/#!documentation/models
 */

module.exports = {

  attributes: {
  	
  	/* e.g.
  	nickname: 'string'
  	*/
    firstName: {
      type: 'STRING',
      required: true
    },
    lastName: {
      type: 'STRING',
      required: true
    },
    email: {
      type: 'STRING',
      email: true,
      required: true
    },
    userID: {
      type: 'STRING',
      required: true
    },
    dataset: {
      type: 'STRING',
      required: true
    },
    GPGkey: {
      type: 'TEXT',
      required: true
    },
    requestType: {
      type: 'STRING',
      required: true
    },
    granted: {
      type: 'BOOLEAN',
      defaultsTo: false
    },
    denied: {
      type: 'BOOLEAN',
      defaultsTo: false
    },
    downloaded: {
      type: 'BOOLEAN',
      defaultsTo: false
    }
  }

};