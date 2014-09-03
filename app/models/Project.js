var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.SchemaTypes.ObjectId
  , slug = require('mongoose-slug');

// this defines the fields associated with the model,
// and moreover, their type.
var ProjectSchema = new Schema({
    name: { type: String, required: true }
  , description: { type: String }
  , created: { type: Date, required: true, default: Date.now }
  , _creator: { type: ObjectId, ref: 'Actor', required: true }
  , _owner:   { type: ObjectId, ref: 'Actor', required: true }
  , _upstream: { type: ObjectId, ref: 'Project' }
});

// attach a URI-friendly slug
ProjectSchema.plugin( slug( 'name' , {
  required: true
}) );

/*ProjectSchema.virtual('path').get(function() {
  return config.git.data.path + '/' + this._id;
});*/

ProjectSchema.statics.getForks = function( parent , callback ) {
Project.find({ _upstream: parent._id }/*/, { _id: 1 , slug: 1 }/**/).exec(function(err, forks) {
    var collectors = forks.map(function(fork) {
      return function(done) {
        
        // TODO: call .lookup for all
        return done( null, fork );
        //console.log(fork);
        
        //Project.lookup( fork.uniqueSlug , done );
        
        
      }
    });
    async.parallel( collectors , callback );
  });
}

ProjectSchema.statics.lookup = function( uniqueSlug , callback) {
  var parts = uniqueSlug.split('/');
  var actorSlug = parts[0];
  var projectSlug = parts[1];

  Actor.findOne({ slug: actorSlug }).exec(function(err, actor) {
    if (!actor) { return callback(404); }
    
    Project.findOne({
        _owner: actor._id
      , slug: projectSlug
    }).populate('_owner _upstream').exec(function(err, project) {
      if (!project) return callback(404);
      if (!project._upstream) return callback( err , project );

      Actor.populate( project , {
        path: '_upstream._owner'
      }, function(err, project) {
        
        // multiple-actor model
        var contexts = {
            Person: Account
          , Organization: Organization
        };
        contexts[ project._upstream._owner.type ].populate( project , {
          path: '_upstream._owner.target'
        }, callback );
      });

    });
  });
};

var Project = mongoose.model('Project', ProjectSchema);

// export the model to anything requiring it.
module.exports = {
  Project: Project
};
