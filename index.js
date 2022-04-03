const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const fs = require("fs");
const formidable = require("formidable");

const userData = require("./userData");
const cardsData = require("./cards");
const locksData = require("./locks");

let users = userData;
let cards = cardsData;
let locks = locksData;

let wasChangeUsers = false;
let wasChangeCards = false;
let wasChangeLocks = false;

// app.use(function (req, res, next) {
//     //console.log(req.protocol + "://" + req.get("host") + req.originalUrl);
//     next();
// });

app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.post("/submit-form/cards.php", (req, res) => {
  new formidable.IncomingForm().parse(req, (err, fields, files) => {
    if (err) {
      console.error("Error", err);
      throw err;
    }
    var oldpath = files.cardImageInput.filepath;
    //console.log(files.cardImageInput);
    var newpath =
      "./public/cardImages/" +
      fields.cardName +
      "." +
      files.cardImageInput.originalFilename.split(".")[
        files.cardImageInput.originalFilename.split(".").length - 1
      ];
    // copy the file to a new location

    fs.copyFile(oldpath, newpath, function (err) {
      if (err) throw err;
      // you may respond with another html page
      res.write("File uploaded and moved!");
      res.end();
    });
    console.log(fields);
    cards[fields.cardName] = {
      name: fields.cardName,
      sizeX: parseInt(fields.sizeX),
      sizeY: parseInt(fields.sizeY),
      start: !!fields.start,
      type: files.cardImageInput.originalFilename.split(".")[
        files.cardImageInput.originalFilename.split(".").length - 1
      ]
    };
    wasChangeCards = true;
    io.emit("sendAllCardData", cards);
    io.emit("askReset");
  });
});

app.post("/submit-form/locks.php", (req, res) => {
  console.log("in");
  new formidable.IncomingForm().parse(req, (err, fields, files) => {
    if (err) {
      console.error("Error", err);
      throw err;
    }
    let temp;
    console.log(files.openLockImageInput.originalFilename);
    if (files.openLockImageInput && files.openLockImageInput.originalFilename) {
      var oldpath = files.openLockImageInput.filepath;
      var newpath =
        "./public/lockImages/" +
        fields.lockName +
        "." +
        files.openLockImageInput.originalFilename.split(".")[
          files.openLockImageInput.originalFilename.split(".").length - 1
        ];
      // copy the file to a new location

      temp = files.openLockImageInput.originalFilename.split(".")[
        files.openLockImageInput.originalFilename.split(".").length - 1
      ];
      if (!!temp)
        fs.copyFile(oldpath, newpath, function (err) {
          if (err) throw err;
          // you may respond with another html page
          res.write("File uploaded and moved!");
          res.end();
        });
    } else {
      if (locks[fields.lockName] && locks[fields.lockName].isDisplay)
        temp = locks[fields.lockName].type;
    }
    let rQCards = fields.locksResults.split(", ");
    let rCards = [];
    for (let i in rQCards) {
      if (cards[rQCards[i]] && cards[rQCards[i]].name) rCards.push(rQCards[i]);
    }

    locks[fields.lockName] = {
      name: fields.lockName,
      lockResults: rCards,
      combo: fields.Combination,
      displayName: fields.displayInput,
      toRemove: fields.locksResultsRemove,
      isDisplay: !!temp,
      type: temp
    };
    wasChangeLocks = true;
    io.emit("askReset");
  });
});

