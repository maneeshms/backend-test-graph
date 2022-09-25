'use strict';
module.exports = (sequelize, DataTypes) => {
  var Friend = sequelize.define('Friends', {
    userId: DataTypes.INTEGER,
    friendId: DataTypes.INTEGER,
  }, {timestamps: false});
  Friend.associate = function(models) {
    // associations can be defined here
  };
  return Friend;
};