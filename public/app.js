let socket = io();

window.onload = init;

let chars = [
  "♚",
  "♛",
  "♜",
  "♝",
  "♞",
  "♟︎",
  "★",
  "►",
  "♥",
  "☻",
  "✦",
  "✿",
  "♠",
  "♣",
  "✸",
  "♦",
  "☁",
  "☎",
  "◙",
];

let keyboardTarget, hideKeyboard, cardInputTarget, lockInputTarget;

let cards = [];
let videos = [];
let users = [];
let allCards = [];
let locks = [];
let progs = [];
let allLocks = [];
let isCardEdit = false;
let isLockEdit = false;
let isCardDelete = false;
let isLockDelete = false;
let keepImageLock = false;
let keepImageCard = false;

var isKeyPressed = {
  c: false, // ASCII code for 'a'
  b: false, // ASCII code for 'b'
  // ... Other keys to check for custom key combinations
};

function init() {
  if (localStorage.getItem("email") && localStorage.getItem("email") !== "") {
    socket.emit("login", {
      email: localStorage.getItem("email"),
      password: localStorage.getItem("pass"),
    });
  }
  document.onkeydown = (keyDownEvent) => {
    isKeyPressed[keyDownEvent.key] = true;
    if (isKeyPressed["q"] && keyDownEvent.ctrlKey) {
      refreshCSS();
    }
    if (isKeyPressed["m"] && keyDownEvent.ctrlKey) {
      socket.emit("reset");
    }
    //do something as custom shortcut (a & b) is clicked
  };
  document.onkeyup = (keyUpEvent) => {
    isKeyPressed[keyUpEvent.key] = false;
  };

  document.getElementById("loginDiv").onsubmit = login;
  document.getElementById("email").blur();
  setTimeout(function () {
    document.getElementById("email").focus();
  });
  doInputStuff();
  let textInputs = document.querySelectorAll(
    "input[type='text']:not(.CardInput)"
  );
  for (let i of textInputs) {
    i.addEventListener("focus", textFocus);
    i.addEventListener("blur", textBlur);
  }

  let cardInputs = document.querySelectorAll(".CardInput");
  for (let i of cardInputs) {
    i.addEventListener("focus", cardFocus);
  }

  let lockInputs = document.querySelectorAll(".LockInput");
  for (let i of lockInputs) {
    i.addEventListener("focus", lockFocus);
  }

  document
    .getElementById("cardInputSelectorButton")
    .addEventListener("click", cardInputSubmit);

  document
    .getElementById("lockInputSelectorButton")
    .addEventListener("click", lockInputSubmit);

  document.getElementById("submitLockOpener").addEventListener("click", unlock);
  document
    .getElementById("lockOpenerInput")
    .addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        socket.emit(
          "unlock",
          document.getElementById("submitLockOpener").getAttribute("nameL"),
          document.getElementById("lockOpenerInput").value
        );
      }
    });
  for (let i in chars) {
    let b = document.createElement("label");
    b.className = "emojiButton";
    b.innerHTML = chars[i];
    b.addEventListener("click", function () {
      keyboardTarget.value += this.innerHTML;
      hideKeyboard = false;
    });
    document.getElementById("emojiKeyboard").appendChild(b);
  }

  let html5QrcodeScanner = new Html5QrcodeScanner("reader", {
    fps: 10,
    qrbox: 250,
  });
  html5QrcodeScanner.render(onScanSuccess);

  setTimeout(() => {
    var aTags = document.getElementsByTagName("button");
    var searchText = "Stop Scanning";
    var found;

    for (var i = 0; i < aTags.length; i++) {
      if (aTags[i].textContent === searchText) {
        found = aTags[i];
        break;
      }
    }
    let imgs = document.getElementsByTagName("img");
    for (let i of imgs) {
      if (imgs[i] && imgs[i].alt === "Info icon") {
        imgs[i].style["z-index"] = 0;
      }
    }
    if (found) found.click();
  }, 5000);
  function onScanSuccess(decodedText, decodedResult) {
    // Handle on success condition with the decoded text or result.
    socket.emit("qrcode", decodedText);
    var aTags = document.getElementsByTagName("button");
    var searchText = "Stop Scanning";
    var found;

    for (var i = 0; i < aTags.length; i++) {
      if (aTags[i].textContent === searchText) {
        found = aTags[i];
        break;
      }
    }
    if (found) found.click();
  }
  function onScanFailure(error) {
    // handle scan failure, usually better to ignore and keep scanning.
    // for example:
    console.warn(`Code scan error = ${error}`);
  }
}