io.on("connection", (socket) => {
  console.log("a user connected");
  let name = "";
  socket.on("login", function (value) {
    if (users[value.email]) {
      if (users[value.email].password === value.password) {
        name = value.email;
        socket.emit("goodLog", false, users[value.email].isAdmin);
        if (users[value.email].isAdmin) sendAllCardData();
        sendCardData();
        sendLockData();
        sendVideoData();
      } else {
        socket.emit("badLog");
      }
    } else {
      wasChangeCards = true;
      users[value.email] = {
        password: value.password,
        isAdmin: false,
        videos: []
      };
      socket.emit("goodLog", true);
      name = value.email;
      reset();
      sendCardData();
      sendLockData();
      sendVideoData();
    }
  });

  socket.on("unlock", function (lname, combo) {
    if (name === "") {
      socket.emit("reload");
      return;
    }
    if (locks[lname].combo === combo) {
      socket.emit("unlocked", lname, locks[lname].type);
      for (let i in users[name].locks) {
        if (lname === users[name].locks[i].name) {
          users[name].locks.splice(i, 1);
          break;
        }
      }
      users[name].videos.push([
        "lockImages/" + lname + "." + locks[lname].type,
        locks[lname].displayName
      ]);
      for (let i in locks[lname].lockResults) {
        users[name].cards.push(cards[locks[lname].lockResults[i]]);
      }
      let toRemove = locks[lname].toRemove.split(", ");
      console.log(toRemove);
      while (toRemove.length) {
        for (let i in users[name].cards) {
          if (users[name].cards[i].name === toRemove[0]) {
            toRemove.shift();
            users[name].cards.splice(i, 1);
          }
        }
        toRemove.shift();
      }
      console.log("in");
      wasChangeUsers = true;
      sendCardData();
      sendLockData();
      sendVideoData();
    } else {
      socket.emit("failedUnlocked", lname);
    }
  });

  socket.on("reset", function (value) {
    if (name === "") {
      socket.emit("reload");
      return;
    }
    reset();
    sendCardData();
    sendLockData();
    sendVideoData();
  });

  socket.on("qrcode", function (value) {
    if (name === "") {
      socket.emit("reload");
      return;
    }
    console.log("on");
    let col = value.split(":");
    let locks = col[0].split(", ");
    let hasLock = false;
    console.log(locks);
    let hasLocks = "";
    for (let i in users[name].locks) {
      for (let j in locks) {
        if (users[name].locks[i].name === locks[j]) {
          hasLock = true;
          hasLocks += locks[j] + ", ";
        }
      }
    }
    if (!hasLock) {
      let vCards = col[1].split(", ");
      for (let i in vCards) {
        if (
          "" !== vCards[i] &&
          " " !== vCards[i] &&
          ", " !== vCards[i] &&
          "," !== vCards[i] &&
          cards[vCards[i]]
        ) {
          let hasCard = false;
          for (let j in users[name].cards) {
            console.log(users[name].cards[j], vCards[i]);
            if (users[name].cards[j].name === vCards[i]) hasCard = true;
          }
          if (!hasCard) users[name].cards.push(cards[vCards[i]]);
        }
      }
      wasChangeUsers = true;
      sendCardData();
      sendLockData();
      sendVideoData();
    } else {
      socket.emit("makepopup", "You need to open " + hasLocks);
    }
  });

  //-------------------------CardHandleing------------------------------
  function sendCardData() {
    if (name === "") {
      socket.emit("reload");
      return;
    }
    socket.emit("sendCardData", users[name].cards);
  }
  function sendVideoData() {
    if (name === "") {
      socket.emit("reload");
      return;
    }
    socket.emit("sendVideoData", users[name].videos);
  }
  function sendAllCardData() {
    if (name === "") {
      socket.emit("reload");
      return;
    }
    socket.emit("sendAllCardData", Object.values(cards));
  }
  //-------------------------LockHandleing------------------------------
  function sendLockData() {
    if (name === "") {
      socket.emit("reload");
      return;
    }
    socket.emit("sendLockData", users[name].locks);
  }
  //-------------------------BothHandleing------------------------------
  function reset() {
    if (name === "") {
      socket.emit("reload");
      return;
    }
    console.log(name);
    users[name].locks = Object.values(locks);
    let startCards = [];
    for (let i in cards) {
      if (cards[i].start) {
        startCards.push(cards[i]);
      }
    }

    users[name].cards = startCards;
    users[name].videos = [];
    wasChangeUsers = true;
  }
});

setInterval(function () {
  if (wasChangeUsers) {
    fs.writeFile("userData.json", JSON.stringify(users), (err) => {
      // Checking for errors
      if (err) throw err;

      console.log("Done writing"); // Success
    });
    wasChangeUsers = false;
  }
  if (wasChangeCards) {
    fs.writeFile("cards.json", JSON.stringify(cards), (err) => {
      // Checking for errors
      if (err) throw err;

      console.log("Done writing"); // Success
    });
    wasChangeCards = false;
  }
  if (wasChangeLocks) {
    fs.writeFile("locks.json", JSON.stringify(locks), (err) => {
      // Checking for errors
      if (err) throw err;

      console.log("Done writing"); // Success
    });
    wasChangeLocks = false;
  }
}, 10000);

server.listen(3000, () => {
  console.log("listening on *:3000");
});
