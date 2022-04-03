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
  "◙"
];

let keyboardTarget, hideKeyboard, cardInputTarget, lockInputTarget;

let cards = [];
let videos = [];
let allCards = [];
let locks = [];
let isCardEdit = false;
let isLockEdit = false;
let keepImageLock = false;
let keepImageCard = false;

var isKeyPressed = {
  c: false, // ASCII code for 'a'
  b: false // ASCII code for 'b'
  // ... Other keys to check for custom key combinations
};

function init() {
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
    qrbox: 250
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
      console.log("ins", i);
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
  for (let i in locks) {
    if (!locks[i].start) {
      let item = document.createElement("div");
      item.className = "lockItem";
      let checkboxButton = document.createElement("input");
      checkboxButton.className = "lockItemCheckbox";
      checkboxButton.setAttribute("name", locks[i].name);
      checkboxButton.type = "checkbox";
      item.appendChild(checkboxButton);
      item.innerHTML += "<br>" + locks[i].displayName;

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
  socket.emit("login", {
    email: document.getElementById("email").value,
    password: document.getElementById("password").value
  });
  return false;
}

socket.on("goodLog", function (value, value2) {
  document.getElementById("loginDiv").style.display = "none";
  document.getElementById("hoverDiv").classList.remove("noClickThrough");
  if (value) {
    makePopup("Account created");
  } else {
    makePopup("Loged In");
  }

  if (value2) {
    let els = document.getElementsByClassName("admin");
    for (let i in els) {
      els[i].classList += " adminV";
    }
  }
});

socket.on("badLog", function (value) {
  makePopup("Wrong Password");
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
  }, 1000);
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
    console.log("ins");
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
    body: data
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
            body: data
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
      body: data
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
  reloadCards();
});