let refreshCSS = () => {
  let links = document.getElementsByTagName("link");
  for (let i = 0; i < links.length; i++) {
    if (links[i].getAttribute("rel") == "stylesheet") {
      let href = links[i].getAttribute("href").split("?")[0];

      let newHref = href + "?version=" + new Date().getMilliseconds();

      links[i].setAttribute("href", newHref);
    }
  }
};

//---------------------------------Emoji Keyboard----------------------------------

function textFocus() {
  hideKeyboard = false;
  let emojiKeyboard = document.getElementById("emojiKeyboard");
  emojiKeyboard.style.display = "block";
  keyboardTarget = this;
  let emoji = document.querySelectorAll(".emojiButton");
  for (let i of emoji) {
    i.setAttribute("for", this.id);
  }
}

function textBlur(e) {
  hideKeyboard = true;
  setTimeout(() => {
    if (hideKeyboard) {
      let emojiKeyboard = document.getElementById("emojiKeyboard");
      emojiKeyboard.style.display = "none";
    }
  }, 500);
}

//---------------------------------Card Input----------------------------------

function cardFocus() {
  let cardInputSelector = document.getElementById("cardInputSelector");
  cardInputSelector.style.display = "block";
  cardInputTarget = this;
  let cardsItems = document.querySelectorAll(".cardItem");
  for (let i of cardsItems) {
    i.remove();
  }
  let cardInputSelectorBr = document.getElementById("cardInputSelectorBr");
  for (let i in allCards) {
    if (cardInputTarget.id === "locksResultsRemove" || !allCards[i].start) {
      let item = document.createElement("div");
      item.title = allCards[i].name;
      item.className = "cardItem";
      let checkboxButton = document.createElement("input");
      checkboxButton.className = "cardItemCheckbox";
      checkboxButton.setAttribute("name", allCards[i].name);
      checkboxButton.type = "checkbox";
      let image = document.createElement("img");
      image.className = "cardItemImage";
      image.src = "cardImages/" + allCards[i].name + "." + allCards[i].type;
      item.appendChild(checkboxButton);
      item.appendChild(image);

      cardInputSelector.insertBefore(item, cardInputSelectorBr);
    }
  }
}

function cardInputSubmit() {
  let string = "";
  let cardsItems = document.getElementsByClassName("cardItemCheckbox");
  for (let i of cardsItems) {
    if (i.checked) {
      string += i.getAttribute("name") + ", ";
    }
  }
  cardInputTarget.value = string;
  let cardInputSelector = document.getElementById("cardInputSelector");
  cardInputSelector.style.display = "none";
}

//---------------------------------Lock Input----------------------------------

function lockFocus() {
  let lockInputSelector = document.getElementById("lockInputSelector");
  lockInputSelector.style.display = "block";
  lockInputTarget = this;
  let locksItems = document.querySelectorAll(".lockItem");
  for (let i of locksItems) {
    i.remove();
  }
  let lockInputSelectorBr = document.getElementById("lockInputSelectorBr");
  for (let i in allLocks) {
    if (!allLocks[i].start) {
      let item = document.createElement("div");
      item.className = "lockItem";
      item.title = allLocks[i].name;
      let checkboxButton = document.createElement("input");
      checkboxButton.className = "lockItemCheckbox";
      checkboxButton.setAttribute("name", allLocks[i].name);
      checkboxButton.type = "checkbox";
      item.appendChild(checkboxButton);
      item.innerHTML += "<br>" + allLocks[i].displayName;

      lockInputSelector.insertBefore(item, lockInputSelectorBr);
    }
  }
}

