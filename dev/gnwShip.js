/**
 * @file defines the SHIP paenl functions for the Greek Naval Warfare page
 * mostly providing a formatted panel to display info abuut the ship...
 *
 * name, etc a top
 * port oar row: 1 cell for each oar 'point' either black or red
 * hull row: 1 cell for each hull point, filled either green or red
 * starboard oar row: 1 cell for each oar 'point' either black or red
 * crew row: ???
 * wailing row: ???
 *
 * @author Rod Hawkes
 */
'use strict';

const gnwShip = function() {
  const gCaptain = "<span><i title='Captain' style='color:grey'>C</i></span>";
  const gCaptainRed = "<span><i title='Captain' style='color:red'>C</i></span>";
  const gSteersman = "<span><i class='fas fa-life-ring' title='Steersman' style='color:grey'></i></span>";
  const gSteersmanRed = "<span><i class='fas fa-life-ring' title='Steersman' style='color:red'></i></span>";
  const gSailor = "<span><i class='fas fa-child' title='Deck crew' style='color:grey'></i></span>";
  const gSailorRed = "<span><i class='fas fa-child' title='Deck crew' style='color:red'></i></span>";
  const gArcher = "<span><i class='fas fa-feather-alt' title='Archers' style='color:grey'></i></span>";
  const gArcherRed = "<span><i class='fas fa-feather-alt' title='Archers' style='color:red'></i></span>";
  const gMarine = "<span><i class='fas fa-khanda' title='Marines' style='color:grey'></i></span>";
  const gMarineRed = "<span><i class='fas fa-khanda' title='Marines' style='color:red'></i></span>";
  const gHoleRed = "<span><i class='fas fa-bahai' title='Holed!' style='color:red; font-size:10px'></i></span>";
  const gFlagship = "<i class='fas fa-flag-checkered' style='font-size:10px'></i>";
  const gSurvivors = "<span><i class='material-icons' title='Survivors'>pool</i></span>"
  const gTransfer = "<span><i class='material-icons' title='Transfer'>transfer_within_a_station</i></span>"
  let gMapForShips = null; // map that ships are markered on
  let clickCallbackFunction = null;

  function setMap(map, callbackFunction) {
    gMapForShips = map;
    clickCallbackFunction = callbackFunction;
  }

  function newCard(snapShip, gTypes) {
    const shipId = snapShip.key;
    const shipNm = snapShip.val().name;
    const shipType = snapShip.val().type;
    const typeCrew = gTypes[shipType].crew;

    const newCard = makeElement('div', 'card|' + shipId, 'w3-card w3-bar-item w3-light-grey');
    newCard.style = "margin-left:5px; padding-left:8px; padding-top:0px; padding-right:5px; padding-bottom:1px";
    newCard.style.width = (55 + 12 * gTypes[shipType].hull) + "px";
    newCard.onclick = function() {
      gMapForShips.setCenter(this.location);
      gnwMarker.highlight(shipId);
      clickCallbackFunction(shipId);
    }

    const nameRow = makeElement('div');
    nameRow.style = "height:20px; overflow:hidden";
    newCard.appendChild(nameRow);
    nameRow.appendChild( makeElement('span', 'name|' + shipId, 'w3-small') );
    const iconList = makeElement('span', 'icons|' + shipId);
    iconList.style = "margin-left:3px";
    nameRow.appendChild( iconList );

    const idPfx = 'health|' + shipId + '|';
    const healthGrid = makeElement('div', null, 'gnw-shipGrid' );

    healthGrid.appendChild( makeElement('div', idPfx + 'rudder-p', null, '-') );
    for (let i=1; i<=8; i++) {
      const oarBank = makeElement('div', idPfx + 'oar-p' + i, 'w3-tiny', '|||');
      if (i > gTypes[shipType].oars) {oarBank.style.visibility = "hidden";}
      healthGrid.appendChild( oarBank );
    }

    healthGrid.appendChild( makeElement('div') );
    for (let i=1; i<=8; i++) {
      const hullBox = makeElement('div', idPfx + 'hull-' + i, 'w3-border');
      hullBox.style = "margin-top:3px; height:10px"; // so box is between oars
      if (i > gTypes[shipType].hull) {hullBox.style.visibility = "hidden";}
      healthGrid.appendChild( hullBox );
    }

    const rudderS = makeElement('div', idPfx + 'rudder-s', 'w3-cell-top', '-');
    rudderS.style = "line-height:5px"; // so the bar is at the top
    healthGrid.appendChild( rudderS );
    for (let i=1; i<=8; i++) {
      const oarBank = makeElement('div', idPfx + 'oar-s' + i, 'w3-tiny', '|||');
      if (i > gTypes[shipType].oars) {oarBank.style.visibility = "hidden";}
      healthGrid.appendChild( oarBank );
    }

    newCard.appendChild(healthGrid);

    // and a row to indicate the state of movement, rowing or sailing
    const moveDiv = makeElement('div', null, 'w3-bar');
    newCard.appendChild( moveDiv );

    const rowing = makeElement('span', 'rowing|' + shipId);
    rowing.appendChild( makeElement('span', null, 'w3-border w3-tiny', '<', 'Back'));
    rowing.appendChild( makeElement('span', null, 'w3-border w3-tiny', 'O', 'Stop'));
    rowing.appendChild( makeElement('span', null, 'w3-border w3-tiny', '>', 'Slow'));
    rowing.appendChild( makeElement('span', null, 'w3-border w3-tiny', '>', 'Cruise'));
    rowing.appendChild( makeElement('span', null, 'w3-border w3-tiny', '>', 'Full'));
    moveDiv.appendChild( rowing );

    const sailing = makeElement('span', 'sailing|' + shipId, 'w3-tiny w3-border');
    sailing.style="display:none; margin-top:5px";
    moveDiv.appendChild( sailing );

    const message = makeElement('span', 'message|' + shipId, 'w3-tiny w3-red w3-center');
    message.style="display:none; margin-top:5px";
    moveDiv.appendChild( message );

    // And an area to hold the crew health indicators
    const crewArea1 = makeElement('div', 'crew1|' + shipId, 'w3-tiny');
    crewArea1.style = "margin-top:3px";

    newCard.appendChild( crewArea1 );

    const crewArea2 = makeElement('div', 'crew2|' + shipId, 'w3-tiny');
    for (let i=0; i<typeCrew.marines/2; i++) {crewArea2.innerHTML += gMarine;}
    newCard.appendChild( crewArea2 );

    // and add the major state overlay eg overlays "sunk"
    const cardContainer = makeElement('div');
    cardContainer.appendChild(newCard);
    const overlay = makeElement('div', 'overlay|' + shipId, 'gnw-overlay');
    cardContainer.appendChild(overlay);
    return cardContainer;
  }

  function makeElement(type, id, classList=null, text=null, title=null) {
    const el = document.createElement(type);
    if (id != null) {el.id = id;}
    if (classList != null) {el.className = classList;}
    if (text != null) el.innerText = text;
    if (title != null) el.title = title;
    return el;
  }


  function updateCard(snapShip, gTypes) {
    const shipId = snapShip.key;
    const shipNm = snapShip.val().name;
    const shipType = snapShip.val().type;
    const typeInfo = gTypes[shipType];

    const idPfx = 'health|' + shipId + '|';
    document.getElementById('card|' + shipId).location = snapShip.val().location;
    document.getElementById('name|' + shipId).innerHTML = '<i>' + shipNm + '</i>';

    const iconArea = document.getElementById('icons|' + shipId);
    iconArea.innerHTML = '';
    if (snapShip.val().flagship) {iconArea.innerHTML = gFlagship;}

    // Now adjust the card to indicate the current health of the ship
    const health = snapShip.val().health;
    if (health.holes > 0) {iconArea.innerHTML += gHoleRed;}

    const oarMax = typeInfo.oars;

    const rudderP = document.getElementById(idPfx + 'rudder-p');
    rudderP.className = (health.port.rudder > 0) ? "w3-cell-top": "w3-cell-top w3-text-red";
    for (let i=1; i<=oarMax; i++) {
      const oarCell = document.getElementById(idPfx + 'oar-p' + i);
      oarCell.className = (i > health.port.oars) ? "w3-tiny w3-text-red": "w3-tiny";
    }

    const hullCellMax = gTypes[shipType].hull
    for (let i=1; i<=hullCellMax; i++) {
      const hullCell = document.getElementById(idPfx + 'hull-' + i);
      const colour = (i > health.hull) ? " w3-red": " w3-grey";
      hullCell.className = "w3-border" + colour;
    }

    const rudderS = document.getElementById(idPfx + 'rudder-s');
    rudderS.className = (health.starboard.rudder > 0) ? "w3-cell-top": "w3-cell-top w3-text-red";
    for (let i=1; i<=oarMax; i++) {
      const oarCell = document.getElementById(idPfx + 'oar-s' + i);
      oarCell.className = (i > health.starboard.oars) ? "w3-tiny w3-text-red": "w3-tiny";
    }

    const typeCrew = typeInfo.crew;
    const crewArea1 = document.getElementById('crew1|' + shipId);
    crewArea1.innerHTML = (health.crew.captain > 0) ? gCaptain: gCaptainRed;
    crewArea1.innerHTML += (health.crew.steersman > 0) ? gSteersman: gSteersmanRed;;
    for (let i=0; i<health.crew.sailors; i++) {crewArea1.innerHTML += gSailor;}
    for (let i=health.crew.sailors; i<typeCrew.sailors; i++) {crewArea1.innerHTML += gSailorRed;}
    for (let i=0; i<health.crew.archers; i++) {crewArea1.innerHTML += gArcher;}
    for (let i=health.crew.archers; i<typeCrew.archers; i++) {crewArea1.innerHTML += gArcherRed;}

    const crewArea2 = document.getElementById('crew2|' + shipId);
    crewArea2.innerHTML = '';
    for (let i=0; i<health.crew.marines/2; i++) {crewArea2.innerHTML += gMarine;}
    for (let i=health.crew.marines/2; i<typeCrew.marines/2; i++) {crewArea2.innerHTML += gMarineRed;}

    // And show the current rowing or sailing style
    const rowingArea = document.getElementById('rowing|' + shipId);
    const sailingArea = document.getElementById('sailing|' + shipId);
    const messageArea = document.getElementById('message|' + shipId);
    if (health.sunk) {
      rowingArea.style.display = "none";
      sailingArea.style.display = "none";
      messageArea.style.display = "block";

      messageArea.innerText = "SUNK";

    } else if (snapShip.val().sailing == null) { // must be Rowing, show rowing speed
      rowingArea.style.display = "block";
      sailingArea.style.display = "none";
      messageArea.style.display = "none";
      const rowingCell = snapShip.val().rowing + 1; // back (-1) is child zero, etc
      for (let i=0; i<5; i++) {
        let cl = "w3-border w3-tiny";
        if (i == rowingCell) {cl += " w3-dark-grey";}
        rowingArea.children[i].className = cl;
      }

    } else { // sailing, show direction v wind ie beating, reaching or running
      rowingArea.style.display = "none";
      sailingArea.style.display = "block";
      messageArea.style.display = "none";

      sailingArea.innerText = 'sailing...';
    }
  }

  function order(orderText) {
    const orderList = document.getElementById('modalBattlePlayOrdersSequence').children;
    for (let i=0; i<orderList.length; i++) {
      if (orderList[i].innerText == '') {orderList[i].innerText = orderText; break};
    }
  }

  function clearOrders() {
    const orderList = document.getElementById('modalBattlePlayOrdersSequence').children;
    for (let i=0; i<orderList.length; i++) {
      orderList[i].innerText = '';
    }
  }

  /**
  * Adjusts one attribute on the ship's database record, which will trigger
  * change events so that all listening web pages are updated
  */
  function adjust(shipId, attrNm, newVal) {
    const cmd = {};
    cmd[attrNm] = newVal;
    dbRootRef.child('GNW').child('Ships').child(shipId).update(cmd);
  }




  //-----------------------------------------------------------
  // expose wrapped functions that get called from the HTML
  return {adjust: adjust,
          clearOrders: clearOrders,
          newCard: newCard,
          setMap: setMap,
          order: order,
          updateCard: updateCard}
} (); // // end and immediately execute the ananymous wrapper