socket.on("sendVideoData", function (value) {
  videos = value;
  let cardsItems = document.querySelectorAll(".videos");
  for (let i of cardsItems) {
    i.remove();
  }
  for (let i in videos) {
    let type = videos[i][0].split(".")[videos[i].split(".").length - 1];
    let div = document.createElement("div");
    div.className = "videoDiv";
    div.innerHTML += videos[i][1];
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

function reloadCards() {
  let cardsItems = document.querySelectorAll(".cards");
  for (let i of cardsItems) {
    i.remove();
  }
  for (let i in cards) {
    let cardBase = document.createElement("div");
    cardBase.setAttribute("namel", cards[i].name);
    cardBase.className = "cards";
    let cardImage = document.createElement("img");
    cardImage.src = "cardImages/" + cards[i].name + "." + cards[i].type;
    cardImage.width = cards[i].sizeX;
    cardBase.style.width = cards[i].sizeX + "px";
    cardImage.height = cards[i].sizeY;
    cardBase.style.height = cards[i].sizeY + "px";
    cardBase.appendChild(cardImage);
    document.getElementById("cardsPageDiv").appendChild(cardBase);
    cardBase.addEventListener("click", function () {
      if (isCardEdit) {
        openCardMaker();
        let card;
        for (let i in cards) {
          if (cards[i].name === this.getAttribute("namel")) {
            card = cards[i];
            break;
          }
        }
        document.getElementById("cardNameInput").value = card.name;
        document.getElementById("sizeX").value = card.sizeX;
        document.getElementById("sizeY").value = card.sizeY;
        document.getElementById("start").checked = card.start;
        document.getElementById("cardImageLabel").innerText =
          card.name + "." + card.type;
        document.getElementById("cardImageInput").required = false;
        keepImageCard = true;
        isCardEdit = false;
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
  if (isCardEdit) {
    setTimeout(function () {
      let cardsItems = document.querySelectorAll(".cards");
      for (let i of cardsItems) {
        i.remove();
      }
      for (let i in allCards) {
        let cardBase = document.createElement("div");
        cardBase.setAttribute("namel", allCards[i].name);
        cardBase.className = "cards";
        let cardImage = document.createElement("img");
        cardImage.src =
          "cardImages/" + allCards[i].name + "." + allCards[i].type;

        cardImage.width = cards[i].sizeX;
        cardBase.style.width = cards[i].sizeX + "px";
        cardImage.height = cards[i].sizeY;
        cardBase.style.height = cards[i].sizeY + "px";
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
            document.getElementById("start").checked = card.start;
            document.getElementById("cardImageLabel").innerText =
              card.name + "." + card.type;
            document.getElementById("cardImageInput").required = false;
            keepImageCard = true;
            isCardEdit = false;

            reloadCards();
          } else {
          }
        });
      }
    }, 1000);
  }
});

socket.on("sendLockData", function (value) {
  locks = value;
  let locksItems = document.querySelectorAll(".locks");
  for (let i of locksItems) {
    i.remove();
  }
  for (let i in locks) {
    let lockBase = document.createElement("div");
    lockBase.className = "locks";
    lockBase.innerHTML += locks[i].displayName + "<br>";
    let lockImage = document.createElement("img");
    lockImage.src = "lock.png";
    lockImage.width = 125;
    lockImage.height = 150;
    lockBase.appendChild(lockImage);
    document.getElementById("locksPageDiv").appendChild(lockBase);
    lockBase.setAttribute("namel", locks[i].name);
    lockBase.addEventListener("click", function () {
      if (isLockEdit) {
        openLockMaker();
        let lock;
        for (let i in locks) {
          if (locks[i].name === this.getAttribute("namel")) {
            lock = locks[i];
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
        if (lock.isDisplay) {
          document.getElementById("openLockImageLabel").innerText =
            lock.name + "." + lock.type;
        }
        document.getElementById("locksResultsRemove").value = lock.toRemove;
        keepImageLock = true;
        isLockEdit = false;
      } else {
        document.getElementById("lockOpener").style.display = "block";
        document.getElementById(
          "lockOpenerName"
        ).innerText = this.innerText.trim();

        document
          .getElementById("submitLockOpener")
          .setAttribute("namel", this.getAttribute("namel"));
      }
    });
  }
});

//edit cards

function editCards() {
  isCardEdit = !isCardEdit;
  if (isCardEdit) {
    let cardsItems = document.querySelectorAll(".cards");
    for (let i of cardsItems) {
      i.remove();
    }
    for (let i in allCards) {
      let cardBase = document.createElement("div");
      cardBase.setAttribute("namel", allCards[i].name);
      cardBase.className = "cards";
      let cardImage = document.createElement("img");
      cardImage.src = "cardImages/" + allCards[i].name + "." + allCards[i].type;

      cardImage.width = allCards[i].sizeX;
      cardBase.style.width = allCards[i].sizeX + "px";
      cardImage.height = allCards[i].sizeY;
      cardBase.style.height = allCards[i].sizeY + "px";
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
          document.getElementById("start").checked = card.start;
          document.getElementById("cardImageLabel").innerText =
            card.name + "." + card.type;
          document.getElementById("cardImageInput").required = false;
          keepImageCard = true;
          isCardEdit = false;

          reloadCards();
        } else {
        }
      });
    }
  } else {
    reloadCards();
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
  document.getElementById("lockMaker").reset();
  document.getElementById("openLockImageLabel").innerText = "Upload image";
}

function openCardMaker() {
  document.getElementById("cardMaker").style.display = "block";
  document.getElementById("cardMaker").reset();
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
      var dataUrl = document
        .getElementById("qrcode")
        .getElementsByTagName("canvas")[0]
        .toDataURL(); //attempt to save base64 string to server using this var
      var windowContent = "<!DOCTYPE html>";
      windowContent += "<html>";
      windowContent += "<head><title>Print canvas</title></head>";
      windowContent += "<body style='text-align:center'>";
      windowContent += `<p style="font-size: 20rem; padding:0; margin:0;">${
        document.getElementById("qrcodeNameInput").value
      }</p>`;
      windowContent += '<img src="' + dataUrl + '">';
      windowContent += "</body>";
      windowContent += "</html>";
      let printWin = window.open("", "");
      printWin.document.open();
      printWin.document.write(windowContent);
      printWin.document.close();
      printWin.focus();
      printWin.print();
      printWin.addEventListener("afterprint", function () {
        printWin.close();
      });
      document
        .getElementById("qrcode")
        .getElementsByTagName("canvas")[0]
        .remove();
      document.getElementById("qrcodeMaker").style.display = "none";
    }
  };

  // Create QRCode Object
  let qr = new QRCode(document.getElementById("qrcode"), options);

  return false;
}