function lockInputSubmit() {
  let string = "";
  let locksItems = document.getElementsByClassName("lockItemCheckbox");
  for (let i of locksItems) {
    if (i.checked) {
      string += i.getAttribute("name") + ", ";
    }
  }
  lockInputTarget.value = string;
  let lockInputSelector = document.getElementById("lockInputSelector");
  lockInputSelector.style.display = "none";
}

//---------------------------------NavBar----------------------------------

function navBarClick(that, toPlace) {
  document.getElementsByClassName("navActive")[0].classList.remove("navActive");
  that.classList += " navActive";
  document
    .getElementsByClassName("pageActive")[0]
    .classList.remove("pageActive");
  document.getElementById(toPlace + "PageDiv").classList += " pageActive";
}

//---------------------------------Login----------------------------------
function login() {
  if (document.getElementById("stayLoggedIn").value) {
    localStorage.setItem(
      "email",
      document.getElementById("email").value.toLowerCase()
    );
    localStorage.setItem("pass", document.getElementById("password").value);
  }
  socket.emit("login", {
    email: document.getElementById("email").value.toLowerCase(),
    password: document.getElementById("password").value,
  });
  return false;
}

socket.on("goodLog", function (value, value2) {
  document.getElementById("loginDiv").style.display = "none";
  document.getElementById("hoverDiv").classList.remove("noClickThrough");
  if (value) {
    makePopup("Account created");
  } else {
    makePopup("L0GED 1N");
  }

  if (value2) {
    let els = document.getElementsByClassName("admin");
    for (let i in els) {
      els[i].classList += " adminV";
    }
  }
});

socket.on("badLog", function (value) {
  makePopup("Wrong PA33WORD");
});

socket.on("reload", function (value) {
  window.location.reload();
});

//------------------------------Helper Functions------------------------------
//Makes A popup
function makePopup(text) {
  let popupDiv = document.getElementById("hoverDiv");
  let el = document.createElement("div");
  el.className += "popup";
  el.onclick = function (e) {
    this.remove();
  };
  el.innerHTML = text;
  setTimeout(() => {
    if (el) el.remove();
  }, 3000);
  popupDiv.appendChild(el);
}
//------------------------------No clue------------------------------
function doInputStuff() {
  var inputs = document.querySelectorAll(".inputfile");
  Array.prototype.forEach.call(inputs, function (input) {
    var label = input.nextElementSibling,
      labelVal = label.innerHTML;

    input.addEventListener("change", function (e) {
      var fileName = "";
      if (this.files && this.files.length > 1)
        fileName = (this.getAttribute("data-multiple-caption") || "").replace(
          "{count}",
          this.files.length
        );
      else fileName = e.target.value.split("\\").pop();

      if (fileName) label.innerHTML = fileName;
      else label.innerHTML = labelVal;
    });
  });
}

//-----------------------------Forms------------------------------
function fetchpostLock() {
  // (A) GET FORM DATA
  var form = document.getElementById("lockMaker");
  var data = new FormData(form);
  if (document.getElementById("openLockImageInput").value !== "")
    keepImageLock = false;
  if (keepImageLock) {
    let lock;
    for (let i in locks) {
      if (locks[i].name === document.getElementById("lockNameInput").value) {
        lock = locks[i];
        break;
      }
    }
    if (lock.type !== "") {
      // let canvas = document.createElement("canvas");
      // let ctx = canvas.getContext("2d");
      // let img = document.createElement("img");
      // img.addEventListener("load", function () {
      //     console.log("sdlfksakldf");
      //     canvas.width = this.naturalWidth; // update canvas size to match image
      //     canvas.height = this.naturalHeight;
      //     ctx.drawImage(this, 0, 0);
      //     canvas.toBlob(function (blob) {
      //         console.log(blob);
      //         data.append(
      //             "openLockImageInput",
      //             blob,
      //             lock.name + "." + lock.type
      //         );
      //         fetch("./submit-form/locks.php", {
      //             method: "post",
      //             body: data,
      //         })
      //             .then((res) => {
      //                 return res.text();
      //             })
      //             .then((txt) => {
      //                 console.log(txt);
      //             })
      //             .catch((err) => {
      //                 console.log(err);
      //             });
      //     });
      // });
      // console.log("lockImages/" + lock.name + "." + lock.type);
      // img.src = "/lockImages/" + lock.name + "." + lock.type;
      // console.log(img);
    }
  }

  // (B) FETCH
  //if (!keepImageLock) {
  fetch("./submit-form/locks.php", {
    method: "post",
    body: data,
  })
    .then((res) => {
      return res.text();
    })
    .then((txt) => {
      console.log(txt);
    })
    .catch((err) => {
      console.log(err);
    });
  //}
  keepImageLock = false;

  // (C) PREVENT HTML FORM SUBMIT
  document.getElementById("lockMaker").style.display = "none";
  return false;
}

