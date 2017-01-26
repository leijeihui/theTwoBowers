var Models = require('./models');
var Comment = Models.Comment;
var User = Models.User;

module.exports = {
  commentController: {
    get: function(req, res) {
      Comment.find().then(function(resp) {
        res.json(resp);
      });
    },
    post: function(req, res) {
      var params = {
        userName: req.body.userName,
        comment: req.body.comment
      };
      Comment.create(params).then(function(resp) {
        res.sendStatus(201);
      });
    }    
  }
};