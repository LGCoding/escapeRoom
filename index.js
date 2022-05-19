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
let tempUsers = {};
let cards = cardsData;
let locks = locksData;

let wasChangeUsers = false;
let wasChangeCards = false;
let wasChangeLocks = false;

// app.use(function (req, res, next) {
//     //console.log(req.protocol + "://" + req.get("host") + req.originalUrl);
//     next();
// });

const nodemailer = require("nodemailer");

let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: "idorandomtechstuff@gmail.com",
    pass: "TechStuff.1234",
    clientId:
      "97976407358-8so1bb1nt7c8utfsu76b4n7311g63sk8.apps.googleusercontent.com",
    clientSecret: "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",
    refreshToken:
      "1//04QTJS64GY0qWCgYIARAAGAQSNwF-L9IrH-DknFtVMxiC6p9oUYXidoOQv66zGKVtZzMqv_7HuU4VASXd1-b233LvsofXDFdxBAc",
  },
});

// setup email data with unicode symbols

app.use(express.static(__dirname + "/public"));

app.get("/register", (req, res) => {
  if (
    req.query.email &&
    req.query.secureIdLol &&
    tempUsers[req.query.email] &&
    tempUsers[req.query.email].secureIdLol == req.query.secureIdLol
  ) {
    clearTimeout(tempUsers[req.query.email].timeout);
    users[req.query.email] = tempUsers[req.query.email];
    delete tempUsers[req.query.email];
    wasChangeUsers = true;
    res.sendFile(__dirname + "/public/register.html");
    return;
  }
  res.sendFile(__dirname + "/public/failedRegister.html");
});

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
      ],
    };
    wasChangeCards = true;
    io.emit("sendAllCardData", cards);
    for (let j in users) {
      console.log(j);
      users[j].locks = Object.values(locks);
      let startCards = [];
      for (let i in cards) {
        if (cards[i].start) {
          startCards.push(cards[i]);
        }
      }

      users[j].cards = startCards;
      users[j].videos = [["lockImages/start.mp4", "Start"]];
      users[j].done = false;
    }
    wasChangeUsers = true;
    io.emit("requestAllData");
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

      temp =
        files.openLockImageInput.originalFilename.split(".")[
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
      type: temp,
    };
    wasChangeLocks = true;
    for (let j in users) {
      console.log(j);
      users[j].locks = Object.values(locks);
      let startCards = [];
      for (let i in cards) {
        if (cards[i].start) {
          startCards.push(cards[i]);
        }
      }

      users[j].cards = startCards;
      users[j].videos = [["lockImages/start.mp4", "Start"]];
      users[j].done = false;
    }
    wasChangeUsers = true;
    io.emit("requestAllData");
  });
});

function sendEmail(to, subject, text) {
  let mailOptions = {
    from: "IDORANDOMTECHSTUFF@GMAIL.COM", // sender address
    to: to, // list of receivers
    subject: subject, // Subject line
    text: text, // plain text body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log("Message sent: %s", info.messageId);
  });
}