function fetchpostCard() {
  // (A) GET FORM DATA
  var form = document.getElementById("cardMaker");
  var data = new FormData(form);
  if (document.getElementById("cardImageInput").value !== "")
    keepImageCard = false;

  if (keepImageCard) {
    let card;
    for (let i in allCards) {
      if (allCards[i].name === document.getElementById("cardNameInput").value) {
        card = allCards[i];
        break;
      }
    }
    if (card.type !== "") {
      let canvas = document.createElement("canvas");
      let ctx = canvas.getContext("2d");
      let img = new Image();
      img.onload = function () {
        canvas.width = this.naturalWidth; // update canvas size to match image
        canvas.height = this.naturalHeight;
        ctx.drawImage(this, 0, 0);
        canvas.toBlob(function (blob) {
          data.append("cardImageInput", blob, card.name + "." + card.type);
          fetch("./submit-form/cards.php", {
            method: "post",
            body: data,
          })
            .then((res) => {
              return res.text();
            })
            .then((txt) => {
              console.log(txt);
            })
            .catch((err) => {
              console.log(err);
            });
        });
      };
      img.src = "cardImages/" + card.name + "." + card.type;
    }
  }
  // (B) FETCH
  if (!keepImageCard) {
    fetch("./submit-form/cards.php", {
      method: "post",
      body: data,
    })
      .then((res) => {
        return res.text();
      })
      .then((txt) => {
        console.log(txt);
      })
      .catch((err) => {
        console.log(err);
      });
  }
  keepImageLock = false;
  document.getElementById("cardImageInput").required = true;
  // (C) PREVENT HTML FORM SUBMIT

  document.getElementById("cardMaker").style.display = "none";
  return false;
}

//-----------------------------Recive Data------------------------------

socket.on("sendCardData", function (value) {
  cards = value;
  makeCards();
});

socket.on("sendVideoData", function (value) {
  videos = value;
  let cardsItems = document.querySelectorAll(".videoDiv");
  for (let i of cardsItems) {
    i.remove();
  }
  for (let i in videos) {
    let type = videos[i][0].split(".")[videos[i][0].split(".").length - 1];
    let div = document.createElement("div");
    div.className = "videoDiv";
    div.innerHTML += videos[i][1] + "<br>";
    switch (type) {
      case "mp4":
      case "ogv":
      case "webm":
      case "mov":
        let video = document.createElement("video");
        video.controls = true;
        let source = document.createElement("source");
        source.src = videos[i][0];
        video.appendChild(source);
        video.className = "videos";
        div.appendChild(video);

        break;
      case "":
        break;
      default:
        let image = document.createElement("img");
        image.className = "videos";
        image.src = videos[i][0];
        document.getElementById("videosPageDiv").appendChild(image);
        div.appendChild(image);
        break;
    }
    document.getElementById("videosPageDiv").appendChild(div);
  }
});

