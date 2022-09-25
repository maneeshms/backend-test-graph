const db = require("./models");
const { Op } = require("sequelize");

const init = async () => {

  await db.sequelize.sync({ force: true });
  
  const users = [];
  const names = ["foo", "bar", "baz"];
  for (i = 0; i < 27000; ++i) {
    let n = i;
    let name = "";
    for (j = 0; j < 3; ++j) {
      name += names[n % 3];
      n = Math.floor(n / 3);
      name += n % 10;
      n = Math.floor(n / 10);
    }
    users.push({name});
  }
  const friends = users.map(() => []);
  let fr = [];
  for (i = 0; i < friends.length; ++i) {
    const n = 10 + Math.floor(90 * Math.random());
    const list = [...Array(n)].map(() =>
      Math.floor(friends.length * Math.random())
    );
    list.forEach((j) => {
      if (i === j) {
        return;
      }
      if (friends[i].indexOf(j) >= 0 || friends[j].indexOf(i) >= 0) {
        return;
      }
      friends[i].push(j);
      friends[j].push(i);
      fr.push({userId:i,friendId:j})
      fr.push({userId:j,friendId:i})
    });
  }
  console.log("Init Users Table...");
  await db.Users.bulkCreate(users)

  console.log("Init Friends Table...");
  await db.Friends.bulkCreate(fr)

  console.log("Ready.");
};
module.exports.init = init;

let limiter = 0;
let friendTree = [];
let friendSet = new Set();

const search = async (req, res) => {
  friendSet.clear();
  const query = req.params.query;
  const userId = parseInt(req.params.userId);
  //This tree can be cached and we don't have to populate every time searching.
  //When a change happens to the user-friend relation, just update the cached graph.
  await buildFriendTree(limiter, [userId]);
  await db.Users.findAll({
    attributes: ["id", "name"],
    where: {
      name: {
        [Op.like]: `${query}%`,
      },
    },
    limit: 20, // This limit can be added to any number or can be used for pagination.
    raw: true,
  })
    .then(async (results) => {
      var startTime = process.hrtime();
      for (let i = 0; i < results.length; i++) {
        results[i]["connection"] = friendDistance(results[i].id);
      }
      var elapsedSeconds = parseHrtimeToSeconds(process.hrtime(startTime));
      console.log('Actual Search takes ' + elapsedSeconds + 'seconds');
      res.statusCode = 200;
      res.json({
        success: true,
        users: results,
      });
    })
    .catch((err) => {
      res.statusCode = 500;
      res.json({ success: false, error: err });
    });
};
function parseHrtimeToSeconds(hrtime) {
  var seconds = (hrtime[0] + (hrtime[1] / 1e9)).toFixed(3);
  return seconds;
}
module.exports.search = search;

function friendDistance(friendId) {
  dist = 0;
  for (let i = 0; i < friendTree.length; i++) {
    if (
      typeof friendTree[i].find((friend) => friend === friendId) !== "undefined"
    ) {
      dist = i + 1;
      break;
    }
  }
  return dist;
}

const buildFriendTree = async (limiter, userId) => {
  let nodes = [];
  if (limiter < 4) {
    friendTree[limiter] = [];
    await db.Friends.findAll({
      attributes: ["userId", "friendId"],
      where: {
        userId: {
          [Op.in]: userId,
        },
      },
    })
      .then(async (results) => {
        for (const friend of results) {
          if (!friendSet.has(friend.friendId)) {
            nodes.push(friend.friendId);
            friendTree[limiter].push(friend.friendId);
            friendSet.add(friend.friendId);
          }
        }
        limiter++;
        await buildFriendTree(limiter, nodes);
      })
      .catch((err) => {
        console.log(err);
      });
  }
};

const friend = async (req, res) => {
  try {
    await db.sequelize.transaction(async function (transaction) {
      const friendship1 = await db.Friends.create(
        {
          userId: req.params.userId,
          friendId: req.params.friendId,
        },
        { transaction }
      );

      const friendship2 = await db.Friends.create(
        {
          userId: req.params.friendId,
          friendId: req.params.userId,
        },
        { transaction }
      );

      res.json({
        success: true,
        message: "Befriended successfully",
      });
    });
  } catch (error) {
    res.statusCode = 500;
    res.json({ success: false, error });
  }
};
module.exports.friend = friend;

const unfriend = async (req, res) => {
  try {
    await db.sequelize.transaction(async function (transaction) {
      await db.Friends.destroy({
        where: {
          userId: req.params.userId,
          friendId: req.params.friendId,
        },
      });
      await db.Friends.destroy({
        where: {
          userId: req.params.friendId,
          friendId: req.params.userId,
        },
      });
      res.json({
        success: true,
        message: "Unfriended successfully",
      });
    });
  } catch (error) {
    res.statusCode = 500;
    res.json({ success: false, error });
  }
};
module.exports.unfriend = unfriend;