io.on("connection", (socket) => {
  console.log("a user connected");
  let name = "";
  socket.on("login", function (value) {
    if (users[value.email]) {
      if (users[value.email].password === value.password) {
        name = value.email;
        socket.emit("goodLog", false, users[value.email].isAdmin);
        if (users[value.email].isAdmin) {
          sendAllCardData();
          sendUserData();
        }
        sendCardData();
        sendLockData();
        sendVideoData();
        sendUserProg();
      } else {
        socket.emit("badLog");
      }
    } else {
      wasChangeCards = true;
      let superDuperId =
        Math.ceil(Math.random() * 1000) *
          Math.ceil(Math.random() * 1000) *
          Math.ceil(Math.random() * 1000) +
        "";
      tempUsers[value.email] = {
        password: value.password,
        isAdmin: false,
        videos: [["lockImages/start.mp4", "Start"]],
        secureIdLol: superDuperId,
        timeout: setTimeout(() => {
          delete tempUsers[name];
        }, 300000),
      };
      socket.emit(
        "makepopup",
        "Check your email to confirm email you have 5 min"
      );
      name = value.email;

      tempUsers[name].locks = Object.values(locks);
      let startCards = [];
      for (let i in cards) {
        if (cards[i].start) {
          startCards.push(cards[i]);
        }
      }

      tempUsers[name].cards = startCards;
      tempUsers[name].videos = [["lockImages/start.mp4", "Start"]];
      tempUsers[name].done = false;
      sendEmail(
        name,
        "Please Register Your Email",
        "Use this link to register your email " +
          `https://escape-room-brlgb.ondigitalocean.app/register?email=${name}&secureIdLol=${superDuperId}`
      );
    }
  });

  socket.on("makeAdmin", (value) => {
    console.log("in");
    users[value].isAdmin = !users[value].isAdmin;
    wasChangeUsers = true;
    requestAllData();
  });

  socket.on("deleteUser", (value) => {
    delete users[value];
    wasChangeUsers = true;
    requestAllData();
  });

  socket.on("resetUser", (value) => {
    users[value].locks = Object.values(locks);
    let startCards = [];
    for (let i in cards) {
      if (cards[i].start) {
        startCards.push(cards[i]);
      }
    }

    users[value].cards = startCards;
    users[value].videos = [["lockImages/start.mp4", "Start"]];
    users[value].done = false;
    wasChangeUsers = true;
    requestAllData();
  });

  socket.on("changePassword", (value, value2) => {
    users[value].password = value2;
    wasChangeUsers = true;
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
        locks[lname].displayName,
      ]);
      for (let i in locks[lname].lockResults) {
        if (locks[lname])
          users[name].cards.push(cards[locks[lname].lockResults[i]]);
      }
      let toRemove = locks[lname].toRemove.split(", ");
      console.log(toRemove);
      while (toRemove.length) {
        console.log(users[name].cards);
        for (let i = 0; i < users[name].cards.length; i++) {
          if (users[name].cards[i].name === toRemove[0]) {
            toRemove.shift();
            users[name].cards.splice(i, 1);
          }
        }
        toRemove.shift();
      }
      console.log("in");

      if (users[name].videos.length - 1 === Object.keys(locks).length) {
        users[name].done = true;
        let mailOptions = {
          from: "IDORANDOMTECHSTUFF@GMAIL.COM", // sender address
          to: "liamvgav@gmail.com", // list of receivers
          subject: "Someone finished", // Subject line
          text: name + "finished", // plain text body
        };

        // send mail with defined transport object
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            return console.log(error);
          }
          console.log("Message sent: %s", info.messageId);
        });
      }
      wasChangeUsers = true;
      sendCardData();
      sendLockData();
      sendVideoData();
      sendUserProg();
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
    sendAllCardData();
  });

  socket.on("lockDelete", function (value) {
    let path = "public/lockImages/" + value + "." + locks[value].type;
    fs.unlink(path, (err) => {
      if (err) {
        console.error(err);
        return;
      }
    });
    for (let i in users) {
      for (let j in users[i].locks) {
        if (users[i].locks[j].name === value) {
          users[i].locks.splice(j, 1);
        }
      }
    }
    delete locks[value];
    for (let j in users) {
      console.log(j);
      users[j].locks = Object.values(locks);
      let startCards = [];
      for (let i in cards) {
        if (cards[i].start) {
          startCards.push(cards[i]);
        }
      }

      users[j].cards = startCards;
      users[j].videos = [["lockImages/start.mp4", "Start"]];
      users[j].done = false;
    }
    wasChangeUsers = true;
    wasChangeLocks = true;
    wasChangeUsers = true;
    requestAllData();
  });

  socket.on("cardDelete", function (value) {
    let path = "public/cardImages/" + value + "." + cards[value].type;
    fs.unlink(path, (err) => {
      if (err) {
        console.error(err);
        return;
      }
    });
    for (let i in users) {
      for (let j in users[i].cards) {
        if (users[i].cards[j].name === value) {
          users[i].cards.splice(j, 1);
        }
      }
    }
    delete cards[value];
    for (let j in users) {
      console.log(j);
      users[j].locks = Object.values(locks);
      let startCards = [];
      for (let i in cards) {
        if (cards[i].start) {
          startCards.push(cards[i]);
        }
      }

      users[j].cards = startCards;
      users[j].videos = [["lockImages/start.mp4", "Start"]];
      users[j].done = false;
    }
    wasChangeUsers = true;
    wasChangeCards = true;
    wasChangeUsers = true;
    requestAllData();
  });

  socket.on("qrcode", function (value) {
    if (name === "") {
      socket.emit("reload");
      return;
    }
    console.log("on");
    let col = value.split(":");
    console.log("thing", col, value);
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
      socket.emit("makepopup", "Qrcode Scanned");
      sendCardData();
      sendLockData();
      sendVideoData();
    } else {
      socket.emit("makepopup", "You need to open " + hasLocks);
    }
  });

  socket.on("askForAllData", function (value) {
    if (name === "") {
      socket.emit("reload");
      return;
    }
    if (users[name].isAdmin) {
      sendAllCardData();
      sendUserData();
    }
    sendCardData();
    sendLockData();
    sendVideoData();
    sendUserProg();
  });

  //-------------------------CardHandleing------------------------------
  function sendCardData(person = name) {
    if (person === "") {
      socket.emit("reload");
      return;
    }
    socket.emit("sendCardData", users[person].cards);
  }
  function sendVideoData(person = name) {
    if (name === "") {
      socket.emit("reload");
      return;
    }
    socket.emit("sendVideoData", users[name].videos);
  }
  function sendAllCardData(person = name) {
    if (name === "") {
      socket.emit("reload");
      return;
    }
    socket.emit("sendAllCardData", Object.values(cards));
    socket.emit("sendAllLockData", Object.values(locks));
  }
  function sendUserData(person = name) {
    if (name === "") {
      socket.emit("reload");
      return;
    }
    let nUsers = [];
    for (let i in users) {
      users[i].name = i;
      nUsers.push(users[i]);
    }
    socket.emit("sendUserData", nUsers);
  }
  function sendUserProg(person = name) {
    if (name === "") {
      socket.emit("reload");
      return;
    }
    let nUsers = [];
    for (let i in users) {
      nUsers.push({
        name: i.split("@")[0],
        progress: users[i].videos.length - 1,
        totalLocks: Object.keys(locks).length,
      });
    }
    console.log("inProg");
    io.emit("sendUserProg", nUsers);
  }
  //-------------------------LockHandleing------------------------------
  function sendLockData(person = name) {
    if (name === "") {
      socket.emit("reload");
      return;
    }
    socket.emit("sendLockData", users[person].locks);
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
    users[name].videos = [["lockImages/start.mp4", "Start"]];
    users[name].done = false;
    wasChangeUsers = true;
  }

  function requestAllData() {
    console.log("inRequest");
    io.emit("requestAllData");
  }
});

setInterval(function () {
  if (wasChangeUsers) {
    fs.writeFile("./userData.json", JSON.stringify(users), (err) => {
      // Checking for errors
      if (err) throw err;
      else console.log("Done writing users"); // Success
    });
    wasChangeUsers = false;
  }
  if (wasChangeCards) {
    fs.writeFile("./cards.json", JSON.stringify(cards), (err) => {
      // Checking for errors
      if (err) throw err;
      else console.log("Done writing cards"); // Success
    });
    wasChangeCards = false;
  }
  if (wasChangeLocks) {
    fs.writeFile("./locks.json", JSON.stringify(locks), (err) => {
      // Checking for errors
      if (err) throw err;
      else console.log("Done writing locks"); // Success
    });
    wasChangeLocks = false;
  }
}, 10000);
server.listen(process.env.PORT || 80, () => {
  console.log("listening on *:" + (process.env.PORT || 80));
});