function makeCards() {
  let cardsItems = document.querySelectorAll(".cards");
  for (let i of cardsItems) {
    i.remove();
  }
  let uCards = cards;
  if (isCardEdit || isCardDelete) uCards = allCards;
  for (let i in uCards) {
    let cardBase = document.createElement("div");
    cardBase.setAttribute("namel", uCards[i].name);
    cardBase.className = "cards";
    if (isCardEdit || isCardDelete) {
      cardBase.innerHTML += uCards[i].name;
      cardBase.style.backgroundColor = "red";
      cardBase.style.textAlign = "center";
    } else {
      cardBase.style.height = uCards[i].sizeY + "px";
    }
    let cardImage = document.createElement("img");
    cardImage.src = "cardImages/" + uCards[i].name + "." + uCards[i].type;
    cardImage.width = uCards[i].sizeX;
    cardBase.style.width = uCards[i].sizeX + "px";
    cardImage.height = uCards[i].sizeY;
    cardBase.appendChild(cardImage);
    document.getElementById("cardsPageDiv").appendChild(cardBase);

    cardBase.addEventListener("click", function () {
      if (isCardEdit) {
        document.getElementById("cardMaker").style.display = "block";
        let card;
        for (let i in allCards) {
          if (allCards[i].name === this.getAttribute("namel")) {
            card = allCards[i];
            break;
          }
        }
        document.getElementById("cardNameInput").value = card.name;
        document.getElementById("sizeX").value = card.sizeX;
        document.getElementById("sizeY").value = card.sizeY;
        //document.getElementById("cardNameInput").disabled = true;
        document.getElementById("start").checked = card.start;
        document.getElementById("cardImageLabel").innerText =
          card.name + "." + card.type;
        document.getElementById("cardImageInput").required = false;
        keepImageCard = true;
        isCardEdit = false;
        document.getElementById("isCardEditDiv").innerText = "normal";

        makeCards();
      } else if (isCardDelete) {
        if (confirm("Are you sure you want to delete this") == true) {
          let card;
          for (let i in uCards) {
            if (uCards[i].name === this.getAttribute("namel")) {
              card = uCards[i];
              break;
            }
          }
          socket.emit("cardDelete", card.name);
        }
      } else {
        if (this.classList.contains("bigCard")) {
          this.classList.remove("bigCard");
          this.style.width = parseInt(this.style.width) / 2.5 + "px";
          this.style.height = parseInt(this.style.height) / 2.5 + "px";
          this.getElementsByTagName("img")[0].width = parseInt(
            this.style.width
          );
          this.getElementsByTagName("img")[0].height = parseInt(
            this.style.height
          );
        } else {
          this.classList.add("bigCard");
          this.style.width = parseInt(this.style.width) * 2.5 + "px";
          this.style.height = parseInt(this.style.height) * 2.5 + "px";
          this.getElementsByTagName("img")[0].width = parseInt(
            this.style.width
          );
          this.getElementsByTagName("img")[0].height = parseInt(
            this.style.height
          );
        }
      }
    });
  }
}

socket.on("askReset", function () {
  socket.emit("reset");
});

socket.on("sendAllCardData", function (value) {
  allCards = value;
  setTimeout(() => {
    makeCards();
  }, 1000);
});

function showAllLocks() {
  makeLocks();
}

socket.on("sendLockData", function (value) {
  locks = value;
  makeLocks();
});

socket.on("sendUserData", function (value) {
  users = value;
  makeUsers();
});

