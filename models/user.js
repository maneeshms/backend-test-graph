'use strict';
module.exports = (sequelize, DataTypes) => {
  var User = sequelize.define('Users', {
    name: DataTypes.STRING,
    /*connection: {
      type: DataTypes.VIRTUAL,
      get() {
        return 0;
      },
      set(value) {
        throw new Error('Do not try to set this field');
      }
    }*/
  
  }, {timestamps: false});
  User.associate = function(models) {
    // associations can be defined here
  };
  return User;
};