function makeLocks() {
  let locksItems = document.querySelectorAll(".locks");
  for (let i of locksItems) {
    i.remove();
  }
  let uLocks = locks;
  if (isLockEdit || isLockDelete) uLocks = allLocks;
  for (let i in uLocks) {
    let lockBase = document.createElement("div");
    lockBase.className = "locks";
    lockBase.innerHTML += uLocks[i].displayName + "<br>";
    let lockImage = document.createElement("img");
    lockImage.src = "lock.png";
    lockImage.width = 125;
    lockImage.height = 150;
    lockBase.appendChild(lockImage);
    document.getElementById("locksPageDiv").appendChild(lockBase);
    lockBase.setAttribute("namel", uLocks[i].name);
    lockBase.addEventListener("click", function () {
      if (isLockEdit) {
        openLockMaker();
        let lock;
        for (let i in uLocks) {
          if (uLocks[i].name === this.getAttribute("namel")) {
            lock = uLocks[i];
            break;
          }
        }
        document.getElementById("lockNameInput").value = lock.name;
        let str = "";
        for (let i in lock.lockResults) {
          str += lock.lockResults[i] + ", ";
        }
        document.getElementById("locksResults").value = str;
        document.getElementById("comboInput").value = lock.combo;
        document.getElementById("displayInput").value = lock.displayName;
        //document.getElementById("lockNameInput").disabled = true;
        if (lock.isDisplay) {
          document.getElementById("openLockImageLabel").innerText =
            lock.name + "." + lock.type;
        }
        document.getElementById("locksResultsRemove").value = lock.toRemove;
        keepImageLock = true;
        document.getElementById("isLockEditDiv").innerText = "normal";
      } else if (isLockDelete) {
        if (confirm("Are you sure you want to delete this") == true) {
          let lock;
          for (let i in uLocks) {
            if (uLocks[i].name === this.getAttribute("namel")) {
              lock = uLocks[i];
              break;
            }
          }
          socket.emit("lockDelete", lock.name);
        } else {
        }
      } else {
        document.getElementById("lockOpener").style.display = "block";
        document.getElementById("lockOpenerName").innerText =
          this.innerText.trim();
        document.getElementById("lockOpenerInput").focus();

        document
          .getElementById("submitLockOpener")
          .setAttribute("namel", this.getAttribute("namel"));
      }
    });
  }
}

function makeProgs() {
  let progsItems = document.querySelectorAll(".progs");
  for (let i of progsItems) {
    i.remove();
  }
  let uProgs = progs;
  for (let i in uProgs) {
    let progBase = document.createElement("div");
    progBase.className = "progs";
    progBase.innerHTML +=
      uProgs[i].name +
      ": " +
      uProgs[i].progress +
      "/" +
      uProgs[i].totalLocks +
      "<br>";
    document.getElementById("othersPageDiv").appendChild(progBase);
  }
}

socket.on("sendUserProg", function (value) {
  progs = value;
  makeProgs();
});

socket.on("requestAllData", function () {
  socket.emit("askForAllData");
});

function makeUsers() {
  let usersItems = document.querySelectorAll(".users");
  for (let i of usersItems) {
    i.remove();
  }
  let uUsers = users;
  for (let i in uUsers) {
    let usersBase = document.createElement("div");
    usersBase.className = "users";
    if (uUsers[i].done) {
      usersBase.style.color = "green";
    }
    if (uUsers[i].isAdmin) {
      usersBase.style.color = "blue";
    }
    if (uUsers[i].isAdmin && uUsers[i].done) {
      usersBase.style.color = "black";
    }
    usersBase.innerHTML += uUsers[i].name + "<br>";
    let usersImage = document.createElement("img");
    usersImage.src = "users.png";
    usersImage.width = 125;
    usersImage.height = 150;
    usersBase.appendChild(usersImage);
    document.getElementById("adminPageDiv").appendChild(usersBase);
    usersBase.setAttribute("namel", uUsers[i].name);

    usersBase.addEventListener("click", function () {
      document.getElementById("userMaker").style.display = "block";
      document.getElementById("userMakerName").innerText =
        this.innerText.trim();

      document
        .getElementById("submitLockOpener")
        .setAttribute("namel", this.getAttribute("namel"));
    });
  }
}

socket.on("sendAllLockData", function (value) {
  allLocks = value;
  setTimeout(() => {
    makeLocks();
  }, 1000);
});

//edit cards

function editCards() {
  isCardEdit = !isCardEdit;
  document.getElementById("isCardEditDiv").innerText = isCardEdit
    ? "edit"
    : "normal";

  makeCards();
}

function searchCards(that) {
  let string = that.value.toLowerCase();
  let cardsItems = document.querySelectorAll(".cards");
  for (let i of cardsItems) {
    if (i.getAttribute("namel").toLowerCase().includes(string)) {
      i.style.display = "inline-block";
    } else {
      i.style.display = "none";
    }
  }
}

function searchCardInput(that) {
  let string = that.value.toLowerCase();
  let cardsItems = document.querySelectorAll(".cardItem");
  for (let i of cardsItems) {
    if (
      i.getElementsByTagName("input")[0].name.toLowerCase().includes(string)
    ) {
      i.style.display = "inline-block";
    } else {
      i.style.display = "none";
    }
  }
}

function searchLocks(that) {
  let string = that.value.toLowerCase();
  let locksItems = document.querySelectorAll(".locks");
  for (let i of locksItems) {
    if (i.getAttribute("namel").toLowerCase().includes(string)) {
      i.style.display = "inline-block";
    } else {
      i.style.display = "none";
    }
  }
}

function searchLockInput(that) {
  let string = that.value.toLowerCase();
  let locksItems = document.querySelectorAll(".lockItem");
  for (let i of locksItems) {
    if (
      i.getElementsByTagName("input")[0].name.toLowerCase().includes(string)
    ) {
      i.style.display = "inline-block";
    } else {
      i.style.display = "none";
    }
  }
}

//lock
function unlock() {
  socket.emit(
    "unlock",
    this.getAttribute("nameL"),
    document.getElementById("lockOpenerInput").value
  );
}

socket.on("unlocked", function (name, type) {
  makePopup("Nice");
  switch (type) {
    case "mp4":
    case "ogv":
    case "webm":
    case "mov":
      let video = document.createElement("video");
      let source = document.createElement("source");
      source.src = "lockImages/" + name + "." + type;
      video.appendChild(source);
      video.className = "unlockedDisplay";
      video.addEventListener("canplaythrough", function () {
        video.play();
      });
      video.addEventListener("ended", function () {
        video.remove();
      });
      video.addEventListener("click", function () {
        video.remove();
      });
      document.body.appendChild(video);
      break;
    case "":
      break;
    default:
      let image = document.createElement("img");
      image.src = "lockImages/" + name + "." + type;
      image.className = "unlockedDisplay";
      document.body.appendChild(image);
      setTimeout(function () {
        if (image) image.remove();
      }, 5000);
      image.addEventListener("click", function () {
        image.remove();
      });
      break;
  }
  document.getElementById("lockOpener").style.display = "none";
});

socket.on("failedUnlocked", function (name) {
  makePopup("Sorry thats the wrong Number");
});

socket.on("makepopup", function (name) {
  makePopup(name);
});

function openLockMaker() {
  document.getElementById("lockMaker").style.display = "block";
  //document.getElementById("lockNameInput").disabled = false;
  document.getElementById("lockMaker").reset();
  document.getElementById("openLockImageLabel").innerHTML = "Upload image";
  document.getElementById("openLockImageLabel").innerText = "Upload image";
}

function openCardMaker() {
  document.getElementById("cardMaker").style.display = "block";
  document.getElementById("cardMaker").reset();
  //document.getElementById("cardNameInput").disabled = false;
  document.getElementById("cardImageLabel").innerHTML = "Upload image";
  document.getElementById("cardNameInput").innerText = "Upload image";
}

//qrcode
function qrcode() {
  var options = {
    text:
      document
        .getElementById("qrcodeLock")
        .value.slice(
          0,
          document.getElementById("qrcodeLock").value.length - 2
        ) +
      ":" +
      document.getElementById("qrcodeCards").value,
    width: 512,
    height: 512,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.L,
    logo: "logo.png",
    logoBackgroundTransparent: true,

    onRenderingEnd: () => {
      printJS({
        printable: "qrcode",
        type: "html",
        header: `<p style="text-align:center; font-size: 7rem; padding:0">${
          document.getElementById("qrcodeNameInput").value
        }</p>`,
      });
      document
        .getElementById("qrcode")
        .getElementsByTagName("canvas")[0]
        .remove();
      document.getElementById("qrcodeMaker").style.display = "none";
    },
  };

  // Create QRCode Object
  let qr = new QRCode(document.getElementById("qrcode"), options);

  return false;
}
